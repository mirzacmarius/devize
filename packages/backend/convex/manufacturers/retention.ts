import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireSuperAdmin } from "../lib/roles";
import { isSuppressed } from "./admin";
import { checkEmail, redirectDraft } from "./drafts";
import {
  type AddressPlan,
  ERASED,
  type ErasureRule,
  mentions,
  messageAddresses,
  REPORT_MS,
  retentionPlan,
  scrubText,
} from "./lib/retention";
import { normalizeEmail } from "./lib/text";

// Erases the addresses of people at producers once the privacy page says they
// go (ADR 0043). Functions here take ids and cursors only: an address passed
// to the scheduler would stay in its records.

const SWEEP_BATCH = 50;
// A manufacturer has a handful of research jobs among its norm extraction
// jobs; this many are read to find them.
const JOBS_READ = 500;
const SUBJECTS_KEPT = 5;

/**
 * When each person's address in the manufacturer's contacts and emails is
 * erased, from the rows already read.
 */
export async function planFor(
  ctx: QueryCtx,
  manufacturer: Doc<"manufacturers">,
  contacts: Doc<"manufacturerContacts">[],
  messages: Doc<"outreachMessages">[],
): Promise<AddressPlan[]> {
  const addresses = new Set<string>();
  for (const contact of contacts) {
    if (contact.email) {
      addresses.add(normalizeEmail(contact.email));
    }
  }
  for (const message of messages) {
    for (const address of messageAddresses(message)) {
      addresses.add(address);
    }
  }
  const suppressed = new Set<string>();
  for (const address of addresses) {
    if (await isSuppressed(ctx, address)) {
      suppressed.add(address);
    }
  }
  return retentionPlan({ manufacturer, contacts, messages, suppressed });
}

/** Starts the daily run over every manufacturer. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.manufacturers.retention.sweepBatch,
      { cursor: null },
    );
    return null;
  },
});

/** Reviews a page of manufacturers, each in its own transaction. */
export const sweepBatch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("manufacturers")
      .paginate({ numItems: SWEEP_BATCH, cursor: args.cursor });
    for (const manufacturer of page.page) {
      await ctx.scheduler.runAfter(0, internal.manufacturers.retention.review, {
        manufacturerId: manufacturer._id,
      });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.manufacturers.retention.sweepBatch,
        { cursor: page.continueCursor },
      );
    }
    return null;
  },
});

/**
 * Erases what is due at one manufacturer: people's addresses past their
 * time, and research reports older than 25 days.
 */
export const review = internalMutation({
  args: { manufacturerId: v.id("manufacturers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    let manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      return null;
    }
    const now = Date.now();
    // A status set to replied stays an answer when it is changed back.
    if (
      manufacturer.answeredAt === undefined &&
      (manufacturer.status === "replied" ||
        manufacturer.status === "norms_received" ||
        manufacturer.normsStatus === "received")
    ) {
      await ctx.db.patch("manufacturers", manufacturer._id, {
        answeredAt: now,
      });
      manufacturer = { ...manufacturer, answeredAt: now };
    }
    const [contacts, messages] = await Promise.all([
      ctx.db
        .query("manufacturerContacts")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", args.manufacturerId),
        )
        .take(100),
      ctx.db
        .query("outreachMessages")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", args.manufacturerId),
        )
        .take(200),
    ]);
    const due = new Map<string, ErasureRule>();
    for (const entry of await planFor(ctx, manufacturer, contacts, messages)) {
      if (entry.rule && entry.at !== null && entry.at <= now) {
        due.set(entry.address, entry.rule);
      }
    }
    if (due.size > 0) {
      await eraseAddresses(ctx, manufacturer, contacts, messages, due, now);
    }
    const { reportsUntil } = manufacturer;
    if (
      due.size > 0 ||
      reportsUntil === undefined ||
      (reportsUntil > 0 && reportsUntil <= now)
    ) {
      await dropReports(ctx, manufacturer._id, now, [...due.keys()]);
    }
    return null;
  },
});

type Vars = Doc<"outreachMessages">["vars"];

// The email's values without the erased addresses. An email kept as a record
// keeps the page the address came from; a draft loses it, so rendering it
// again asks for a new recipient rather than writing a contact-form note.
function scrubVars(vars: Vars, erased: Set<string>, keepSource: boolean) {
  const hit = (address?: string) =>
    address !== undefined && erased.has(normalizeEmail(address));
  const addressHit = hit(vars.address);
  return {
    ...vars,
    address: addressHit ? undefined : vars.address,
    addressSourceUrl:
      addressHit && !keepSource ? undefined : vars.addressSourceUrl,
    personalization:
      vars.personalization && scrubText(vars.personalization, erased),
    thanks:
      vars.thanks && hit(vars.thanks.claimEmail)
        ? { ...vars.thanks, claimEmail: ERASED, claimUrl: undefined }
        : vars.thanks,
  };
}

/**
 * Erases the addresses from the manufacturer's records:
 * - its contacts with them go, and so do the unused claim links for them;
 * - an email sent or opened to send stays as the record that we wrote, with
 *   the address replaced by "[adresă ștearsă]";
 * - a draft nobody edited goes to the next contact; an edited one gets
 *   "{adresa}" in place of the address, which blocks it until someone picks a
 *   new recipient; a thank-you draft goes, since its claim link was theirs;
 * - the address is replaced in the notes and research findings, and any
 *   research report naming it is deleted.
 * One erasure row per rule records how many went, without them.
 */
async function eraseAddresses(
  ctx: MutationCtx,
  manufacturer: Doc<"manufacturers">,
  contacts: Doc<"manufacturerContacts">[],
  messages: Doc<"outreachMessages">[],
  due: Map<string, ErasureRule>,
  now: number,
) {
  const erased = new Set(due.keys());
  const excluded = manufacturer.status === "excluded";
  const subjects = new Map<ErasureRule, Set<string>>();

  for (const contact of contacts) {
    if (contact.email && erased.has(normalizeEmail(contact.email))) {
      await ctx.db.delete("manufacturerContacts", contact._id);
    }
  }

  const redirect: Doc<"outreachMessages">[] = [];
  for (const message of messages) {
    const involved = messageAddresses(message).filter((address) =>
      erased.has(address),
    );
    const text = [
      message.subject,
      message.body,
      ...message.issues.map((issue) => issue.detail ?? ""),
    ].join("\n");
    if (involved.length === 0 && !mentions(text, erased)) {
      continue;
    }
    const to =
      message.to && erased.has(normalizeEmail(message.to))
        ? undefined
        : message.to;

    // Emails that went, or may have: sent, opened to send, or opened and
    // then stopped when the firm asked us to.
    const record =
      message.status === "sent" ||
      message.status === "approved" ||
      (message.status === "rejected" && message.approvedAt !== undefined);
    if (record) {
      const subject = scrubText(message.subject, erased);
      for (const address of involved) {
        const rule = due.get(address);
        if (rule) {
          subjects.set(
            rule,
            (subjects.get(rule) ?? new Set<string>()).add(subject),
          );
        }
      }
      // Nobody may still send an approved email to someone who asked us to
      // stop, or to an excluded firm.
      const stop =
        message.status === "approved" &&
        involved.some((address) => due.get(address) !== "no_answer");
      await ctx.db.patch("outreachMessages", message._id, {
        to,
        vars: scrubVars(message.vars, erased, true),
        subject,
        body: scrubText(message.body, erased),
        issues: message.issues.map((issue) =>
          issue.detail
            ? { ...issue, detail: scrubText(issue.detail, erased) }
            : issue,
        ),
        ...(involved.length > 0 ? { recipientErasedAt: now } : {}),
        ...(stop ? { status: "rejected" as const } : {}),
      });
      continue;
    }

    if (
      involved.length > 0 &&
      (message.status === "rejected" || message.step === "thanks" || excluded)
    ) {
      await ctx.db.delete("outreachMessages", message._id);
      continue;
    }
    if (message.status === "rejected") {
      await ctx.db.patch("outreachMessages", message._id, {
        subject: scrubText(message.subject, erased),
        body: scrubText(message.body, erased),
        issues: message.issues.map((issue) =>
          issue.detail
            ? { ...issue, detail: scrubText(issue.detail, erased) }
            : issue,
        ),
      });
      continue;
    }
    if (involved.length > 0 && !message.edited) {
      redirect.push(message);
      continue;
    }
    const subject = scrubText(message.subject, erased, "{adresa}");
    const body = scrubText(message.body, erased, "{adresa}");
    const vars = scrubVars(message.vars, erased, false);
    const issues = await checkEmail(ctx, manufacturer._id, {
      subject,
      body,
      to,
      step: message.step,
      vars,
    });
    await ctx.db.patch("outreachMessages", message._id, {
      subject,
      body,
      to,
      vars,
      issues:
        involved.length > 0
          ? [...issues, { code: "recipient_erased", level: "warning" as const }]
          : issues,
      ...(to === message.to ? {} : { toSetAt: now }),
    });
  }
  // After the contacts are gone, so the next one is chosen.
  for (const message of redirect) {
    await redirectDraft(ctx, manufacturer, message);
  }

  const links = await ctx.db
    .query("claimLinks")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .take(100);
  for (const link of links) {
    if (link.usedAt === undefined && erased.has(normalizeEmail(link.email))) {
      await ctx.db.delete("claimLinks", link._id);
    }
  }

  const scrub = (text: string | undefined) =>
    text === undefined ? undefined : scrubText(text, erased);
  const texts = {
    hints: scrub(manufacturer.hints),
    notes: scrub(manufacturer.notes),
    needsReview: scrub(manufacturer.needsReview),
    mainProductsPhrase: scrub(manufacturer.mainProductsPhrase),
    personalization: manufacturer.personalization && {
      ...manufacturer.personalization,
      sentence: scrubText(manufacturer.personalization.sentence, erased),
    },
  };
  if (JSON.stringify(texts) !== JSON.stringify(pickTexts(manufacturer))) {
    await ctx.db.patch("manufacturers", manufacturer._id, texts);
  }

  const counts = new Map<ErasureRule, number>();
  for (const rule of due.values()) {
    counts.set(rule, (counts.get(rule) ?? 0) + 1);
  }
  for (const [rule, addresses] of counts) {
    const sent = [...(subjects.get(rule) ?? [])].slice(0, SUBJECTS_KEPT);
    await ctx.db.insert("outreachErasures", {
      manufacturerId: manufacturer._id,
      rule,
      erasedAt: now,
      addresses,
      subjects: sent,
      ...(sent.length === 0 ? { mailboxClearedAt: now } : {}),
    });
  }
}

function pickTexts(manufacturer: Doc<"manufacturers">) {
  return {
    hints: manufacturer.hints,
    notes: manufacturer.notes,
    needsReview: manufacturer.needsReview,
    mainProductsPhrase: manufacturer.mainProductsPhrase,
    personalization: manufacturer.personalization,
  };
}

/**
 * Deletes the research reports kept on the manufacturer's jobs that are 25
 * days old, or that name an erased address, and notes when the next one is
 * due. The jobs stay, so their cost is still counted (ADR 0006).
 */
export async function dropReports(
  ctx: MutationCtx,
  manufacturerId: Id<"manufacturers">,
  now: number,
  erased: string[] = [],
) {
  let next = Number.POSITIVE_INFINITY;
  let read = 0;
  const jobs = ctx.db
    .query("aiJobs")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const job of jobs) {
    if (++read > JOBS_READ) {
      break;
    }
    if (job.kind !== "manufacturer_research" || job.result === undefined) {
      continue;
    }
    const until = (job.finishedAt ?? job._creationTime) + REPORT_MS;
    if (until <= now || mentions(JSON.stringify(job.result), erased)) {
      await ctx.db.patch("aiJobs", job._id, { result: undefined });
    } else {
      next = Math.min(next, until);
    }
  }
  const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
  if (manufacturer) {
    await ctx.db.patch("manufacturers", manufacturerId, {
      reportsUntil: Number.isFinite(next) ? next : 0,
    });
  }
}

const erasureSummary = v.object({
  _id: v.id("outreachErasures"),
  manufacturerId: v.id("manufacturers"),
  manufacturerName: v.string(),
  rule: v.union(
    v.literal("no_answer"),
    v.literal("not_written"),
    v.literal("opt_out"),
    v.literal("excluded"),
  ),
  erasedAt: v.number(),
  addresses: v.number(),
  subjects: v.array(v.string()),
});

/** Erasures whose sent emails are still to be deleted from the mailbox. */
export const mailboxPending = query({
  args: {},
  returns: v.array(erasureSummary),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const rows = await ctx.db
      .query("outreachErasures")
      .withIndex("by_mailboxClearedAt", (q) =>
        q.eq("mailboxClearedAt", undefined),
      )
      .order("desc")
      .take(100);
    return await Promise.all(
      rows.map(async (row) => ({
        _id: row._id,
        manufacturerId: row.manufacturerId,
        manufacturerName:
          (await ctx.db.get("manufacturers", row.manufacturerId))?.name ?? "",
        rule: row.rule,
        erasedAt: row.erasedAt,
        addresses: row.addresses,
        subjects: row.subjects,
      })),
    );
  },
});

/** Records that the emails to the erased addresses left the mailbox too. */
export const markMailboxCleared = mutation({
  args: { erasureId: v.id("outreachErasures") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const row = await ctx.db.get("outreachErasures", args.erasureId);
    if (!row) {
      throw new ConvexError({ code: "not_found" });
    }
    if (row.mailboxClearedAt === undefined) {
      await ctx.db.patch("outreachErasures", row._id, {
        mailboxClearedAt: Date.now(),
        mailboxClearedBy: admin._id,
      });
    }
    return null;
  },
});

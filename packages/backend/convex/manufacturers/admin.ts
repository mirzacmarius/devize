import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { createJob, JOB_TIMEOUT_MS } from "../ai/jobs";
import { aiModel } from "../ai/models";
import { requireSuperAdmin } from "../lib/roles";
import { deleteProducerRows } from "../producers/handover";
import { REPORT_MS } from "./lib/retention";
import {
  isEmail,
  nameKey,
  normalizeEmail,
  parseManufacturerLines,
} from "./lib/text";
import { dropReports, planFor } from "./retention";
import { contactKind, manufacturerStatus } from "./validators";

// Research jobs started together run this far apart, to stay under the API's
// rate limits.
const researchSpacingMs = 45_000;

async function activeJobsByManufacturer(ctx: QueryCtx) {
  const jobs = new Map<Id<"manufacturers">, Doc<"aiJobs">>();
  for (const status of ["queued", "running"] as const) {
    const active = await ctx.db
      .query("aiJobs")
      .withIndex("by_status", (q) => q.eq("status", status))
      .take(200);
    for (const job of active) {
      if (job.manufacturerId) {
        jobs.set(job.manufacturerId, job);
      }
    }
  }
  return jobs;
}

async function activeResearchJob(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
) {
  const jobs = await ctx.db
    .query("aiJobs")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    )
    .order("desc")
    .take(10);
  return jobs.find(
    (job) =>
      job.kind === "manufacturer_research" &&
      (job.status === "queued" || job.status === "running"),
  );
}

/** Every manufacturer with its research state and its latest email. */
export const list = query({
  args: { status: v.optional(manufacturerStatus) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { status } = args;
    const manufacturers = status
      ? await ctx.db
          .query("manufacturers")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(500)
      : await ctx.db.query("manufacturers").take(500);
    const active = await activeJobsByManufacturer(ctx);
    return await Promise.all(
      manufacturers.map(async (manufacturer) => {
        const message = await ctx.db
          .query("outreachMessages")
          .withIndex("by_manufacturerId", (q) =>
            q.eq("manufacturerId", manufacturer._id),
          )
          .order("desc")
          .first();
        const job = active.get(manufacturer._id);
        return {
          _id: manufacturer._id,
          _creationTime: manufacturer._creationTime,
          name: manufacturer.name,
          wave: manufacturer.wave,
          hints: manufacturer.hints,
          status: manufacturer.status,
          normsStatus: manufacturer.normsStatus,
          website: manufacturer.website,
          categories: manufacturer.categories,
          confidence: manufacturer.confidence,
          researchedAt: manufacturer.researchedAt,
          activeJob: job ? { kind: job.kind, status: job.status } : null,
          message: message
            ? {
                status: message.status,
                blocked: message.issues.some(
                  (issue) => issue.level === "error",
                ),
              }
            : null,
        };
      }),
    );
  },
});

/** One manufacturer with everything the admin page shows about it. */
export const get = query({
  args: { manufacturerId: v.id("manufacturers") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      return null;
    }
    const { manufacturerId } = args;
    const [contacts, messages, normImports, jobs] = await Promise.all([
      ctx.db
        .query("manufacturerContacts")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", manufacturerId),
        )
        .take(50),
      ctx.db
        .query("outreachMessages")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", manufacturerId),
        )
        .order("desc")
        .take(50),
      ctx.db
        .query("normImports")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", manufacturerId),
        )
        .order("desc")
        .take(50),
      ctx.db
        .query("aiJobs")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", manufacturerId),
        )
        .order("desc")
        .take(20),
    ]);
    const suppressed = new Set<string>();
    for (const contact of contacts) {
      if (contact.email && (await isSuppressed(ctx, contact.email))) {
        suppressed.add(contact.email);
      }
    }
    const research = jobs.find(
      (job) =>
        job.kind === "manufacturer_research" && job.status === "succeeded",
    );
    // When each person's address goes, as the contacts panel shows it.
    const plan = new Map(
      (await planFor(ctx, manufacturer, contacts, messages)).map((entry) => [
        entry.address,
        entry,
      ]),
    );
    const erasures = await ctx.db
      .query("outreachErasures")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .order("desc")
      .take(20);
    return {
      manufacturer,
      contacts: contacts.map((contact) => {
        const entry = contact.email ? plan.get(contact.email) : undefined;
        return {
          ...contact,
          suppressed: contact.email ? suppressed.has(contact.email) : false,
          retention: entry ? { at: entry.at, rule: entry.rule } : null,
        };
      }),
      messages,
      normImports,
      jobs: jobs.map(({ result: _result, ...job }) => job),
      research: research?.result as
        | { report: string; sources: { url: string; title?: string }[] }
        | undefined,
      // The research report was deleted after 25 days (ADR 0043).
      reportDeletedAt:
        research && research.result === undefined
          ? (research.finishedAt ?? research._creationTime) + REPORT_MS
          : undefined,
      erasures,
    };
  },
});

export async function isSuppressed(ctx: QueryCtx, email: string) {
  const address = normalizeEmail(email);
  const domain = address.slice(address.lastIndexOf("@"));
  for (const value of [address, domain]) {
    const row = await ctx.db
      .query("suppressionList")
      .withIndex("by_value", (q) => q.eq("value", value))
      .first();
    if (row) {
      return true;
    }
  }
  return false;
}

/**
 * Adds manufacturers from a pasted list, one per line. Names already in the
 * list are skipped and returned.
 */
export const createMany = mutation({
  args: { text: v.string(), wave: v.number() },
  returns: v.object({ created: v.number(), skipped: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const lines = parseManufacturerLines(args.text).slice(0, 200);
    const skipped: string[] = [];
    let created = 0;
    for (const line of lines) {
      const key = nameKey(line.name);
      const existing = await ctx.db
        .query("manufacturers")
        .withIndex("by_nameKey", (q) => q.eq("nameKey", key))
        .first();
      if (existing) {
        skipped.push(line.name);
        continue;
      }
      await ctx.db.insert("manufacturers", {
        name: line.name,
        nameKey: key,
        wave: args.wave,
        hints: line.hints,
        status: "new",
        normsStatus: "unknown",
        claimStatus: "unclaimed",
        brands: [],
        categories: [],
        mainProducts: [],
        retailers: [],
        existingNorms: [],
        technicalDocs: [],
        declaredConsumption: [],
        createdBy: admin._id,
      });
      created++;
    }
    return { created, skipped };
  },
});

export const update = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    name: v.optional(v.string()),
    wave: v.optional(v.number()),
    website: v.optional(v.string()),
    hints: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(manufacturerStatus),
  },
  returns: v.null(),
  handler: async (ctx, { manufacturerId, name, wave, status, ...texts }) => {
    await requireSuperAdmin(ctx);
    if (name !== undefined && !name.trim()) {
      throw new ConvexError({ code: "invalid", field: "name" });
    }
    const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
    if (!manufacturer) {
      throw new ConvexError({ code: "not_found" });
    }
    // The first answer is kept when the status changes again (ADR 0043).
    const answered =
      manufacturer.answeredAt === undefined &&
      (status === "replied" || status === "norms_received");
    // An empty text clears the field; a field left out stays as it is.
    const cleared: Partial<Record<keyof typeof texts, string | undefined>> = {};
    for (const [key, value] of Object.entries(texts)) {
      if (value !== undefined) {
        cleared[key as keyof typeof texts] = value.trim() || undefined;
      }
    }
    await ctx.db.patch("manufacturers", manufacturerId, {
      ...cleared,
      ...(name ? { name: name.trim(), nameKey: nameKey(name) } : {}),
      ...(wave !== undefined ? { wave } : {}),
      ...(status ? { status } : {}),
      ...(answered ? { answeredAt: Date.now() } : {}),
    });
    return null;
  },
});

/**
 * Whether anything outside the outreach refers to the manufacturer: a firm
 * claimed it, or the catalog holds its norms, products or systems.
 */
async function isInUse(ctx: QueryCtx, manufacturer: Doc<"manufacturers">) {
  const manufacturerId = manufacturer._id;
  if (manufacturer.claimStatus === "claimed") {
    return true;
  }
  const uses = await Promise.all([
    ctx.db
      .query("organizations")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .first(),
    ctx.db
      .query("norms")
      .withIndex("by_manufacturerId_and_status_and_code", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .first(),
    ctx.db
      .query("products")
      .withIndex("by_manufacturerId_and_status", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .first(),
    ctx.db
      .query("systems")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .first(),
  ]);
  return uses.some((use) => use !== null);
}

/**
 * Deletes a manufacturer with its contacts, emails, erasure records and norm
 * imports. Its AI jobs stay without their research reports, so their cost
 * is still counted. One that a firm claimed or the catalog uses can't be
 * deleted; exclude it instead.
 */
export const remove = mutation({
  args: { manufacturerId: v.id("manufacturers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { manufacturerId } = args;
    const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
    if (!manufacturer) {
      return null;
    }
    if (await isInUse(ctx, manufacturer)) {
      throw new ConvexError({ code: "in_use" });
    }
    for (const table of [
      "manufacturerContacts",
      "outreachMessages",
      "outreachErasures",
    ] as const) {
      const rows = ctx.db
        .query(table)
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", manufacturerId),
        );
      for await (const row of rows) {
        await ctx.db.delete(table, row._id);
      }
    }
    const imports = ctx.db
      .query("normImports")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      );
    for await (const normImport of imports) {
      await deleteNormImport(ctx, normImport);
    }
    await deleteProducerRows(ctx, manufacturerId);
    await dropReports(ctx, manufacturerId, Number.POSITIVE_INFINITY);
    await ctx.db.delete("manufacturers", manufacturerId);
    return null;
  },
});

/**
 * Deletes a norms document with the norms extracted from it. When some of them
 * reached the catalog, the manufacturer keeps the document's recorded
 * agreement, as proof that they were published with it.
 */
export async function deleteNormImport(
  ctx: MutationCtx,
  normImport: Doc<"normImports">,
) {
  let published = false;
  const norms = ctx.db
    .query("importedNorms")
    .withIndex("by_normImportId_and_baseCode", (q) =>
      q.eq("normImportId", normImport._id),
    );
  for await (const norm of norms) {
    published ||=
      (await ctx.db
        .query("norms")
        .withIndex("by_importedNormId", (q) => q.eq("importedNormId", norm._id))
        .first()) !== null;
    await ctx.db.delete("importedNorms", norm._id);
  }
  const manufacturer = await ctx.db.get(
    "manufacturers",
    normImport.manufacturerId,
  );
  if (published && normImport.consent && manufacturer) {
    await ctx.db.patch("manufacturers", manufacturer._id, {
      keptConsents: [
        ...(manufacturer.keptConsents ?? []),
        {
          ...normImport.consent,
          fileName: normImport.fileName,
          edition: normImport.edition,
          deletedAt: Date.now(),
        },
      ],
    });
  }
  await ctx.storage.delete(normImport.fileId);
  await ctx.db.delete("normImports", normImport._id);
}

export const addContact = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    kind: contactKind,
    email: v.optional(v.string()),
    url: v.optional(v.string()),
    role: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.id("manufacturerContacts"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const email = args.email?.trim() ? normalizeEmail(args.email) : undefined;
    if (email && !isEmail(email)) {
      throw new ConvexError({ code: "invalid", field: "email" });
    }
    if (!email && !args.url?.trim()) {
      throw new ConvexError({ code: "invalid", field: "email" });
    }
    return await ctx.db.insert("manufacturerContacts", {
      manufacturerId: args.manufacturerId,
      kind: args.kind,
      email,
      url: args.url?.trim() || undefined,
      role: args.role?.trim() || undefined,
      sourceUrl: args.sourceUrl?.trim() || undefined,
      sourceVerified: false,
      origin: "manual",
      foundAt: Date.now(),
    });
  },
});

export const removeContact = mutation({
  args: { contactId: v.id("manufacturerContacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.delete("manufacturerContacts", args.contactId);
    return null;
  },
});

async function queueResearch(
  ctx: MutationCtx,
  admin: Doc<"users">,
  manufacturerId: Id<"manufacturers">,
  delayMs: number,
) {
  // The watchdog counts from now, so it also waits out the delay.
  const jobId = await createJob(
    ctx,
    {
      kind: "manufacturer_research",
      model: aiModel(),
      manufacturerId,
      createdBy: admin._id,
    },
    JOB_TIMEOUT_MS + delayMs,
  );
  await ctx.scheduler.runAfter(delayMs, internal.manufacturers.ai.research, {
    jobId,
  });
  return jobId;
}

/**
 * Researches a manufacturer on the web and drafts its first email. Nothing is
 * sent: the draft waits for approval.
 */
export const startResearch = mutation({
  args: { manufacturerId: v.id("manufacturers") },
  returns: v.id("aiJobs"),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      throw new ConvexError({ code: "not_found" });
    }
    if (await activeResearchJob(ctx, manufacturer._id)) {
      throw new ConvexError({ code: "already_running" });
    }
    return await queueResearch(ctx, admin, manufacturer._id, 0);
  },
});

/** Starts research for several manufacturers, spaced out. */
export const startResearchMany = mutation({
  args: { manufacturerIds: v.array(v.id("manufacturers")) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    let started = 0;
    for (const manufacturerId of args.manufacturerIds.slice(0, 50)) {
      const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
      if (
        !manufacturer ||
        manufacturer.status === "excluded" ||
        (await activeResearchJob(ctx, manufacturerId))
      ) {
        continue;
      }
      await queueResearch(
        ctx,
        admin,
        manufacturerId,
        started * researchSpacingMs,
      );
      started++;
    }
    return started;
  },
});

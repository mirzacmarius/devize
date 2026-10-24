import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getController, namesController, privacyPageUrl } from "../privacy";
import { createClaimLink } from "../producers/claimLinks";
import { isSuppressed } from "./admin";
import {
  type EmailIssue,
  type EmailVariant,
  lintEmail,
  renderInitialEmail,
  renderThanksEmail,
  type Sender,
  type TemplateVars,
} from "./lib/emailTemplate";
import {
  emailDomain,
  isEmail,
  normalizeEmail,
  onCompanyDomain,
} from "./lib/text";

/**
 * The signature, and the privacy page the emails link to: Devize's own,
 * unless the settings name another.
 */
export async function getSender(ctx: QueryCtx): Promise<Sender> {
  const settings = await ctx.db.query("outreachSettings").first();
  return {
    firstName: settings?.firstName,
    lastName: settings?.lastName,
    phone: settings?.phone,
    privacyUrl: settings?.privacyUrl ?? privacyPageUrl() ?? undefined,
  };
}

/**
 * The outreach rules, the suppression list, and what research knows about
 * the recipient: whether the address was read on a page (or added by a
 * person) and whether it is on the manufacturer's own domain. A thank-you
 * goes to whoever sent the norms, so only its claim link is checked against
 * the recipient. Devize's privacy page, which the emails link to, must name
 * its controller first.
 */
export async function checkEmail(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
  email: {
    subject: string;
    body: string;
    to?: string;
    step?: Doc<"outreachMessages">["step"];
    vars?: TemplateVars;
  },
): Promise<EmailIssue[]> {
  const issues = lintEmail(email);
  const privacyPage = privacyPageUrl();
  if (
    privacyPage &&
    email.body.includes(privacyPage) &&
    !namesController(await getController(ctx))
  ) {
    issues.push({ code: "missing_controller", level: "error" });
  }
  const to =
    email.to && isEmail(email.to) ? normalizeEmail(email.to) : undefined;
  const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
  if (email.step === "thanks") {
    const claimEmail = email.vars?.thanks?.claimEmail;
    if (claimEmail && claimEmail !== to) {
      issues.push({
        code: "claim_link_mismatch",
        level: "error",
        detail: claimEmail,
      });
    }
    if (manufacturer?.claimStatus === "claimed") {
      issues.push({ code: "already_claimed", level: "error" });
    }
  }
  if (!to) {
    return issues;
  }
  if (await isSuppressed(ctx, to)) {
    issues.push({ code: "suppressed_recipient", level: "error", detail: to });
  }
  if (email.step !== "thanks") {
    const contacts = await ctx.db
      .query("manufacturerContacts")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .take(50);
    const contact = contacts.find((candidate) => candidate.email === to);
    if (!contact || (!contact.sourceVerified && contact.origin !== "manual")) {
      issues.push({ code: "unverified_recipient", level: "warning" });
    }
  }
  if (manufacturer?.website && !onCompanyDomain(to, manufacturer.website)) {
    issues.push({
      code: "recipient_other_domain",
      level: "warning",
      detail: emailDomain(to),
    });
  }
  return issues;
}

const kindOrder = { department: 0, generic: 1, person: 2, form: 3 } as const;

/**
 * Who the first email goes to: the address research recommended, else a
 * department address (tehnic@, marketing@), a generic one (office@), a named
 * person's, and last the contact form. Addresses on the suppression list are
 * never chosen.
 */
async function chooseRecipient(
  ctx: QueryCtx,
  contacts: Doc<"manufacturerContacts">[],
  recommended: string | undefined,
) {
  const candidates: Doc<"manufacturerContacts">[] = [];
  for (const contact of contacts) {
    if (contact.email && (await isSuppressed(ctx, contact.email))) {
      continue;
    }
    if (contact.email || contact.kind === "form") {
      candidates.push(contact);
    }
  }
  candidates.sort(
    (a, b) =>
      Number(b.email === recommended) - Number(a.email === recommended) ||
      Number(b.sourceVerified) - Number(a.sourceVerified) ||
      kindOrder[a.kind] - kindOrder[b.kind],
  );
  return candidates[0];
}

export function emailVariantFor(
  manufacturer: Doc<"manufacturers">,
): EmailVariant {
  return manufacturer.existingNorms.length > 0 ||
    manufacturer.normsStatus === "existing" ||
    manufacturer.wave === 1
    ? "A"
    : "B";
}

async function templateVarsFor(
  ctx: QueryCtx,
  manufacturer: Doc<"manufacturers">,
  recommended: string | undefined,
): Promise<{ vars: TemplateVars; to?: string }> {
  const contacts = await ctx.db
    .query("manufacturerContacts")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .take(50);
  const recipient = await chooseRecipient(ctx, contacts, recommended);
  return {
    to: recipient?.email,
    vars: {
      firm: manufacturer.displayName ?? manufacturer.name,
      personalization: manufacturer.personalization?.sentence,
      mainProducts: manufacturer.mainProductsPhrase,
      address: recipient?.email,
      addressSourceUrl: recipient?.email
        ? recipient.sourceUrl
        : (recipient?.url ?? recipient?.sourceUrl),
    },
  };
}

/**
 * Drafts the first email from what research found. A draft nobody edited is
 * rendered again; one a person edited, approved or sent is left alone.
 */
export async function draftInitialEmail(
  ctx: MutationCtx,
  manufacturer: Doc<"manufacturers">,
  recommended?: string,
): Promise<Id<"outreachMessages"> | null> {
  const latest = await ctx.db
    .query("outreachMessages")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .order("desc")
    .first();
  if (
    latest &&
    latest.step === "initial" &&
    (latest.edited || latest.status === "approved" || latest.status === "sent")
  ) {
    return null;
  }
  const variant = emailVariantFor(manufacturer);
  const { vars, to } = await templateVarsFor(ctx, manufacturer, recommended);
  const email = renderInitialEmail(variant, vars, await getSender(ctx));
  const open =
    latest && latest.step === "initial" && latest.status === "draft"
      ? latest
      : undefined;
  const now = Date.now();
  const fields = {
    variant,
    vars,
    to,
    ...email,
    issues: await checkEmail(ctx, manufacturer._id, { ...email, to }),
    edited: false,
    updatedAt: now,
    ...(open && open.to === to ? {} : { toSetAt: now }),
  };
  if (open) {
    await ctx.db.patch("outreachMessages", open._id, fields);
    return open._id;
  }
  return await ctx.db.insert("outreachMessages", {
    manufacturerId: manufacturer._id,
    step: "initial",
    status: "draft",
    ...fields,
  });
}

/**
 * What the thank-you to `email` is rendered from: a claim link for that
 * address (the one already out while it has two weeks left), and the latest
 * document extracted from the norms.
 */
async function thanksVarsFor(
  ctx: MutationCtx,
  manufacturer: Doc<"manufacturers">,
  email: string,
  adminId: Id<"users">,
): Promise<TemplateVars> {
  const link = await createClaimLink(ctx, {
    manufacturerId: manufacturer._id,
    email,
    createdBy: adminId,
  });
  const normImports = await ctx.db
    .query("normImports")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .order("desc")
    .take(20);
  const extracted = normImports.find(
    (normImport) => normImport.status === "review",
  );
  return {
    firm: manufacturer.displayName ?? manufacturer.name,
    address: email,
    thanks: {
      claimEmail: email,
      claimUrl: link.url ?? undefined,
      claimExpiresAt: link.expiresAt,
      articles: extracted?.articles.length,
      variants: extracted?.articles.reduce(
        (sum, article) => sum + article.variantCodes.length,
        0,
      ),
      consentRecorded: extracted?.consent !== undefined,
    },
  };
}

/** Whether the person at `email` may get a claim link to the profile. */
async function canGetClaimLink(
  ctx: QueryCtx,
  manufacturer: Doc<"manufacturers">,
  email: string,
) {
  return (
    isEmail(email) &&
    manufacturer.status !== "excluded" &&
    manufacturer.claimStatus !== "claimed" &&
    !(await isSuppressed(ctx, email))
  );
}

/**
 * Drafts the thank-you to the person who sent the manufacturer's norms, with
 * a claim link for their address. An open thank-you is rendered again for
 * this address. Nobody on the suppression list gets a link, and a profile
 * already claimed needs none.
 */
export async function draftThanksEmail(
  ctx: MutationCtx,
  manufacturer: Doc<"manufacturers">,
  to: string,
  adminId: Id<"users">,
): Promise<Id<"outreachMessages">> {
  const email = normalizeEmail(to);
  if (!isEmail(email)) {
    throw new ConvexError({ code: "invalid" });
  }
  if (manufacturer.claimStatus === "claimed") {
    throw new ConvexError({ code: "already_claimed" });
  }
  if (!(await canGetClaimLink(ctx, manufacturer, email))) {
    throw new ConvexError({ code: "suppressed" });
  }
  const vars = await thanksVarsFor(ctx, manufacturer, email, adminId);
  const rendered = renderThanksEmail(vars, await getSender(ctx));
  const fields = {
    to: email,
    vars,
    ...rendered,
    issues: await checkEmail(ctx, manufacturer._id, {
      ...rendered,
      to: email,
      step: "thanks",
      vars,
    }),
    status: "draft" as const,
    edited: false,
    approvedBy: undefined,
    approvedAt: undefined,
    updatedAt: Date.now(),
  };
  const messages = await ctx.db
    .query("outreachMessages")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .order("desc")
    .take(50);
  const open = messages.find(
    (message) =>
      message.step === "thanks" &&
      (message.status === "draft" || message.status === "approved"),
  );
  if (open) {
    await ctx.db.patch("outreachMessages", open._id, {
      ...fields,
      ...(open.to === email ? {} : { toSetAt: fields.updatedAt }),
    });
    return open._id;
  }
  return await ctx.db.insert("outreachMessages", {
    manufacturerId: manufacturer._id,
    step: "thanks",
    ...fields,
    toSetAt: fields.updatedAt,
  });
}

/**
 * Points a first email or follow-up nobody edited at the next contact, after
 * its recipient's address was erased (ADR 0043), and renders it again. It
 * goes back to draft, since the new recipient wasn't approved.
 */
export async function redirectDraft(
  ctx: MutationCtx,
  manufacturer: Doc<"manufacturers">,
  message: Doc<"outreachMessages">,
) {
  const { vars, to } = await templateVarsFor(ctx, manufacturer, undefined);
  const email = renderInitialEmail(
    message.variant ?? emailVariantFor(manufacturer),
    vars,
    await getSender(ctx),
  );
  const now = Date.now();
  await ctx.db.patch("outreachMessages", message._id, {
    ...email,
    vars,
    to,
    toSetAt: now,
    issues: await checkEmail(ctx, manufacturer._id, {
      ...email,
      to,
      step: message.step,
      vars,
    }),
    status: "draft",
    approvedBy: undefined,
    approvedAt: undefined,
    updatedAt: now,
  });
}

/**
 * Renders a draft again from its saved values and the current signature. A
 * thank-you also gets a claim link for its recipient as it now stands, from
 * `adminId`; without one it keeps the link it has.
 */
export async function rerenderDraft(
  ctx: MutationCtx,
  message: Doc<"outreachMessages">,
  adminId?: Id<"users">,
) {
  const sender = await getSender(ctx);
  let vars = message.vars;
  let email: { subject: string; body: string };
  if (message.step === "thanks") {
    const manufacturer = await ctx.db.get(
      "manufacturers",
      message.manufacturerId,
    );
    const to = message.to ? normalizeEmail(message.to) : undefined;
    if (
      adminId &&
      manufacturer &&
      to &&
      (await canGetClaimLink(ctx, manufacturer, to))
    ) {
      vars = await thanksVarsFor(ctx, manufacturer, to, adminId);
    }
    email = renderThanksEmail(vars, sender);
  } else {
    email = renderInitialEmail(
      message.variant ?? "A",
      { ...vars, address: message.to ?? vars.address },
      sender,
    );
  }
  await ctx.db.patch("outreachMessages", message._id, {
    ...email,
    vars,
    issues: await checkEmail(ctx, message.manufacturerId, {
      ...email,
      to: message.to,
      step: message.step,
      vars,
    }),
    edited: false,
    updatedAt: Date.now(),
  });
}

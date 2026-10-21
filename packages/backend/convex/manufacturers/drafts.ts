import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isSuppressed } from "./admin";
import {
  type EmailIssue,
  type EmailVariant,
  lintEmail,
  renderInitialEmail,
  type Sender,
  type TemplateVars,
} from "./lib/emailTemplate";
import {
  emailDomain,
  isEmail,
  normalizeEmail,
  onCompanyDomain,
} from "./lib/text";

export async function getSender(ctx: QueryCtx): Promise<Sender> {
  const settings = await ctx.db.query("outreachSettings").first();
  return {
    firstName: settings?.firstName,
    lastName: settings?.lastName,
    phone: settings?.phone,
    privacyUrl: settings?.privacyUrl,
  };
}

/**
 * The outreach rules, the suppression list, and what research knows about
 * the recipient: whether the address was read on a page (or added by a
 * person) and whether it is on the manufacturer's own domain.
 */
export async function checkEmail(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
  email: { subject: string; body: string; to?: string },
): Promise<EmailIssue[]> {
  const issues = lintEmail(email);
  if (!email.to || !isEmail(email.to)) {
    return issues;
  }
  const to = normalizeEmail(email.to);
  if (await isSuppressed(ctx, to)) {
    issues.push({ code: "suppressed_recipient", level: "error", detail: to });
  }
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
  const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
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
  const fields = {
    variant,
    vars,
    to,
    ...email,
    issues: await checkEmail(ctx, manufacturer._id, { ...email, to }),
    edited: false,
    updatedAt: Date.now(),
  };
  if (latest && latest.step === "initial" && latest.status === "draft") {
    await ctx.db.patch("outreachMessages", latest._id, fields);
    return latest._id;
  }
  return await ctx.db.insert("outreachMessages", {
    manufacturerId: manufacturer._id,
    step: "initial",
    status: "draft",
    ...fields,
  });
}

/** Renders a draft again from its saved values and the current signature. */
export async function rerenderDraft(
  ctx: MutationCtx,
  message: Doc<"outreachMessages">,
) {
  const email = renderInitialEmail(
    message.variant,
    { ...message.vars, address: message.to ?? message.vars.address },
    await getSender(ctx),
  );
  await ctx.db.patch("outreachMessages", message._id, {
    ...email,
    issues: await checkEmail(ctx, message.manufacturerId, {
      ...email,
      to: message.to,
    }),
    edited: false,
    updatedAt: Date.now(),
  });
}

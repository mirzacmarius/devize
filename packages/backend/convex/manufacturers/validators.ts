import { v } from "convex/values";
import { aiConfidence } from "../ai/validators";

// Where a Producător is in the outreach pipeline. A research job in progress
// is not a status: it is the manufacturer's queued or running aiJobs row.
export const manufacturerStatus = v.union(
  v.literal("new"),
  v.literal("review"),
  v.literal("approved"),
  v.literal("contacted"),
  v.literal("replied"),
  v.literal("norms_received"),
  v.literal("declined"),
  v.literal("excluded"),
);

export const normsStatus = v.union(
  v.literal("unknown"),
  v.literal("existing"),
  v.literal("none_found"),
  v.literal("received"),
);

export const contactKind = v.union(
  v.literal("generic"),
  v.literal("department"),
  v.literal("person"),
  v.literal("form"),
);

export const existingNorm = v.object({
  title: v.string(),
  edition: v.optional(v.string()),
  author: v.optional(v.string()),
  url: v.string(),
  kind: v.union(
    v.literal("public_pdf"),
    v.literal("deviz_software"),
    v.literal("article"),
  ),
});

export const technicalDoc = v.object({
  title: v.string(),
  url: v.string(),
});

export const declaredConsumption = v.object({
  product: v.string(),
  value: v.string(),
  unit: v.string(),
  sourceUrl: v.string(),
});

export const personalization = v.object({
  sentence: v.string(),
  sourceUrl: v.optional(v.string()),
});

// "thanks" answers the norms a manufacturer sent, with a claim link.
export const messageStep = v.union(
  v.literal("initial"),
  v.literal("followup_1"),
  v.literal("followup_2"),
  v.literal("thanks"),
);

export const messageStatus = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("sent"),
);

// Why a person's address was erased (ADR 0043): the firm didn't answer within
// 175 days of the last email, nobody wrote to it within 25 days of finding it,
// the person asked us to stop, or the firm was excluded.
export const erasureRule = v.union(
  v.literal("no_answer"),
  v.literal("not_written"),
  v.literal("opt_out"),
  v.literal("excluded"),
);

// A: the manufacturer already has norms. B: we found none.
export const emailVariant = v.union(v.literal("A"), v.literal("B"));

// What the thank-you email adds once a manufacturer sent its norms: the claim
// link for the address they came from, and the latest document we extracted.
export const thanksVars = v.object({
  claimEmail: v.string(),
  // Missing when the app's SITE_URL isn't set; the placeholder left in the
  // email then blocks approval.
  claimUrl: v.optional(v.string()),
  claimExpiresAt: v.optional(v.number()),
  articles: v.optional(v.number()),
  variants: v.optional(v.number()),
  // Their written agreement to publish is already recorded on the document.
  consentRecorded: v.boolean(),
});

// What the email template is rendered from. Kept on the message so a draft can
// be rendered again after the sender's details change.
export const templateVars = v.object({
  firm: v.string(),
  personalization: v.optional(v.string()),
  mainProducts: v.optional(v.string()),
  address: v.optional(v.string()),
  addressSourceUrl: v.optional(v.string()),
  thanks: v.optional(thanksVars),
});

// Problems found in a draft or an extracted norm. The interface translates
// `code`; `detail` carries the values (a phrase, a count, two totals).
export const issue = v.object({
  code: v.string(),
  level: v.union(v.literal("error"), v.literal("warning"), v.literal("info")),
  detail: v.optional(v.string()),
});

export const resourceKind = v.union(
  v.literal("material"),
  v.literal("labor"),
  v.literal("equipment"),
  v.literal("transport"),
);

export const normResource = v.object({
  kind: resourceKind,
  name: v.string(),
  unit: v.string(),
  unitRaw: v.string(),
  quantity: v.number(),
  unitPrice: v.optional(v.number()),
});

export const normImportStatus = v.union(
  v.literal("queued"),
  v.literal("extracting"),
  v.literal("review"),
  v.literal("failed"),
);

export const normImportArticle = v.object({
  baseCode: v.string(),
  title: v.string(),
  unit: v.string(),
  variantCodes: v.array(v.string()),
  pages: v.array(v.number()),
});

export const importedNormStatus = v.union(
  v.literal("review"),
  v.literal("approved"),
  v.literal("rejected"),
);

// A Producător's written agreement to Devize publishing the norms in one
// document, as a super admin recorded it. Norms are published only with it.
export const normConsent = v.object({
  // Who agreed, when and where the agreement is, in the admin's words.
  note: v.string(),
  recordedBy: v.id("users"),
  recordedAt: v.number(),
});

// The agreement of a document deleted after some of its norms reached the
// catalog, kept as proof that they were published with it.
export const keptConsent = v.object({
  ...normConsent.fields,
  fileName: v.string(),
  edition: v.optional(v.string()),
  // When the document itself was deleted.
  deletedAt: v.number(),
});

// What manufacturer research returns, after the action checked its sources.
export const researchFindings = v.object({
  displayName: v.string(),
  website: v.optional(v.string()),
  legalName: v.optional(v.string()),
  cui: v.optional(v.string()),
  brands: v.array(v.string()),
  categories: v.array(v.string()),
  mainProducts: v.array(v.string()),
  retailers: v.array(v.string()),
  contacts: v.array(
    v.object({
      kind: contactKind,
      email: v.optional(v.string()),
      url: v.optional(v.string()),
      role: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
      sourceVerified: v.boolean(),
    }),
  ),
  existingNorms: v.array(existingNorm),
  technicalDocs: v.array(technicalDoc),
  declaredConsumption: v.array(declaredConsumption),
  personalization: v.optional(personalization),
  mainProductsPhrase: v.optional(v.string()),
  recommendedEmail: v.optional(v.string()),
  confidence: aiConfidence,
  needsReview: v.optional(v.string()),
});

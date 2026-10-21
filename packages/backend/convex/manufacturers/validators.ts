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

export const messageStep = v.union(
  v.literal("initial"),
  v.literal("followup_1"),
  v.literal("followup_2"),
);

export const messageStatus = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("sent"),
);

// A: the manufacturer already has norms. B: we found none.
export const emailVariant = v.union(v.literal("A"), v.literal("B"));

// What the email template is rendered from. Kept on the message so a draft can
// be rendered again after the sender's details change.
export const templateVars = v.object({
  firm: v.string(),
  personalization: v.optional(v.string()),
  mainProducts: v.optional(v.string()),
  address: v.optional(v.string()),
  addressSourceUrl: v.optional(v.string()),
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

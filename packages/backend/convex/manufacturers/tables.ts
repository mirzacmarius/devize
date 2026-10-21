import { defineTable } from "convex/server";
import { v } from "convex/values";
import { aiConfidence } from "../ai/validators";
import {
  contactKind,
  declaredConsumption,
  emailVariant,
  existingNorm,
  importedNormStatus,
  issue,
  manufacturerStatus,
  messageStatus,
  messageStep,
  normConsent,
  normImportArticle,
  normImportStatus,
  normResource,
  normsStatus,
  personalization,
  technicalDoc,
  templateVars,
} from "./validators";

export const manufacturerTables = {
  // The one Producător entity. Devize creates it before the manufacturer has
  // an account; it links to an organization once they claim it.
  manufacturers: defineTable({
    name: v.string(),
    // Lower case, without diacritics or legal suffixes, to catch duplicates.
    nameKey: v.string(),
    wave: v.number(),
    // What we knew before researching, from the outreach list.
    hints: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: manufacturerStatus,
    normsStatus: normsStatus,
    claimStatus: v.union(v.literal("unclaimed"), v.literal("claimed")),
    website: v.optional(v.string()),
    legalName: v.optional(v.string()),
    cui: v.optional(v.string()),
    brands: v.array(v.string()),
    categories: v.array(v.string()),
    mainProducts: v.array(v.string()),
    retailers: v.array(v.string()),
    existingNorms: v.array(existingNorm),
    technicalDocs: v.array(technicalDoc),
    declaredConsumption: v.array(declaredConsumption),
    // Set by the last research job; its report and sources stay on the job.
    displayName: v.optional(v.string()),
    personalization: v.optional(personalization),
    mainProductsPhrase: v.optional(v.string()),
    confidence: v.optional(aiConfidence),
    needsReview: v.optional(v.string()),
    researchedAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_nameKey", ["nameKey"])
    .index("by_status", ["status"]),

  // Only addresses published on the manufacturer's own site, each with the
  // page it was found on. A "person" address is personal data under GDPR.
  manufacturerContacts: defineTable({
    manufacturerId: v.id("manufacturers"),
    kind: contactKind,
    email: v.optional(v.string()),
    // The contact form, for kind "form".
    url: v.optional(v.string()),
    role: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    // The source page came back from a web search or fetch during research,
    // rather than only from the model's answer.
    sourceVerified: v.boolean(),
    origin: v.union(v.literal("research"), v.literal("manual")),
  })
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_email", ["email"]),

  // Emails to manufacturers. Devize never sends one by itself: a super admin
  // approves each draft and sends it from their own mailbox.
  outreachMessages: defineTable({
    manufacturerId: v.id("manufacturers"),
    step: messageStep,
    // Which first email it is; the thank-you has none.
    variant: v.optional(emailVariant),
    status: messageStatus,
    to: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    vars: templateVars,
    issues: v.array(issue),
    // A person changed the text after it was rendered from the template.
    edited: v.boolean(),
    updatedAt: v.number(),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    sentBy: v.optional(v.id("users")),
    sentAt: v.optional(v.number()),
  })
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_status", ["status"]),

  // The sender's details for the email signature, one row.
  outreachSettings: defineTable({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    privacyUrl: v.optional(v.string()),
    updatedBy: v.id("users"),
  }),

  // Addresses and domains that asked not to be contacted again. Kept for good.
  suppressionList: defineTable({
    // A lower-case address, or "@domain.ro" for a whole domain.
    value: v.string(),
    reason: v.optional(v.string()),
    manufacturerId: v.optional(v.id("manufacturers")),
    addedBy: v.id("users"),
  }).index("by_value", ["value"]),

  // A norms document a manufacturer sent us, and how far its extraction got.
  normImports: defineTable({
    manufacturerId: v.id("manufacturers"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    status: normImportStatus,
    edition: v.optional(v.string()),
    laborRate: v.optional(v.number()),
    consent: v.optional(normConsent),
    // The document's table of contents, from the first pass.
    articles: v.array(normImportArticle),
    articlesDone: v.number(),
    error: v.optional(v.string()),
    createdBy: v.id("users"),
  }).index("by_manufacturerId", ["manufacturerId"]),

  // One Normă per row, as extracted from a normImports document (IZF117A01
  // belongs to the article IZF117). A super admin approves them article by
  // article before they can go into the catalog.
  importedNorms: defineTable({
    normImportId: v.id("normImports"),
    manufacturerId: v.id("manufacturers"),
    baseCode: v.string(),
    code: v.string(),
    title: v.string(),
    unit: v.string(),
    unitRaw: v.string(),
    pages: v.array(v.number()),
    includes: v.optional(v.string()),
    excludes: v.optional(v.string()),
    resources: v.array(normResource),
    totalLaborHours: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    checks: v.array(issue),
    status: importedNormStatus,
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_normImportId_and_baseCode", ["normImportId", "baseCode"])
    .index("by_manufacturerId_and_code", ["manufacturerId", "code"]),
};

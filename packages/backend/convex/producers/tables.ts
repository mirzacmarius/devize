import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  anafRecord,
  claimMethod,
  claimStatus,
  datasheetCondition,
  datasheetStatus,
  removalStatus,
} from "./validators";

export const producerTables = {
  // Someone taking over a Producător's profile for the producer's own firm.
  // A claim by link or by domain is approved on the spot; a manual one waits
  // for a super admin. Kept after the decision, as the record of who claimed
  // the profile and how.
  manufacturerClaims: defineTable({
    manufacturerId: v.id("manufacturers"),
    method: claimMethod,
    status: claimStatus,
    userId: v.id("users"),
    // The verified address they were signed in with, lowercase.
    email: v.string(),
    // Who they are at the producer, for a manual claim.
    message: v.optional(v.string()),
    // The producer's CUI as they gave it, checked with ANAF.
    cui: v.optional(v.string()),
    anaf: v.optional(anafRecord),
    // A firm of theirs to link to the profile instead of a new one. Once
    // approved, the firm that holds the profile.
    organizationId: v.optional(v.id("organizations")),
    decidedBy: v.optional(v.id("users")),
    decidedAt: v.optional(v.number()),
    // Why a super admin turned it down, shown to the person.
    reason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_userId", ["userId"]),

  // A link that lets one person claim a profile. Devize writes it into the
  // thank-you email to the address that sent the norms; only someone signed
  // in with that address can use it, once, within 30 days.
  claimLinks: defineTable({
    manufacturerId: v.id("manufacturers"),
    // Lowercase, as people sign in with it.
    email: v.string(),
    // The secret part of the link.
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.id("users"),
    usedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_manufacturerId", ["manufacturerId"]),

  // Email domains that belong to a Producător, typed by a super admin, never
  // taken from research. A verified address on one claims the profile without
  // waiting for review. Each domain belongs to one producer.
  manufacturerDomains: defineTable({
    manufacturerId: v.id("manufacturers"),
    // Lowercase, without "@", e.g. "producator.ro".
    domain: v.string(),
    addedBy: v.id("users"),
  })
    .index("by_domain", ["domain"])
    .index("by_manufacturerId", ["manufacturerId"]),

  // Someone asking Devize to take a profile it created down. A super admin
  // decides; removing hides the profile and withdraws its norms.
  removalRequests: defineTable({
    manufacturerId: v.id("manufacturers"),
    userId: v.id("users"),
    email: v.optional(v.string()),
    message: v.string(),
    status: removalStatus,
    decidedBy: v.optional(v.id("users")),
    decidedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_userId", ["userId"]),

  // What a Producător says about itself on its claimed profile: a few words,
  // its site, and whom contractors ask about its norms. Its own firm's owners
  // and admins write it; it goes when the firm lets the profile go.
  producerDetails: defineTable({
    manufacturerId: v.id("manufacturers"),
    about: v.optional(v.string()),
    website: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_manufacturerId", ["manufacturerId"]),

  // A technical data sheet the producer's firm uploaded for Devize AI to read
  // into a draft Normă de producător, each figure with the page it comes
  // from. The draft is the producer's to check, correct and send for review;
  // the row keeps what the norm's page shows about where it came from.
  datasheetImports: defineTable({
    manufacturerId: v.id("manufacturers"),
    // The producer's firm, which owns the file and pays for the reading.
    organizationId: v.id("organizations"),
    fileId: v.id("files"),
    // The work the norm should describe, as the producer put it.
    work: v.optional(v.string()),
    aiJobId: v.id("aiJobs"),
    // While reading, the job's own status says whether it failed.
    status: datasheetStatus,
    error: v.optional(v.string()),
    normId: v.optional(v.id("norms")),
    product: v.optional(
      v.object({ name: v.string(), packaging: v.optional(v.string()) }),
    ),
    conditions: v.optional(v.array(datasheetCondition)),
    // What the AI says the producer should check before sending the norm.
    checks: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
  })
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_fileId", ["fileId"]),
};

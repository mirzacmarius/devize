import { defineTable } from "convex/server";
import { v } from "convex/values";
import { aiConfidence } from "../ai/validators";
import { store } from "../prices/validators";
import {
  amountsByKind,
  estimateKind,
  estimateStatus,
  lineItemOrigin,
  lineItemResource,
  markups,
  offerStatus,
  priceSource,
  recap,
  sectionKind,
  takeoffMethod,
  takeoffRow,
  variantTier,
} from "./validators";

export const estimateTables = {
  // A Deviz. Its line items keep their own copies of norms and prices, and
  // `totals` caches its Recapitulație for lists.
  estimates: defineTable({
    organizationId: v.id("organizations"),
    // Numbered per firm: 1, 2, 3...
    number: v.number(),
    title: v.string(),
    // The number and title, normalized, for full-text search.
    searchText: v.string(),
    description: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    siteAddress: v.optional(v.string()),
    county: v.optional(v.string()),
    kind: estimateKind,
    status: estimateStatus,
    // The day prices are taken at, as YYYY-MM-DD.
    priceDate: v.string(),
    markups: markups,
    // The retailer whose prices come first.
    preferredStore: v.optional(store),
    // For a Licitație: the contracting authority, the SEAP procedure and the
    // deadline (YYYY-MM-DD).
    tender: v.optional(
      v.object({
        authority: v.optional(v.string()),
        procedure: v.optional(v.string()),
        deadline: v.optional(v.string()),
      }),
    ),
    totals: recap,
    // A sent Deviz is read-only; changing it means a new revision.
    lockedAt: v.optional(v.number()),
    revisionOf: v.optional(v.id("estimates")),
    revision: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_organizationId_and_updatedAt", ["organizationId", "updatedAt"])
    .index("by_organizationId_and_number", ["organizationId", "number"])
    .index("by_organizationId_and_status_and_updatedAt", [
      "organizationId",
      "status",
      "updatedAt",
    ])
    // For the daily price check of sent devize, across firms.
    .index("by_status_and_updatedAt", ["status", "updatedAt"])
    .index("by_clientId", ["clientId"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: ["organizationId"],
    }),

  // Obiecte and Capitole. A chapter can sit inside an object.
  sections: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    kind: sectionKind,
    parentId: v.optional(v.id("sections")),
    code: v.optional(v.string()),
    name: v.string(),
    position: v.number(),
  }).index("by_estimateId_and_position", ["estimateId", "position"]),

  // Articole de deviz.
  lineItems: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    sectionId: v.optional(v.id("sections")),
    // Orders the items within their section.
    position: v.number(),
    origin: lineItemOrigin,
    // The norm version the item was copied from.
    normId: v.optional(v.id("norms")),
    code: v.string(),
    title: v.string(),
    unit: v.string(),
    quantity: v.number(),
    resources: v.array(lineItemResource),
    // Lei per unit, rounded to bani for each kind of resource.
    unitCost: amountsByKind,
    laborHours: v.number(),
    notes: v.optional(v.string()),
    // Set on items an AI proposed, until a person confirms them.
    confidence: v.optional(aiConfidence),
    aiJobId: v.optional(v.id("aiJobs")),
    // The tender's own position number, code and text, kept for the forms.
    tenderRef: v.optional(
      v.object({
        position: v.string(),
        code: v.optional(v.string()),
        text: v.optional(v.string()),
      }),
    ),
    updatedAt: v.number(),
  })
    .index("by_estimateId_and_position", ["estimateId", "position"])
    .index("by_sectionId_and_position", ["sectionId", "position"])
    .index("by_normId", ["normId"]),

  // Antemăsurători: the measurements behind a line item's quantity.
  takeoffs: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    lineItemId: v.optional(v.id("lineItems")),
    method: takeoffMethod,
    title: v.optional(v.string()),
    unit: v.string(),
    rows: v.array(takeoffRow),
    total: v.number(),
    fileId: v.optional(v.id("_storage")),
    aiJobId: v.optional(v.id("aiJobs")),
    confidence: v.optional(aiConfidence),
    createdBy: v.id("users"),
  })
    .index("by_estimateId", ["estimateId"])
    .index("by_lineItemId", ["lineItemId"]),

  // Variante: the same Deviz with some products swapped, such as economy,
  // standard and premium.
  variants: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    name: v.string(),
    tier: v.optional(variantTier),
    position: v.number(),
    swaps: v.array(
      v.object({
        lineItemId: v.id("lineItems"),
        // The `key` of the line item resource it replaces.
        resourceKey: v.string(),
        productId: v.optional(v.id("products")),
        resourceId: v.optional(v.id("resources")),
        name: v.string(),
        unitPrice: v.number(),
        priceSource: priceSource,
      }),
    ),
    totals: recap,
  }).index("by_estimateId_and_position", ["estimateId", "position"]),

  // Oferte: the secure link a client opens to read, accept and sign a Deviz.
  offers: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    // The secret in the client's link.
    token: v.string(),
    status: offerStatus,
    message: v.optional(v.string()),
    variantIds: v.array(v.id("variants")),
    expiresAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    acceptedVariantId: v.optional(v.id("variants")),
    signature: v.optional(
      v.object({
        name: v.string(),
        signedAt: v.number(),
        imageId: v.optional(v.id("_storage")),
      }),
    ),
    depositPercent: v.optional(v.number()),
    depositPaidAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_token", ["token"])
    .index("by_estimateId", ["estimateId"]),
};

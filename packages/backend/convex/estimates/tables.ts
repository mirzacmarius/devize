import { defineTable } from "convex/server";
import { v } from "convex/values";
import { aiConfidence } from "../ai/validators";
import { lineItemLayout } from "../materials/validators";
import { store } from "../prices/validators";
import {
  amountsByKind,
  estimateKind,
  estimateStatus,
  lineItemOrigin,
  lineItemResource,
  markups,
  priceSource,
  recap,
  roomMeasure,
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
    // In a revision, the item of the first revision this one descends from,
    // so Comparare revizii pairs it with its earlier self.
    originId: v.optional(v.id("lineItems")),
    code: v.string(),
    title: v.string(),
    unit: v.string(),
    quantity: v.number(),
    resources: v.array(lineItemResource),
    // Lei per unit, rounded to bani for each kind of resource.
    unitCost: amountsByKind,
    laborHours: v.number(),
    notes: v.optional(v.string()),
    // How its covering is laid (Mod de montaj), when not as the norm has it;
    // the consumptions already include the method's losses.
    layout: v.optional(lineItemLayout),
    // Set on items an AI proposed, until a person confirms them.
    confidence: v.optional(aiConfidence),
    aiJobId: v.optional(v.id("aiJobs")),
    // The tender's own position number, code and text, kept for the forms.
    // unit and quantity are the contracting authority's U.M. and quantity as
    // the tender writes them, before any conversion, while the line's own
    // quantity is in the norm's unit (2,432 for 243,2 mp on a "100 mp"
    // norm). An import sets both or neither; the factor between the two
    // quantities is never stored.
    tenderRef: v.optional(
      v.object({
        position: v.string(),
        code: v.optional(v.string()),
        text: v.optional(v.string()),
        unit: v.optional(v.string()),
        quantity: v.optional(v.number()),
      }),
    ),
    updatedAt: v.number(),
  })
    .index("by_estimateId_and_position", ["estimateId", "position"])
    .index("by_sectionId_and_position", ["sectionId", "position"])
    .index("by_normId", ["normId"]),

  // Antemăsurători: the measurements behind a line item's quantity. The
  // rows are in metres and pieces; `total` is in the line item's unit, so a
  // "100 mp" item measures 2,432 for 243,2 mp of rows. A line item's
  // quantity follows the sum of its takeoffs (takeoffs/takeoffs.ts).
  takeoffs: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    lineItemId: v.optional(v.id("lineItems")),
    method: takeoffMethod,
    title: v.optional(v.string()),
    unit: v.string(),
    rows: v.array(takeoffRow),
    total: v.number(),
    // Generated from the Deviz's Camere: which measure of which rooms. Its
    // rows are written again whenever one of the rooms changes.
    rooms: v.optional(
      v.object({ measure: roomMeasure, roomIds: v.array(v.id("rooms")) }),
    ),
    fileId: v.optional(v.id("_storage")),
    aiJobId: v.optional(v.id("aiJobs")),
    confidence: v.optional(aiConfidence),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
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
    // What the client gets in this Variantă, in their words.
    description: v.optional(v.string()),
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
    // Not kept: a Variantă is priced when it's read (offers/choice.ts), since
    // editing the Deviz's line items changes what it costs.
    totals: v.optional(recap),
  }).index("by_estimateId_and_position", ["estimateId", "position"]),
};

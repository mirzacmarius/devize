import { defineTable } from "convex/server";
import { v } from "convex/values";
import { catalogStatus } from "../catalog/validators";
import { workContext } from "./validators";

export const systemTables = {
  // A Producător's products and norms that work together, such as a floor
  // system with its primer, adhesive and grout, and where the producer says
  // it belongs. A firm that uses one of them is offered the rest.
  systems: defineTable({
    manufacturerId: v.id("manufacturers"),
    name: v.string(),
    description: v.optional(v.string()),
    // The norms by their first version, so a newer one stays in the system.
    normLineageIds: v.array(v.id("norms")),
    productIds: v.array(v.id("products")),
    suitable: v.array(workContext),
    unsuitable: v.array(workContext),
    status: catalogStatus,
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_status", ["status"]),

  // Findings of the compatibility check a firm said it knows about, for all
  // the revisions of a Deviz, which share its number.
  compatibilityDismissals: defineTable({
    organizationId: v.id("organizations"),
    number: v.number(),
    key: v.string(),
    dismissedBy: v.id("users"),
    dismissedAt: v.number(),
  }).index("by_organizationId_and_number_and_key", [
    "organizationId",
    "number",
    "key",
  ]),
};

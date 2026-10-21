import { defineTable } from "convex/server";
import { v } from "convex/values";
import { recap } from "../estimates/validators";
import { offerStatus, optionalItem } from "./validators";

export const offerTables = {
  // Oferte: the secure link a client opens, without an account, to read a
  // Deviz, choose between its Variante and optional works, ask questions,
  // and accept and sign it or decline it. See docs/adr/0016.
  offers: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    // The secret in the client's link.
    token: v.string(),
    status: offerStatus,
    message: v.optional(v.string()),
    variantIds: v.array(v.id("variants")),
    // What the Deviz as built is called next to its Variante: "Standard".
    baseLabel: v.optional(v.string()),
    optionalItems: v.array(optionalItem),
    // Whether the AI assistant answers the client's questions on the link.
    assistant: v.boolean(),
    expiresAt: v.optional(v.number()),
    sentAt: v.number(),
    // The client's first visit, their last, and how many there were; a page
    // opened again within half an hour is the same visit.
    viewedAt: v.optional(v.number()),
    lastViewedAt: v.optional(v.number()),
    viewCount: v.number(),
    // What the client is looking at: a Variantă, the optional works left
    // out, and the Recapitulație they give, always computed on the server.
    // Frozen once the client decides, so it records what they accepted.
    choice: v.optional(
      v.object({
        variantId: v.optional(v.id("variants")),
        excludedItemIds: v.array(v.id("lineItems")),
        totals: recap,
        updatedAt: v.number(),
      }),
    ),
    decidedAt: v.optional(v.number()),
    acceptedVariantId: v.optional(v.id("variants")),
    signature: v.optional(
      v.object({
        name: v.string(),
        signedAt: v.number(),
        imageId: v.optional(v.id("_storage")),
        // The signature as drawn: SVG path data in a 600 × 200 box.
        path: v.optional(v.string()),
      }),
    ),
    declineReason: v.optional(v.string()),
    // The link of a newer revision of the Deviz, which this one leads to.
    replacedBy: v.optional(v.id("offers")),
    depositPercent: v.optional(v.number()),
    depositPaidAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_token", ["token"])
    .index("by_estimateId", ["estimateId"]),
};

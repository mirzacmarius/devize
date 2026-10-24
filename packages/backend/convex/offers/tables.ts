import { defineTable } from "convex/server";
import { v } from "convex/values";
import { recap } from "../estimates/validators";
import {
  offerStatus,
  optionalItem,
  paymentStage,
  questionStatus,
  signatureEvidence,
} from "./validators";

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
    // Whether the link shows the price in EUR too, at BNR's rate of the day.
    showEur: v.optional(v.boolean()),
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
        // SHA-256, in hex, of what was accepted: the works, the prices, the
        // payment stages and the signer. The signed copy prints it.
        contentHash: v.optional(v.string()),
        evidence: v.optional(signatureEvidence),
        // A consumer asked for the works to begin within the 14 days in
        // which they may withdraw (OUG 34/2014, art. 8).
        earlyStart: v.optional(v.boolean()),
      }),
    ),
    declineReason: v.optional(v.string()),
    // The link of a newer revision of the Deviz, which this one leads to.
    replacedBy: v.optional(v.id("offers")),
    // How the price is paid, stage by stage; `depositPercent` is the share
    // due at signing, kept for the pages that show one figure.
    paymentSchedule: v.optional(v.array(paymentStage)),
    depositPercent: v.optional(v.number()),
    depositPaidAt: v.optional(v.number()),
    // The client is a consumer, a person rather than a firm: the link shows
    // their rights under OUG 34/2014 and the withdrawal form, and accepting
    // is confirmed to them by email.
    consumer: v.optional(v.boolean()),
    // The confirmation of the accepted Ofertă emailed to the client.
    confirmation: v.optional(
      v.object({ email: v.string(), sentAt: v.number() }),
    ),
    createdBy: v.id("users"),
  })
    .index("by_token", ["token"])
    .index("by_estimateId", ["estimateId"]),

  // What the client asks on the link, with the assistant's answer from the
  // Ofertă and the firm's own reply. See docs/adr/0019.
  offerQuestions: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    offerId: v.id("offers"),
    question: v.string(),
    // What the client was looking at when they asked, which the answer
    // talks about.
    choice: v.object({
      variantId: v.optional(v.id("variants")),
      excludedItemIds: v.array(v.id("lineItems")),
    }),
    status: questionStatus,
    answer: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
    aiJobId: v.optional(v.id("aiJobs")),
    reply: v.optional(v.string()),
    repliedBy: v.optional(v.id("users")),
    repliedAt: v.optional(v.number()),
  })
    .index("by_offerId", ["offerId"])
    .index("by_estimateId", ["estimateId"])
    .index("by_organizationId", ["organizationId"]),
};

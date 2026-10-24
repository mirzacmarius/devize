import { v } from "convex/values";

// Where an Ofertă stands. A link starts sent, becomes viewed when the client
// first opens it, and ends accepted or declined by the client, expired, or
// withdrawn by the firm (or replaced by a newer revision's link).
export const offerStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("expired"),
  v.literal("withdrawn"),
);

/** Works the client may add or leave out, and whether they start in. */
export const optionalItem = v.object({
  lineItemId: v.id("lineItems"),
  included: v.boolean(),
});

// Where a client's question stands: the assistant is answering it, it has
// an answer, or it waits for the firm, because the assistant is off or
// couldn't answer it from the Ofertă.
export const questionStatus = v.union(
  v.literal("answering"),
  v.literal("answered"),
  v.literal("waiting"),
);

// The client's choice as the page sends it: a Variantă, and the optional
// works left out.
export const choiceArgs = {
  variantId: v.optional(v.id("variants")),
  excludedItemIds: v.optional(v.array(v.id("lineItems"))),
};

// When a part of the price is due: at signing (the deposit), when the works
// start, with each Situație de lucrări, at the Recepție at the end of the
// works, or after it, with the Recepție finală.
export const paymentTrigger = v.union(
  v.literal("signing"),
  v.literal("start"),
  v.literal("statement"),
  v.literal("completion"),
  v.literal("final"),
);

// One part of the price and when it is due: a share of the total with VAT or
// a fixed sum in lei, never both. See docs/adr/0038.
export const paymentStage = v.object({
  stage: v.string(),
  percent: v.optional(v.number()),
  amount: v.optional(v.number()),
  trigger: paymentTrigger,
});

// What the browser said about itself when the client signed, and the address
// the page's server saw: evidence next to the name, the moment and the hash
// of what was signed.
export const signatureEvidence = v.object({
  userAgent: v.optional(v.string()),
  language: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  screen: v.optional(v.string()),
  address: v.optional(v.string()),
});

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

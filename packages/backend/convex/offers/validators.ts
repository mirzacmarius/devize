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

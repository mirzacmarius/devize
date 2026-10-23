import { v } from "convex/values";

// A door reaches the floor and is counted among the doors; a window doesn't
// reach the floor; another opening (a passage, a niche) reaches the floor
// but is neither.
export const openingKind = v.union(
  v.literal("door"),
  v.literal("window"),
  v.literal("other"),
);

/** An opening in a Cameră's walls, in metres: so many of width × height. */
export const roomOpening = v.object({
  kind: openingKind,
  label: v.optional(v.string()),
  count: v.number(),
  width: v.number(),
  height: v.number(),
});

import { v } from "convex/values";

// The four retailers of the MVP (docs/adr/0003).
export const store = v.union(
  v.literal("dedeman"),
  v.literal("leroy_merlin"),
  v.literal("hornbach"),
  v.literal("brico_depot"),
);

// Where a Listare's price comes from: a retailer, a Furnizor's price list, a
// quotation a firm received, or the firm's own price.
export const listingSource = v.union(
  v.literal("retailer"),
  v.literal("supplier"),
  v.literal("quote"),
  v.literal("own"),
);

export const listingStatus = v.union(
  v.literal("active"),
  v.literal("stale"),
  v.literal("unavailable"),
);

export const matchMethod = v.union(
  v.literal("ean"),
  v.literal("ai"),
  v.literal("manual"),
);

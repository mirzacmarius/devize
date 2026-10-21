import { v } from "convex/values";

// The four retailers of the MVP (docs/adr/0003). Brico Dépôt is BRICO now
// (see stores.ts); the key stays.
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

// How an on-demand read of a store's product page went: waiting for its turn,
// done, or why there is no price: robots.txt forbids the page, the store
// refused the read (or refused one recently), Devize's own daily limit, the
// page is gone, it shows no price, or the read failed otherwise.
export const readStatus = v.union(
  v.literal("pending"),
  v.literal("done"),
  v.literal("disallowed"),
  v.literal("blocked"),
  v.literal("limited"),
  v.literal("not_found"),
  v.literal("no_price"),
  v.literal("failed"),
);

// One resource of a Deviz whose price changed: lei without VAT per unit, its
// quantity in the whole Deviz, and what the change adds to the direct costs.
export const priceChange = v.object({
  name: v.string(),
  unit: v.string(),
  oldPrice: v.number(),
  newPrice: v.number(),
  quantity: v.number(),
  impact: v.number(),
});

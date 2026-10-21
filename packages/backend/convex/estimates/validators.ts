import { v } from "convex/values";
import { resourceKind } from "../manufacturers/validators";
import { store } from "../prices/validators";

// The cote added on top of a Deviz's direct costs, as percentages: CAM on
// labour, indirect costs on direct costs, profit on direct plus indirect
// costs, and VAT on the total.
export const markups = v.object({
  cam: v.number(),
  indirect: v.number(),
  profit: v.number(),
  vat: v.number(),
});

export const estimateKind = v.union(v.literal("private"), v.literal("tender"));

export const estimateStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("archived"),
);

// An Obiect (a building or network) or a Capitol (a kind of work).
export const sectionKind = v.union(v.literal("object"), v.literal("chapter"));

// How a line item's resource got its price: the firm's own rate or price, a
// Listare, the norm's reference price, a price typed on the line, or none.
export const priceSource = v.union(
  v.literal("own"),
  v.literal("listing"),
  v.literal("reference"),
  v.literal("manual"),
  v.literal("missing"),
);

export const lineItemOrigin = v.union(
  v.literal("norm"),
  v.literal("custom"),
  v.literal("ai"),
  v.literal("tender"),
  v.literal("copy"),
);

export const amountsByKind = v.object({
  material: v.number(),
  labor: v.number(),
  equipment: v.number(),
  transport: v.number(),
});

/**
 * One resource of a line item, copied from the norm with its price on the
 * Deviz's date, so later changes to either never alter the Deviz.
 */
export const lineItemResource = v.object({
  // Unique within the line item; variants use it to swap a product.
  key: v.string(),
  kind: resourceKind,
  resourceId: v.optional(v.id("resources")),
  productId: v.optional(v.id("products")),
  name: v.string(),
  unit: v.string(),
  // Consumption per unit of the line item, or a percentage of its materials
  // when the unit is "%".
  quantity: v.number(),
  // Lei without VAT per unit of the resource.
  unitPrice: v.number(),
  priceSource: priceSource,
  // The norm's own price, the fallback when repricing finds nothing better.
  referencePrice: v.optional(v.number()),
  listingId: v.optional(v.id("listings")),
  store: v.optional(store),
  // When the price was read or set, as a timestamp.
  pricedAt: v.optional(v.number()),
});

/** A Recapitulație, in lei rounded to bani. */
export const recap = v.object({
  material: v.number(),
  labor: v.number(),
  equipment: v.number(),
  transport: v.number(),
  cam: v.number(),
  direct: v.number(),
  indirect: v.number(),
  profit: v.number(),
  subtotal: v.number(),
  vat: v.number(),
  total: v.number(),
  laborHours: v.number(),
});

export const takeoffMethod = v.union(
  v.literal("manual"),
  v.literal("photo"),
  v.literal("plan"),
  v.literal("voice"),
);

/** One row of an Antemăsurătoare: count × length × width × height. */
export const takeoffRow = v.object({
  label: v.optional(v.string()),
  count: v.number(),
  length: v.optional(v.number()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  // Openings and other quantities to subtract.
  deduct: v.boolean(),
});

export const variantTier = v.union(
  v.literal("economy"),
  v.literal("standard"),
  v.literal("premium"),
);

export const offerStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("expired"),
  v.literal("withdrawn"),
);

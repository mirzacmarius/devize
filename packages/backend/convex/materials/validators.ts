import { v } from "convex/values";

// How a covering is laid (Mod de montaj), which sets how much of it is lost
// to cuts and how much longer the work takes. "straight" is the norm's own
// way; the others replace the norm's losses with their own (docs/adr/0027).
export const layoutMethod = v.union(
  v.literal("straight"),
  v.literal("offset"),
  v.literal("diagonal"),
  v.literal("herringbone"),
  v.literal("complex"),
);

/**
 * An Articol's Mod de montaj: the covering's losses in percent (15 means
 * 1,15 mp of tiles for each mp laid, per layer), the extra labour in percent
 * of the hours, and the consumptions as they were before the method changed
 * them, by resource key, so another method starts again from them.
 */
export const lineItemLayout = v.object({
  method: layoutMethod,
  waste: v.number(),
  labor: v.number(),
  base: v.array(v.object({ key: v.string(), quantity: v.number() })),
});

// What a material is sold in: a bag, a box, a roll... Its sizes are counted
// in the material's own unit.
export const packageKind = v.union(
  v.literal("bag"),
  v.literal("box"),
  v.literal("roll"),
  v.literal("bucket"),
  v.literal("can"),
  v.literal("pack"),
  v.literal("sheet"),
  v.literal("bar"),
  v.literal("cartridge"),
  v.literal("set"),
  v.literal("piece"),
);

import { v } from "convex/values";
import { resourceKind } from "../manufacturers/validators";

// Normă de bază (Devize's own catalog), Normă de producător, or a firm's own
// private norm.
export const normSource = v.union(
  v.literal("base"),
  v.literal("manufacturer"),
  v.literal("organization"),
);

// Public norms are seen by every firm once published; private ones only by the
// firm that wrote them.
export const visibility = v.union(v.literal("public"), v.literal("private"));

// A published norm never changes: an edit is a new version, and publishing it
// supersedes the old one, which stays for the devize that used it.
export const normStatus = v.union(
  v.literal("draft"),
  v.literal("review"),
  v.literal("published"),
  v.literal("superseded"),
  v.literal("archived"),
);

export const catalogStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const productAttribute = v.object({
  name: v.string(),
  value: v.string(),
  unit: v.optional(v.string()),
});

/** One Resursă of a norm, as a function receives it. */
export const normResourceInput = v.object({
  kind: resourceKind,
  name: v.string(),
  unit: v.string(),
  quantity: v.number(),
  resourceId: v.optional(v.id("resources")),
  productId: v.optional(v.id("products")),
  referencePrice: v.optional(v.number()),
  note: v.optional(v.string()),
});

export const usageEventKind = v.union(
  v.literal("norm_added"),
  v.literal("norm_viewed"),
);

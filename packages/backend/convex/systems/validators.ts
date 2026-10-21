import { v } from "convex/values";

// Where a work is done, as far as the materials it may use go: on a floor
// with underfloor heating, outdoors, in a bathroom or shower, on a facade.
export const workContext = v.union(
  v.literal("floor_heating"),
  v.literal("outdoor"),
  v.literal("wet"),
  v.literal("facade"),
);

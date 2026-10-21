import { defineTable } from "convex/server";
import { v } from "convex/values";
import { packageKind } from "./validators";

export const materialTables = {
  // What a firm buys a material in, when it isn't what Devize knows: the
  // Lista de cumpărături counts its packages from these sizes first.
  packagings: defineTable({
    organizationId: v.id("organizations"),
    // The material, keyed like the Coș keys it: "p:" and a product,
    // "r:" and a resource, or "n:" and a name with its unit.
    key: v.string(),
    unit: v.string(),
    kind: packageKind,
    // How much of `unit` each package holds, largest first.
    sizes: v.array(v.number()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_organizationId_and_key", ["organizationId", "key"]),
};

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireFirmDoc, requireMember } from "../lib/access";
import { invalid } from "../lib/errors";
import { normalizeUnit } from "../lib/text";

// Rates price labour, equipment and transport; materials are priced by
// Listări (see prices/listings.ts).
const rateKind = v.union(
  v.literal("labor"),
  v.literal("equipment"),
  v.literal("transport"),
);

/** The firm's rates by kind, each with the catalog resource it prices. */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const rates = [];
    for (const kind of ["labor", "equipment", "transport"] as const) {
      const ofKind = await ctx.db
        .query("companyRates")
        .withIndex("by_organizationId_and_kind", (q) =>
          q.eq("organizationId", args.organizationId).eq("kind", kind),
        )
        .take(500);
      rates.push(...ofKind);
    }
    return rates;
  },
});

/**
 * Sets the firm's rate for a resource, or its default rate for a kind when no
 * resource is given. Lei without VAT per unit.
 */
export const set = mutation({
  args: {
    organizationId: v.id("organizations"),
    kind: rateKind,
    resourceId: v.optional(v.id("resources")),
    name: v.string(),
    unit: v.string(),
    price: v.number(),
  },
  returns: v.id("companyRates"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    const name = args.name.trim();
    const unit = normalizeUnit(args.unit);
    if (!name || name.length > 200) {
      throw invalid("name");
    }
    if (!unit || unit === "%") {
      throw invalid("unit");
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw invalid("price");
    }
    if (args.resourceId) {
      const resource = await ctx.db.get("resources", args.resourceId);
      if (
        !resource ||
        resource.kind !== args.kind ||
        (resource.organizationId !== undefined &&
          resource.organizationId !== args.organizationId)
      ) {
        throw invalid("resourceId");
      }
    }
    const existing = await ctx.db
      .query("companyRates")
      .withIndex("by_organizationId_and_resourceId", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("resourceId", args.resourceId),
      )
      .filter((q) => q.eq(q.field("kind"), args.kind))
      .first();
    const fields = {
      name,
      unit,
      price: args.price,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch("companyRates", existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("companyRates", {
      organizationId: args.organizationId,
      kind: args.kind,
      resourceId: args.resourceId,
      ...fields,
    });
  },
});

export const remove = mutation({
  args: { rateId: v.id("companyRates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(
      ctx,
      "companyRates",
      args.rateId,
      "admin",
    );
    await ctx.db.delete("companyRates", doc._id);
    return null;
  },
});

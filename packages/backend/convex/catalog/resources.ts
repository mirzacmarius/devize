import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireMember, requireUserId } from "../lib/access";
import { invalid } from "../lib/errors";
import { requireSuperAdmin } from "../lib/roles";
import { normalizeText } from "../lib/text";
import { resourceKind } from "../manufacturers/validators";
import { findOrCreateResource } from "./resourceRows";

/** Catalog resources matching the words typed: the firm's own, then shared. */
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    text: v.string(),
    kind: v.optional(resourceKind),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const text = normalizeText(args.text);
    if (!text) {
      return [];
    }
    const kind = args.kind;
    const own = await ctx.db
      .query("resources")
      .withSearchIndex("search_nameKey", (q) => {
        const scoped = q
          .search("nameKey", text)
          .eq("organizationId", args.organizationId);
        return kind ? scoped.eq("kind", kind) : scoped;
      })
      .take(20);
    const shared = await ctx.db
      .query("resources")
      .withSearchIndex("search_nameKey", (q) => {
        const scoped = q.search("nameKey", text).eq("visibility", "public");
        return kind ? scoped.eq("kind", kind) : scoped;
      })
      .take(20);
    return [...own, ...shared].slice(0, 20);
  },
});

/**
 * Adds a resource to a firm's own list, or to the shared catalog for a super
 * admin. An existing resource with the same kind, name and unit is reused.
 */
export const create = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    kind: resourceKind,
    name: v.string(),
    unit: v.string(),
    referencePrice: v.optional(v.number()),
  },
  returns: v.id("resources"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.organizationId) {
      await requireMember(ctx, args.organizationId);
    } else {
      await requireSuperAdmin(ctx);
    }
    if (
      args.referencePrice !== undefined &&
      (!Number.isFinite(args.referencePrice) || args.referencePrice < 0)
    ) {
      throw invalid("referencePrice");
    }
    return await findOrCreateResource(ctx, {
      kind: args.kind,
      name: args.name,
      unit: args.unit,
      organizationId: args.organizationId,
      referencePrice: args.referencePrice,
      createdBy: userId,
    });
  },
});

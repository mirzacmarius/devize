import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { requireMember } from "../lib/access";
import { invalid } from "../lib/errors";
import { normalizeUnit } from "../lib/text";
import { cleanSizes } from "./packages";
import { packageKind } from "./validators";

function checkKey(key: string) {
  if (!/^[prn]:/.test(key) || key.length > 300) {
    throw invalid("key");
  }
}

/**
 * Sets what the firm buys a material in, for every Deviz's Lista de
 * cumpărături: a 20 kg bag, or 15 l and 5 l buckets.
 */
export const setPackage = mutation({
  args: {
    organizationId: v.id("organizations"),
    key: v.string(),
    unit: v.string(),
    kind: packageKind,
    sizes: v.array(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    checkKey(args.key);
    const unit = normalizeUnit(args.unit);
    if (!unit || unit === "%") {
      throw invalid("unit");
    }
    if (args.sizes.some((size) => !Number.isFinite(size) || size > 1e6)) {
      throw invalid("sizes");
    }
    const sizes = cleanSizes(args.sizes);
    if (sizes.length === 0) {
      throw invalid("sizes");
    }
    const existing = await ctx.db
      .query("packagings")
      .withIndex("by_organizationId_and_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("key", args.key),
      )
      .unique();
    const fields = {
      unit,
      kind: args.kind,
      sizes,
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch("packagings", existing._id, fields);
    } else {
      await ctx.db.insert("packagings", {
        organizationId: args.organizationId,
        key: args.key,
        ...fields,
      });
    }
    return null;
  },
});

/** Goes back to the package Devize knows for the material. */
export const clearPackage = mutation({
  args: { organizationId: v.id("organizations"), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    checkKey(args.key);
    const existing = await ctx.db
      .query("packagings")
      .withIndex("by_organizationId_and_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("key", args.key),
      )
      .unique();
    if (existing) {
      await ctx.db.delete("packagings", existing._id);
    }
    return null;
  },
});

/**
 * Deletes a batch of a deleted firm's packages and dismissed compatibility
 * findings; returns how many, 0 when none is left.
 */
export async function deletePackagingRows(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  limit: number,
): Promise<number> {
  const packagings = await ctx.db
    .query("packagings")
    .withIndex("by_organizationId_and_key", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of packagings) {
    await ctx.db.delete("packagings", row._id);
  }
  if (packagings.length > 0) {
    return packagings.length;
  }
  const dismissals = await ctx.db
    .query("compatibilityDismissals")
    .withIndex("by_organizationId_and_number_and_key", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of dismissals) {
    await ctx.db.delete("compatibilityDismissals", row._id);
  }
  return dismissals.length;
}

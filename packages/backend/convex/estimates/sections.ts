import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import {
  nextPosition,
  refreshTotals,
  requireEditableEstimate,
} from "./helpers";
import { sectionKind } from "./validators";

function cleanName(name: string): string {
  const result = name.trim();
  if (!result || result.length > 300) {
    throw invalid("name");
  }
  return result;
}

/** Adds an Obiect, or a Capitol at the top level or inside an object. */
export const create = mutation({
  args: {
    estimateId: v.id("estimates"),
    kind: sectionKind,
    name: v.string(),
    code: v.optional(v.string()),
    parentId: v.optional(v.id("sections")),
    afterId: v.optional(v.id("sections")),
  },
  returns: v.id("sections"),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    if (args.parentId) {
      const parent = await ctx.db.get("sections", args.parentId);
      if (!parent || parent.estimateId !== estimate._id) {
        throw notFound("section");
      }
      if (parent.kind !== "object" || args.kind !== "chapter") {
        throw invalid("parentId");
      }
    }
    const after = args.afterId
      ? await ctx.db.get("sections", args.afterId)
      : null;
    if (args.afterId && (!after || after.estimateId !== estimate._id)) {
      throw notFound("section");
    }
    const sectionId = await ctx.db.insert("sections", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      kind: args.kind,
      parentId: args.parentId,
      code: args.code?.trim() || undefined,
      name: cleanName(args.name),
      position: await nextPosition(
        ctx,
        "sections",
        estimate._id,
        after ?? undefined,
      ),
    });
    await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
    return sectionId;
  },
});

async function requireEditableSection(
  ctx: Parameters<typeof requireEditableEstimate>[0],
  sectionId: Doc<"sections">["_id"],
) {
  const { doc: section } = await requireFirmDoc(ctx, "sections", sectionId);
  const { estimate } = await requireEditableEstimate(ctx, section.estimateId);
  return { section, estimate };
}

export const update = mutation({
  args: {
    sectionId: v.id("sections"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { section, estimate } = await requireEditableSection(
      ctx,
      args.sectionId,
    );
    await ctx.db.patch("sections", section._id, {
      ...(args.name === undefined ? {} : { name: cleanName(args.name) }),
      ...(args.code === undefined
        ? {}
        : { code: args.code.trim() || undefined }),
    });
    await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
    return null;
  },
});

/** Moves a section to right after another one, or to the top. */
export const move = mutation({
  args: {
    sectionId: v.id("sections"),
    afterId: v.optional(v.id("sections")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { section, estimate } = await requireEditableSection(
      ctx,
      args.sectionId,
    );
    let position: number;
    if (args.afterId) {
      const after = await ctx.db.get("sections", args.afterId);
      if (!after || after.estimateId !== estimate._id) {
        throw notFound("section");
      }
      position = await nextPosition(ctx, "sections", estimate._id, after);
    } else {
      const first = await ctx.db
        .query("sections")
        .withIndex("by_estimateId_and_position", (q) =>
          q.eq("estimateId", estimate._id),
        )
        .first();
      position = first ? first.position - 1 : 1;
    }
    await ctx.db.patch("sections", section._id, { position });
    await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
    return null;
  },
});

/**
 * Deletes an empty section. With `withContents`, also deletes its chapters
 * and line items.
 */
export const remove = mutation({
  args: {
    sectionId: v.id("sections"),
    withContents: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { section, estimate } = await requireEditableSection(
      ctx,
      args.sectionId,
    );
    const children = await ctx.db
      .query("sections")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", estimate._id),
      )
      .take(1000);
    const removed = [
      section,
      ...children.filter((child) => child.parentId === section._id),
    ];
    for (const target of removed) {
      const items = await ctx.db
        .query("lineItems")
        .withIndex("by_sectionId_and_position", (q) =>
          q.eq("sectionId", target._id),
        )
        .take(2000);
      if (items.length > 0 && !args.withContents) {
        throw appError("in_use", "lineItems");
      }
      for (const item of items) {
        await ctx.db.delete("lineItems", item._id);
      }
    }
    if (removed.length > 1 && !args.withContents) {
      throw appError("in_use", "sections");
    }
    for (const target of removed) {
      await ctx.db.delete("sections", target._id);
    }
    await refreshTotals(ctx, estimate);
    return null;
  },
});

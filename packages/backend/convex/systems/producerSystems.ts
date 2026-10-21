import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { latestPublishedVersion } from "../catalog/norms";
import { catalogStatus } from "../catalog/validators";
import {
  canEditManufacturer,
  requireManufacturerEditor,
  requireUserId,
} from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import { isVisible } from "../producers/access";
import { workContext } from "./validators";

// A Producător's systems: its norms and products that work together, and
// where it says they belong. Its own firm (or Devize staff) writes them on
// its profile; published, they complete and check the devize that use them
// (docs/adr/0028).

// Norms and products in one system, and systems per producer.
const MAX_PARTS = 30;
const MAX_SYSTEMS = 100;
// The producer's norms and products to pick from.
const MAX_LISTED = 500;

async function partsOf(
  ctx: QueryCtx,
  system: Doc<"systems">,
  canEdit: boolean,
) {
  const norms = [];
  for (const lineageId of system.normLineageIds) {
    const first = await ctx.db.get("norms", lineageId);
    const norm = first
      ? ((await latestPublishedVersion(ctx, first)) ?? (canEdit ? first : null))
      : null;
    if (norm) {
      norms.push({
        lineageId,
        normId: norm._id,
        code: norm.code,
        title: norm.title,
        unit: norm.unit,
        published: norm.status === "published",
      });
    }
  }
  const products = [];
  for (const productId of system.productIds) {
    const product = await ctx.db.get("products", productId);
    if (product && (canEdit || product.status === "published")) {
      products.push({
        productId,
        name: product.name,
        published: product.status === "published",
      });
    }
  }
  return { norms, products };
}

/**
 * A Producător's systems: the published ones for everyone who may see its
 * profile, and all of them, with its norms and products to choose from, for
 * those who may edit it. Null for a profile that isn't shown.
 */
export const forManufacturer = query({
  args: { manufacturerId: v.id("manufacturers") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      return null;
    }
    const canEdit = await canEditManufacturer(ctx, manufacturer._id);
    if (!canEdit && !(await isVisible(ctx, manufacturer))) {
      return null;
    }
    const rows = await ctx.db
      .query("systems")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .take(MAX_SYSTEMS);
    const systems = [];
    for (const row of rows) {
      if (!canEdit && row.status !== "published") {
        continue;
      }
      systems.push({
        _id: row._id,
        name: row.name,
        description: row.description,
        suitable: row.suitable,
        unsuitable: row.unsuitable,
        status: row.status,
        updatedAt: row.updatedAt,
        ...(await partsOf(ctx, row, canEdit)),
      });
    }
    const choices = canEdit
      ? {
          norms: (
            await ctx.db
              .query("norms")
              .withIndex("by_manufacturerId_and_status_and_code", (q) =>
                q
                  .eq("manufacturerId", manufacturer._id)
                  .eq("status", "published"),
              )
              .take(MAX_LISTED)
          ).map((norm) => ({
            lineageId: norm.lineageId ?? norm._id,
            code: norm.code,
            title: norm.title,
            unit: norm.unit,
            category: norm.category,
          })),
          products: (
            await ctx.db
              .query("products")
              .withIndex("by_manufacturerId_and_status", (q) =>
                q
                  .eq("manufacturerId", manufacturer._id)
                  .eq("status", "published"),
              )
              .take(MAX_LISTED)
          ).map((product) => ({ productId: product._id, name: product.name })),
        }
      : null;
    return {
      manufacturer: {
        _id: manufacturer._id,
        name: manufacturer.displayName ?? manufacturer.name,
      },
      canEdit,
      systems: systems.sort((a, b) => a.name.localeCompare(b.name, "ro")),
      choices,
    };
  },
});

function cleanText(value: string | undefined, max: number, field: string) {
  const text = value?.trim() ?? "";
  if (text.length > max) {
    throw invalid(field);
  }
  return text;
}

/** Checks that the norms are the producer's own, each by its first version. */
async function checkNorms(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
  lineageIds: readonly Id<"norms">[],
) {
  for (const lineageId of lineageIds) {
    const norm = await ctx.db.get("norms", lineageId);
    if (
      !norm ||
      norm.manufacturerId !== manufacturerId ||
      (norm.lineageId ?? norm._id) !== lineageId
    ) {
      throw notFound("norm");
    }
  }
}

async function checkProducts(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
  productIds: readonly Id<"products">[],
) {
  for (const productId of productIds) {
    const product = await ctx.db.get("products", productId);
    if (!product || product.manufacturerId !== manufacturerId) {
      throw notFound("product");
    }
  }
}

/**
 * Writes a system, new as a draft or over an existing one: its name, its
 * norms and products, and the contexts it suits and doesn't suit, never
 * both for one context.
 */
export const save = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    systemId: v.optional(v.id("systems")),
    name: v.string(),
    description: v.optional(v.string()),
    normLineageIds: v.array(v.id("norms")),
    productIds: v.array(v.id("products")),
    suitable: v.array(workContext),
    unsuitable: v.array(workContext),
  },
  returns: v.id("systems"),
  handler: async (ctx, args) => {
    const userId = await requireManufacturerEditor(ctx, args.manufacturerId);
    const name = cleanText(args.name, 120, "name");
    if (!name) {
      throw invalid("name");
    }
    const description = cleanText(args.description, 1000, "description");
    const normLineageIds = [...new Set(args.normLineageIds)];
    const productIds = [...new Set(args.productIds)];
    if (
      normLineageIds.length + productIds.length === 0 ||
      normLineageIds.length > MAX_PARTS ||
      productIds.length > MAX_PARTS
    ) {
      throw invalid("parts");
    }
    const suitable = [...new Set(args.suitable)];
    const unsuitable = [...new Set(args.unsuitable)];
    if (suitable.some((context) => unsuitable.includes(context))) {
      throw invalid("contexts");
    }
    await checkNorms(ctx, args.manufacturerId, normLineageIds);
    await checkProducts(ctx, args.manufacturerId, productIds);
    const fields = {
      name,
      description: description || undefined,
      normLineageIds,
      productIds,
      suitable,
      unsuitable,
      updatedAt: Date.now(),
    };
    if (args.systemId) {
      const existing = await ctx.db.get("systems", args.systemId);
      if (!existing || existing.manufacturerId !== args.manufacturerId) {
        throw notFound("system");
      }
      await ctx.db.patch("systems", existing._id, fields);
      return existing._id;
    }
    const count = await ctx.db
      .query("systems")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", args.manufacturerId),
      )
      .take(MAX_SYSTEMS);
    if (count.length >= MAX_SYSTEMS) {
      throw invalid("systems");
    }
    return await ctx.db.insert("systems", {
      manufacturerId: args.manufacturerId,
      ...fields,
      status: "draft",
      createdBy: userId,
    });
  },
});

async function requireEditableSystem(ctx: QueryCtx, systemId: Id<"systems">) {
  const system = await ctx.db.get("systems", systemId);
  if (!system) {
    throw notFound("system");
  }
  await requireManufacturerEditor(ctx, system.manufacturerId);
  return system;
}

/**
 * Publishes a system, takes it back to draft or archives it. Published, its
 * norms and products must all be published too.
 */
export const setStatus = mutation({
  args: { systemId: v.id("systems"), status: catalogStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    const system = await requireEditableSystem(ctx, args.systemId);
    if (args.status === "published") {
      const parts = await partsOf(ctx, system, true);
      if (
        parts.norms.length !== system.normLineageIds.length ||
        parts.products.length !== system.productIds.length ||
        parts.norms.some((norm) => !norm.published) ||
        parts.products.some((product) => !product.published)
      ) {
        throw invalid("unpublished");
      }
    }
    await ctx.db.patch("systems", system._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { systemId: v.id("systems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const system = await requireEditableSystem(ctx, args.systemId);
    await ctx.db.delete("systems", system._id);
    return null;
  },
});

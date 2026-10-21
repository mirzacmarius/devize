import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  canEditManufacturer,
  requireManufacturerEditor,
  requireUserId,
} from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import { normalizeText, normalizeUnit } from "../lib/text";
import { catalogStatus, productAttribute } from "./validators";

const editableFields = {
  resourceId: v.optional(v.id("resources")),
  brand: v.optional(v.string()),
  sku: v.optional(v.string()),
  ean: v.optional(v.string()),
  packageSize: v.optional(v.number()),
  packageLabel: v.optional(v.string()),
  attributes: v.optional(v.array(productAttribute)),
  massPerUnit: v.optional(v.number()),
  embodiedCarbon: v.optional(v.number()),
  datasheetId: v.optional(v.id("_storage")),
  datasheetUrl: v.optional(v.string()),
  epdUrl: v.optional(v.string()),
};

function checkNumbers(fields: {
  packageSize?: number;
  massPerUnit?: number;
  embodiedCarbon?: number;
}) {
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw invalid(name);
    }
  }
}

function cleanEan(ean: string | undefined): string | undefined {
  if (ean === undefined) {
    return undefined;
  }
  const digits = ean.replace(/\s/g, "");
  if (digits && !/^\d{8,14}$/.test(digits)) {
    throw invalid("ean");
  }
  return digits || undefined;
}

async function canRead(ctx: QueryCtx, product: Doc<"products">) {
  return (
    product.status === "published" ||
    (await canEditManufacturer(ctx, product.manufacturerId))
  );
}

export const get = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const product = await ctx.db.get("products", args.productId);
    if (!product || !(await canRead(ctx, product))) {
      throw notFound("product");
    }
    return {
      ...product,
      datasheetFileUrl: product.datasheetId
        ? await ctx.storage.getUrl(product.datasheetId)
        : null,
    };
  },
});

/** A Producător's products; drafts and archived ones only for its editors. */
export const listByManufacturer = query({
  args: {
    manufacturerId: v.id("manufacturers"),
    status: v.optional(catalogStatus),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const status = args.status ?? "published";
    if (
      status !== "published" &&
      !(await canEditManufacturer(ctx, args.manufacturerId))
    ) {
      return [];
    }
    return await ctx.db
      .query("products")
      .withIndex("by_manufacturerId_and_status", (q) =>
        q.eq("manufacturerId", args.manufacturerId).eq("status", status),
      )
      .take(500);
  },
});

export const search = query({
  args: {
    text: v.string(),
    manufacturerId: v.optional(v.id("manufacturers")),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const text = normalizeText(args.text);
    if (!text) {
      return [];
    }
    const manufacturerId = args.manufacturerId;
    return await ctx.db
      .query("products")
      .withSearchIndex("search_nameKey", (q) => {
        const scoped = q.search("nameKey", text).eq("status", "published");
        return manufacturerId
          ? scoped.eq("manufacturerId", manufacturerId)
          : scoped;
      })
      .take(20);
  },
});

export const create = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    name: v.string(),
    unit: v.string(),
    ...editableFields,
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const userId = await requireManufacturerEditor(ctx, args.manufacturerId);
    const name = args.name.trim();
    const unit = normalizeUnit(args.unit);
    if (!name) {
      throw invalid("name");
    }
    if (!unit || unit === "%") {
      throw invalid("unit");
    }
    checkNumbers(args);
    const { attributes, ean, ...rest } = args;
    return await ctx.db.insert("products", {
      ...rest,
      name,
      nameKey: normalizeText(name),
      unit,
      ean: cleanEan(ean),
      attributes: attributes ?? [],
      status: "draft",
      createdBy: userId,
    });
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    status: v.optional(catalogStatus),
    ...editableFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get("products", args.productId);
    if (!product) {
      throw notFound("product");
    }
    await requireManufacturerEditor(ctx, product.manufacturerId);
    checkNumbers(args);
    const { productId, name, unit, ean, ...rest } = args;
    const patch: Partial<Doc<"products">> = { ...rest };
    if (name !== undefined) {
      if (!name.trim()) {
        throw invalid("name");
      }
      patch.name = name.trim();
      patch.nameKey = normalizeText(name);
    }
    if (unit !== undefined) {
      const normalized = normalizeUnit(unit);
      if (!normalized || normalized === "%") {
        throw invalid("unit");
      }
      patch.unit = normalized;
    }
    if (ean !== undefined) {
      patch.ean = cleanEan(ean);
    }
    await ctx.db.patch("products", productId, patch);
    return null;
  },
});

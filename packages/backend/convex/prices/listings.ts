import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { requireMember } from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import { normalizeUnit } from "../lib/text";
import { listingUnitPrice } from "./resolve";

/** The firm's own material prices and the quotations it received. */
export const listOwn = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_organizationId_and_productId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(1000);
    return listings
      .filter(
        (listing) => listing.source === "own" || listing.source === "quote",
      )
      .map((listing) => ({ ...listing, unitPrice: listingUnitPrice(listing) }));
  },
});

/**
 * Sets the firm's own price for a product or a generic material, or records
 * a quotation. The previous price stays in the price history.
 */
export const setOwnPrice = mutation({
  args: {
    organizationId: v.id("organizations"),
    source: v.union(v.literal("own"), v.literal("quote")),
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
    title: v.string(),
    price: v.number(),
    includedVat: v.number(),
    saleUnit: v.string(),
    unitsPerSale: v.number(),
    url: v.optional(v.string()),
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    if ((args.productId === undefined) === (args.resourceId === undefined)) {
      throw invalid("productId");
    }
    if (args.productId && !(await ctx.db.get("products", args.productId))) {
      throw notFound("product");
    }
    if (args.resourceId) {
      const resource = await ctx.db.get("resources", args.resourceId);
      if (
        resource?.kind !== "material" ||
        (resource.organizationId !== undefined &&
          resource.organizationId !== args.organizationId)
      ) {
        throw invalid("resourceId");
      }
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw invalid("price");
    }
    if (
      !Number.isFinite(args.includedVat) ||
      args.includedVat < 0 ||
      args.includedVat > 100
    ) {
      throw invalid("includedVat");
    }
    if (!Number.isFinite(args.unitsPerSale) || args.unitsPerSale <= 0) {
      throw invalid("unitsPerSale");
    }
    const title = args.title.trim();
    const saleUnit = normalizeUnit(args.saleUnit);
    if (!title || !saleUnit) {
      throw invalid("title");
    }
    const now = Date.now();
    const candidates = args.productId
      ? ctx.db
          .query("listings")
          .withIndex("by_organizationId_and_productId", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("productId", args.productId),
          )
      : ctx.db
          .query("listings")
          .withIndex("by_organizationId_and_resourceId", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("resourceId", args.resourceId),
          );
    let existing: Doc<"listings"> | null = null;
    for await (const listing of candidates) {
      if (listing.source === args.source) {
        existing = listing;
        break;
      }
    }
    const fields = {
      title,
      price: args.price,
      includedVat: args.includedVat,
      saleUnit,
      unitsPerSale: args.unitsPerSale,
      url: args.url?.trim() || undefined,
      status: "active" as const,
      checkedAt: now,
    };
    const listingId = existing
      ? existing._id
      : await ctx.db.insert("listings", {
          source: args.source,
          organizationId: args.organizationId,
          productId: args.productId,
          resourceId: args.resourceId,
          matchMethod: "manual",
          ...fields,
        });
    if (existing) {
      await ctx.db.patch("listings", existing._id, fields);
    }
    await ctx.db.insert("priceHistory", {
      listingId,
      price: args.price,
      includedVat: args.includedVat,
      at: now,
    });
    return listingId;
  },
});

export const removeOwnPrice = mutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (
      !listing?.organizationId ||
      (listing.source !== "own" && listing.source !== "quote")
    ) {
      throw notFound("listing");
    }
    await requireMember(ctx, listing.organizationId);
    await ctx.db.patch("listings", listing._id, { status: "unavailable" });
    return null;
  },
});

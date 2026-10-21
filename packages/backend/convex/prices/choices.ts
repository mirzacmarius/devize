import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireFirmDoc, requireMember } from "../lib/access";
import { invalid } from "../lib/errors";
import { choicesFor, choose, materialOf, requireMaterial } from "./materials";
import { listingUnitPrice } from "./resolve";
import { productPage, retailVat } from "./stores";
import { store } from "./validators";

function checkUnits(unitsPerSale: number) {
  if (
    !Number.isFinite(unitsPerSale) ||
    unitsPerSale <= 0 ||
    unitsPerSale > 1e6
  ) {
    throw invalid("unitsPerSale");
  }
}

/** A choice with its listing, priced per unit of the material. */
async function withListing(ctx: QueryCtx, choice: Doc<"storeChoices">) {
  const listing = await ctx.db.get("listings", choice.listingId);
  if (!listing) {
    return null;
  }
  return {
    _id: choice._id,
    store: choice.store,
    unitsPerSale: choice.unitsPerSale,
    unitsChecked: choice.unitsChecked,
    updatedAt: choice.updatedAt,
    listing: {
      _id: listing._id,
      title: listing.title,
      url: listing.url,
      price: listing.price,
      includedVat: listing.includedVat,
      inStock: listing.inStock,
      status: listing.status,
      checkedAt: listing.checkedAt,
      // Typed by the firm because the page couldn't be read.
      typed: listing.organizationId !== undefined,
    },
    // Lei without VAT per unit of the material.
    unitPrice: listingUnitPrice({
      price: listing.price,
      includedVat: listing.includedVat,
      unitsPerSale: choice.unitsPerSale,
    }),
  };
}

/** The products the firm chose for a material, one per store at most. */
export const forMaterial = query({
  args: {
    organizationId: v.id("organizations"),
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const material = materialOf(args);
    await requireMaterial(ctx, args.organizationId, material);
    const choices = await choicesFor(ctx, args.organizationId, material);
    const result = [];
    for (const choice of choices) {
      const item = await withListing(ctx, choice);
      if (item) {
        result.push(item);
      }
    }
    return result;
  },
});

/** Sets how many of the material's units one item sold holds, by hand. */
export const setUnits = mutation({
  args: { choiceId: v.id("storeChoices"), unitsPerSale: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: choice } = await requireFirmDoc(
      ctx,
      "storeChoices",
      args.choiceId,
    );
    checkUnits(args.unitsPerSale);
    await ctx.db.patch("storeChoices", choice._id, {
      unitsPerSale: args.unitsPerSale,
      unitsChecked: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { choiceId: v.id("storeChoices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: choice } = await requireFirmDoc(
      ctx,
      "storeChoices",
      args.choiceId,
    );
    await ctx.db.delete("storeChoices", choice._id);
    return null;
  },
});

/**
 * Records a store's price the firm typed itself, because the page couldn't
 * be read or the firm pays another price, and chooses it for the material.
 * Only this firm sees it; the earlier one stays in the price history.
 */
export const typePrice = mutation({
  args: {
    organizationId: v.id("organizations"),
    store,
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
    title: v.string(),
    // Lei with VAT for one item sold, as the store shows it.
    price: v.number(),
    unitsPerSale: v.number(),
    url: v.optional(v.string()),
  },
  returns: v.id("storeChoices"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const material = materialOf(args);
    await requireMaterial(ctx, args.organizationId, material);
    if (!Number.isFinite(args.price) || args.price <= 0 || args.price > 1e8) {
      throw invalid("price");
    }
    checkUnits(args.unitsPerSale);
    const title = args.title.trim().slice(0, 300);
    if (!title) {
      throw invalid("title");
    }
    let url: string | undefined;
    if (args.url?.trim()) {
      const page = productPage(args.url);
      if (page?.store !== args.store) {
        throw invalid("url");
      }
      url = page.url;
    }
    // The firm's typed price for this material at this store, if any.
    const current = (await choicesFor(ctx, args.organizationId, material)).find(
      (choice) => choice.store === args.store,
    );
    const previous = current
      ? await ctx.db.get("listings", current.listingId)
      : null;
    const now = Date.now();
    const fields = {
      title,
      url,
      price: args.price,
      includedVat: retailVat,
      unitsPerSale: args.unitsPerSale,
      status: "active" as const,
      checkedAt: now,
    };
    let listingId: Id<"listings">;
    if (previous?.organizationId === args.organizationId) {
      listingId = previous._id;
      await ctx.db.patch("listings", previous._id, fields);
    } else {
      listingId = await ctx.db.insert("listings", {
        source: "retailer",
        store: args.store,
        organizationId: args.organizationId,
        productId: material.productId,
        resourceId: material.resourceId,
        saleUnit: "buc",
        matchMethod: "manual",
        ...fields,
      });
    }
    if (
      previous?._id !== listingId ||
      previous.price !== args.price ||
      previous.includedVat !== retailVat
    ) {
      await ctx.db.insert("priceHistory", {
        listingId,
        price: args.price,
        includedVat: retailVat,
        at: now,
      });
    }
    const listing = await ctx.db.get("listings", listingId);
    if (!listing) {
      throw invalid("listing");
    }
    return await choose(ctx, {
      organizationId: args.organizationId,
      material,
      listing,
      unitsPerSale: args.unitsPerSale,
      unitsChecked: true,
      userId,
    });
  },
});

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { readLineItems } from "../estimates/helpers";
import { requireFirmDoc, requireMember } from "../lib/access";
import { invalid } from "../lib/errors";
import { isPercentUnit, normalizeText } from "../lib/text";
import { choicesFor, type Material } from "./materials";
import { isPublicListing, type Store } from "./resolve";
import { store } from "./validators";

// The Coș's data: a Deviz's materials with what each store sells them for,
// and what using each store costs the firm. `basketPlan.ts` splits them
// between the stores.

// A Deviz with more materials is planned for its most expensive ones.
const MAX_MATERIALS = 300;

type Line = Doc<"lineItems">;

/** One material of a Deviz, summed over its line items. */
type BasketMaterial = {
  key: string;
  productId?: Id<"products">;
  resourceId?: Id<"resources">;
  name: string;
  unit: string;
  // In `unit`, for the whole Deviz.
  quantity: number;
  // What the Deviz prices it at: lei without VAT, for the whole quantity.
  estimateCost: number;
  lineItems: number;
};

/** A Deviz's materials, most expensive first; "%" shares aren't bought. */
export function materialsOf(items: Line[]): BasketMaterial[] {
  const byKey = new Map<string, BasketMaterial>();
  for (const item of items) {
    const counted = new Set<string>();
    for (const resource of item.resources) {
      const quantity = item.quantity * resource.quantity;
      if (
        resource.kind !== "material" ||
        isPercentUnit(resource.unit) ||
        !(quantity > 0)
      ) {
        continue;
      }
      const key = resource.productId
        ? `p:${resource.productId}`
        : resource.resourceId
          ? `r:${resource.resourceId}`
          : `n:${normalizeText(resource.name)}:${resource.unit}`;
      const material = byKey.get(key) ?? {
        key,
        productId: resource.productId,
        resourceId: resource.productId ? undefined : resource.resourceId,
        name: resource.name,
        unit: resource.unit,
        quantity: 0,
        estimateCost: 0,
        lineItems: 0,
      };
      material.quantity += quantity;
      material.estimateCost += quantity * resource.unitPrice;
      if (!counted.has(key)) {
        counted.add(key);
        material.lineItems++;
      }
      byKey.set(key, material);
    }
  }
  return [...byKey.values()]
    .map((material) => ({
      ...material,
      quantity: Number(material.quantity.toFixed(4)),
      estimateCost: Math.round(material.estimateCost * 100) / 100,
    }))
    .sort(
      (a, b) =>
        b.estimateCost - a.estimateCost || a.name.localeCompare(b.name, "ro"),
    );
}

function offerOf(
  listing: Doc<"listings"> & { store: Store },
  unitsPerSale: number,
  choice?: Doc<"storeChoices">,
) {
  return {
    store: listing.store,
    listingId: listing._id,
    title: listing.title,
    url: listing.url,
    // Lei with VAT for one item sold, as the store shows it.
    price: listing.price,
    includedVat: listing.includedVat,
    unitsPerSale,
    inStock: listing.inStock,
    checkedAt: listing.checkedAt,
    // Typed by the firm because the page couldn't be read.
    typed: listing.organizationId !== undefined,
    // The firm's own choice, or a store product matched by its EAN.
    choiceId: choice?._id,
    unitsChecked: choice?.unitsChecked ?? false,
  };
}

type Offer = ReturnType<typeof offerOf>;

function hasStore(
  listing: Doc<"listings">,
): listing is Doc<"listings"> & { store: Store } {
  return listing.store !== undefined;
}

/**
 * What each store sells a material for: the product the firm chose there,
 * else the cheapest public listing matched to it.
 */
async function offersFor(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  material: Material,
): Promise<Offer[]> {
  const offers = new Map<Store, Offer>();
  for (const choice of await choicesFor(ctx, organizationId, material)) {
    const listing = await ctx.db.get("listings", choice.listingId);
    if (
      listing &&
      hasStore(listing) &&
      listing.status === "active" &&
      (isPublicListing(listing) || listing.organizationId === organizationId)
    ) {
      offers.set(choice.store, offerOf(listing, choice.unitsPerSale, choice));
    }
  }
  const listings = material.productId
    ? await ctx.db
        .query("listings")
        .withIndex("by_productId_and_status", (q) =>
          q.eq("productId", material.productId).eq("status", "active"),
        )
        .take(20)
    : await ctx.db
        .query("listings")
        .withIndex("by_organizationId_and_resourceId", (q) =>
          q
            .eq("organizationId", undefined)
            .eq("resourceId", material.resourceId),
        )
        .take(20);
  for (const listing of listings) {
    if (
      listing.source !== "retailer" ||
      !hasStore(listing) ||
      !isPublicListing(listing)
    ) {
      continue;
    }
    const known = offers.get(listing.store);
    if (known?.choiceId) {
      continue;
    }
    const offer = offerOf(listing, listing.unitsPerSale);
    if (
      !known ||
      offer.price / offer.unitsPerSale < known.price / known.unitsPerSale
    ) {
      offers.set(listing.store, offer);
    }
  }
  return [...offers.values()];
}

/**
 * A Deviz's materials with each store's offer for them, and what the firm
 * set for delivery at each store.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const all = materialsOf(await readLineItems(ctx, estimate._id));
    const materials = [];
    for (const material of all.slice(0, MAX_MATERIALS)) {
      const target: Material | null = material.productId
        ? { productId: material.productId }
        : material.resourceId
          ? { resourceId: material.resourceId }
          : null;
      materials.push({
        ...material,
        offers: target
          ? await offersFor(ctx, estimate.organizationId, target)
          : [],
      });
    }
    const settings = await ctx.db
      .query("priceSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", estimate.organizationId),
      )
      .unique();
    return {
      estimate: {
        _id: estimate._id,
        organizationId: estimate.organizationId,
        number: estimate.number,
        revision: estimate.revision,
        title: estimate.title,
        locked: estimate.lockedAt !== undefined,
        preferredStore: estimate.preferredStore,
        vat: estimate.markups.vat,
      },
      materials,
      // Materials left out because the Deviz has too many.
      omitted: all.length - materials.length,
      storeFees: settings?.storeFees ?? [],
    };
  },
});

/**
 * Sets what using a store costs the firm besides the goods: its delivery
 * fee, or the trip there, and the order value from which delivery is free.
 */
export const setStoreFee = mutation({
  args: {
    organizationId: v.id("organizations"),
    store,
    fee: v.number(),
    freeFrom: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    if (!Number.isFinite(args.fee) || args.fee < 0 || args.fee > 100_000) {
      throw invalid("fee");
    }
    if (
      args.freeFrom !== undefined &&
      (!Number.isFinite(args.freeFrom) ||
        args.freeFrom < 0 ||
        args.freeFrom > 10_000_000)
    ) {
      throw invalid("freeFrom");
    }
    const entry = {
      store: args.store,
      fee: Math.round(args.fee * 100) / 100,
      freeFrom:
        args.freeFrom === undefined
          ? undefined
          : Math.round(args.freeFrom * 100) / 100,
    };
    const settings = await ctx.db
      .query("priceSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();
    const now = Date.now();
    if (settings) {
      await ctx.db.patch("priceSettings", settings._id, {
        storeFees: [
          ...settings.storeFees.filter((fee) => fee.store !== args.store),
          entry,
        ],
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("priceSettings", {
        organizationId: args.organizationId,
        storeFees: [entry],
        updatedAt: now,
      });
    }
    return null;
  },
});

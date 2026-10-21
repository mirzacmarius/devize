import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { priceSource } from "../estimates/validators";
import { isPercentUnit, normalizeUnit } from "../lib/text";
import type { resourceKind } from "../manufacturers/validators";
import type { store } from "./validators";

export type Store = Infer<typeof store>;
export type PriceSource = Infer<typeof priceSource>;

export type PriceRequest = {
  kind: Infer<typeof resourceKind>;
  unit: string;
  resourceId?: Id<"resources">;
  productId?: Id<"products">;
  // The norm's own price for the resource, the last fallback.
  referencePrice?: number;
};

export type ResolvedPrice = {
  unitPrice: number;
  priceSource: PriceSource;
  listingId?: Id<"listings">;
  store?: Store;
  pricedAt?: number;
};

/** Lei without VAT per product unit, from a listing's price per sale unit. */
export function listingUnitPrice(
  listing: Pick<Doc<"listings">, "price" | "includedVat" | "unitsPerSale">,
): number {
  const withoutVat = listing.price / (1 + listing.includedVat / 100);
  return Number((withoutVat / listing.unitsPerSale).toFixed(4));
}

function fromListing(listing: Doc<"listings">): ResolvedPrice {
  return {
    unitPrice: listingUnitPrice(listing),
    priceSource: listing.source === "own" ? "own" : "listing",
    listingId: listing._id,
    store: listing.store,
    pricedAt: listing.checkedAt,
  };
}

/**
 * Finds the price a firm pays for each resource of a norm, in this order:
 *
 * - labour, equipment and transport: the firm's rate for the resource, then its
 *   default rate for that kind;
 * - a product: the firm's own price or a quotation it received, then the
 *   preferred retailer, then the cheapest public listing;
 * - a generic material: the firm's own price for it;
 *
 * and for all of them, the norm's reference price, then the resource's.
 * Prices are cached for one call, since a Deviz repeats the same resources.
 */
export function createPriceResolver(
  ctx: QueryCtx,
  options: { organizationId: Id<"organizations">; preferredStore?: Store },
) {
  const { organizationId, preferredStore } = options;
  const cache = new Map<string, Promise<ResolvedPrice>>();

  async function firmRate(
    request: PriceRequest,
  ): Promise<ResolvedPrice | null> {
    // A rate only prices resources counted in its own unit: 400 lei a day
    // says nothing about a machine counted in hours.
    const unit = normalizeUnit(request.unit);
    const rates = await ctx.db
      .query("companyRates")
      .withIndex("by_organizationId_and_kind", (q) =>
        q.eq("organizationId", organizationId).eq("kind", request.kind),
      )
      .take(500);
    const inUnit = rates.filter((rate) => rate.unit === unit);
    const rate =
      (request.resourceId &&
        inUnit.find((rate) => rate.resourceId === request.resourceId)) ||
      inUnit.find((rate) => rate.resourceId === undefined);
    return rate
      ? { unitPrice: rate.price, priceSource: "own", pricedAt: rate.updatedAt }
      : null;
  }

  async function firmListing(
    field: "productId" | "resourceId",
    id: Id<"products"> | Id<"resources">,
  ): Promise<ResolvedPrice | null> {
    const listings =
      field === "productId"
        ? ctx.db
            .query("listings")
            .withIndex("by_organizationId_and_productId", (q) =>
              q
                .eq("organizationId", organizationId)
                .eq("productId", id as Id<"products">),
            )
        : ctx.db
            .query("listings")
            .withIndex("by_organizationId_and_resourceId", (q) =>
              q
                .eq("organizationId", organizationId)
                .eq("resourceId", id as Id<"resources">),
            );
    // Newest first, so a firm's latest price or quotation wins.
    for await (const listing of listings.order("desc")) {
      if (
        listing.status === "active" &&
        (listing.source === "own" || listing.source === "quote")
      ) {
        return fromListing(listing);
      }
    }
    return null;
  }

  async function publicListing(
    productId: Id<"products">,
  ): Promise<ResolvedPrice | null> {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_productId_and_status", (q) =>
        q.eq("productId", productId).eq("status", "active"),
      )
      .take(50);
    // Own prices and quotations belong to one firm; never use another's.
    const candidates = listings.filter(
      (listing) =>
        listing.source === "retailer" || listing.source === "supplier",
    );
    const preferred = preferredStore
      ? candidates.filter((listing) => listing.store === preferredStore)
      : [];
    const pool = preferred.length > 0 ? preferred : candidates;
    let cheapest: Doc<"listings"> | null = null;
    for (const listing of pool) {
      if (!cheapest || listingUnitPrice(listing) < listingUnitPrice(cheapest)) {
        cheapest = listing;
      }
    }
    return cheapest ? fromListing(cheapest) : null;
  }

  async function reference(request: PriceRequest): Promise<ResolvedPrice> {
    if (request.referencePrice !== undefined) {
      return { unitPrice: request.referencePrice, priceSource: "reference" };
    }
    const resource = request.resourceId
      ? await ctx.db.get("resources", request.resourceId)
      : null;
    if (resource?.referencePrice !== undefined) {
      return { unitPrice: resource.referencePrice, priceSource: "reference" };
    }
    return { unitPrice: 0, priceSource: "missing" };
  }

  async function lookUp(request: PriceRequest): Promise<ResolvedPrice> {
    if (request.kind !== "material") {
      return (await firmRate(request)) ?? (await reference(request));
    }
    if (request.productId) {
      const price =
        (await firmListing("productId", request.productId)) ??
        (await publicListing(request.productId));
      if (price) {
        return price;
      }
    }
    if (request.resourceId) {
      const price = await firmListing("resourceId", request.resourceId);
      if (price) {
        return price;
      }
    }
    return await reference(request);
  }

  return {
    resolve(request: PriceRequest): Promise<ResolvedPrice> {
      // A percentage has no price of its own (see recap.ts).
      if (isPercentUnit(request.unit)) {
        return Promise.resolve({ unitPrice: 0, priceSource: "reference" });
      }
      const key = [
        request.kind,
        normalizeUnit(request.unit),
        request.resourceId ?? "",
        request.productId ?? "",
        request.referencePrice ?? "",
      ].join(":");
      let price = cache.get(key);
      if (!price) {
        price = lookUp(request);
        cache.set(key, price);
      }
      return price;
    },
  };
}

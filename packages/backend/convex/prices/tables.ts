import { defineTable } from "convex/server";
import { v } from "convex/values";
import { listingSource, listingStatus, matchMethod, store } from "./validators";

export const priceTables = {
  // A Listare: one product's or resource's price at one source. Retailer and
  // supplier prices are seen by every firm; own prices and quotations only by
  // the firm in `organizationId`.
  listings: defineTable({
    source: listingSource,
    store: v.optional(store),
    // The Furnizor whose price list it is, or the firm an own price or a
    // quotation belongs to.
    organizationId: v.optional(v.id("organizations")),
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
    // The name the source sells it under.
    title: v.string(),
    url: v.optional(v.string()),
    // The source's own product id, such as a retailer's article number.
    externalId: v.optional(v.string()),
    ean: v.optional(v.string()),
    // Lei per sale unit, as the source shows it.
    price: v.number(),
    // The VAT rate the price includes, in percent; 0 when it is without VAT.
    includedVat: v.number(),
    saleUnit: v.string(),
    // How many units of the product (or resource) one sale unit holds, e.g. 25
    // for a 25 kg bag of a product norms count in kg.
    unitsPerSale: v.number(),
    inStock: v.optional(v.boolean()),
    matchMethod: v.optional(matchMethod),
    status: listingStatus,
    checkedAt: v.number(),
  })
    .index("by_productId_and_status", ["productId", "status"])
    .index("by_organizationId_and_productId", ["organizationId", "productId"])
    .index("by_organizationId_and_resourceId", ["organizationId", "resourceId"])
    .index("by_store_and_externalId", ["store", "externalId"]),

  // Every price a listing had, for charts, forecasts and price alerts.
  priceHistory: defineTable({
    listingId: v.id("listings"),
    price: v.number(),
    includedVat: v.number(),
    at: v.number(),
  }).index("by_listingId_and_at", ["listingId", "at"]),
};

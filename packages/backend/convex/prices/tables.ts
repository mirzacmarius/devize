import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  listingSource,
  listingStatus,
  matchMethod,
  priceChange,
  readStatus,
  store,
} from "./validators";

export const priceTables = {
  // A Listare: one product's or resource's price at one source. Retailer and
  // supplier prices are seen by every firm; own prices and quotations only by
  // the firm in `organizationId`. A retailer price read from the store's page
  // has no firm; one a firm typed itself, because the page couldn't be read,
  // has that firm and only it sees it.
  listings: defineTable({
    source: listingSource,
    store: v.optional(store),
    // The Furnizor whose price list it is, the firm an own price or a
    // quotation belongs to, or the firm that typed a retailer price.
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
    // for a 25 kg bag of a product norms count in kg. A store product no
    // catalog product matches counts in its own sale unit: 1.
    unitsPerSale: v.number(),
    inStock: v.optional(v.boolean()),
    matchMethod: v.optional(matchMethod),
    status: listingStatus,
    checkedAt: v.number(),
    // When Devize reads the store's page again: set while a firm chose the
    // product, so its price stays fresh (docs/adr/0009).
    refreshAfter: v.optional(v.number()),
  })
    .index("by_productId_and_status", ["productId", "status"])
    .index("by_organizationId_and_productId", ["organizationId", "productId"])
    .index("by_organizationId_and_resourceId", ["organizationId", "resourceId"])
    .index("by_store_and_externalId", ["store", "externalId"])
    .index("by_store_and_refreshAfter", ["store", "refreshAfter"])
    .index("by_url", ["url"]),

  // Every price a listing had, for charts, forecasts and price alerts.
  priceHistory: defineTable({
    listingId: v.id("listings"),
    price: v.number(),
    includedVat: v.number(),
    at: v.number(),
  }).index("by_listingId_and_at", ["listingId", "at"]),

  // A Produs ales: the store product a firm buys for a catalog product or
  // resource, at most one per store, with how many of the material's own
  // units (kg, mp, l) one item sold holds.
  storeChoices: defineTable({
    organizationId: v.id("organizations"),
    store: store,
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
    listingId: v.id("listings"),
    unitsPerSale: v.number(),
    // Whether a person set or confirmed `unitsPerSale`, rather than Devize
    // reading it from the product's title.
    unitsChecked: v.boolean(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_organizationId_and_productId", ["organizationId", "productId"])
    .index("by_organizationId_and_resourceId", ["organizationId", "resourceId"])
    .index("by_organizationId_and_updatedAt", ["organizationId", "updatedAt"])
    .index("by_listingId", ["listingId"]),

  // Citiri la cerere: each read of a store's product page, what asked for it
  // and how it went. They also space the reads to one store and count a
  // firm's reads in a day (docs/adr/0008).
  storeReads: defineTable({
    store: store,
    url: v.string(),
    // The firm that asked, and the material to link the product to; none for
    // Devize's own refresh of prices in sent devize.
    organizationId: v.optional(v.id("organizations")),
    requestedBy: v.optional(v.id("users")),
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
    status: readStatus,
    // Whether the page is read from the store's site; false when a recent
    // read of it answered, or the read was refused before it started.
    fromStore: v.boolean(),
    listingId: v.optional(v.id("listings")),
    requestedAt: v.number(),
    // When the page is read, a few seconds after the store's previous read.
    scheduledFor: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_organizationId_and_requestedAt", [
      "organizationId",
      "requestedAt",
    ])
    .index("by_requestedAt", ["requestedAt"]),

  // One row per store: its robots.txt and how Devize paces reads of its site.
  storeStates: defineTable({
    store: store,
    robotsTxt: v.optional(v.string()),
    robotsCheckedAt: v.optional(v.number()),
    // The next moment a read of this store may start.
    nextReadAt: v.number(),
    // Reads started on `day` (YYYY-MM-DD, Romanian time), against the
    // store's daily limit.
    day: v.string(),
    readsOnDay: v.number(),
    // After the store refused a read (403, 429, a captcha), none until then.
    pausedUntil: v.optional(v.number()),
  }).index("by_store", ["store"]),

  // A firm's settings for store prices, one row per firm.
  priceSettings: defineTable({
    organizationId: v.id("organizations"),
    // What using each store costs besides the goods, for the Coș: its
    // delivery fee, or the trip there, in lei with VAT, and the order value
    // from which delivery is free.
    storeFees: v.array(
      v.object({
        store: store,
        fee: v.number(),
        freeFrom: v.optional(v.number()),
      }),
    ),
    // The change of a sent Deviz's total, in percent, from which the firm
    // gets an Alertă de preț; 0 turns alerts off. Unset means 5.
    alertPercent: v.optional(v.number()),
    // When someone last asked for the firm's devize to be checked.
    alertsCheckedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_organizationId", ["organizationId"]),

  // Alerte de preț: a sent or accepted Deviz whose total would change by at
  // least the firm's threshold at today's prices. The Deviz itself never
  // changes; the alert says what the change does to its costs and profit.
  // One row per Deviz, written by the daily check (alerts.ts).
  priceAlerts: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    // The Deviz's total with VAT as sent, and at today's prices.
    sentTotal: v.number(),
    currentTotal: v.number(),
    // How much the total changed, in percent of the total sent.
    percent: v.number(),
    // Its direct costs, without VAT, as sent and at today's prices.
    sentDirect: v.number(),
    currentDirect: v.number(),
    // The profit in the Deviz, and what is left of it when the client pays
    // the price sent and the direct costs are today's.
    sentProfit: v.number(),
    profitLeft: v.number(),
    // The resources whose price moved most, by what they add to the direct
    // costs, and how many changed in all.
    changes: v.array(priceChange),
    changeCount: v.number(),
    checkedAt: v.number(),
    // Dismissed, with the change it had then; it comes back when the change
    // moves by the threshold again.
    dismissedAt: v.optional(v.number()),
    dismissedPercent: v.optional(v.number()),
  })
    .index("by_organizationId_and_checkedAt", ["organizationId", "checkedAt"])
    .index("by_estimateId", ["estimateId"])
    .index("by_checkedAt", ["checkedAt"]),
};

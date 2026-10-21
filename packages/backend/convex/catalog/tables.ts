import { defineTable } from "convex/server";
import { v } from "convex/values";
import { resourceKind } from "../manufacturers/validators";
import {
  catalogStatus,
  normSource,
  normStatus,
  productAttribute,
  usageEventKind,
  visibility,
} from "./validators";

export const catalogTables = {
  // A Resursă that norms consume and that gets priced: a generic material, a
  // trade, a machine or a kind of transport. The shared catalog's resources
  // have no firm; a firm can add its own.
  resources: defineTable({
    kind: resourceKind,
    code: v.optional(v.string()),
    name: v.string(),
    nameKey: v.string(),
    unit: v.string(),
    // Public for the shared catalog, private for a firm's own resource.
    visibility: visibility,
    organizationId: v.optional(v.id("organizations")),
    // Lei without VAT, a fallback when no firm rate or Listare applies.
    referencePrice: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_organizationId_and_kind_and_nameKey", [
      "organizationId",
      "kind",
      "nameKey",
    ])
    .searchIndex("search_nameKey", {
      searchField: "nameKey",
      filterFields: ["visibility", "organizationId", "kind"],
    }),

  // A product a Producător makes, with what estimating and pricing need.
  products: defineTable({
    manufacturerId: v.id("manufacturers"),
    // The generic resource this product is one make of, such as a C2TE tile
    // adhesive; variants swap products within it.
    resourceId: v.optional(v.id("resources")),
    name: v.string(),
    nameKey: v.string(),
    brand: v.optional(v.string()),
    sku: v.optional(v.string()),
    ean: v.optional(v.string()),
    // The unit norms consume it in.
    unit: v.string(),
    // How much of `unit` one package holds, e.g. 25 for a 25 kg bag.
    packageSize: v.optional(v.number()),
    packageLabel: v.optional(v.string()),
    attributes: v.array(productAttribute),
    // Kilograms per unit, for the summary's material weight and transport.
    massPerUnit: v.optional(v.number()),
    // Kilograms of CO2 equivalent per unit, from the EPD.
    embodiedCarbon: v.optional(v.number()),
    datasheetId: v.optional(v.id("_storage")),
    datasheetUrl: v.optional(v.string()),
    epdUrl: v.optional(v.string()),
    status: catalogStatus,
    createdBy: v.id("users"),
  })
    .index("by_manufacturerId_and_status", ["manufacturerId", "status"])
    .index("by_ean", ["ean"])
    .index("by_resourceId", ["resourceId"])
    .searchIndex("search_nameKey", {
      searchField: "nameKey",
      filterFields: ["manufacturerId", "status"],
    }),

  // One version of a Normă: a recipe for one unit of work. Its resources are
  // the normResources rows.
  norms: defineTable({
    source: normSource,
    visibility: visibility,
    manufacturerId: v.optional(v.id("manufacturers")),
    // The firm that owns a private norm.
    organizationId: v.optional(v.id("organizations")),
    code: v.string(),
    // The article a variant belongs to: IZF117A01 belongs to IZF117.
    baseCode: v.optional(v.string()),
    title: v.string(),
    unit: v.string(),
    category: v.optional(v.string()),
    // What the work includes and leaves out, and how it is measured.
    includes: v.optional(v.string()),
    excludes: v.optional(v.string()),
    measurement: v.optional(v.string()),
    // The code and title, normalized, for full-text search.
    searchText: v.string(),
    version: v.number(),
    // The id of the norm's first version, shared by all its versions. Set
    // right after the first version is inserted.
    lineageId: v.optional(v.id("norms")),
    status: normStatus,
    reviewNote: v.optional(v.string()),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    // Where the norm came from: the imported row and the document's edition
    // and pages.
    importedNormId: v.optional(v.id("importedNorms")),
    edition: v.optional(v.string()),
    sourcePages: v.optional(v.array(v.number())),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_lineageId_and_version", ["lineageId", "version"])
    .index("by_visibility_and_status", ["visibility", "status"])
    .index("by_organizationId_and_status", ["organizationId", "status"])
    .index("by_manufacturerId_and_status", ["manufacturerId", "status"])
    .index("by_importedNormId", ["importedNormId"])
    .index("by_code", ["code"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: [
        "visibility",
        "status",
        "organizationId",
        "manufacturerId",
        "category",
      ],
    }),

  // The resources one norm version consumes per unit of work.
  normResources: defineTable({
    normId: v.id("norms"),
    position: v.number(),
    kind: resourceKind,
    resourceId: v.optional(v.id("resources")),
    productId: v.optional(v.id("products")),
    name: v.string(),
    unit: v.string(),
    // Per unit of the norm, or a percentage of its materials when the unit is
    // "%".
    quantity: v.number(),
    // Lei without VAT, as given by the norm's source.
    referencePrice: v.optional(v.number()),
    note: v.optional(v.string()),
  })
    .index("by_normId_and_position", ["normId", "position"])
    .index("by_productId", ["productId"])
    .index("by_resourceId", ["resourceId"]),

  // Products and norms that work together, such as a complete ETICS
  // thermosystem with its adhesive, mesh, plaster and corner details.
  systems: defineTable({
    manufacturerId: v.optional(v.id("manufacturers")),
    name: v.string(),
    description: v.optional(v.string()),
    productIds: v.array(v.id("products")),
    normLineageIds: v.array(v.id("norms")),
    status: catalogStatus,
    createdBy: v.id("users"),
  }).index("by_manufacturerId", ["manufacturerId"]),

  // How firms use catalog norms, so producers see aggregate statistics: never
  // which firm, only counts, quantities and counties.
  usageEvents: defineTable({
    kind: usageEventKind,
    organizationId: v.id("organizations"),
    normId: v.optional(v.id("norms")),
    manufacturerId: v.optional(v.id("manufacturers")),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    county: v.optional(v.string()),
  })
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_normId", ["normId"])
    .index("by_organizationId", ["organizationId"]),
};

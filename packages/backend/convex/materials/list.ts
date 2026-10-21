import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { readLineItems } from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { normalizeUnit } from "../lib/text";
import { choicesFor } from "../prices/materials";
import {
  baseResources,
  coveringsOf,
  hintedMethod,
  isStale,
  layoutPresets,
  normWaste,
  presetFor,
} from "./layout";
import {
  isCountedUnit,
  kindFromLabel,
  type Package,
  type PackageKind,
  typicalPackage,
} from "./packages";
import {
  type ListMaterial,
  listMaterials,
  listTotals,
  packageFor,
  rowFor,
} from "./shoppingList";

// A Deviz with more materials lists its most expensive ones.
const MAX_MATERIALS = 300;

type Material = ListMaterial<Id<"products">, Id<"resources">>;

/**
 * The package of the store product the firm chose for a material: at the
 * Deviz's preferred store, else the one chosen last.
 */
async function storePackage(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
  material: Material,
  fallback: PackageKind | undefined,
): Promise<(Package & { label: string; store: string }) | undefined> {
  const target = material.productId
    ? { productId: material.productId }
    : material.resourceId
      ? { resourceId: material.resourceId }
      : null;
  if (!target) {
    return undefined;
  }
  const choices = (await choicesFor(ctx, estimate.organizationId, target)).sort(
    (a, b) =>
      Number(b.store === estimate.preferredStore) -
        Number(a.store === estimate.preferredStore) ||
      b.updatedAt - a.updatedAt,
  );
  for (const choice of choices) {
    const listing = await ctx.db.get("listings", choice.listingId);
    if (listing && choice.unitsPerSale > 0) {
      return {
        kind: kindFromLabel(listing.title, fallback),
        sizes: [choice.unitsPerSale],
        label: listing.title,
        store: choice.store,
      };
    }
  }
  return undefined;
}

/** The package a Producător sells its product in. */
async function productPackage(
  ctx: QueryCtx,
  material: Material,
  fallback: PackageKind | undefined,
): Promise<(Package & { label?: string }) | undefined> {
  if (!material.productId) {
    return undefined;
  }
  const product = await ctx.db.get("products", material.productId);
  if (!product?.packageSize || !(product.packageSize > 0)) {
    return undefined;
  }
  return {
    kind: kindFromLabel(product.packageLabel, fallback),
    sizes: [product.packageSize],
    label: product.packageLabel,
  };
}

/** The Mod de montaj of each Articol that lays a covering. */
function layoutRows(items: readonly Doc<"lineItems">[]) {
  const rows = [];
  for (const item of items) {
    const base = baseResources(item.resources, item.layout);
    const found = coveringsOf({ unit: item.unit, resources: base });
    if (!found) {
      continue;
    }
    rows.push({
      lineItemId: item._id,
      code: item.code,
      title: item.title,
      unit: item.unit,
      quantity: item.quantity,
      family: found.family,
      coverings: found.coverings.map((covering) => {
        const resource = item.resources.find((r) => r.key === covering.key);
        // What it consumes now and costs, per unit of the Articol.
        return {
          ...covering,
          quantity: resource?.quantity ?? 0,
          unitPrice: resource?.unitPrice ?? 0,
        };
      }),
      layout: item.layout
        ? {
            method: item.layout.method,
            waste: item.layout.waste,
            labor: item.layout.labor,
          }
        : null,
      stale: isStale(item.resources, item.layout, item),
      normWaste: normWaste(found.coverings),
      // The method the Articol's own words name, when it isn't applied.
      hinted:
        hintedMethod(`${item.title} ${item.notes ?? ""}`, found.family) ?? null,
      presets: layoutPresets[found.family].map((preset) =>
        presetFor(preset.method, found.family, found.coverings),
      ),
      laborHours: item.laborHours,
    });
  }
  return rows;
}

/**
 * A Deviz's Lista de cumpărături: its materials in whole packages, with what
 * is left over and what that costs, and the Mod de montaj of its Articole
 * that lay a covering.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const items = await readLineItems(ctx, estimate._id);
    const all = listMaterials(items);
    const firmPackages = new Map(
      (
        await ctx.db
          .query("packagings")
          .withIndex("by_organizationId_and_key", (q) =>
            q.eq("organizationId", estimate.organizationId),
          )
          .take(2000)
      ).map((row) => [row.key, row]),
    );
    const rows = [];
    for (const material of all.slice(0, MAX_MATERIALS)) {
      const firm = firmPackages.get(material.key);
      const typical = typicalPackage(material.name, material.unit);
      const pkg = packageFor(material, {
        firm:
          firm && normalizeUnit(firm.unit) === normalizeUnit(material.unit)
            ? { kind: firm.kind, sizes: firm.sizes }
            : undefined,
        store: await storePackage(ctx, estimate, material, typical?.kind),
        product: await productPackage(ctx, material, typical?.kind),
        counted: isCountedUnit(material.unit),
      });
      rows.push({ ...rowFor(material, pkg), typical });
    }
    return {
      estimate: {
        _id: estimate._id,
        organizationId: estimate.organizationId,
        number: estimate.number,
        revision: estimate.revision,
        title: estimate.title,
        locked: estimate.lockedAt !== undefined,
      },
      rows,
      totals: listTotals(rows),
      // Materials left out because the Deviz has too many.
      omitted: all.length - rows.length,
      layouts: layoutRows(items),
    };
  },
});

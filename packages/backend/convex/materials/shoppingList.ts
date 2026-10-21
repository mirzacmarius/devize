import { isPercentUnit, normalizeText } from "../lib/text";
import { type Package, typicalPackage } from "./packages";
import { type Purchase, poolingSaves, purchaseOf } from "./purchase";

// Lista de cumpărături: a Deviz's materials summed over its Articole, each
// in whole packages, with what is left over and what that costs. No
// database here (docs/adr/0027).

/** Where a material's package came from, the first that has one. */
export type PackageSource =
  // The firm set it.
  | "firm"
  // The store product the firm chose for it.
  | "store"
  // The Producător's product.
  | "product"
  // What the material is usually sold in, as Devize assumes.
  | "typical"
  // Counted in whole units, bought one by one.
  | "counted";

export type ListPackage = Package & {
  source: PackageSource;
  // What the store product or the producer calls it: "Sac 25 kg".
  label?: string;
  store?: string;
};

type ListResource<P extends string, R extends string> = {
  kind: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  productId?: P;
  resourceId?: R;
};

/** One material of a Deviz, keyed like the Coș keys it. */
export type ListMaterial<
  P extends string = string,
  R extends string = string,
> = {
  key: string;
  productId?: P;
  resourceId?: R;
  name: string;
  unit: string;
  // In `unit`, for the whole Deviz.
  need: number;
  // Lei without VAT at the Deviz's prices, for `need`.
  cost: number;
  // Each Articol's share.
  uses: { lineItemId: string; title: string; quantity: number }[];
};

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function roundLei(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A material's key: its product, else its resource, else its name and unit. */
export function materialKey(resource: {
  name: string;
  unit: string;
  productId?: string;
  resourceId?: string;
}): string {
  return resource.productId
    ? `p:${resource.productId}`
    : resource.resourceId
      ? `r:${resource.resourceId}`
      : `n:${normalizeText(resource.name)}:${resource.unit}`;
}

/** A Deviz's materials, most expensive first; "%" shares aren't bought. */
export function listMaterials<P extends string, R extends string>(
  items: readonly {
    _id: string;
    title: string;
    quantity: number;
    resources: readonly ListResource<P, R>[];
  }[],
): ListMaterial<P, R>[] {
  const byKey = new Map<string, ListMaterial<P, R>>();
  for (const item of items) {
    for (const resource of item.resources) {
      const quantity = item.quantity * resource.quantity;
      if (
        resource.kind !== "material" ||
        isPercentUnit(resource.unit) ||
        !(quantity > 0)
      ) {
        continue;
      }
      const key = materialKey(resource);
      const material = byKey.get(key) ?? {
        key,
        productId: resource.productId,
        resourceId: resource.productId ? undefined : resource.resourceId,
        name: resource.name,
        unit: resource.unit,
        need: 0,
        cost: 0,
        uses: [],
      };
      material.need += quantity;
      material.cost += quantity * resource.unitPrice;
      const use = material.uses.find((u) => u.lineItemId === item._id);
      if (use) {
        use.quantity += quantity;
      } else {
        material.uses.push({
          lineItemId: item._id,
          title: item.title,
          quantity,
        });
      }
      byKey.set(key, material);
    }
  }
  return [...byKey.values()]
    .map((material) => ({
      ...material,
      need: round4(material.need),
      cost: roundLei(material.cost),
      uses: material.uses.map((use) => ({
        ...use,
        quantity: round4(use.quantity),
      })),
    }))
    .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name, "ro"));
}

/** The first package known for a material, in the order of its sources. */
export function packageFor(
  material: { name: string; unit: string },
  known: {
    firm?: Package;
    store?: Package & { label?: string; store?: string };
    product?: Package & { label?: string };
    counted: boolean;
  },
): ListPackage | null {
  if (known.firm) {
    return { ...known.firm, source: "firm" };
  }
  if (known.store) {
    return { ...known.store, source: "store" };
  }
  if (known.product) {
    return { ...known.product, source: "product" };
  }
  const typical = typicalPackage(material.name, material.unit);
  if (typical) {
    return { ...typical, source: "typical" };
  }
  return known.counted
    ? { kind: "piece", sizes: [1], source: "counted" }
    : null;
}

export type ListRow<
  P extends string = string,
  R extends string = string,
> = ListMaterial<P, R> & {
  package: ListPackage | null;
  // Null for a material bought by quantity, such as concrete.
  purchase: Purchase | null;
  // Lei without VAT at the Deviz's prices: what the packages cost, and the
  // part of it left over.
  boughtCost: number;
  leftoverCost: number;
  // What buying for the whole Deviz saves over buying for each Articol.
  pooled: { packages: number; quantity: number };
};

/** What to buy of a material, in its packages. */
export function rowFor<P extends string, R extends string>(
  material: ListMaterial<P, R>,
  pkg: ListPackage | null,
): ListRow<P, R> {
  const price = material.need > 0 ? material.cost / material.need : 0;
  if (!pkg) {
    return {
      ...material,
      package: null,
      purchase: null,
      boughtCost: material.cost,
      leftoverCost: 0,
      pooled: { packages: 0, quantity: 0 },
    };
  }
  const purchase = purchaseOf(material.need, pkg.sizes);
  return {
    ...material,
    package: pkg,
    purchase,
    boughtCost: roundLei(purchase.bought * price),
    leftoverCost: roundLei(purchase.leftover * price),
    pooled:
      material.uses.length > 1
        ? poolingSaves(
            material.uses.map((use) => use.quantity),
            pkg.sizes,
          )
        : { packages: 0, quantity: 0 },
  };
}

/** The list's totals: what the Deviz prices, what is bought, what is left. */
export function listTotals(rows: readonly ListRow[]): {
  cost: number;
  boughtCost: number;
  leftoverCost: number;
  packages: number;
} {
  let cost = 0;
  let boughtCost = 0;
  let leftoverCost = 0;
  let packages = 0;
  for (const row of rows) {
    cost += row.cost;
    boughtCost += row.boughtCost;
    leftoverCost += row.leftoverCost;
    packages += row.purchase?.packages ?? 0;
  }
  return {
    cost: roundLei(cost),
    boughtCost: roundLei(boughtCost),
    leftoverCost: roundLei(leftoverCost),
    packages,
  };
}

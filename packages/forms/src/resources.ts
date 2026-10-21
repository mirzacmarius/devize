import {
  type ResourceKind,
  resourceKinds,
  roundLei,
} from "@devize/backend/convex/estimates/recap";
import {
  isPercentUnit,
  normalizeText,
  normalizeUnit,
} from "@devize/backend/convex/lib/text";
import type { LineItemInput } from "./input";
import { listedLine } from "./listed";

// The resource lists (C6–C9): what a group of line items consumes in total,
// one line per resource and price.

export type ResourceLine = {
  name: string;
  unit: string;
  // The total consumption and its price; neither for a percentage, such as
  // "Material mărunt 2%", which is a share of other resources.
  quantity?: number;
  unitPrice?: number;
  // Lei without VAT.
  value: number;
  // The retailer every price of the line came from.
  store?: string;
};

export type ResourceList = {
  kind: ResourceKind;
  lines: ResourceLine[];
  // What rounding each line item's unit cost to bani adds or takes away, so
  // the list adds up to the same total as the lists of quantities.
  rounding: number;
  total: number;
};

const storeNames: Record<string, string> = {
  dedeman: "Dedeman",
  leroy_merlin: "Leroy Merlin",
  hornbach: "Hornbach",
  brico_depot: "Brico Dépôt",
};

const percentOf: Record<ResourceKind, string> = {
  material: "din materiale",
  labor: "din manoperă",
  equipment: "din utilaj",
  transport: "din materiale",
};

const collator = new Intl.Collator("ro");

/** Rounds a total consumption the way the lists print it. */
function roundQuantity(value: number): number {
  return Number(value.toFixed(3)) || 0;
}

type Entry = {
  name: string;
  unit: string;
  percent: boolean;
  quantity: number;
  unitPrice: number;
  // Lei, before rounding, for a percentage.
  value: number;
  stores: Set<string | undefined>;
};

/**
 * One kind of resource, summed over line items. A resource used at two
 * prices gets two lines. A percentage ("Material mărunt 2%") becomes one line
 * with its value in lei, worked out on each line item the way its unit cost
 * was: materials and transport on the item's materials, labour and equipment
 * on their own kind.
 */
export function resourceList(
  items: readonly LineItemInput[],
  kind: ResourceKind,
): ResourceList {
  const entries = new Map<string, Entry>();
  for (const item of items) {
    const priced: Record<ResourceKind, number> = {
      material: 0,
      labor: 0,
      equipment: 0,
      transport: 0,
    };
    for (const resource of item.resources) {
      if (!isPercentUnit(resource.unit)) {
        priced[resource.kind] += resource.quantity * resource.unitPrice;
      }
    }
    for (const resource of item.resources) {
      if (resource.kind !== kind) {
        continue;
      }
      const percent = isPercentUnit(resource.unit);
      const unit = percent ? "%" : normalizeUnit(resource.unit);
      const key = percent
        ? `%|${normalizeText(resource.name)}`
        : `${resource.productId ?? resource.resourceId ?? normalizeText(resource.name)}|${unit}|${resource.unitPrice}`;
      let entry = entries.get(key);
      if (!entry) {
        entry = {
          name: resource.name,
          unit,
          percent,
          quantity: 0,
          unitPrice: resource.unitPrice,
          value: 0,
          stores: new Set(),
        };
        entries.set(key, entry);
      }
      if (percent) {
        const base =
          kind === "labor" || kind === "equipment"
            ? priced[kind]
            : priced.material;
        entry.value += (item.quantity * base * resource.quantity) / 100;
      } else {
        entry.quantity += item.quantity * resource.quantity;
        entry.stores.add(resource.store);
      }
    }
  }

  const lines = [...entries.values()]
    .sort(
      (a, b) =>
        Number(a.percent) - Number(b.percent) ||
        collator.compare(a.name, b.name) ||
        a.unitPrice - b.unitPrice,
    )
    .map((entry): ResourceLine => {
      if (entry.percent) {
        return {
          name: `${entry.name} (${percentOf[kind]})`,
          unit: "%",
          value: roundLei(entry.value),
        };
      }
      const quantity = roundQuantity(entry.quantity);
      const [store, ...others] = [...entry.stores];
      return {
        name: entry.name,
        unit: entry.unit,
        quantity,
        unitPrice: entry.unitPrice,
        value: roundLei(quantity * entry.unitPrice),
        store:
          store && others.length === 0
            ? (storeNames[store] ?? store)
            : undefined,
      };
    });

  const listed = lines.reduce(
    (sum, line) => sum + Math.round(line.value * 100),
    0,
  );
  const expected = items.reduce(
    (sum, item) => sum + Math.round(listedLine(item, 0).totals[kind] * 100),
    0,
  );
  return {
    kind,
    lines,
    rounding: (expected - listed) / 100,
    total: expected / 100,
  };
}

/** All four lists, in the order the forms number them: C6 to C9. */
export function resourceLists(items: readonly LineItemInput[]) {
  return resourceKinds.map((kind) => resourceList(items, kind));
}

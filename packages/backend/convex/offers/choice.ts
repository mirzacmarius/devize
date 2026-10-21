import type { Doc, Id } from "../_generated/dataModel";
import {
  type Amounts,
  computeRecap,
  lineTotals,
  type Markups,
  type Recap,
  roundLei,
  unitCost,
} from "../estimates/recap";
import { invalid, notFound } from "../lib/errors";
import { isPercentUnit } from "../lib/text";

// What a client's choice on an Ofertă costs: a Variantă swaps some products
// on the Deviz's line items, and optional works can be left out. Pure
// functions, so the page, the acceptance and the tests price it the same way.

type LineItem = Pick<
  Doc<"lineItems">,
  "_id" | "resources" | "unitCost" | "quantity" | "laborHours"
>;
type Variant = Pick<Doc<"variants">, "_id" | "swaps">;
type Offer = Pick<Doc<"offers">, "variantIds" | "optionalItems">;

export type Choice = {
  variantId?: Id<"variants">;
  excludedItemIds: Id<"lineItems">[];
};

export type PricedLine<T extends LineItem> = {
  item: T;
  resources: T["resources"];
  unitCost: Amounts;
  laborHours: number;
  // Lei without VAT: one unit at direct cost, and the whole line.
  unitPrice: number;
  total: number;
  included: boolean;
  // The products the Variantă put in, with the ones they replace.
  changes: { from: string; to: string }[];
};

/** A line item with a Variantă's products in place of the Deviz's own. */
export function withVariant<T extends LineItem>(
  item: T,
  variant: Variant | null,
): Omit<PricedLine<T>, "included" | "unitPrice" | "total"> {
  const swaps =
    variant?.swaps.filter((swap) => swap.lineItemId === item._id) ?? [];
  const changes: { from: string; to: string }[] = [];
  if (swaps.length > 0) {
    const resources = item.resources.map((resource) => {
      const swap = swaps.find((s) => s.resourceKey === resource.key);
      if (!swap) {
        return resource;
      }
      changes.push({ from: resource.name, to: swap.name });
      return { ...resource, name: swap.name, unitPrice: swap.unitPrice };
    });
    if (changes.length > 0) {
      const cost = unitCost(resources);
      return {
        item,
        resources,
        unitCost: cost.unitCost,
        laborHours: cost.laborHours,
        changes,
      };
    }
  }
  return {
    item,
    resources: item.resources,
    unitCost: item.unitCost,
    laborHours: item.laborHours,
    changes,
  };
}

/**
 * Every line item priced for a choice, the left-out ones too (the client sees
 * what adding them back would cost), and the Recapitulație of the rest.
 */
export function priceChoice<T extends LineItem>(
  items: readonly T[],
  variant: Variant | null,
  excludedItemIds: readonly Id<"lineItems">[],
  markups: Markups,
): { lines: PricedLine<T>[]; totals: Recap } {
  const excluded = new Set(excludedItemIds);
  const lines = items.map((item) => {
    const priced = withVariant(item, variant);
    const totals = lineTotals({
      unitCost: priced.unitCost,
      quantity: item.quantity,
      laborHours: priced.laborHours,
    });
    return {
      ...priced,
      unitPrice: sumAmounts(priced.unitCost),
      total: totals.total,
      included: !excluded.has(item._id),
    };
  });
  const totals = computeRecap(
    lines
      .filter((line) => line.included)
      .map((line) => ({
        unitCost: line.unitCost,
        quantity: line.item.quantity,
        laborHours: line.laborHours,
      })),
    markups,
  );
  return { lines, totals };
}

/** One unit's direct cost, as the client's PDF prints it. */
function sumAmounts(amounts: Amounts): number {
  return roundLei(
    amounts.material + amounts.labor + amounts.equipment + amounts.transport,
  );
}

/** What the client starts with: the Deviz as built, with its optional works as the firm set them. */
export function defaultChoice(offer: Offer): Choice {
  return {
    excludedItemIds: offer.optionalItems
      .filter((optional) => !optional.included)
      .map((optional) => optional.lineItemId),
  };
}

/**
 * Checks a choice the client's page sent: a Variantă of this Ofertă, and only
 * optional works left out. Throws for anything else.
 */
export function checkChoice(
  offer: Offer,
  choice: { variantId?: Id<"variants">; excludedItemIds?: Id<"lineItems">[] },
): Choice {
  if (choice.variantId && !offer.variantIds.includes(choice.variantId)) {
    throw notFound("variant");
  }
  const optional = new Set(offer.optionalItems.map((o) => o.lineItemId));
  const excluded = [
    ...new Set(choice.excludedItemIds ?? defaultChoice(offer).excludedItemIds),
  ];
  if (excluded.some((id) => !optional.has(id))) {
    throw invalid("excludedItemIds");
  }
  return { variantId: choice.variantId, excludedItemIds: excluded };
}

/** The materials a client reads under a line item: named products, not the "%" sundries. */
export function materialNames(resources: Doc<"lineItems">["resources"]) {
  const names = resources
    .filter(
      (resource) =>
        resource.kind === "material" && !isPercentUnit(resource.unit),
    )
    .map((resource) => resource.name.trim())
    .filter(Boolean);
  return [...new Set(names)].slice(0, 12);
}

import { isHourUnit, isPercentUnit } from "../lib/text";
import {
  type Amounts,
  applyMarkups,
  computeRecap,
  type Markups,
  type PricedResource,
  type Recap,
  roundLei,
  unitCost,
} from "./recap";

// Preț țintă: the client says "48.000 lei" and the Deviz gets there through
// its profit or through its labour, never below what it costs. Pure, so the
// dialog shows the same result the mutation applies. See docs/adr/0041.

/** Whether the target includes VAT, as a client says it, or not, as a tender does. */
export type TargetBasis = "total" | "subtotal";

export type TargetMethod = "profit" | "labor";

// Why a target can't be reached: it is below what the Deviz costs with no
// profit (or no labour), the Deviz has no labour to change, or it would take
// more than the limits allow (a 100% profit, labour ten times as dear).
export type TargetMiss = {
  ok: false;
  reason: "belowCost" | "tooHigh" | "noLabor";
  // The nearest the method gets, on the target's basis.
  limit: number;
};

export type ProfitFit = { ok: true; profit: number; recap: Recap } | TargetMiss;

export type LaborFit<R extends PricedResource> =
  | {
      ok: true;
      factor: number;
      recap: Recap;
      // Each line's resources with the labour priced again, in order.
      resources: R[][];
      // The cheapest hour of labour after the change, to hold against the
      // legal minimum; undefined when no labour is counted in hours.
      lowestHourly?: number;
    }
  | TargetMiss;

type TargetLine<R extends PricedResource> = {
  quantity: number;
  resources: readonly R[];
};

const MAX_PROFIT = 100;
const MAX_LABOR_FACTOR = 10;

/** The figure a target is compared with. */
export function onBasis(recap: Recap, basis: TargetBasis): number {
  return basis === "total" ? recap.total : recap.subtotal;
}

/** Of two candidates, the one nearer the target; the first on a tie. */
function nearer<T extends { recap: Recap }>(
  a: T,
  b: T,
  target: number,
  basis: TargetBasis,
): T {
  const da = Math.abs(onBasis(a.recap, basis) - target);
  const db = Math.abs(onBasis(b.recap, basis) - target);
  return db < da ? b : a;
}

/**
 * The profit rate, to two decimals as the Cote print, whose Deviz comes
 * nearest the target. The other Cote and the direct costs stay.
 */
export function fitProfit(
  totals: Amounts & { laborHours: number },
  markups: Markups,
  target: number,
  basis: TargetBasis,
): ProfitFit {
  const at = (profit: number) => ({
    profit,
    recap: applyMarkups(totals, totals.laborHours, { ...markups, profit }),
  });
  const none = at(0);
  if (target < onBasis(none.recap, basis)) {
    return {
      ok: false,
      reason: "belowCost",
      limit: onBasis(none.recap, basis),
    };
  }
  const most = at(MAX_PROFIT);
  if (target > onBasis(most.recap, basis)) {
    return { ok: false, reason: "tooHigh", limit: onBasis(most.recap, basis) };
  }
  // Profit is a share of the direct and indirect costs, so the rate follows
  // from the subtotal the target asks for; rounding to bani and to the
  // rate's two decimals leaves a neighbour that may come nearer.
  const base = none.recap.subtotal;
  const subtotal =
    basis === "total" ? target / (1 + markups.vat / 100) : target;
  const guess = base > 0 ? Math.round((subtotal / base - 1) * 10000) : 0;
  let best = none;
  for (let step = -2; step <= 2; step++) {
    const profit = Math.min(Math.max(guess + step, 0), MAX_PROFIT * 100) / 100;
    best = nearer(best, at(profit), target, basis);
  }
  return { ok: true, ...best };
}

/** A line's resources with each priced labour resource's price times `factor`. */
function scaleLabor<R extends PricedResource>(
  resources: readonly R[],
  factor: number,
): R[] {
  return resources.map((resource) =>
    resource.kind === "labor" && !isPercentUnit(resource.unit)
      ? { ...resource, unitPrice: roundLei(resource.unitPrice * factor) }
      : resource,
  );
}

/**
 * The labour prices, all changed by the same factor, whose Deviz comes
 * nearest the target. Materials, equipment, transport and the Cote stay.
 */
export function fitLabor<R extends PricedResource>(
  lines: readonly TargetLine<R>[],
  markups: Markups,
  target: number,
  basis: TargetBasis,
): LaborFit<R> {
  const at = (factor: number) => {
    const resources = lines.map((line) => scaleLabor(line.resources, factor));
    const recap = computeRecap(
      lines.map((line, index) => ({
        quantity: line.quantity,
        ...unitCost(resources[index] ?? []),
      })),
      markups,
    );
    return { factor, resources, recap };
  };
  const none = at(0);
  const most = at(MAX_LABOR_FACTOR);
  if (onBasis(none.recap, basis) === onBasis(most.recap, basis)) {
    return { ok: false, reason: "noLabor", limit: onBasis(none.recap, basis) };
  }
  if (target < onBasis(none.recap, basis)) {
    return {
      ok: false,
      reason: "belowCost",
      limit: onBasis(none.recap, basis),
    };
  }
  if (target > onBasis(most.recap, basis)) {
    return { ok: false, reason: "tooHigh", limit: onBasis(most.recap, basis) };
  }
  // The total grows with the factor, so halving the interval finds the two
  // factors either side of the target; the nearer one wins.
  let low = none;
  let high = most;
  for (let step = 0; step < 50; step++) {
    const middle = at((low.factor + high.factor) / 2);
    if (onBasis(middle.recap, basis) < target) {
      low = middle;
    } else {
      high = middle;
    }
    if (high.factor - low.factor < 1e-7) {
      break;
    }
  }
  const best = nearer(low, high, target, basis);
  const hourly = best.resources
    .flat()
    .filter(
      (resource) =>
        resource.kind === "labor" &&
        isHourUnit(resource.unit) &&
        resource.unitPrice > 0,
    )
    .map((resource) => resource.unitPrice);
  return {
    ok: true,
    factor: best.factor,
    recap: best.recap,
    resources: best.resources,
    lowestHourly: hourly.length > 0 ? Math.min(...hourly) : undefined,
  };
}

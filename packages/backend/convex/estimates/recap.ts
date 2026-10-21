import type { Infer } from "convex/values";
import { isHourUnit, isPercentUnit } from "../lib/text";
import type { resourceKind } from "../manufacturers/validators";
import type { amountsByKind, markups, recap } from "./validators";

// The arithmetic of a Deviz, with no database access, so it is easy to test.
// Money is summed in whole bani so totals never drift.

export type ResourceKind = Infer<typeof resourceKind>;
export type Amounts = Infer<typeof amountsByKind>;
export type Markups = Infer<typeof markups>;
export type Recap = Infer<typeof recap>;

export const resourceKinds: readonly ResourceKind[] = [
  "material",
  "labor",
  "equipment",
  "transport",
];

export const zeroAmounts: Amounts = {
  material: 0,
  labor: 0,
  equipment: 0,
  transport: 0,
};

export type PricedResource = {
  kind: ResourceKind;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type PricedLine = {
  unitCost: Amounts;
  quantity: number;
  laborHours: number;
};

/** Rounds to `decimals` places, halves away from zero, ignoring float noise. */
function round(value: number, decimals: number): number {
  const scaled = Number((Math.abs(value) * 10 ** decimals).toPrecision(15));
  const rounded = (Math.sign(value) * Math.round(scaled)) / 10 ** decimals;
  return rounded === 0 ? 0 : rounded;
}

/** Lei rounded to bani: 1.005 becomes 1.01. */
export function roundLei(lei: number): number {
  return round(lei, 2);
}

function toBani(lei: number): number {
  return Math.round(roundLei(lei) * 100);
}

function percentOf(bani: number, rate: number): number {
  return toBani((bani * rate) / 10000);
}

/**
 * What one unit of a line item costs, per kind of resource, rounded to bani
 * the way deviz forms print it, and how many labour hours it takes.
 *
 * A resource in "%" is a share of the line's other resources rather than a
 * priced quantity: "Material mărunt 3 %" adds 3% of the materials. Material
 * and transport percentages apply to the materials, labour and equipment
 * percentages to their own kind.
 */
export function unitCost(resources: readonly PricedResource[]): {
  unitCost: Amounts;
  laborHours: number;
} {
  const priced = { ...zeroAmounts };
  const percent = { ...zeroAmounts };
  let laborHours = 0;
  for (const resource of resources) {
    if (isPercentUnit(resource.unit)) {
      percent[resource.kind] += resource.quantity;
      continue;
    }
    priced[resource.kind] += resource.quantity * resource.unitPrice;
    if (resource.kind === "labor" && isHourUnit(resource.unit)) {
      laborHours += resource.quantity;
    }
  }
  return {
    unitCost: {
      material: roundLei(priced.material * (1 + percent.material / 100)),
      labor: roundLei(priced.labor * (1 + percent.labor / 100)),
      equipment: roundLei(priced.equipment * (1 + percent.equipment / 100)),
      transport: roundLei(
        priced.transport + (priced.material * percent.transport) / 100,
      ),
    },
    laborHours: round(laborHours, 4),
  };
}

/** A line's totals: each kind's unit cost times the quantity, in bani. */
function lineBani(line: PricedLine): Amounts {
  return {
    material: toBani(line.unitCost.material * line.quantity),
    labor: toBani(line.unitCost.labor * line.quantity),
    equipment: toBani(line.unitCost.equipment * line.quantity),
    transport: toBani(line.unitCost.transport * line.quantity),
  };
}

function baniToLei(amounts: Amounts): Amounts {
  return {
    material: amounts.material / 100,
    labor: amounts.labor / 100,
    equipment: amounts.equipment / 100,
    transport: amounts.transport / 100,
  };
}

/** A line item's totals in lei, per kind and altogether. */
export function lineTotals(line: PricedLine): Amounts & { total: number } {
  const bani = lineBani(line);
  return {
    ...baniToLei(bani),
    total: (bani.material + bani.labor + bani.equipment + bani.transport) / 100,
  };
}

/** The direct costs of several lines (a chapter, an object, a Deviz). */
export function sumLines(lines: readonly PricedLine[]): {
  amounts: Amounts;
  laborHours: number;
} {
  const bani = { ...zeroAmounts };
  let laborHours = 0;
  for (const line of lines) {
    const totals = lineBani(line);
    for (const kind of resourceKinds) {
      bani[kind] += totals[kind];
    }
    laborHours += line.laborHours * line.quantity;
  }
  return { amounts: baniToLei(bani), laborHours: round(laborHours, 2) };
}

/**
 * The Recapitulație from the direct costs per kind: CAM on labour joins the
 * direct costs, indirect costs are a share of the direct costs, profit a share
 * of direct plus indirect costs, and VAT a share of the total without VAT.
 */
export function applyMarkups(
  amounts: Amounts,
  laborHours: number,
  rates: Markups,
): Recap {
  const material = toBani(amounts.material);
  const labor = toBani(amounts.labor);
  const equipment = toBani(amounts.equipment);
  const transport = toBani(amounts.transport);
  const cam = percentOf(labor, rates.cam);
  const direct = material + labor + equipment + transport + cam;
  const indirect = percentOf(direct, rates.indirect);
  const profit = percentOf(direct + indirect, rates.profit);
  const subtotal = direct + indirect + profit;
  const vat = percentOf(subtotal, rates.vat);
  return {
    material: material / 100,
    labor: labor / 100,
    equipment: equipment / 100,
    transport: transport / 100,
    cam: cam / 100,
    direct: direct / 100,
    indirect: indirect / 100,
    profit: profit / 100,
    subtotal: subtotal / 100,
    vat: vat / 100,
    total: (subtotal + vat) / 100,
    laborHours: round(laborHours, 2),
  };
}

export function computeRecap(
  lines: readonly PricedLine[],
  rates: Markups,
): Recap {
  const { amounts, laborHours } = sumLines(lines);
  return applyMarkups(amounts, laborHours, rates);
}

export const emptyRecap: Recap = computeRecap([], {
  cam: 0,
  indirect: 0,
  profit: 0,
  vat: 0,
});

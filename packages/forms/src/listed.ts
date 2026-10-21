import {
  type Amounts,
  lineTotals,
  roundLei,
} from "@devize/backend/convex/estimates/recap";
import { formatUnit } from "./format";
import type { LineItemInput } from "./input";

/** A line item as the lists of quantities print it. */
export type ListedLine = {
  // The tender's position, or the line's number in its list.
  number: string;
  code: string;
  title: string;
  unit: string;
  quantity: number;
  // Lei per unit for each kind, rounded to bani, and their sum.
  unitCost: Amounts;
  unitPrice: number;
  // Each kind's unit cost times the quantity, rounded, as on the form.
  totals: Amounts & { total: number };
  // Per unit, for the Recapitulație's hours.
  laborHours: number;
};

/**
 * How a line item reads in a list: with a tender's own position, code, text,
 * unit and quantity when it was imported from one, since a bidder may not
 * change the authority's list. When the tender counts in another unit, each
 * unit price is the line's total over the tender's quantity, and the line is
 * priced again from it, so every printed row multiplies out.
 */
export function listedLine(item: LineItemInput, index: number): ListedLine {
  const ref = item.tenderRef;
  const tendered = ref?.quantity !== undefined;
  const quantity = ref?.quantity ?? item.quantity;
  const converted = tendered && quantity !== item.quantity;
  let { unitCost, laborHours } = item;
  if (converted) {
    const own = lineTotals(item);
    const perUnit = (amount: number) =>
      quantity > 0 ? roundLei(amount / quantity) : 0;
    unitCost = {
      material: perUnit(own.material),
      labor: perUnit(own.labor),
      equipment: perUnit(own.equipment),
      transport: perUnit(own.transport),
    };
    laborHours =
      quantity > 0 ? (item.laborHours * item.quantity) / quantity : 0;
  }
  return {
    number: ref?.position.trim() || String(index),
    code: ref ? (ref.code?.trim() ?? "") : item.code,
    title: ref?.text?.trim() || item.title,
    unit: (tendered && ref?.unit?.trim()) || formatUnit(item.unit),
    quantity,
    unitCost,
    unitPrice: roundLei(
      unitCost.material +
        unitCost.labor +
        unitCost.equipment +
        unitCost.transport,
    ),
    totals: lineTotals({ unitCost, quantity, laborHours }),
    laborHours,
  };
}

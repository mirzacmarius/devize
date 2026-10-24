import type { Infer } from "convex/values";
import {
  type Amounts,
  computeRecap,
  lineTotals,
  type Markups,
  type Recap,
  roundLei,
} from "../estimates/recap";
import type { attachmentRow } from "./validators";

// The arithmetic of a Situație de lucrări, with no database access: what a
// row's quantities add up to, what a statement is worth and what is kept
// back from it. Money follows the Deviz's own rules (estimates/recap.ts).

export type AttachmentRow = Infer<typeof attachmentRow>;

/** A row as the arithmetic needs it: the contract and the two quantities. */
export type StatementRow = {
  unitCost: Amounts;
  laborHours: number;
  contractQuantity: number;
  previousQuantity: number;
  quantity: number;
};

/** Rounds to `decimals` places, halves away from zero, ignoring float noise. */
export function roundTo(value: number, decimals: number): number {
  const scaled = Number((Math.abs(value) * 10 ** decimals).toPrecision(15));
  const rounded = (Math.sign(value) * Math.round(scaled)) / 10 ** decimals;
  return rounded === 0 ? 0 : rounded;
}

/** A quantity of work, as the forms print it: three decimals at most. */
export function roundQuantity(value: number): number {
  return roundTo(value, 3);
}

/** One unit's direct cost, all kinds together, as the documents print it. */
export function unitPriceOf(unitCost: Amounts): number {
  return roundLei(
    unitCost.material +
      unitCost.labor +
      unitCost.equipment +
      unitCost.transport,
  );
}

/**
 * What one Atașament row measures: count × length × width × height, with
 * the sides left out taken as 1, negative when it is to be subtracted.
 */
export function attachmentRowQuantity(row: AttachmentRow): number {
  const product =
    row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1);
  return roundQuantity(row.deduct ? -product : product);
}

/** What an Atașament adds up to, never below zero. */
export function attachmentTotal(rows: readonly AttachmentRow[]): number {
  const total = rows.reduce((sum, row) => sum + attachmentRowQuantity(row), 0);
  return Math.max(0, roundQuantity(total));
}

/** A row's figures: executed so far, what remains, and the values of each. */
export function rowFigures(row: StatementRow) {
  const cumulativeQuantity = roundQuantity(row.previousQuantity + row.quantity);
  const remainingQuantity = roundQuantity(
    row.contractQuantity - cumulativeQuantity,
  );
  const value = (quantity: number) =>
    lineTotals({
      unitCost: row.unitCost,
      quantity,
      laborHours: row.laborHours,
    }).total;
  return {
    unitPrice: unitPriceOf(row.unitCost),
    cumulativeQuantity,
    // Below zero when more was executed than contracted.
    remainingQuantity,
    // 0 to 100, and over 100 when more was executed than contracted; 100
    // for a contract quantity of 0 once anything is done.
    percent:
      row.contractQuantity > 0
        ? roundTo((cumulativeQuantity / row.contractQuantity) * 100, 1)
        : cumulativeQuantity > 0
          ? 100
          : 0,
    over: cumulativeQuantity - row.contractQuantity > 1e-9,
    value: value(row.quantity),
    cumulativeValue: value(cumulativeQuantity),
    contractValue: value(row.contractQuantity),
  };
}

/** The Recapitulație of some rows at one of their quantities. */
export function statementRecap(
  rows: readonly StatementRow[],
  markups: Markups,
  quantityOf: (row: StatementRow) => number,
): Recap {
  return computeRecap(
    rows.map((row) => ({
      unitCost: row.unitCost,
      laborHours: row.laborHours,
      quantity: Math.max(0, quantityOf(row)),
    })),
    markups,
  );
}

/** The period's, the cumulative and the contract's Recapitulație. */
export function statementTotals(
  rows: readonly StatementRow[],
  markups: Markups,
) {
  const period = statementRecap(rows, markups, (row) => row.quantity);
  const cumulative = statementRecap(
    rows,
    markups,
    (row) => row.previousQuantity + row.quantity,
  );
  const contract = statementRecap(rows, markups, (row) => row.contractQuantity);
  return {
    period,
    cumulative,
    contract,
    // What is left to execute, in lei without VAT; 0 once it is all done.
    remainingSubtotal: Math.max(
      0,
      roundLei(contract.subtotal - cumulative.subtotal),
    ),
    // How much of the contract's value is done, 0 to 100 and over.
    percent:
      contract.subtotal > 0
        ? roundTo((cumulative.subtotal / contract.subtotal) * 100, 1)
        : 0,
  };
}

/**
 * The Garanție de bună execuție kept back from a statement: its share of
 * the statement's value without VAT, in lei. Nothing when the guarantee is
 * a bank instrument, or when there is none.
 */
export function retentionOf(
  subtotal: number,
  guarantee: { percent: number; method: "retention" | "instrument" } | null,
): number {
  if (guarantee?.method !== "retention") {
    return 0;
  }
  return roundLei((subtotal * guarantee.percent) / 100);
}

/** The shares of HG 395/2016 art. 42: 70 % after the first PV, 30 % after the final. */
export const releaseShares = { completion: 70, final: 30 } as const;

/** What each release of a guarantee of `total` lei is worth. */
export function releaseAmounts(total: number) {
  const completion = roundLei((total * releaseShares.completion) / 100);
  return { completion, final: roundLei(total - completion) };
}

/** A calendar date some days later, as YYYY-MM-DD; undefined for a bad date. */
export function addDays(date: string, days: number): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return undefined;
  }
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  )
    .toISOString()
    .slice(0, 10);
}

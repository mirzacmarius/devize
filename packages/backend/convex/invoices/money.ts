import type { Infer } from "convex/values";
import { roundLei } from "../estimates/recap";
import type {
  invoiceLine,
  invoiceLineInput,
  invoiceTotals,
  vatCategory,
} from "./validators";

// The arithmetic of an invoice, with no database access: each line's value
// rounded to bani, and VAT worked out on the taxable amount of each rate,
// as EN 16931 wants it (BR-CO-17), not summed line by line.

export type InvoiceLine = Infer<typeof invoiceLine>;
export type InvoiceLineInput = Infer<typeof invoiceLineInput>;
export type InvoiceTotals = Infer<typeof invoiceTotals>;
export type VatCategory = Infer<typeof vatCategory>;

/** The VAT category a rate implies when the line doesn't say: standard above 0. */
export function defaultCategory(
  vatRate: number,
  sellerVatRegistered: boolean,
): VatCategory {
  if (vatRate > 0) {
    return "S";
  }
  return sellerVatRegistered ? "Z" : "O";
}

/** A line with its value, from what the page sends. */
export function priceLine(
  input: InvoiceLineInput,
  sellerVatRegistered: boolean,
): InvoiceLine {
  const vatCategory =
    input.vatCategory ?? defaultCategory(input.vatRate, sellerVatRegistered);
  return {
    description: input.description,
    unit: input.unit,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    vatRate: input.vatRate,
    vatCategory,
    net: roundLei(input.quantity * input.unitPrice),
    lineItemId: input.lineItemId,
    settles: input.settles,
  };
}

/** The VAT on a line as it prints, for information: the totals decide. */
export function lineVat(line: Pick<InvoiceLine, "net" | "vatRate">): number {
  return roundLei((line.net * line.vatRate) / 100);
}

/**
 * The invoice's totals. Lines are grouped by category and rate; each
 * group's VAT is its taxable amount times its rate, rounded to bani.
 */
export function computeTotals(lines: readonly InvoiceLine[]): InvoiceTotals {
  const groups = new Map<string, InvoiceTotals["byRate"][number]>();
  for (const line of lines) {
    const key = `${line.vatCategory}:${line.vatRate}`;
    const group = groups.get(key) ?? {
      vatRate: line.vatRate,
      vatCategory: line.vatCategory,
      net: 0,
      vat: 0,
    };
    group.net = roundLei(group.net + line.net);
    groups.set(key, group);
  }
  const byRate = [...groups.values()]
    .map((group) => ({
      ...group,
      vat: roundLei((group.net * group.vatRate) / 100),
    }))
    .sort((a, b) => b.vatRate - a.vatRate);
  const net = roundLei(byRate.reduce((sum, group) => sum + group.net, 0));
  const vat = roundLei(byRate.reduce((sum, group) => sum + group.vat, 0));
  return { net, vat, total: roundLei(net + vat), byRate };
}

/** Lei as a decimal string with two places, as the XML writes amounts. */
export function amount(value: number): string {
  return roundLei(value).toFixed(2);
}

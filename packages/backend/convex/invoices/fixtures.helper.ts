import type { InvoiceParty } from "./helpers";
import type { InvoiceLine } from "./money";
import { computeTotals } from "./money";
import type { InvoiceLike } from "./rules";
import type { UblInvoice } from "./ubl";

// Made-up parties and lines for the invoice tests. Two dots in the name keep
// the file out of the deployment.

export const seller: InvoiceParty = {
  name: "Ana Construct SRL",
  kind: "company",
  cui: "2816464",
  vatRegistered: true,
  tradeRegister: "J12/1234/2020",
  address: "Str. Fabricii 10",
  city: "Cluj-Napoca",
  county: "Cluj",
  postalCode: "400001",
  email: "office@anaconstruct.ro",
  phone: "0722 123 456",
  iban: "RO49AAAA1B31007593840000",
  bank: "Banca Exemplu",
  shareCapital: 200,
};

export const buyer: InvoiceParty = {
  name: "Ion Popescu",
  kind: "person",
  cui: "1900101123456",
  vatRegistered: false,
  address: "Bd. Unirii 5",
  city: "Sector 3",
  county: "București",
};

export function line(fields: Partial<InvoiceLine> = {}): InvoiceLine {
  const quantity = fields.quantity ?? 1;
  const unitPrice = fields.unitPrice ?? 1000;
  return {
    description: "Lucrări de construcții „Baie apartament”",
    unit: "buc",
    quantity,
    unitPrice,
    vatRate: 21,
    vatCategory: "S",
    net: Math.round(quantity * unitPrice * 100) / 100,
    ...fields,
  };
}

/** An invoice the XML has nothing to complain about. */
export function completeInvoice(
  fields: Partial<UblInvoice> & { notes?: readonly string[] } = {},
): UblInvoice & { notes: readonly string[] } {
  const lines = fields.lines ?? [line()];
  return {
    code: "DVZ-0001",
    kind: "final",
    issueDate: "2026-10-23",
    dueDate: "2026-11-07",
    seller,
    buyer,
    lines,
    totals: computeTotals(lines),
    notes: [],
    preceding: [],
    ...fields,
  };
}

/** The same invoice as the checks read it: the row's note is one text. */
export function ruleInvoice(
  fields: Partial<UblInvoice> & { note?: string } = {},
): InvoiceLike {
  const { notes: _notes, ...rest } = completeInvoice(fields);
  return { ...rest, notes: fields.note };
}

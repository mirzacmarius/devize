import { v } from "convex/values";

// What an invoice is for: the advance a client pays on accepting an Ofertă,
// a Situație de lucrări, the rest of the Deviz once the works are done, or
// the reversal (storno) of an invoice issued by mistake.
export const invoiceKind = v.union(
  v.literal("advance"),
  v.literal("statement"),
  v.literal("final"),
  v.literal("storno"),
);

// A draft has no number and can change or be deleted. Issuing gives it the
// next number of its series and freezes it: an issued invoice is paid or,
// when it was never sent anywhere, cancelled; a wrong one is reversed by a
// storno invoice.
export const invoiceStatus = v.union(
  v.literal("draft"),
  v.literal("issued"),
  v.literal("paid"),
  v.literal("cancelled"),
);

// The VAT category of a line, as EN 16931 codes it (UNCL5305): standard or
// reduced rate, zero rated, exempt, not subject to VAT (a firm that doesn't
// charge VAT) and reverse charge.
export const vatCategory = v.union(
  v.literal("S"),
  v.literal("Z"),
  v.literal("E"),
  v.literal("O"),
  v.literal("AE"),
);

// A firm or a client as the invoice names them, copied when the invoice is
// made so a later change to the client's card never alters an issued invoice.
// The address is kept apart (street, city, county, postal code) because the
// e-Factura XML wants it so.
export const invoiceParty = v.object({
  name: v.string(),
  kind: v.union(v.literal("company"), v.literal("person")),
  // CUI without "RO", or a person's CNP when they gave it.
  cui: v.optional(v.string()),
  // Whether the party is registered for VAT: its CUI goes in the XML with the
  // "RO" prefix as a VAT identifier.
  vatRegistered: v.boolean(),
  tradeRegister: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  county: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  // The seller's bank account and share capital, printed on the invoice.
  iban: v.optional(v.string()),
  bank: v.optional(v.string()),
  shareCapital: v.optional(v.number()),
});

/** One line of an invoice, in lei without VAT. */
export const invoiceLine = v.object({
  description: v.string(),
  unit: v.string(),
  // Negative for a line that reverses an earlier invoice, such as the advance
  // deducted on the final invoice.
  quantity: v.number(),
  // Lei without VAT per unit, never negative (EN 16931 BR-27).
  unitPrice: v.number(),
  vatRate: v.number(),
  vatCategory,
  // quantity × unitPrice, rounded to bani.
  net: v.number(),
  // The Articol de deviz the line bills, when it bills one.
  lineItemId: v.optional(v.id("lineItems")),
  // The invoice this line settles: an advance deducted here.
  settles: v.optional(v.id("invoices")),
});

/** The invoice's totals, with VAT worked out on the taxable amount of each rate. */
export const invoiceTotals = v.object({
  net: v.number(),
  vat: v.number(),
  total: v.number(),
  byRate: v.array(
    v.object({
      vatRate: v.number(),
      vatCategory,
      net: v.number(),
      vat: v.number(),
    }),
  ),
});

export const paymentMethod = v.union(
  v.literal("transfer"),
  v.literal("cash"),
  v.literal("card"),
  v.literal("other"),
);

export const invoicePayment = v.object({
  // YYYY-MM-DD.
  date: v.string(),
  amount: v.number(),
  method: paymentMethod,
  note: v.optional(v.string()),
});

// Where the invoice stands with ANAF's e-Factura system: not sent, being
// uploaded, waiting for ANAF to check it, accepted (ANAF signed it and gave it
// a download id), rejected (ANAF listed errors), or the upload itself failed.
export const efacturaStatus = v.union(
  v.literal("not_sent"),
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("failed"),
);

export const efacturaState = v.object({
  status: efacturaStatus,
  // ANAF's index_incarcare from the upload, and id_descarcare once accepted.
  uploadIndex: v.optional(v.string()),
  downloadId: v.optional(v.string()),
  uploadedAt: v.optional(v.number()),
  checkedAt: v.optional(v.number()),
  errors: v.optional(v.array(v.string())),
  // The last day to send the invoice to ANAF: five working days from issue
  // (OUG 89/2025), as YYYY-MM-DD.
  deadline: v.string(),
  // The signed archive ANAF returned for an accepted invoice.
  responseStorageId: v.optional(v.id("_storage")),
});

/** How a draft's lines reach the server. */
export const invoiceLineInput = v.object({
  description: v.string(),
  unit: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  vatRate: v.number(),
  vatCategory: v.optional(vatCategory),
  lineItemId: v.optional(v.id("lineItems")),
  settles: v.optional(v.id("invoices")),
});

/** How a draft's buyer is corrected before issuing. */
export const buyerInput = v.object({
  name: v.optional(v.string()),
  kind: v.optional(v.union(v.literal("company"), v.literal("person"))),
  cui: v.optional(v.string()),
  vatRegistered: v.optional(v.boolean()),
  tradeRegister: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  county: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
});

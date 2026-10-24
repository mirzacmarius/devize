import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  efacturaState,
  invoiceKind,
  invoiceLine,
  invoiceParty,
  invoicePayment,
  invoiceStatus,
  invoiceTotals,
} from "./validators";

export const invoiceTables = {
  // A firm's invoicing settings: its bank account, what Legea 31/1990 wants
  // on every invoice, and the mentions it adds. One row per firm, made the
  // first time the firm saves one. The series live in `invoiceSeries`.
  invoiceSettings: defineTable({
    organizationId: v.id("organizations"),
    iban: v.optional(v.string()),
    bank: v.optional(v.string()),
    // Capitalul social, in lei, which an SRL's or SA's invoices state.
    shareCapital: v.optional(v.number()),
    // The registered office's city and postal code: the firm's address is one
    // line, while the e-Factura XML wants the city and county apart.
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    // Days from issue to the due date.
    paymentTermDays: v.number(),
    // A firm under "TVA la încasare" (Codul fiscal art. 282) prints it.
    vatOnCollection: v.boolean(),
    // Mentions printed at the foot of every invoice.
    footer: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_organizationId", ["organizationId"]),

  // A series of invoice numbers (seria DVZ, numerele de la 1): each issued
  // invoice takes the series' next number inside the issuing mutation, so a
  // series never skips or repeats a number.
  invoiceSeries: defineTable({
    organizationId: v.id("organizations"),
    code: v.string(),
    nextNumber: v.number(),
    // The series new invoices take unless another is chosen.
    isDefault: v.boolean(),
    active: v.boolean(),
  }).index("by_organizationId_and_code", ["organizationId", "code"]),

  // Facturi. A draft can change; an issued invoice keeps the parties, lines
  // and totals as they were, since it is a fiscal document.
  invoices: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    kind: invoiceKind,
    status: invoiceStatus,
    // Set when the invoice is issued.
    series: v.optional(v.string()),
    number: v.optional(v.number()),
    // YYYY-MM-DD.
    issueDate: v.string(),
    dueDate: v.string(),
    seller: invoiceParty,
    buyer: invoiceParty,
    lines: v.array(invoiceLine),
    totals: invoiceTotals,
    // Garanția de bună execuție withheld from a Situație de lucrări: it
    // reduces what is paid now, not the taxable amount.
    retention: v.optional(
      v.object({
        percent: v.number(),
        amount: v.number(),
      }),
    ),
    // An advance: the accepted Ofertă and the share of it billed.
    offerId: v.optional(v.id("offers")),
    advancePercent: v.optional(v.number()),
    // The advance invoices deducted on this one.
    settlesInvoiceIds: v.optional(v.array(v.id("invoices"))),
    // A storno: the invoice it reverses; and on that one, the storno.
    stornoOf: v.optional(v.id("invoices")),
    stornoedBy: v.optional(v.id("invoices")),
    // The Situație de lucrări billed, by its id as text: the statements
    // module keeps its own tables and shows the invoice through this index.
    workStatementId: v.optional(v.string()),
    // A Situație de lucrări's period, as the XML's InvoicePeriod.
    period: v.optional(v.object({ start: v.string(), end: v.string() })),
    // The invoice's note (e-Factura BT-22, at most 300 characters).
    notes: v.optional(v.string()),
    // What the issued invoice states besides its lines: "TVA la încasare"
    // and the firm's footer, as they stood when it was issued.
    mentions: v.optional(v.array(v.string())),
    payments: v.array(invoicePayment),
    paidAmount: v.number(),
    paidAt: v.optional(v.number()),
    efactura: efacturaState,
    // ANAF's validator's last word on this invoice's XML.
    validation: v.optional(
      v.object({
        checkedAt: v.number(),
        ok: v.boolean(),
        messages: v.array(v.string()),
      }),
    ),
    createdBy: v.id("users"),
    issuedBy: v.optional(v.id("users")),
    issuedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_estimateId", ["estimateId"])
    .index("by_organizationId_and_updatedAt", ["organizationId", "updatedAt"])
    .index("by_organizationId_and_status_and_updatedAt", [
      "organizationId",
      "status",
      "updatedAt",
    ])
    .index("by_organizationId_and_series_and_number", [
      "organizationId",
      "series",
      "number",
    ])
    .index("by_offerId", ["offerId"])
    .index("by_workStatementId", ["workStatementId"])
    // For the check of invoices ANAF is still processing.
    .index("by_efactura_status", ["efactura.status"]),
};

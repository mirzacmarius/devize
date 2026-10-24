import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { roundLei } from "../estimates/recap";
import { requireFirmDoc } from "../lib/access";
import { estimateCode } from "../offers/helpers";
import { formatLei } from "../offers/notify";
import {
  codeOf,
  mentionsOf,
  settingsOf,
  textDate,
  textPercent,
} from "./helpers";
import { buildUbl } from "./ubl";

// The e-Factura XML of an invoice, from the row as it stands: a draft's to
// try against ANAF's validator before issuing, an issued one's to download
// or to send.

/** The number a draft's XML carries, since ANAF's validator wants one. */
export const DRAFT_CODE = "CIORNA";

/** What the payment terms say: when, and what is withheld as guarantee. */
export function paymentTermsOf(
  invoice: Pick<Doc<"invoices">, "dueDate" | "retention" | "totals">,
): string {
  const parts = [`Scadență ${textDate(invoice.dueDate)}`];
  if (invoice.retention && invoice.retention.amount > 0) {
    parts.push(
      `Garanție de bună execuție reținută ${textPercent(invoice.retention.percent)}: ${formatLei(invoice.retention.amount)} lei`,
      `Rest de plată: ${formatLei(roundLei(invoice.totals.total - invoice.retention.amount))} lei`,
    );
  }
  return parts.join(". ");
}

/** The name the XML file downloads under. */
export function xmlFileName(
  invoice: Pick<Doc<"invoices">, "series" | "number">,
): string {
  return `Factura-${codeOf(invoice) ?? "ciorna"}.xml`;
}

/** The UBL document of an invoice, with the invoices it refers to. */
export async function ublFor(
  ctx: QueryCtx,
  invoice: Doc<"invoices">,
): Promise<string> {
  const preceding: { code: string; issueDate: string }[] = [];
  const refs = [
    ...(invoice.stornoOf ? [invoice.stornoOf] : []),
    ...(invoice.settlesInvoiceIds ?? []),
  ];
  for (const id of refs) {
    const other = await ctx.db.get("invoices", id);
    const code =
      other && other.organizationId === invoice.organizationId
        ? codeOf(other)
        : null;
    if (other && code) {
      preceding.push({ code, issueDate: other.issueDate });
    }
  }
  const estimate = await ctx.db.get("estimates", invoice.estimateId);
  const mentions =
    invoice.mentions ??
    mentionsOf(await settingsOf(ctx, invoice.organizationId));
  return buildUbl({
    code: codeOf(invoice) ?? DRAFT_CODE,
    kind: invoice.kind,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    seller: invoice.seller,
    buyer: invoice.buyer,
    lines: invoice.lines,
    totals: invoice.totals,
    notes: [...(invoice.notes ? [invoice.notes] : []), ...mentions],
    preceding,
    contract: estimate ? `Deviz ${estimateCode(estimate)}` : undefined,
    period: invoice.period,
    paymentTerms: paymentTermsOf(invoice),
  });
}

/** An invoice's XML, for the download and for ANAF's validator. */
export const forInvoice = query({
  args: { invoiceId: v.id("invoices") },
  returns: v.object({ xml: v.string(), fileName: v.string() }),
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(ctx, "invoices", args.invoiceId);
    return { xml: await ublFor(ctx, doc), fileName: xmlFileName(doc) };
  },
});

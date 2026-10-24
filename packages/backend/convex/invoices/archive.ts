import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { requireMember } from "../lib/access";
import { estimateCode } from "../offers/helpers";
import { codeOf, mentionsOf, settingsOf } from "./helpers";
import { ublFor } from "./xml";

// A firm's issued invoices as an archive it keeps itself: Legea 82/1991
// art. 25 has the firm keep them 5 years, and they go with the firm when its
// last member deletes their account (ADR 0050). The browser draws each PDF
// and packs the files, as it does for one invoice.

/** The statuses of an invoice that has a number: everything but a draft. */
const NUMBERED = ["issued", "paid", "cancelled"] as const;

/**
 * How many numbered invoices a firm has, counted up to `max`: enough to say
 * "12 facturi" or "peste 100" without reading them all.
 */
export async function numberedInvoiceCount(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  max: number,
): Promise<number> {
  let count = 0;
  for (const status of NUMBERED) {
    if (count >= max) {
      break;
    }
    const rows = await ctx.db
      .query("invoices")
      .withIndex("by_organizationId_and_status_and_updatedAt", (q) =>
        q.eq("organizationId", organizationId).eq("status", status),
      )
      .take(max - count);
    count += rows.length;
  }
  return count;
}

/** One invoice as the archive holds it: what its PDF prints, and its XML. */
async function archived(
  ctx: QueryCtx,
  invoice: Doc<"invoices">,
  settings: Doc<"invoiceSettings"> | null,
) {
  const estimate = await ctx.db.get("estimates", invoice.estimateId);
  const reversed = invoice.stornoOf
    ? await ctx.db.get("invoices", invoice.stornoOf)
    : null;
  const issuer = invoice.issuedBy
    ? await ctx.db.get("users", invoice.issuedBy)
    : null;
  return {
    _id: invoice._id,
    code: codeOf(invoice),
    kind: invoice.kind,
    status: invoice.status,
    series: invoice.series,
    number: invoice.number,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    seller: invoice.seller,
    buyer: invoice.buyer,
    lines: invoice.lines,
    totals: invoice.totals,
    retention: invoice.retention,
    notes: invoice.notes,
    payments: invoice.payments,
    paidAmount: invoice.paidAmount,
    advancePercent: invoice.advancePercent,
    mentions: invoice.mentions ?? mentionsOf(settings),
    efactura: {
      status: invoice.efactura.status,
      uploadIndex: invoice.efactura.uploadIndex,
    },
    estimate: estimate
      ? { code: estimateCode(estimate), title: estimate.title }
      : null,
    stornoOf:
      reversed && reversed.organizationId === invoice.organizationId
        ? { code: codeOf(reversed), issueDate: reversed.issueDate }
        : null,
    // Who issued it, printed under "Întocmit de".
    issuer: issuer?.name,
    // A cancelled invoice never went to ANAF, so it has no XML to keep.
    xml: invoice.status === "cancelled" ? null : await ublFor(ctx, invoice),
  };
}

/**
 * A page of a firm's numbered invoices, by series and number, each with what
 * its PDF needs and its e-Factura XML. Drafts are left out: they aren't
 * documents yet.
 */
export const page = query({
  args: {
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    // Series and number never change once issued, so a page can't skip or
    // repeat an invoice that is paid while the archive is being made.
    const result = await ctx.db
      .query("invoices")
      .withIndex("by_organizationId_and_series_and_number", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .paginate(args.paginationOpts);
    const settings = await settingsOf(ctx, args.organizationId);
    const rows = [];
    for (const invoice of result.page) {
      if (invoice.status !== "draft") {
        rows.push(await archived(ctx, invoice, settings));
      }
    }
    return { ...result, page: rows };
  },
});

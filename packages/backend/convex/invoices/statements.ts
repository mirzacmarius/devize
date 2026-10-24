import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireFirmDoc } from "../lib/access";
import { appError, notFound } from "../lib/errors";
import { estimateCode } from "../offers/helpers";
import { readStatementForInvoice } from "../progress/invoiceData";
import { MAX_DESCRIPTION, textDate } from "./helpers";
import { insertDraft } from "./invoices";
import { defaultCategory } from "./money";

// The invoice of a Situație de lucrări the beneficiary confirmed: one line
// for the period's works at the statement's value without VAT, the period
// in the XML, and the Garanție de bună execuție the statement keeps back
// shown after the total. The statement's rows stay on the statement, which
// goes with the invoice.

/** The line's text, cut so the Deviz's title never pushes it past the XML's limit. */
export function statementLine(
  statement: {
    number: number;
    date: string;
    periodStart: string;
    periodEnd: string;
  },
  estimate: { code: string; title: string },
): string {
  const prefix = `Lucrări executate conform Situației de lucrări nr. ${statement.number} din ${textDate(
    statement.date,
  )}, perioada ${textDate(statement.periodStart)} – ${textDate(statement.periodEnd)}, deviz ${estimate.code}`;
  const room = MAX_DESCRIPTION - prefix.length - 3;
  if (room < 8) {
    return prefix;
  }
  const title =
    estimate.title.length > room
      ? `${estimate.title.slice(0, room - 1).trimEnd()}…`
      : estimate.title;
  return `${prefix} „${title}”`;
}

/**
 * Starts the invoice of an approved statement. A statement is invoiced
 * once: while its invoice stands (a draft, or issued and not reversed), no
 * second one can be made.
 */
export const fromStatement = mutation({
  args: { workStatementId: v.id("workStatements") },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    const { doc: statement, userId } = await requireFirmDoc(
      ctx,
      "workStatements",
      args.workStatementId,
    );
    if (statement.status !== "approved") {
      throw appError("locked", "unapproved");
    }
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_workStatementId", (q) =>
        q.eq("workStatementId", statement._id),
      )
      .take(10);
    if (
      existing.some(
        (invoice) =>
          invoice.status !== "cancelled" && invoice.stornoedBy === undefined,
      )
    ) {
      throw appError("in_use", "statement");
    }
    const data = await readStatementForInvoice(ctx, statement._id);
    const estimate = await ctx.db.get("estimates", data.estimateId);
    if (!estimate) {
      throw notFound("estimate");
    }
    const firm = await ctx.db.get("organizations", estimate.organizationId);
    const vatPayer = firm?.vatPayer ?? true;
    const vatRate = vatPayer ? data.markups.vat : 0;
    return await insertDraft(ctx, estimate, userId, {
      kind: "statement",
      workStatementId: statement._id,
      period: { start: data.periodStart, end: data.periodEnd },
      retention:
        data.retention.amount > 0
          ? { percent: data.retention.percent, amount: data.retention.amount }
          : undefined,
      lines: [
        {
          description: statementLine(data, {
            code: estimateCode(estimate),
            title: estimate.title,
          }),
          unit: "buc",
          quantity: 1,
          unitPrice: data.totals.subtotal,
          vatRate,
          vatCategory: defaultCategory(vatRate, vatPayer),
        },
      ],
    });
  },
});

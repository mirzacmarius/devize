import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { notFound } from "../lib/errors";
import { rowFigures, statementTotals } from "./arithmetic";
import { guaranteeFor, readRows } from "./helpers";

// What an invoice takes from a Situație de lucrări. The invoicing module
// calls this inside its own functions, after its own access check, so the
// shape here is a contract between the two: keep its fields stable.

/**
 * A statement as an invoice reads it: each row's executed quantity at the
 * contract's unit price (direct cost, lei without VAT), the period's
 * Recapitulație, which adds CAM, indirect costs and profit on the sums, and
 * the Garanție de bună execuție kept back from it.
 */
export async function readStatementForInvoice(
  ctx: QueryCtx,
  statementId: Id<"workStatements">,
) {
  const statement = await ctx.db.get("workStatements", statementId);
  const estimate = statement
    ? await ctx.db.get("estimates", statement.estimateId)
    : null;
  if (!statement || !estimate) {
    throw notFound("statement");
  }
  const rows = await readRows(ctx, statement._id);
  const totals = statementTotals(rows, statement.markups);
  const guarantee = await guaranteeFor(ctx, estimate._id);
  return {
    statementId: statement._id,
    estimateId: estimate._id,
    organizationId: estimate.organizationId,
    number: statement.number,
    status: statement.status,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    date: statement.date,
    estimate: {
      number: estimate.number,
      revision: estimate.revision,
      title: estimate.title,
      clientId: estimate.clientId,
      siteAddress: estimate.siteAddress,
    },
    markups: statement.markups,
    rows: rows.map((row) => {
      const figures = rowFigures(row);
      return {
        lineItemId: row.lineItemId,
        code: row.code,
        title: row.title,
        unit: row.unit,
        quantity: row.quantity,
        unitPrice: figures.unitPrice,
        value: figures.value,
      };
    }),
    totals: totals.period,
    retention: {
      percent:
        guarantee?.method === "retention" && statement.retention > 0
          ? guarantee.percent
          : 0,
      amount: statement.retention,
    },
    cumulative: {
      subtotal: totals.cumulative.subtotal,
      total: totals.cumulative.total,
    },
    contract: {
      subtotal: totals.contract.subtotal,
      total: totals.contract.total,
    },
  };
}

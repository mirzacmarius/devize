import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { type StatementRow, statementTotals } from "./arithmetic";
import { contractRows } from "./contract";
import { readRows, readStatements } from "./helpers";

// How far a Deviz's works have come, for the statements, the guarantee and
// the receptions alike.

/**
 * The contract and the progress of a Deviz: its rows as the last statement
 * holds them, or as the first statement would snapshot them, with the
 * totals through the last statement and through the last approved one.
 */
export async function progressOf(ctx: QueryCtx, estimate: Doc<"estimates">) {
  const statements = await readStatements(ctx, estimate._id);
  const latest = statements.at(-1) ?? null;
  const lastApproved =
    [...statements].reverse().find((s) => s.status === "approved") ?? null;
  const rows: StatementRow[] = latest
    ? await readRows(ctx, latest._id)
    : (await contractRows(ctx, estimate)).map((row) => ({
        ...row,
        previousQuantity: 0,
        quantity: 0,
      }));
  const markups = latest?.markups ?? estimate.markups;
  const totals = statementTotals(rows, markups);
  const approvedRows = lastApproved
    ? lastApproved._id === latest?._id
      ? rows
      : await readRows(ctx, lastApproved._id)
    : [];
  const approved = statementTotals(approvedRows, markups);
  return {
    statements,
    latest,
    lastApproved,
    rows,
    markups,
    contract: totals.contract,
    // Through the last statement, draft included.
    executed: totals.cumulative,
    percent: totals.percent,
    remainingSubtotal: totals.remainingSubtotal,
    // Through the last approved statement.
    approved: lastApproved ? approved.cumulative : null,
    approvedPercent: lastApproved ? approved.percent : 0,
    // When the works ran, from the first period to the last approved one.
    executionStart: statements[0]?.periodStart,
    executionEnd: lastApproved?.periodEnd,
    // The Garanție de bună execuție kept back so far, lei without VAT.
    withheld: statements
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => Math.round(sum * 100 + s.retention * 100) / 100, 0),
  };
}

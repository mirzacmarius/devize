import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid } from "../lib/errors";
import { retentionOf, statementRecap, type StatementRow } from "./arithmetic";

// What the statements, the receptions and the guarantee of a Deviz share.

/** Every Situație de lucrări of a Deviz, the first one first. */
export async function readStatements(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"workStatements">[]> {
  return await ctx.db
    .query("workStatements")
    .withIndex("by_estimateId_and_number", (q) =>
      q.eq("estimateId", estimateId),
    )
    .take(500);
}

/** The last Situație de lucrări of a Deviz, the only one that can change. */
export async function latestStatement(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"workStatements"> | null> {
  return await ctx.db
    .query("workStatements")
    .withIndex("by_estimateId_and_number", (q) =>
      q.eq("estimateId", estimateId),
    )
    .order("desc")
    .first();
}

/** A statement's rows, in the Deviz's order. */
export async function readRows(
  ctx: QueryCtx,
  statementId: Id<"workStatements">,
): Promise<Doc<"workStatementRows">[]> {
  const rows: Doc<"workStatementRows">[] = [];
  const query = ctx.db
    .query("workStatementRows")
    .withIndex("by_statementId_and_position", (q) =>
      q.eq("statementId", statementId),
    );
  for await (const row of query) {
    rows.push(row);
  }
  return rows;
}

/** The Deviz's Garanție de bună execuție, if the firm set one. */
export async function guaranteeFor(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"guarantees"> | null> {
  return await ctx.db
    .query("guarantees")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .unique();
}

/**
 * A statement the signed-in user may change: their firm's, still a draft,
 * and the Deviz's last one, so the quantities of the statements that follow
 * it stay right.
 */
export async function requireDraftStatement(
  ctx: MutationCtx,
  statementId: Id<"workStatements">,
) {
  const { doc: statement, userId } = await requireFirmDoc(
    ctx,
    "workStatements",
    statementId,
  );
  if (statement.status !== "draft") {
    throw appError("locked", "statement");
  }
  const latest = await latestStatement(ctx, statement.estimateId);
  if (latest?._id !== statement._id) {
    throw appError("locked", "statement");
  }
  return { statement, userId };
}

/** Recomputes a statement's cached Recapitulație and retention from its rows. */
export async function refreshStatement(
  ctx: MutationCtx,
  statement: Doc<"workStatements">,
  rows?: readonly StatementRow[],
) {
  const all = rows ?? (await readRows(ctx, statement._id));
  const totals = statementRecap(all, statement.markups, (row) => row.quantity);
  const guarantee = await guaranteeFor(ctx, statement.estimateId);
  await ctx.db.patch("workStatements", statement._id, {
    totals,
    retention: retentionOf(totals.subtotal, guarantee),
    updatedAt: Date.now(),
  });
}

/** Whether a Deviz has Situații de lucrări, so it is under execution. */
export async function hasStatements(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<boolean> {
  return (await latestStatement(ctx, estimateId)) !== null;
}

/** A quantity of work: finite, not negative and not absurd. */
export function checkQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1e9) {
    throw invalid("quantity");
  }
  return quantity;
}

/** The value of the works executed so far, lei without VAT, from the last statement counted. */
export function cumulativeSubtotal(
  rows: readonly StatementRow[],
  markups: Doc<"workStatements">["markups"],
): number {
  return statementRecap(
    rows,
    markups,
    (row) => row.previousQuantity + row.quantity,
  ).subtotal;
}

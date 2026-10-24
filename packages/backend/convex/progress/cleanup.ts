import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Deletes up to `limit` of a Deviz's statements, their rows, its receptions
 * and its guarantee, and returns how many it deleted. Called in batches by
 * `estimates.deleteRows` when a Deviz is deleted.
 */
export async function deleteProgressRows(
  ctx: MutationCtx,
  estimateId: Id<"estimates">,
  limit: number,
): Promise<number> {
  if (limit <= 0) {
    return 0;
  }
  let deleted = 0;
  const rows = await ctx.db
    .query("workStatementRows")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .take(limit);
  for (const row of rows) {
    await ctx.db.delete("workStatementRows", row._id);
  }
  deleted += rows.length;
  if (deleted >= limit) {
    return deleted;
  }
  const statements = await ctx.db
    .query("workStatements")
    .withIndex("by_estimateId_and_number", (q) =>
      q.eq("estimateId", estimateId),
    )
    .take(limit - deleted);
  for (const statement of statements) {
    await ctx.db.delete("workStatements", statement._id);
  }
  deleted += statements.length;
  if (deleted >= limit) {
    return deleted;
  }
  const receptions = await ctx.db
    .query("receptions")
    .withIndex("by_estimateId_and_kind", (q) => q.eq("estimateId", estimateId))
    .take(limit - deleted);
  for (const reception of receptions) {
    await ctx.db.delete("receptions", reception._id);
  }
  deleted += receptions.length;
  if (deleted >= limit) {
    return deleted;
  }
  const guarantees = await ctx.db
    .query("guarantees")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .take(limit - deleted);
  for (const guarantee of guarantees) {
    await ctx.db.delete("guarantees", guarantee._id);
  }
  return deleted + guarantees.length;
}

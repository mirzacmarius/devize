import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { requireFirmDoc } from "../lib/access";
import { notFound } from "../lib/errors";
import { type DiffLine, diffLines } from "./diff";
import { readLineItems, readSections } from "./helpers";

/** A revision's articles, each with the name of its section. */
async function linesOf(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
): Promise<DiffLine[]> {
  const sections = new Map<Id<"sections">, string>(
    (await readSections(ctx, estimate._id)).map((section) => [
      section._id,
      section.name,
    ]),
  );
  return (await readLineItems(ctx, estimate._id)).map((item) => ({
    _id: item._id,
    originId: item.originId,
    code: item.code,
    title: item.title,
    unit: item.unit,
    quantity: item.quantity,
    unitCost: item.unitCost,
    laborHours: item.laborHours,
    section: item.sectionId ? sections.get(item.sectionId) : undefined,
  }));
}

function summaryOf(estimate: Doc<"estimates">) {
  return {
    _id: estimate._id,
    revision: estimate.revision,
    title: estimate.title,
    status: estimate.status,
    markups: estimate.markups,
    totals: estimate.totals,
    updatedAt: estimate.updatedAt,
  };
}

/**
 * Comparare revizii: what changed between two revisions of the same Deviz
 * number, the earlier one first whichever was asked from, with the
 * Recapitulație of each and the articles added, removed and changed.
 */
export const compare = query({
  args: { estimateId: v.id("estimates"), withId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const other = await ctx.db.get("estimates", args.withId);
    // Another firm's Deviz, or another number, is not found, like any other.
    if (
      !other ||
      other._id === estimate._id ||
      other.organizationId !== estimate.organizationId ||
      other.number !== estimate.number
    ) {
      throw notFound("estimate");
    }
    const [before, after] =
      other.revision < estimate.revision
        ? [other, estimate]
        : [estimate, other];
    return {
      number: estimate.number,
      before: summaryOf(before),
      after: summaryOf(after),
      lines: diffLines(await linesOf(ctx, before), await linesOf(ctx, after)),
    };
  },
});

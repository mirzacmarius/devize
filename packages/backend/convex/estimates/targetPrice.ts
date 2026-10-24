import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { invalid } from "../lib/errors";
import {
  pricedFields,
  readLineItems,
  refreshTotals,
  requireEditableEstimate,
} from "./helpers";
import { applyMarkups } from "./recap";
import { fitLabor, fitProfit, onBasis } from "./target";

/**
 * Brings a draft Deviz to the client's price through its profit rate or
 * through its labour prices, the way the dialog showed. The labour prices it
 * changes count as typed by hand, so repricing keeps them.
 */
export const apply = mutation({
  args: {
    estimateId: v.id("estimates"),
    target: v.number(),
    basis: v.union(v.literal("total"), v.literal("subtotal")),
    method: v.union(v.literal("profit"), v.literal("labor")),
  },
  returns: v.object({ total: v.number() }),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    if (!Number.isFinite(args.target) || args.target <= 0) {
      throw invalid("target");
    }
    if (args.method === "profit") {
      const fit = fitProfit(
        estimate.totals,
        estimate.markups,
        args.target,
        args.basis,
      );
      if (!fit.ok) {
        throw invalid("target");
      }
      const markups = { ...estimate.markups, profit: fit.profit };
      const totals = applyMarkups(
        estimate.totals,
        estimate.totals.laborHours,
        markups,
      );
      await ctx.db.patch("estimates", estimate._id, {
        markups,
        totals,
        updatedAt: Date.now(),
      });
      return { total: onBasis(totals, args.basis) };
    }

    const items = await readLineItems(ctx, estimate._id);
    const fit = fitLabor(items, estimate.markups, args.target, args.basis);
    if (!fit.ok) {
      throw invalid("target");
    }
    const now = Date.now();
    for (const [index, item] of items.entries()) {
      const resources = (fit.resources[index] ?? item.resources).map(
        (resource, at) =>
          resource.unitPrice === item.resources[at]?.unitPrice
            ? resource
            : {
                ...resource,
                priceSource: "manual" as const,
                listingId: undefined,
                store: undefined,
                pricedAt: now,
              },
      );
      if (resources.some((resource, at) => resource !== item.resources[at])) {
        await ctx.db.patch("lineItems", item._id, pricedFields(resources));
      }
    }
    // The totals follow from the line items as stored, as after any change.
    await refreshTotals(ctx, estimate);
    const updated = await ctx.db.get("estimates", estimate._id);
    return { total: onBasis(updated?.totals ?? fit.recap, args.basis) };
  },
});

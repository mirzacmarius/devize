import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  pricedFields,
  refreshTotals,
  requireEditableLineItem,
} from "../estimates/helpers";
import { invalid } from "../lib/errors";
import {
  coveringsOf,
  isMethodOf,
  layResources,
  MAX_LABOR,
  MAX_WASTE,
  presetFor,
  startingResources,
} from "./layout";
import { layoutMethod } from "./validators";

function checkPercent(value: number, max: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw invalid(field);
  }
}

/**
 * Sets how an Articol's covering is laid: the covering takes the method's
 * losses and the labour its extra hours, from the consumptions before any
 * method, so methods never add up. "straight", the norm's own way, puts the
 * norm's consumptions back. Losses and labour default to the method's usual
 * ones.
 */
export const setLayout = mutation({
  args: {
    lineItemId: v.id("lineItems"),
    method: layoutMethod,
    waste: v.optional(v.number()),
    labor: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    const start = startingResources(item.resources, item.layout, item);
    const found = coveringsOf({ unit: item.unit, resources: start });
    if (!found) {
      throw invalid("layout");
    }
    if (!isMethodOf(args.method, found.family)) {
      throw invalid("method");
    }
    const preset = presetFor(args.method, found.family, found.coverings);
    const waste = args.method === "straight" ? preset.waste : args.waste;
    const labor = args.method === "straight" ? 0 : args.labor;
    const layout = {
      method: args.method,
      waste: Math.round((waste ?? preset.waste) * 100) / 100,
      labor: Math.round((labor ?? preset.labor) * 100) / 100,
    };
    checkPercent(layout.waste, MAX_WASTE, "waste");
    checkPercent(layout.labor, MAX_LABOR, "labor");
    const laid = layResources(start, found.coverings, layout);
    await ctx.db.patch("lineItems", item._id, {
      ...pricedFields(laid.resources),
      layout:
        layout.method === "straight"
          ? undefined
          : { ...layout, base: laid.base },
      updatedAt: Date.now(),
    });
    await refreshTotals(ctx, estimate);
    return null;
  },
});

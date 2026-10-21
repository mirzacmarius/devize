import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { isUsableBy } from "../catalog/access";
import { readNormResources } from "../catalog/norms";
import { findOrCreateResource } from "../catalog/resourceRows";
import {
  pricedFields,
  refreshTotals,
  requireEditableLineItem,
  resolverFor,
  snapshotResources,
} from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import { normalizeUnit } from "../lib/text";
import { countNormAdded } from "../producers/usage";
import { fixOf } from "./rules";

// What the compatibility check's buttons do: swap a material for the one a
// rule names, move an Articol to another norm, or set a finding aside
// (docs/adr/0028).

/**
 * Puts the material a rule names in place of the one it found on an
 * Articol, with the same consumption, priced like any other: the firm's
 * price, its store product, a listing, else Devize's reference price.
 */
export const swapMaterial = mutation({
  args: {
    lineItemId: v.id("lineItems"),
    resourceKey: v.string(),
    ruleId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    const target = item.resources.find((r) => r.key === args.resourceKey);
    if (target?.kind !== "material") {
      throw notFound("resource");
    }
    const fix = fixOf(args.ruleId, target);
    if (fix?.kind !== "material") {
      throw invalid("ruleId");
    }
    const { name, referencePrice } = fix.material;
    // A Devize material, shared like the Norme de bază's.
    const resourceId = await findOrCreateResource(ctx, {
      kind: "material",
      name,
      unit: target.unit,
      referencePrice,
    });
    const price = await resolverFor(ctx, estimate).resolve({
      kind: "material",
      unit: target.unit,
      resourceId,
      referencePrice,
    });
    const now = Date.now();
    const resources = item.resources.map((resource) =>
      resource.key !== target.key
        ? resource
        : {
            ...resource,
            resourceId,
            productId: undefined,
            name,
            referencePrice,
            unitPrice: price.unitPrice,
            priceSource: price.priceSource,
            listingId: price.listingId,
            store: price.store,
            pricedAt: price.pricedAt ?? now,
          },
    );
    await ctx.db.patch("lineItems", item._id, {
      ...pricedFields(resources),
      updatedAt: now,
    });
    await refreshTotals(ctx, estimate);
    return null;
  },
});

/**
 * Moves an Articol to another published norm in the same unit, such as the
 * Normă de bază a rule names or a producer's system meant for where it is
 * done. The quantity, Capitol, notes and Antemăsurători stay; the
 * resources are the new norm's, at today's prices.
 */
export const useNorm = mutation({
  args: { lineItemId: v.id("lineItems"), normId: v.id("norms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    const norm = await ctx.db.get("norms", args.normId);
    if (!norm || !isUsableBy(norm, estimate.organizationId)) {
      throw notFound("norm");
    }
    if (normalizeUnit(norm.unit) !== normalizeUnit(item.unit)) {
      throw invalid("unit");
    }
    const resources = await snapshotResources(
      await readNormResources(ctx, norm._id),
      resolverFor(ctx, estimate),
    );
    await ctx.db.patch("lineItems", item._id, {
      origin: "norm",
      normId: norm._id,
      code: norm.code,
      title: norm.title,
      unit: norm.unit,
      ...pricedFields(resources),
      // The new norm's covering is laid its own way.
      layout: undefined,
      updatedAt: Date.now(),
    });
    await refreshTotals(ctx, estimate);
    await countNormAdded(ctx, estimate, norm, item.quantity);
    return null;
  },
});

function checkKey(key: string) {
  if (!key || key.length > 600) {
    throw invalid("key");
  }
}

async function dismissal(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  key: string,
) {
  return await ctx.db
    .query("compatibilityDismissals")
    .withIndex("by_organizationId_and_number_and_key", (q) =>
      q
        .eq("organizationId", estimate.organizationId)
        .eq("number", estimate.number)
        .eq("key", key),
    )
    .unique();
}

/**
 * Sets a finding or a suggestion aside for the Deviz and its revisions: the
 * firm knows, or the work is done some other way.
 */
export const dismiss = mutation({
  args: { estimateId: v.id("estimates"), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Not a change to the Deviz: a sent one can have findings set aside too.
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    checkKey(args.key);
    if (!(await dismissal(ctx, estimate, args.key))) {
      await ctx.db.insert("compatibilityDismissals", {
        organizationId: estimate.organizationId,
        number: estimate.number,
        key: args.key,
        dismissedBy: userId,
        dismissedAt: Date.now(),
      });
    }
    return null;
  },
});

/** Shows a dismissed finding or suggestion again. */
export const restore = mutation({
  args: { estimateId: v.id("estimates"), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    checkKey(args.key);
    const row = await dismissal(ctx, estimate, args.key);
    if (row) {
      await ctx.db.delete("compatibilityDismissals", row._id);
    }
    return null;
  },
});

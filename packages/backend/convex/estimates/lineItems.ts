import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { isUsableBy } from "../catalog/access";
import { latestPublishedVersion, readNormResources } from "../catalog/norms";
import { romanianDate } from "../lib/dates";
import { invalid, notFound } from "../lib/errors";
import { normalizeUnit } from "../lib/text";
import { resourceKind } from "../manufacturers/validators";
import { countNormAdded } from "../producers/usage";
import {
  checkQuantity,
  checkSection,
  nextPosition,
  pricedFields,
  refreshTotals,
  requireEditableEstimate,
  requireEditableLineItem,
  resolverFor,
  snapshotResources,
} from "./helpers";

async function positionFor(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  afterId: Id<"lineItems"> | undefined,
) {
  if (!afterId) {
    return await nextPosition(ctx, "lineItems", estimate._id);
  }
  const after = await ctx.db.get("lineItems", afterId);
  if (!after || after.estimateId !== estimate._id) {
    throw notFound("lineItem");
  }
  return await nextPosition(ctx, "lineItems", estimate._id, after);
}

async function usableNorm(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  normId: Id<"norms">,
) {
  const norm = await ctx.db.get("norms", normId);
  if (!norm || !isUsableBy(norm, estimate.organizationId)) {
    throw notFound("norm");
  }
  return norm;
}

/**
 * Adds a line item from a published norm: copies the norm's resources with
 * the firm's prices today, so later changes to the norm or the prices never
 * alter this Deviz until someone accepts an update.
 */
export const addFromNorm = mutation({
  args: {
    estimateId: v.id("estimates"),
    normId: v.id("norms"),
    quantity: v.number(),
    sectionId: v.optional(v.id("sections")),
    afterId: v.optional(v.id("lineItems")),
  },
  returns: v.id("lineItems"),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    const norm = await usableNorm(ctx, estimate, args.normId);
    return await insertFromNorm(ctx, estimate, norm, args);
  },
});

/**
 * Inserts the line item for a norm the caller checked the firm may use, with
 * the firm's prices today, and brings the Deviz's totals up to date.
 */
export async function insertFromNorm(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  norm: Doc<"norms">,
  args: {
    quantity: number;
    sectionId?: Id<"sections">;
    afterId?: Id<"lineItems">;
  },
): Promise<Id<"lineItems">> {
  checkQuantity(args.quantity);
  await checkSection(ctx, estimate, args.sectionId);
  const resources = await snapshotResources(
    await readNormResources(ctx, norm._id),
    resolverFor(ctx, estimate),
  );
  const lineItemId = await ctx.db.insert("lineItems", {
    organizationId: estimate.organizationId,
    estimateId: estimate._id,
    sectionId: args.sectionId,
    position: await positionFor(ctx, estimate, args.afterId),
    origin: "norm",
    normId: norm._id,
    code: norm.code,
    title: norm.title,
    unit: norm.unit,
    quantity: args.quantity,
    ...pricedFields(resources),
    updatedAt: Date.now(),
  });
  await refreshTotals(ctx, estimate);
  await countNormAdded(ctx, estimate, norm, args.quantity);
  return lineItemId;
}

const customResource = v.object({
  kind: resourceKind,
  name: v.string(),
  unit: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  resourceId: v.optional(v.id("resources")),
  productId: v.optional(v.id("products")),
});

function cleanCustomResources(
  resources: readonly Infer<typeof customResource>[],
): Doc<"lineItems">["resources"] {
  if (resources.length === 0 || resources.length > 200) {
    throw invalid("resources");
  }
  const now = Date.now();
  return resources.map((resource, index) => {
    const name = resource.name.trim();
    const unit = normalizeUnit(resource.unit);
    if (!name) {
      throw invalid("resource.name");
    }
    if (!unit) {
      throw invalid("resource.unit");
    }
    checkQuantity(resource.quantity);
    if (!Number.isFinite(resource.unitPrice) || resource.unitPrice < 0) {
      throw invalid("resource.unitPrice");
    }
    return {
      key: `custom:${index + 1}`,
      kind: resource.kind,
      resourceId: resource.resourceId,
      productId: resource.productId,
      name,
      unit,
      quantity: resource.quantity,
      unitPrice: resource.unitPrice,
      priceSource: "manual" as const,
      pricedAt: now,
    };
  });
}

/**
 * Adds a line item that isn't in the catalog, with resources priced by hand,
 * such as a lump sum for removing rubble.
 */
export const addCustom = mutation({
  args: {
    estimateId: v.id("estimates"),
    title: v.string(),
    unit: v.string(),
    quantity: v.number(),
    code: v.optional(v.string()),
    resources: v.array(customResource),
    sectionId: v.optional(v.id("sections")),
    afterId: v.optional(v.id("lineItems")),
  },
  returns: v.id("lineItems"),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    checkQuantity(args.quantity);
    await checkSection(ctx, estimate, args.sectionId);
    const title = args.title.trim();
    const unit = normalizeUnit(args.unit);
    if (!title || title.length > 500) {
      throw invalid("title");
    }
    if (!unit || unit === "%") {
      throw invalid("unit");
    }
    const lineItemId = await ctx.db.insert("lineItems", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      sectionId: args.sectionId,
      position: await positionFor(ctx, estimate, args.afterId),
      origin: "custom",
      code: args.code?.trim() || "—",
      title,
      unit,
      quantity: args.quantity,
      ...pricedFields(cleanCustomResources(args.resources)),
      updatedAt: Date.now(),
    });
    await refreshTotals(ctx, estimate);
    return lineItemId;
  },
});

/**
 * Changes a line item's quantity, text or section. A norm's code and unit
 * stay as the norm has them; a custom item can change them too.
 */
export const update = mutation({
  args: {
    lineItemId: v.id("lineItems"),
    quantity: v.optional(v.number()),
    title: v.optional(v.string()),
    code: v.optional(v.string()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    sectionId: v.optional(v.union(v.id("sections"), v.null())),
    // Accepts an AI-proposed item as checked by a person.
    confirm: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    const patch: Partial<Doc<"lineItems">> = { updatedAt: Date.now() };
    if (args.quantity !== undefined) {
      checkQuantity(args.quantity);
      patch.quantity = args.quantity;
    }
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title || title.length > 500) {
        throw invalid("title");
      }
      patch.title = title;
    }
    if (args.code !== undefined || args.unit !== undefined) {
      if (item.origin === "norm") {
        throw invalid("origin");
      }
      if (args.code !== undefined) {
        patch.code = args.code.trim() || "—";
      }
      if (args.unit !== undefined) {
        const unit = normalizeUnit(args.unit);
        if (!unit || unit === "%") {
          throw invalid("unit");
        }
        patch.unit = unit;
      }
    }
    if (args.notes !== undefined) {
      patch.notes = args.notes.trim().slice(0, 5000) || undefined;
    }
    if (args.sectionId !== undefined) {
      await checkSection(ctx, estimate, args.sectionId ?? undefined);
      patch.sectionId = args.sectionId ?? undefined;
    }
    if (args.confirm) {
      patch.confidence = undefined;
    }
    await ctx.db.patch("lineItems", item._id, patch);
    if (args.quantity !== undefined) {
      await refreshTotals(ctx, estimate);
    } else {
      await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
    }
    return null;
  },
});

/** Sets one resource's price or consumption on a line item by hand. */
export const updateResource = mutation({
  args: {
    lineItemId: v.id("lineItems"),
    key: v.string(),
    unitPrice: v.optional(v.number()),
    quantity: v.optional(v.number()),
    // Drops a price typed by hand and prices the resource as when it was
    // added: the firm's rate or price, a listing or the reference price.
    automatic: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    const target = item.resources.find((resource) => resource.key === args.key);
    if (!target) {
      throw notFound("resource");
    }
    const automatic = args.automatic
      ? await resolverFor(ctx, estimate).resolve(target)
      : undefined;
    if (
      args.unitPrice !== undefined &&
      (!Number.isFinite(args.unitPrice) || args.unitPrice < 0)
    ) {
      throw invalid("unitPrice");
    }
    if (args.quantity !== undefined) {
      checkQuantity(args.quantity);
    }
    const now = Date.now();
    const resources = item.resources.map((resource) =>
      resource.key !== args.key
        ? resource
        : {
            ...resource,
            ...(args.quantity === undefined ? {} : { quantity: args.quantity }),
            ...(args.unitPrice === undefined
              ? {}
              : {
                  unitPrice: args.unitPrice,
                  priceSource: "manual" as const,
                  listingId: undefined,
                  store: undefined,
                  pricedAt: now,
                }),
            ...(automatic === undefined
              ? {}
              : {
                  unitPrice: automatic.unitPrice,
                  priceSource: automatic.priceSource,
                  listingId: automatic.listingId,
                  store: automatic.store,
                  pricedAt: automatic.pricedAt ?? now,
                }),
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

/** Moves a line item to a section (or none), after another item or first. */
export const move = mutation({
  args: {
    lineItemId: v.id("lineItems"),
    sectionId: v.union(v.id("sections"), v.null()),
    afterId: v.optional(v.id("lineItems")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    await checkSection(ctx, estimate, args.sectionId ?? undefined);
    let position: number;
    if (args.afterId) {
      position = await positionFor(ctx, estimate, args.afterId);
    } else {
      const first = await ctx.db
        .query("lineItems")
        .withIndex("by_estimateId_and_position", (q) =>
          q.eq("estimateId", estimate._id),
        )
        .first();
      position = first ? first.position - 1 : 1;
    }
    await ctx.db.patch("lineItems", item._id, {
      sectionId: args.sectionId ?? undefined,
      position,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { lineItemId: v.id("lineItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    const takeoffs = await ctx.db
      .query("takeoffs")
      .withIndex("by_lineItemId", (q) => q.eq("lineItemId", item._id))
      .take(100);
    for (const takeoff of takeoffs) {
      await ctx.db.patch("takeoffs", takeoff._id, { lineItemId: undefined });
    }
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", estimate._id),
      )
      .take(20);
    for (const variant of variants) {
      if (variant.swaps.some((swap) => swap.lineItemId === item._id)) {
        await ctx.db.patch("variants", variant._id, {
          swaps: variant.swaps.filter((swap) => swap.lineItemId !== item._id),
        });
      }
    }
    await ctx.db.delete("lineItems", item._id);
    await refreshTotals(ctx, estimate);
    return null;
  },
});

/**
 * Reprices every resource of a Deviz at today's prices, except those set by
 * hand, and moves its price date to today.
 */
export const refreshPrices = mutation({
  args: { estimateId: v.id("estimates") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    const resolver = resolverFor(ctx, estimate);
    const now = Date.now();
    let changed = 0;
    const items = ctx.db
      .query("lineItems")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", estimate._id),
      );
    for await (const item of items) {
      let itemChanged = false;
      const resources = [];
      for (const resource of item.resources) {
        if (resource.priceSource === "manual") {
          resources.push(resource);
          continue;
        }
        const price = await resolver.resolve(resource);
        if (
          price.unitPrice !== resource.unitPrice ||
          price.priceSource !== resource.priceSource
        ) {
          itemChanged = true;
        }
        resources.push({
          ...resource,
          unitPrice: price.unitPrice,
          priceSource: price.priceSource,
          listingId: price.listingId,
          store: price.store,
          pricedAt: price.pricedAt ?? now,
        });
      }
      if (itemChanged) {
        changed++;
        await ctx.db.patch("lineItems", item._id, {
          ...pricedFields(resources),
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch("estimates", estimate._id, {
      priceDate: romanianDate(now),
    });
    await refreshTotals(ctx, estimate);
    return changed;
  },
});

/**
 * Moves a line item to the newest published version of its norm, repricing
 * the resources and keeping prices set by hand on resources still there.
 */
export const upgradeNorm = mutation({
  args: { lineItemId: v.id("lineItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, estimate } = await requireEditableLineItem(
      ctx,
      args.lineItemId,
    );
    if (!item.normId) {
      throw invalid("origin");
    }
    const current = await ctx.db.get("norms", item.normId);
    const latest = current ? await latestPublishedVersion(ctx, current) : null;
    if (!latest || latest._id === item.normId) {
      return null;
    }
    const norm = await usableNorm(ctx, estimate, latest._id);
    const resources = await snapshotResources(
      await readNormResources(ctx, norm._id),
      resolverFor(ctx, estimate),
      item.resources,
    );
    await ctx.db.patch("lineItems", item._id, {
      normId: norm._id,
      code: norm.code,
      title: norm.title,
      unit: norm.unit,
      ...pricedFields(resources),
      updatedAt: Date.now(),
    });
    await refreshTotals(ctx, estimate);
    return null;
  },
});

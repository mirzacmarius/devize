import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  readLineItems,
  requireEditableEstimate,
  resolverFor,
} from "../estimates/helpers";
import { variantTier } from "../estimates/validators";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { isPercentUnit, normalizeText, normalizeUnit } from "../lib/text";
import { priceChoice } from "./choice";

// A Deviz's Variante as the firm makes them: each puts other materials in
// some of the Deviz's works, priced like the Deviz's own or by hand. They are
// priced whenever they're read, since editing the Deviz changes what they
// cost, and change only while the Deviz does. See docs/adr/0021.

export const MAX_VARIANTS = 4;
const MAX_NAME = 40;
const MAX_DESCRIPTION = 300;
const MAX_SWAPS = 300;
const MAX_SWAP_NAME = 120;
// No material in a Deviz costs ten million lei a unit.
const MAX_PRICE = 10_000_000;
const MAX_ALTERNATIVES = 20;

type Resource = Doc<"lineItems">["resources"][number];
type Swap = Doc<"variants">["swaps"][number];

/** What a Variantă can swap: a material, not the sundries counted in "%". */
function isSwappable(resource: Resource) {
  return resource.kind === "material" && !isPercentUnit(resource.unit);
}

async function variantsOf(ctx: QueryCtx, estimateId: Id<"estimates">) {
  return await ctx.db
    .query("variants")
    .withIndex("by_estimateId_and_position", (q) =>
      q.eq("estimateId", estimateId),
    )
    .take(20);
}

/** A Variantă and its Deviz, while the Deviz can still change. */
async function requireEditableVariant(
  ctx: MutationCtx,
  variantId: Id<"variants">,
) {
  const { doc: variant } = await requireFirmDoc(ctx, "variants", variantId);
  const { estimate } = await requireEditableEstimate(ctx, variant.estimateId);
  return { variant, estimate };
}

async function touch(ctx: MutationCtx, estimate: Doc<"estimates">) {
  await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
}

/** A name the client reads, unique among the Deviz's Variante. */
function checkName(
  name: string,
  others: Doc<"variants">[],
  self?: Id<"variants">,
) {
  const result = name.trim();
  if (!result || result.length > MAX_NAME) {
    throw invalid("name");
  }
  const key = normalizeText(result);
  if (others.some((x) => x._id !== self && normalizeText(x.name) === key)) {
    throw appError("in_use", "name");
  }
  return result;
}

function checkDescription(description: string | undefined) {
  const result = description?.trim();
  if (result && result.length > MAX_DESCRIPTION) {
    throw invalid("description");
  }
  return result || undefined;
}

/**
 * A Deviz's Variante, each with what it costs now and the materials it puts
 * in, next to the Deviz as built. Totals are with VAT, for all the works.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const variants = await variantsOf(ctx, estimate._id);
    const items = await readLineItems(ctx, estimate._id);
    const resources = new Set(
      items.flatMap((item) =>
        item.resources.map((resource) => `${item._id}:${resource.key}`),
      ),
    );
    return {
      baseTotal: priceChoice(items, null, [], estimate.markups).totals.total,
      variants: variants.map((variant) => ({
        _id: variant._id,
        name: variant.name,
        tier: variant.tier,
        description: variant.description,
        total: priceChoice(items, variant, [], estimate.markups).totals.total,
        // A swap whose material left the Deviz no longer counts.
        swaps: variant.swaps.filter((swap) =>
          resources.has(`${swap.lineItemId}:${swap.resourceKey}`),
        ),
      })),
    };
  },
});

export const create = mutation({
  args: {
    estimateId: v.id("estimates"),
    name: v.string(),
    tier: v.optional(variantTier),
    description: v.optional(v.string()),
  },
  returns: v.id("variants"),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    const variants = await variantsOf(ctx, estimate._id);
    if (variants.length >= MAX_VARIANTS) {
      throw invalid("variants");
    }
    const variantId = await ctx.db.insert("variants", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      name: checkName(args.name, variants),
      tier: args.tier,
      description: checkDescription(args.description),
      position: (variants.at(-1)?.position ?? 0) + 1,
      swaps: [],
    });
    await touch(ctx, estimate);
    return variantId;
  },
});

/** Renames a Variantă or changes what the client reads about it. */
export const update = mutation({
  args: {
    variantId: v.id("variants"),
    name: v.optional(v.string()),
    // Null takes the tier off.
    tier: v.optional(v.union(variantTier, v.null())),
    // Empty takes the description off.
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { variant, estimate } = await requireEditableVariant(
      ctx,
      args.variantId,
    );
    const patch: Partial<Doc<"variants">> = {};
    if (args.name !== undefined) {
      patch.name = checkName(
        args.name,
        await variantsOf(ctx, estimate._id),
        variant._id,
      );
    }
    if (args.tier !== undefined) {
      patch.tier = args.tier ?? undefined;
    }
    if (args.description !== undefined) {
      patch.description = checkDescription(args.description);
    }
    await ctx.db.patch("variants", variant._id, patch);
    await touch(ctx, estimate);
    return null;
  },
});

export const remove = mutation({
  args: { variantId: v.id("variants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { variant, estimate } = await requireEditableVariant(
      ctx,
      args.variantId,
    );
    await ctx.db.delete("variants", variant._id);
    await touch(ctx, estimate);
    return null;
  },
});

/** Whether a resource is the same material as `target`, in another work. */
function sameMaterial(resource: Resource, target: Resource) {
  if (!isSwappable(resource)) {
    return false;
  }
  if (target.productId) {
    return resource.productId === target.productId;
  }
  if (target.resourceId) {
    return (
      resource.productId === undefined &&
      resource.resourceId === target.resourceId
    );
  }
  return (
    resource.productId === undefined &&
    resource.resourceId === undefined &&
    normalizeText(resource.name) === normalizeText(target.name) &&
    normalizeUnit(resource.unit) === normalizeUnit(target.unit)
  );
}

/**
 * A catalog material the firm may use: its own or a shared one, or a
 * published product. Null for anything else.
 */
async function catalogMaterial(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  pick: { resourceId?: Id<"resources">; productId?: Id<"products"> },
) {
  if (pick.productId) {
    const product = await ctx.db.get("products", pick.productId);
    return product?.status === "published"
      ? {
          name: product.name,
          unit: product.unit,
          productId: product._id,
          resourceId: product.resourceId,
        }
      : null;
  }
  if (pick.resourceId) {
    const resource = await ctx.db.get("resources", pick.resourceId);
    return resource?.kind === "material" &&
      (resource.visibility === "public" ||
        resource.organizationId === organizationId)
      ? {
          name: resource.name,
          unit: resource.unit,
          productId: undefined,
          resourceId: resource._id,
        }
      : null;
  }
  return null;
}

/**
 * What a swap puts in: a catalog material priced as the Deviz prices its
 * own, or a name typed by hand. A price typed by hand wins over both.
 */
async function replacementFor(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  target: Resource,
  args: {
    resourceId?: Id<"resources">;
    productId?: Id<"products">;
    name?: string;
    unitPrice?: number;
  },
): Promise<Omit<Swap, "lineItemId" | "resourceKey">> {
  const typed = args.unitPrice;
  if (
    typed !== undefined &&
    (!Number.isFinite(typed) || typed < 0 || typed > MAX_PRICE)
  ) {
    throw invalid("unitPrice");
  }
  if (args.resourceId || args.productId) {
    const material = await catalogMaterial(ctx, estimate.organizationId, args);
    if (!material) {
      throw notFound("resource");
    }
    // The swap keeps the work's consumption, so it must be counted alike.
    if (normalizeUnit(material.unit) !== normalizeUnit(target.unit)) {
      throw invalid("unit");
    }
    const price =
      typed !== undefined
        ? { unitPrice: typed, priceSource: "manual" as const }
        : await resolverFor(ctx, estimate).resolve({
            kind: "material",
            unit: target.unit,
            resourceId: material.resourceId,
            productId: material.productId,
          });
    // A material without a price would make the Variantă look cheaper.
    if (price.priceSource === "missing") {
      throw invalid("unitPrice");
    }
    return {
      name: material.name,
      resourceId: material.resourceId,
      productId: material.productId,
      unitPrice: price.unitPrice,
      priceSource: price.priceSource,
    };
  }
  const name = args.name?.trim();
  if (!name || name.length > MAX_SWAP_NAME) {
    throw invalid("materialName");
  }
  if (typed === undefined) {
    throw invalid("unitPrice");
  }
  return { name, unitPrice: typed, priceSource: "manual" };
}

/**
 * Puts another material in a work for a Variantă, in place of one of the
 * work's own, or in every work that uses that material. Returns how many
 * works it changed.
 */
export const setSwap = mutation({
  args: {
    variantId: v.id("variants"),
    lineItemId: v.id("lineItems"),
    resourceKey: v.string(),
    // A material from the catalog, priced like the Deviz's own...
    resourceId: v.optional(v.id("resources")),
    productId: v.optional(v.id("products")),
    // ...or one named by hand, with its price.
    name: v.optional(v.string()),
    // Lei without VAT per unit of the material it replaces.
    unitPrice: v.optional(v.number()),
    everywhere: v.optional(v.boolean()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { variant, estimate } = await requireEditableVariant(
      ctx,
      args.variantId,
    );
    const item = await ctx.db.get("lineItems", args.lineItemId);
    if (!item || item.estimateId !== estimate._id) {
      throw notFound("lineItem");
    }
    const target = item.resources.find((r) => r.key === args.resourceKey);
    if (!target || !isSwappable(target)) {
      throw notFound("resource");
    }
    const replacement = await replacementFor(ctx, estimate, target, args);

    const places = args.everywhere
      ? (await readLineItems(ctx, estimate._id)).flatMap((other) =>
          other.resources
            .filter((resource) => sameMaterial(resource, target))
            .map((resource) => ({
              lineItemId: other._id,
              resourceKey: resource.key,
            })),
        )
      : [{ lineItemId: item._id, resourceKey: target.key }];
    const placed = new Set(
      places.map((place) => `${place.lineItemId}:${place.resourceKey}`),
    );
    const swaps = [
      ...variant.swaps.filter(
        (swap) => !placed.has(`${swap.lineItemId}:${swap.resourceKey}`),
      ),
      ...places.map((place) => ({ ...place, ...replacement })),
    ];
    if (swaps.length > MAX_SWAPS) {
      throw invalid("swaps");
    }
    await ctx.db.patch("variants", variant._id, { swaps });
    await touch(ctx, estimate);
    return places.length;
  },
});

/** Gives a work its own material back in a Variantă. */
export const removeSwap = mutation({
  args: {
    variantId: v.id("variants"),
    lineItemId: v.id("lineItems"),
    resourceKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { variant, estimate } = await requireEditableVariant(
      ctx,
      args.variantId,
    );
    await ctx.db.patch("variants", variant._id, {
      swaps: variant.swaps.filter(
        (swap) =>
          swap.lineItemId !== args.lineItemId ||
          swap.resourceKey !== args.resourceKey,
      ),
    });
    await touch(ctx, estimate);
    return null;
  },
});

/** The words to look alternatives up by: the material's name, without sizes. */
export function searchWords(name: string) {
  return normalizeText(name)
    .split(" ")
    .filter((word) => /[a-z]/.test(word) && !/\d/.test(word))
    .slice(0, 2)
    .join(" ");
}

type Candidate = {
  key: string;
  name: string;
  resourceId?: Id<"resources">;
  productId?: Id<"products">;
  sameMaterial: boolean;
};

/**
 * Materials that could take a work's material's place in a Variantă, in its
 * unit and priced as the Deviz would price them: other makes of the same
 * material, then the catalog's matches for `text` or the material's own
 * name, each cheapest first.
 */
export const alternatives = query({
  args: {
    lineItemId: v.id("lineItems"),
    resourceKey: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { doc: item } = await requireFirmDoc(
      ctx,
      "lineItems",
      args.lineItemId,
    );
    const estimate = await ctx.db.get("estimates", item.estimateId);
    const target = item.resources.find((r) => r.key === args.resourceKey);
    if (!estimate || !target || !isSwappable(target)) {
      return [];
    }
    const organizationId = estimate.organizationId;
    const unit = normalizeUnit(target.unit);
    const candidates = new Map<string, Candidate>();
    const add = (
      found: { name: string; unit: string },
      ids: { resourceId?: Id<"resources">; productId?: Id<"products"> },
      same: boolean,
    ) => {
      const key = ids.productId ?? ids.resourceId ?? "";
      if (
        normalizeUnit(found.unit) !== unit ||
        candidates.has(key) ||
        (ids.productId && ids.productId === target.productId) ||
        (!ids.productId &&
          !target.productId &&
          ids.resourceId === target.resourceId)
      ) {
        return;
      }
      candidates.set(key, {
        key,
        name: found.name,
        ...ids,
        sameMaterial: same,
      });
    };

    // Other makes of the material the work uses, and the generic one.
    const product = target.productId
      ? await ctx.db.get("products", target.productId)
      : null;
    const genericId = target.resourceId ?? product?.resourceId;
    if (genericId) {
      const generic = await ctx.db.get("resources", genericId);
      if (
        generic?.kind === "material" &&
        (generic.visibility === "public" ||
          generic.organizationId === organizationId)
      ) {
        add(generic, { resourceId: generic._id }, true);
      }
      const makes = await ctx.db
        .query("products")
        .withIndex("by_resourceId", (q) => q.eq("resourceId", genericId))
        .take(30);
      for (const make of makes) {
        if (make.status === "published") {
          add(make, { productId: make._id, resourceId: make.resourceId }, true);
        }
      }
    }

    const text = normalizeText(args.text ?? "") || searchWords(target.name);
    if (text) {
      const own = await ctx.db
        .query("resources")
        .withSearchIndex("search_nameKey", (q) =>
          q
            .search("nameKey", text)
            .eq("organizationId", organizationId)
            .eq("kind", "material"),
        )
        .take(15);
      const shared = await ctx.db
        .query("resources")
        .withSearchIndex("search_nameKey", (q) =>
          q
            .search("nameKey", text)
            .eq("visibility", "public")
            .eq("kind", "material"),
        )
        .take(15);
      const products = await ctx.db
        .query("products")
        .withSearchIndex("search_nameKey", (q) =>
          q.search("nameKey", text).eq("status", "published"),
        )
        .take(15);
      for (const resource of [...own, ...shared]) {
        add(resource, { resourceId: resource._id }, false);
      }
      for (const found of products) {
        add(
          found,
          { productId: found._id, resourceId: found.resourceId },
          false,
        );
      }
    }

    const resolver = resolverFor(ctx, estimate);
    const priced = await Promise.all(
      [...candidates.values()]
        .slice(0, MAX_ALTERNATIVES * 2)
        .map(async (candidate) => {
          const price = await resolver.resolve({
            kind: "material",
            unit: target.unit,
            resourceId: candidate.resourceId,
            productId: candidate.productId,
          });
          return {
            ...candidate,
            unitPrice: price.unitPrice,
            priceSource: price.priceSource,
            store: price.store,
          };
        }),
    );
    // One without a price comes last: the firm types it before it goes in.
    const missing = (x: (typeof priced)[number]) =>
      Number(x.priceSource === "missing");
    return priced
      .sort(
        (a, b) =>
          Number(b.sameMaterial) - Number(a.sameMaterial) ||
          missing(a) - missing(b) ||
          a.unitPrice - b.unitPrice,
      )
      .slice(0, MAX_ALTERNATIVES);
  },
});

import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, query } from "../_generated/server";
import { latestPublishedVersion } from "../catalog/norms";
import { readLineItems } from "../estimates/helpers";
import { isProducer, requireUserId } from "../lib/access";
import { checkMonth, monthsUntil, romanianMonth } from "../lib/dates";
import { getSuperAdmin } from "../lib/roles";
import { isPercentUnit } from "../lib/text";
import { MIN_FIRMS_PER_COUNTY, STATS_MONTHS } from "./lib/usage";
import { countedKind } from "./validators";

// A Producător's usage statistics: its norms added to devize, the devize sent
// and accepted with its norms and products, and the products they hold.
// Counted as it happens, a month at a time, so reading them never walks the
// devize. Only counts and quantities: never which firm. See docs/adr/0023.

// What a producer's statistics read, at most. A year of a producer with many
// norms stays well under it.
const MAX_ROWS = 5000;
// Norms and products listed, the most used first.
const MAX_LISTED = 100;

type Kind = Infer<typeof countedKind>;

const producerCounters = ["added", "sent", "accepted"] as const;
const normCounters = ["added", "sent", "accepted", "acceptedQuantity"] as const;
const productCounters = [
  "sent",
  "sentQuantity",
  "accepted",
  "acceptedQuantity",
  "acceptedValue",
  "replaced",
] as const;

/** A row's counters with `by` added to them. */
function counted<K extends string>(
  fields: readonly K[],
  row: Record<K, number> | null,
  by: Partial<Record<K, number>>,
): Record<K, number> {
  return Object.fromEntries(
    fields.map((field) => [field, (row?.[field] ?? 0) + (by[field] ?? 0)]),
  ) as Record<K, number>;
}

function countyOf(estimate: Doc<"estimates">): string | undefined {
  return estimate.county?.trim() || undefined;
}

async function countForProducer(
  ctx: MutationCtx,
  key: {
    manufacturerId: Id<"manufacturers">;
    month: string;
    county: string | undefined;
  },
  by: Partial<Record<(typeof producerCounters)[number], number>>,
) {
  const row = await ctx.db
    .query("producerUsage")
    .withIndex("by_manufacturerId_and_month_and_county", (q) =>
      q
        .eq("manufacturerId", key.manufacturerId)
        .eq("month", key.month)
        .eq("county", key.county),
    )
    .unique();
  const counters = counted(producerCounters, row, by);
  if (row) {
    await ctx.db.patch("producerUsage", row._id, counters);
  } else {
    await ctx.db.insert("producerUsage", { ...key, ...counters });
  }
}

async function countForNorm(
  ctx: MutationCtx,
  key: {
    manufacturerId: Id<"manufacturers">;
    month: string;
    lineageId: Id<"norms">;
  },
  by: Partial<Record<(typeof normCounters)[number], number>>,
) {
  const row = await ctx.db
    .query("normUsage")
    .withIndex("by_manufacturerId_and_month_and_lineageId", (q) =>
      q
        .eq("manufacturerId", key.manufacturerId)
        .eq("month", key.month)
        .eq("lineageId", key.lineageId),
    )
    .unique();
  const counters = counted(normCounters, row, by);
  if (row) {
    await ctx.db.patch("normUsage", row._id, counters);
  } else {
    await ctx.db.insert("normUsage", { ...key, ...counters });
  }
}

async function countForProduct(
  ctx: MutationCtx,
  key: {
    manufacturerId: Id<"manufacturers">;
    month: string;
    productId: Id<"products">;
  },
  by: Partial<Record<(typeof productCounters)[number], number>>,
) {
  const row = await ctx.db
    .query("productUsage")
    .withIndex("by_manufacturerId_and_month_and_productId", (q) =>
      q
        .eq("manufacturerId", key.manufacturerId)
        .eq("month", key.month)
        .eq("productId", key.productId),
    )
    .unique();
  const counters = counted(productCounters, row, by);
  if (row) {
    await ctx.db.patch("productUsage", row._id, counters);
  } else {
    await ctx.db.insert("productUsage", { ...key, ...counters });
  }
}

/** Notes that a firm used the producer in a county, for counting firms. */
async function noteFirm(
  ctx: MutationCtx,
  key: {
    manufacturerId: Id<"manufacturers">;
    organizationId: Id<"organizations">;
    county: string | undefined;
  },
  month: string,
) {
  const row = await ctx.db
    .query("usageFirms")
    .withIndex("by_manufacturerId_and_organizationId_and_county", (q) =>
      q
        .eq("manufacturerId", key.manufacturerId)
        .eq("organizationId", key.organizationId)
        .eq("county", key.county),
    )
    .unique();
  if (!row) {
    await ctx.db.insert("usageFirms", { ...key, lastMonth: month });
  } else if (row.lastMonth < month) {
    await ctx.db.patch("usageFirms", row._id, { lastMonth: month });
  }
}

/**
 * Counts a producer's norm added to a Deviz, by hand or from an AI proposal.
 * Other norms count for no one.
 */
export async function countNormAdded(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  norm: Doc<"norms">,
  quantity: number,
) {
  const { manufacturerId } = norm;
  if (!manufacturerId) {
    return;
  }
  await ctx.db.insert("usageEvents", {
    kind: "norm_added",
    organizationId: estimate.organizationId,
    normId: norm._id,
    manufacturerId,
    quantity,
    unit: norm.unit,
    county: estimate.county,
  });
  const month = romanianMonth(Date.now());
  const county = countyOf(estimate);
  await countForProducer(ctx, { manufacturerId, month, county }, { added: 1 });
  await countForNorm(
    ctx,
    { manufacturerId, month, lineageId: norm.lineageId ?? norm._id },
    { added: 1 },
  );
  await noteFirm(
    ctx,
    { manufacturerId, organizationId: estimate.organizationId, county },
    month,
  );
}

type Content = {
  // The producers whose norms or products the Deviz holds.
  manufacturers: Set<Id<"manufacturers">>;
  norms: Map<
    Id<"norms">,
    { manufacturerId: Id<"manufacturers">; quantity: number }
  >;
  products: Map<
    Id<"products">,
    {
      manufacturerId: Id<"manufacturers">;
      quantity: number;
      value: number;
      // In the Deviz, rather than only swapped out of it.
      used: boolean;
      replaced: boolean;
    }
  >;
};

/**
 * The producers' norms and products a Deviz holds. A sent one also offers
 * the products its Variante put in; an accepted one holds what the client
 * accepted on its Ofertă: the chosen Variantă's products, without the
 * optional works they left out.
 */
async function contentOf(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  kind: Kind,
): Promise<Content> {
  let items = await readLineItems(ctx, estimate._id);
  let swaps: Doc<"variants">["swaps"] = [];
  if (kind === "sent") {
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", estimate._id),
      )
      .take(100);
    swaps = variants.flatMap((variant) => variant.swaps);
  } else {
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
      .take(100);
    const offer = offers.find((row) => row.status === "accepted");
    if (offer) {
      const excluded = new Set(offer.choice?.excludedItemIds ?? []);
      items = items.filter((item) => !excluded.has(item._id));
      const variant = offer.acceptedVariantId
        ? await ctx.db.get("variants", offer.acceptedVariantId)
        : null;
      swaps = variant?.swaps ?? [];
    }
  }

  const norms = new Map<Id<"norms">, Doc<"norms"> | null>();
  const products = new Map<Id<"products">, Doc<"products"> | null>();
  const normOf = async (normId: Id<"norms">) => {
    if (!norms.has(normId)) {
      norms.set(normId, await ctx.db.get("norms", normId));
    }
    return norms.get(normId) ?? null;
  };
  const productOf = async (productId: Id<"products"> | undefined) => {
    if (!productId) {
      return null;
    }
    if (!products.has(productId)) {
      products.set(productId, await ctx.db.get("products", productId));
    }
    return products.get(productId) ?? null;
  };

  const content: Content = {
    manufacturers: new Set(),
    norms: new Map(),
    products: new Map(),
  };
  const productEntry = (product: Doc<"products">) => {
    const entry = content.products.get(product._id) ?? {
      manufacturerId: product.manufacturerId,
      quantity: 0,
      value: 0,
      used: false,
      replaced: false,
    };
    content.products.set(product._id, entry);
    return entry;
  };
  const use = (product: Doc<"products">, quantity: number, value: number) => {
    const entry = productEntry(product);
    entry.quantity += quantity;
    entry.value += value;
    entry.used = true;
    content.manufacturers.add(product.manufacturerId);
  };

  for (const item of items) {
    const norm = item.normId ? await normOf(item.normId) : null;
    if (norm?.manufacturerId) {
      const lineageId = norm.lineageId ?? norm._id;
      const entry = content.norms.get(lineageId) ?? {
        manufacturerId: norm.manufacturerId,
        quantity: 0,
      };
      entry.quantity += item.quantity;
      content.norms.set(lineageId, entry);
      content.manufacturers.add(norm.manufacturerId);
    }
    for (const resource of item.resources) {
      if (isPercentUnit(resource.unit)) {
        continue;
      }
      const quantity = resource.quantity * item.quantity;
      const original = await productOf(resource.productId);
      const instead = swaps.filter(
        (swap) =>
          swap.lineItemId === item._id && swap.resourceKey === resource.key,
      );
      if (kind === "sent") {
        // Each product offered for the resource, once.
        const offered = new Set([original]);
        for (const swap of instead) {
          offered.add(await productOf(swap.productId));
        }
        for (const product of offered) {
          if (product) {
            use(product, quantity, 0);
          }
        }
        continue;
      }
      const swap = instead.at(0);
      const chosen = swap ? await productOf(swap.productId) : original;
      if (
        swap &&
        original &&
        chosen?.manufacturerId !== original.manufacturerId
      ) {
        productEntry(original).replaced = true;
      }
      if (chosen) {
        use(
          chosen,
          quantity,
          quantity * (swap?.unitPrice ?? resource.unitPrice),
        );
      }
    }
  }
  return content;
}

/** Counts a Deviz as sent or accepted, unless one of its revisions was. */
async function countOnce(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  kind: Kind,
  at: number,
) {
  const counted = await ctx.db
    .query("countedEstimates")
    .withIndex("by_organizationId_and_number_and_kind", (q) =>
      q
        .eq("organizationId", estimate.organizationId)
        .eq("number", estimate.number)
        .eq("kind", kind),
    )
    .unique();
  if (counted) {
    return;
  }
  const content = await contentOf(ctx, estimate, kind);
  if (content.manufacturers.size === 0 && content.products.size === 0) {
    // Nothing of any producer's: a later revision may still count.
    return;
  }
  await ctx.db.insert("countedEstimates", {
    organizationId: estimate.organizationId,
    number: estimate.number,
    kind,
  });
  const month = romanianMonth(at);
  const county = countyOf(estimate);
  for (const manufacturerId of content.manufacturers) {
    await countForProducer(
      ctx,
      { manufacturerId, month, county },
      kind === "sent" ? { sent: 1 } : { accepted: 1 },
    );
    await noteFirm(
      ctx,
      { manufacturerId, organizationId: estimate.organizationId, county },
      month,
    );
  }
  for (const [lineageId, norm] of content.norms) {
    await countForNorm(
      ctx,
      { manufacturerId: norm.manufacturerId, month, lineageId },
      kind === "sent"
        ? { sent: 1 }
        : { accepted: 1, acceptedQuantity: norm.quantity },
    );
  }
  for (const [productId, product] of content.products) {
    const used = product.used ? 1 : 0;
    await countForProduct(
      ctx,
      { manufacturerId: product.manufacturerId, month, productId },
      kind === "sent"
        ? { sent: used, sentQuantity: product.quantity }
        : {
            accepted: used,
            acceptedQuantity: product.quantity,
            acceptedValue: product.value,
            replaced: product.replaced ? 1 : 0,
          },
    );
  }
}

/**
 * Counts a Deviz sent to its client or accepted, scheduled when its status
 * changes so that neither the firm's click nor the client's waits for it.
 * `at` is when it happened. An accepted Deviz also counts as sent, for one
 * marked accepted straight from draft.
 */
export const countEstimate = internalMutation({
  args: {
    estimateId: v.id("estimates"),
    kind: countedKind,
    at: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const estimate = await ctx.db.get("estimates", args.estimateId);
    if (!estimate) {
      return null;
    }
    if (args.kind === "accepted") {
      await countOnce(ctx, estimate, "sent", args.at);
    }
    await countOnce(ctx, estimate, args.kind, args.at);
    return null;
  },
});

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

/** Rows grouped by a key, in the order the keys first appear. */
function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const group = groups.get(key(row));
    if (group) {
      group.push(row);
    } else {
      groups.set(key(row), [row]);
    }
  }
  return groups;
}

/**
 * A Producător's usage statistics over the last twelve months, for its own
 * firm and Devize staff; null for anyone else. `until` is the current month
 * (YYYY-MM), which the app passes since a query can't read the clock.
 */
export const stats = query({
  args: { manufacturerId: v.id("manufacturers"), until: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const allowed =
      (await isProducer(ctx, args.manufacturerId, userId)) ||
      (await getSuperAdmin(ctx)) !== null;
    if (!allowed) {
      return null;
    }
    const until = checkMonth(args.until);
    const months = monthsUntil(until, STATS_MONTHS);
    const from = months[0] ?? until;

    const producerRows = await ctx.db
      .query("producerUsage")
      .withIndex("by_manufacturerId_and_month_and_county", (q) =>
        q
          .eq("manufacturerId", args.manufacturerId)
          .gte("month", from)
          .lte("month", until),
      )
      .take(MAX_ROWS);
    const normRows = await ctx.db
      .query("normUsage")
      .withIndex("by_manufacturerId_and_month_and_lineageId", (q) =>
        q
          .eq("manufacturerId", args.manufacturerId)
          .gte("month", from)
          .lte("month", until),
      )
      .take(MAX_ROWS);
    const productRows = await ctx.db
      .query("productUsage")
      .withIndex("by_manufacturerId_and_month_and_productId", (q) =>
        q
          .eq("manufacturerId", args.manufacturerId)
          .gte("month", from)
          .lte("month", until),
      )
      .take(MAX_ROWS);
    const firmRows = await ctx.db
      .query("usageFirms")
      .withIndex("by_manufacturerId_and_lastMonth", (q) =>
        q.eq("manufacturerId", args.manufacturerId).gte("lastMonth", from),
      )
      .take(MAX_ROWS);

    const byMonth = groupBy(producerRows, (row) => row.month);
    const monthly = months.map((month) => {
      const rows = byMonth.get(month) ?? [];
      return {
        month,
        added: sum(rows, (row) => row.added),
        sent: sum(rows, (row) => row.sent),
        accepted: sum(rows, (row) => row.accepted),
      };
    });

    // Counties with enough firms on their own; the rest, and devize without
    // a county, together.
    const firmsByCounty = groupBy(firmRows, (row) => row.county);
    const counties = [];
    const others = [];
    for (const [county, rows] of groupBy(producerRows, (row) => row.county)) {
      const firms = firmsByCounty.get(county)?.length ?? 0;
      const usage = {
        added: sum(rows, (row) => row.added),
        sent: sum(rows, (row) => row.sent),
        accepted: sum(rows, (row) => row.accepted),
      };
      if (county !== undefined && firms >= MIN_FIRMS_PER_COUNTY) {
        counties.push({ county, firms, ...usage });
      } else {
        others.push(usage);
      }
    }
    counties.sort(
      (a, b) =>
        b.sent - a.sent ||
        b.added - a.added ||
        a.county.localeCompare(b.county, "ro"),
    );

    const norms = [];
    for (const [lineageId, rows] of groupBy(normRows, (row) => row.lineageId)) {
      const first = await ctx.db.get("norms", lineageId);
      if (!first) {
        continue;
      }
      const norm = (await latestPublishedVersion(ctx, first)) ?? first;
      norms.push({
        _id: norm._id,
        code: norm.code,
        title: norm.title,
        unit: norm.unit,
        added: sum(rows, (row) => row.added),
        sent: sum(rows, (row) => row.sent),
        accepted: sum(rows, (row) => row.accepted),
        acceptedQuantity: sum(rows, (row) => row.acceptedQuantity),
      });
    }
    norms.sort(
      (a, b) =>
        b.added - a.added ||
        b.accepted - a.accepted ||
        a.code.localeCompare(b.code, "ro"),
    );

    const products = [];
    for (const [productId, rows] of groupBy(
      productRows,
      (row) => row.productId,
    )) {
      const product = await ctx.db.get("products", productId);
      if (!product) {
        continue;
      }
      products.push({
        _id: product._id,
        name: product.name,
        unit: product.unit,
        packageSize: product.packageSize,
        packageLabel: product.packageLabel,
        sent: sum(rows, (row) => row.sent),
        sentQuantity: sum(rows, (row) => row.sentQuantity),
        accepted: sum(rows, (row) => row.accepted),
        acceptedQuantity: sum(rows, (row) => row.acceptedQuantity),
        acceptedValue: sum(rows, (row) => row.acceptedValue),
        replaced: sum(rows, (row) => row.replaced),
      });
    }
    products.sort(
      (a, b) =>
        b.accepted - a.accepted ||
        b.sent - a.sent ||
        b.replaced - a.replaced ||
        a.name.localeCompare(b.name, "ro"),
    );

    return {
      months: monthly,
      totals: {
        added: sum(monthly, (month) => month.added),
        sent: sum(monthly, (month) => month.sent),
        accepted: sum(monthly, (month) => month.accepted),
        firms: new Set(firmRows.map((row) => row.organizationId)).size,
      },
      norms: norms.slice(0, MAX_LISTED),
      products: products.slice(0, MAX_LISTED),
      counties,
      otherCounties:
        others.length > 0
          ? {
              added: sum(others, (row) => row.added),
              sent: sum(others, (row) => row.sent),
              accepted: sum(others, (row) => row.accepted),
            }
          : null,
    };
  },
});

/** Deletes the next batch of a firm's usage rows; the counts stay. */
export async function deleteFirmUsage(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  limit: number,
): Promise<number> {
  const firms = await ctx.db
    .query("usageFirms")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of firms) {
    await ctx.db.delete("usageFirms", row._id);
  }
  if (firms.length > 0) {
    return firms.length;
  }
  const estimates = await ctx.db
    .query("countedEstimates")
    .withIndex("by_organizationId_and_number_and_kind", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of estimates) {
    await ctx.db.delete("countedEstimates", row._id);
  }
  return estimates.length;
}

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { createPriceResolver } from "../prices/resolve";
import { computeRecap, unitCost } from "./recap";

/** A Deviz the signed-in user may change: their firm's, and not sent. */
export async function requireEditableEstimate(
  ctx: MutationCtx,
  estimateId: Id<"estimates">,
) {
  const { doc: estimate, userId } = await requireFirmDoc(
    ctx,
    "estimates",
    estimateId,
  );
  if (estimate.lockedAt !== undefined) {
    throw appError("locked", "estimate");
  }
  return { estimate, userId };
}

/**
 * Moves a Deviz to `status`, for the firm's buttons and for the client's
 * answer on an Ofertă's link. Leaving draft locks the Deviz, so what the
 * client saw can't change; going back to draft unlocks it, unless an Ofertă
 * is still out or was accepted.
 */
export async function changeStatus(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  status: Doc<"estimates">["status"],
) {
  const now = Date.now();
  if (status === "draft") {
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
      .take(100);
    if (
      offers.some(
        (offer) =>
          offer.status === "sent" ||
          offer.status === "viewed" ||
          offer.status === "accepted",
      )
    ) {
      throw appError("locked", "offer");
    }
    await ctx.db.patch("estimates", estimate._id, {
      status: "draft",
      lockedAt: undefined,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.patch("estimates", estimate._id, {
    status,
    lockedAt: estimate.lockedAt ?? now,
    updatedAt: now,
  });
}

/** A line item and its Deviz, checked like `requireEditableEstimate`. */
export async function requireEditableLineItem(
  ctx: MutationCtx,
  lineItemId: Id<"lineItems">,
) {
  const { doc: item } = await requireFirmDoc(ctx, "lineItems", lineItemId);
  const { estimate, userId } = await requireEditableEstimate(
    ctx,
    item.estimateId,
  );
  return { item, estimate, userId };
}

/** All of a Deviz's line items, in order. */
export async function readLineItems(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"lineItems">[]> {
  const items: Doc<"lineItems">[] = [];
  const rows = ctx.db
    .query("lineItems")
    .withIndex("by_estimateId_and_position", (q) =>
      q.eq("estimateId", estimateId),
    );
  for await (const item of rows) {
    items.push(item);
  }
  return items;
}

export async function readSections(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"sections">[]> {
  return await ctx.db
    .query("sections")
    .withIndex("by_estimateId_and_position", (q) =>
      q.eq("estimateId", estimateId),
    )
    .take(1000);
}

/** Recomputes a Deviz's cached Recapitulație from all its line items. */
export async function refreshTotals(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
) {
  const items = await readLineItems(ctx, estimate._id);
  await ctx.db.patch("estimates", estimate._id, {
    totals: computeRecap(items, estimate.markups),
    updatedAt: Date.now(),
  });
}

/**
 * The position for a new row at the end of a Deviz, or right after another
 * row. Positions are fractions, so inserting never renumbers other rows.
 */
export async function nextPosition(
  ctx: QueryCtx,
  table: "sections" | "lineItems",
  estimateId: Id<"estimates">,
  after?: { position: number },
): Promise<number> {
  const rows =
    table === "sections"
      ? ctx.db
          .query("sections")
          .withIndex("by_estimateId_and_position", (q) =>
            after
              ? q.eq("estimateId", estimateId).gt("position", after.position)
              : q.eq("estimateId", estimateId),
          )
      : ctx.db
          .query("lineItems")
          .withIndex("by_estimateId_and_position", (q) =>
            after
              ? q.eq("estimateId", estimateId).gt("position", after.position)
              : q.eq("estimateId", estimateId),
          );
  if (after) {
    const next = await rows.first();
    return next ? (after.position + next.position) / 2 : after.position + 1;
  }
  const last = await rows.order("desc").first();
  return last ? last.position + 1 : 1;
}

/** Checks that a section belongs to the Deviz. */
export async function checkSection(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
  sectionId: Id<"sections"> | undefined,
) {
  if (!sectionId) {
    return;
  }
  const section = await ctx.db.get("sections", sectionId);
  if (!section || section.estimateId !== estimate._id) {
    throw notFound("section");
  }
}

export function checkQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1e9) {
    throw invalid("quantity");
  }
}

type ResourceRow = Pick<
  Doc<"normResources">,
  | "kind"
  | "resourceId"
  | "productId"
  | "name"
  | "unit"
  | "quantity"
  | "referencePrice"
>;

type PriceResolver = ReturnType<typeof createPriceResolver>;

/**
 * Copies a norm's resources onto a line item with the firm's prices today.
 * Keys are unique within the item; a price set by hand on an earlier copy
 * (`keep`) survives when the same resource is still there.
 */
export async function snapshotResources(
  rows: readonly ResourceRow[],
  resolver: PriceResolver,
  keep: Doc<"lineItems">["resources"] = [],
): Promise<Doc<"lineItems">["resources"]> {
  const now = Date.now();
  const seen = new Map<string, number>();
  const resources: Doc<"lineItems">["resources"] = [];
  for (const row of rows) {
    const base = row.productId ?? row.resourceId ?? `name:${row.name}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const key = count === 0 ? base : `${base}#${count + 1}`;
    const manual = keep.find(
      (resource) => resource.key === key && resource.priceSource === "manual",
    );
    const price = manual
      ? {
          unitPrice: manual.unitPrice,
          priceSource: manual.priceSource,
          pricedAt: manual.pricedAt,
        }
      : await resolver.resolve(row);
    resources.push({
      key,
      kind: row.kind,
      resourceId: row.resourceId,
      productId: row.productId,
      name: row.name,
      unit: row.unit,
      quantity: row.quantity,
      unitPrice: price.unitPrice,
      priceSource: price.priceSource,
      referencePrice: row.referencePrice,
      listingId: "listingId" in price ? price.listingId : undefined,
      store: "store" in price ? price.store : undefined,
      pricedAt: price.pricedAt ?? now,
    });
  }
  return resources;
}

/** The fields of a line item that follow from its resources. */
export function pricedFields(resources: Doc<"lineItems">["resources"]) {
  const result = unitCost(resources);
  return {
    resources,
    unitCost: result.unitCost,
    laborHours: result.laborHours,
  };
}

export function resolverFor(ctx: QueryCtx, estimate: Doc<"estimates">) {
  return createPriceResolver(ctx, {
    organizationId: estimate.organizationId,
    preferredStore: estimate.preferredStore,
  });
}

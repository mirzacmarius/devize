import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { readLineItems, readSections } from "../estimates/helpers";
import {
  type Choice,
  checkChoice,
  defaultChoice,
  materialNames,
  priceChoice,
} from "./choice";

// What the client reads on an Ofertă's link, built field by field from the
// Deviz, so nothing else of the firm's leaks: no notes, no members, no price
// sources or store choices, no resource prices. The page shows it, and the
// assistant answers from it and nothing more.

export async function firmView(ctx: QueryCtx, firm: Doc<"organizations">) {
  return {
    name: firm.name,
    logoUrl: firm.logoId ? await ctx.storage.getUrl(firm.logoId) : null,
    cui: firm.cui,
    tradeRegister: firm.tradeRegister,
    address: firm.address,
    county: firm.county,
    email: firm.email,
    phone: firm.phone,
  };
}

async function variantsOf(ctx: QueryCtx, offer: Doc<"offers">) {
  const variants: Doc<"variants">[] = [];
  for (const variantId of offer.variantIds) {
    const variant = await ctx.db.get("variants", variantId);
    if (variant && variant.estimateId === offer.estimateId) {
      variants.push(variant);
    }
  }
  return variants;
}

/**
 * The choice to show: once the client decided, the one they decided on;
 * otherwise what the page asks for, or the last one saved, or the default.
 */
export function effectiveChoice(
  offer: Doc<"offers">,
  open: boolean,
  asked: { variantId?: Id<"variants">; excludedItemIds?: Id<"lineItems">[] },
): Choice {
  if (!open || (asked.variantId === undefined && !asked.excludedItemIds)) {
    return offer.choice
      ? {
          variantId: offer.choice.variantId,
          excludedItemIds: offer.choice.excludedItemIds,
        }
      : defaultChoice(offer);
  }
  return checkChoice(offer, asked);
}

/**
 * The Ofertă as the client reads it, priced for `choice`: the Deviz's works
 * and their prices, its Variante, and the Recapitulație they add up to.
 */
export async function offerContent(
  ctx: QueryCtx,
  offer: Doc<"offers">,
  estimate: Doc<"estimates">,
  choice: Choice,
) {
  const items = await readLineItems(ctx, estimate._id);
  const sections = await readSections(ctx, estimate._id);
  const variants = await variantsOf(ctx, offer);
  const variant = variants.find((x) => x._id === choice.variantId) ?? null;
  const priced = priceChoice(
    items,
    variant,
    choice.excludedItemIds,
    estimate.markups,
  );
  const optional = new Map(
    offer.optionalItems.map((o) => [o.lineItemId, o.included]),
  );
  // Each option's total with the same works left out, for comparing.
  const totalWith = (option: Doc<"variants"> | null) =>
    priceChoice(items, option, choice.excludedItemIds, estimate.markups).totals
      .total;
  const client = estimate.clientId
    ? await ctx.db.get("clients", estimate.clientId)
    : null;

  return {
    description: estimate.description,
    siteAddress: estimate.siteAddress,
    county: estimate.county,
    priceDate: estimate.priceDate,
    message: offer.message,
    expiresAt: offer.expiresAt,
    depositPercent: offer.depositPercent,
    assistant: offer.assistant,
    client: client ? { name: client.name } : null,
    markups: estimate.markups,
    sections: sections.map((section) => ({
      _id: section._id,
      kind: section.kind,
      parentId: section.parentId,
      code: section.code,
      name: section.name,
      position: section.position,
    })),
    items: priced.lines.map((line) => ({
      _id: line.item._id,
      sectionId: line.item.sectionId,
      position: line.item.position,
      code: line.item.code,
      title: line.item.title,
      unit: line.item.unit,
      quantity: line.item.quantity,
      unitPrice: line.unitPrice,
      total: line.total,
      materials: materialNames(line.resources),
      changes: line.changes,
      optional: optional.has(line.item._id),
      included: line.included,
    })),
    baseLabel: offer.baseLabel,
    baseTotal: variants.length > 0 ? totalWith(null) : priced.totals.total,
    variants: variants.map((option) => ({
      _id: option._id,
      name: option.name,
      tier: option.tier,
      description: option.description,
      total: totalWith(option),
    })),
    choice: { ...choice, totals: priced.totals },
  };
}

export type OfferContent = Awaited<ReturnType<typeof offerContent>>;

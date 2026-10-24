import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { readLineItems, readSections } from "../estimates/helpers";
import { withVariant } from "../offers/choice";

// The contract behind a Deviz's Situații de lucrări: its Articole as the
// client accepted them. When the client answered on an Ofertă's link, that
// is their choice: the optional works they left out are not in the
// contract, and the Variantă they chose sets the materials and the prices.

export type ContractRow = {
  lineItemId: Id<"lineItems">;
  position: number;
  group?: string;
  code: string;
  title: string;
  unit: string;
  contractQuantity: number;
  unitCost: Doc<"lineItems">["unitCost"];
  laborHours: number;
};

function sectionName(section: Doc<"sections">) {
  return section.code ? `${section.code} ${section.name}` : section.name;
}

/**
 * The line items in the order and groups the Deviz's page and PDF show:
 * the items outside any section first, then each object or chapter, with
 * an object's chapters after its own items.
 */
export function orderedItems(
  sections: readonly Doc<"sections">[],
  items: readonly Doc<"lineItems">[],
): { item: Doc<"lineItems">; group?: string }[] {
  const sorted = [...sections].sort((a, b) => a.position - b.position);
  const known = new Set(sorted.map((section) => section._id));
  const objects = new Set(
    sorted.filter((s) => s.kind === "object").map((s) => s._id),
  );
  const bySection = new Map<Id<"sections">, Doc<"lineItems">[]>();
  const loose: Doc<"lineItems">[] = [];
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    if (item.sectionId && known.has(item.sectionId)) {
      bySection.set(item.sectionId, [
        ...(bySection.get(item.sectionId) ?? []),
        item,
      ]);
    } else {
      loose.push(item);
    }
  }
  const result: { item: Doc<"lineItems">; group?: string }[] = loose.map(
    (item) => ({ item }),
  );
  for (const section of sorted) {
    const nested =
      section.kind === "chapter" &&
      section.parentId !== undefined &&
      objects.has(section.parentId);
    if (nested) {
      continue;
    }
    const group = sectionName(section);
    for (const item of bySection.get(section._id) ?? []) {
      result.push({ item, group });
    }
    if (section.kind === "object") {
      for (const chapter of sorted) {
        if (chapter.kind === "chapter" && chapter.parentId === section._id) {
          const name = `${group} · ${sectionName(chapter)}`;
          for (const item of bySection.get(chapter._id) ?? []) {
            result.push({ item, group: name });
          }
        }
      }
    }
  }
  return result;
}

/**
 * The accepted Ofertă of a Deviz, if the client answered on a link: what
 * they chose is the contract.
 */
async function acceptedOffer(ctx: QueryCtx, estimateId: Id<"estimates">) {
  const offers = await ctx.db
    .query("offers")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .take(100);
  return (
    offers
      .filter((offer) => offer.status === "accepted" && offer.choice)
      .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))[0] ?? null
  );
}

/** A Deviz's Articole as contracted, in print order, numbered from 1. */
export async function contractRows(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
): Promise<ContractRow[]> {
  const items = await readLineItems(ctx, estimate._id);
  const sections = await readSections(ctx, estimate._id);
  const offer = await acceptedOffer(ctx, estimate._id);
  const excluded = new Set(offer?.choice?.excludedItemIds ?? []);
  const variant = offer?.choice?.variantId
    ? await ctx.db.get("variants", offer.choice.variantId)
    : null;
  const rows: ContractRow[] = [];
  for (const { item, group } of orderedItems(sections, items)) {
    if (excluded.has(item._id)) {
      continue;
    }
    const priced = withVariant(item, variant);
    rows.push({
      lineItemId: item._id,
      position: rows.length + 1,
      group,
      code: item.code,
      title: item.title,
      unit: item.unit,
      contractQuantity: item.quantity,
      unitCost: priced.unitCost,
      laborHours: priced.laborHours,
    });
  }
  return rows;
}

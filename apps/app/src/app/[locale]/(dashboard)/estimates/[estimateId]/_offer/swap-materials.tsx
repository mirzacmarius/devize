"use client";

import { formatPercent } from "@/lib/format";
import { isPercent } from "@/lib/resource-values";
import { useCurrentLocale } from "@/locales/client";
import type { LineItemResource } from "../_components/types";

/** What a Variantă can swap: a material, not the sundries counted in "%". */
export function isSwappable(resource: LineItemResource) {
  return resource.kind === "material" && !isPercent(resource);
}

/** Words to compare, without case or diacritics. */
export function searchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Whether a resource is the same material as `target`, as the server decides
 * it when a swap goes in every work with it (convex/offers/variants.ts).
 */
export function sameMaterial(
  resource: LineItemResource,
  target: LineItemResource,
) {
  if (!isSwappable(resource)) {
    return false;
  }
  if (target.productId) {
    return resource.productId === target.productId;
  }
  if (target.resourceId) {
    return !resource.productId && resource.resourceId === target.resourceId;
  }
  return (
    !resource.productId &&
    !resource.resourceId &&
    searchKey(resource.name) === searchKey(target.name) &&
    resource.unit === target.unit
  );
}

/** How much dearer or cheaper a price is: (+35%), (−20%). */
export function PriceChange({ from, to }: { from: number; to: number }) {
  const locale = useCurrentLocale();
  const change = from > 0 ? Math.round(((to - from) / from) * 100) : 0;
  if (change === 0) {
    return null;
  }
  return (
    <span className="tabular-nums">
      ({change > 0 ? "+" : "−"}
      {formatPercent(Math.abs(change), locale)})
    </span>
  );
}

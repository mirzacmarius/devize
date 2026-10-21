import type { BasketLine } from "@devize/backend/convex/prices/basketPlan";
import type { Store } from "@devize/backend/convex/prices/resolve";
import { storeSites } from "@devize/backend/convex/prices/stores";
import type { BasketMaterial, BasketOffer } from "./types";

/** The materials as the planner reads them. */
export function linesOf(materials: readonly BasketMaterial[]): BasketLine[] {
  return materials.map((material) => ({
    key: material.key,
    quantity: material.quantity,
    offers: material.offers.map((offer) => ({
      store: offer.store,
      price: offer.price,
      unitsPerSale: offer.unitsPerSale,
    })),
  }));
}

/** A store's offer for a material, if it has one. */
export function offerAt(
  material: BasketMaterial,
  store: Store,
): BasketOffer | undefined {
  return material.offers.find((offer) => offer.store === store);
}

/** Lei without VAT from a store price with VAT. */
export function withoutVat(price: number, vat: number): number {
  return price / (1 + vat / 100);
}

/**
 * A Google search for the material on one store's site, for finding the
 * product page to link. The person runs it; Devize never searches stores.
 */
export function searchUrl(store: Store, name: string): string {
  const domain = storeSites[store].domains[0];
  return `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${name}`)}`;
}

/**
 * The list to take to a store: each product with how many items to buy, its
 * price and its link, then the total.
 */
export function shoppingList({
  heading,
  items,
  total,
}: {
  heading: string;
  items: { count: number; title: string; price: string; url?: string }[];
  total: string;
}): string {
  const lines = items.map(
    (item) =>
      `${item.count} × ${item.title} · ${item.price}${item.url ? ` · ${item.url}` : ""}`,
  );
  return [heading, "", ...lines, "", total].join("\n");
}

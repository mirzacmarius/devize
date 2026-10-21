import type { api } from "@devize/backend/convex/_generated/api";
import type { Store } from "@devize/backend/convex/prices/resolve";
import type { FunctionReturnType } from "convex/server";

export type Basket = FunctionReturnType<typeof api.prices.basket.forEstimate>;
export type BasketMaterial = Basket["materials"][number];
export type BasketOffer = BasketMaterial["offers"][number];

/** The dialog open on the Coș, if any. */
export type BasketPanel =
  | { kind: "link"; material: BasketMaterial; store: Store }
  | { kind: "typed"; material: BasketMaterial; store: Store }
  | { kind: "offer"; material: BasketMaterial; offer: BasketOffer }
  | { kind: "fee"; store: Store };

export type OpenBasketPanel = (panel: BasketPanel) => void;

import type { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

export type OfferView = NonNullable<
  FunctionReturnType<typeof api.offers.public.view>
>;
export type ClosedOfferView = Extract<OfferView, { state: "closed" }>;
// An Ofertă the client can still answer, or already answered.
export type OpenOfferView = Exclude<OfferView, { state: "closed" }>;
export type OfferItem = OpenOfferView["items"][number];
export type OfferFirm = OfferView["firm"];

/** What the client chose: a Variantă, or none, and the optional works left out. */
export type Choice = {
  variantId?: Id<"variants">;
  excludedItemIds: Id<"lineItems">[];
};

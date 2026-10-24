import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type TakeoffPageData = FunctionReturnType<
  typeof api.takeoffs.page.forEstimate
>;
export type Room = TakeoffPageData["rooms"][number];
export type Opening = Room["openings"][number];
export type Item = TakeoffPageData["items"][number];
export type Takeoff = Item["takeoffs"][number];
export type Section = TakeoffPageData["sections"][number];

/** A takeoff being written or changed, for one of the page's Articole. */
export type Target = { item: Item; takeoff?: Takeoff };

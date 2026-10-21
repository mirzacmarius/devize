import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type ShoppingList = FunctionReturnType<
  typeof api.materials.list.forEstimate
>;
export type ListRow = ShoppingList["rows"][number];
export type LayoutRow = ShoppingList["layouts"][number];

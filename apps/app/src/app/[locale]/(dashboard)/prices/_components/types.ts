import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type AlertList = FunctionReturnType<typeof api.prices.alerts.list>;
export type PriceAlert = AlertList["alerts"][number];

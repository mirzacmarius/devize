import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** An invoice as its page gets it: the row, its code and what it refers to. */
export type Invoice = FunctionReturnType<typeof api.invoices.invoices.get>;
export type InvoiceLine = Invoice["lines"][number];
export type Payment = Invoice["payments"][number];

import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type Overview = FunctionReturnType<
  typeof api.progress.statements.forEstimate
>;
export type Works = Overview["estimate"];
export type ListedStatement = Overview["statements"][number];
export type Statement = FunctionReturnType<typeof api.progress.statements.get>;
export type StatementRow = Statement["rows"][number];
export type Guarantee = FunctionReturnType<
  typeof api.progress.guarantees.forEstimate
>;
export type Receptions = FunctionReturnType<
  typeof api.progress.receptions.forEstimate
>;
export type Reception = NonNullable<Receptions["completion"]>;
export type ReceptionKind = Reception["kind"];

import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type CompatibilityCheck = FunctionReturnType<
  typeof api.systems.check.forEstimate
>;
export type Finding = CompatibilityCheck["findings"][number];
export type RestSuggestion = CompatibilityCheck["rest"][number];

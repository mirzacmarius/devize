import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type Norm = FunctionReturnType<typeof api.catalog.norms.get>;

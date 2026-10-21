import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type Profile = NonNullable<
  FunctionReturnType<typeof api.producers.profiles.get>
>;

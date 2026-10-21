import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type Profile = NonNullable<
  FunctionReturnType<typeof api.producers.profiles.get>
>;

/** A data sheet Devize AI reads, or read, for the producer. */
export type Reading = FunctionReturnType<
  typeof api.producers.datasheets.list
>[number];

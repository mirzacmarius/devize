import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type ManufacturerData = NonNullable<
  FunctionReturnType<typeof api.manufacturers.admin.get>
>;
export type Manufacturer = ManufacturerData["manufacturer"];
export type Contact = ManufacturerData["contacts"][number];
export type Message = ManufacturerData["messages"][number];
export type NormImport = ManufacturerData["normImports"][number];
export type Job = ManufacturerData["jobs"][number];
export type Erasure = ManufacturerData["erasures"][number];
export type KeptConsent = NonNullable<Manufacturer["keptConsents"]>[number];

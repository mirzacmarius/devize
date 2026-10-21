import type { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

export type Estimate = FunctionReturnType<typeof api.estimates.estimates.get>;
export type LineItem = Estimate["lineItems"][number];
export type LineItemResource = LineItem["resources"][number];
export type Section = Estimate["sections"][number];
export type Updates = FunctionReturnType<
  typeof api.estimates.estimates.checkUpdates
>;

/** The sheet or dialog open on a Deviz's page, if any. */
export type Panel =
  | { kind: "details" }
  | { kind: "markups" }
  | { kind: "proposal" }
  | { kind: "addNorm"; sectionId?: Id<"sections"> }
  | { kind: "custom"; sectionId?: Id<"sections"> }
  | { kind: "item"; item: LineItem }
  | {
      kind: "newSection";
      sectionKind: Section["kind"];
      parentId?: Id<"sections">;
    }
  | { kind: "section"; section: Section };

export type OpenPanel = (panel: Panel) => void;

import { v } from "convex/values";
import { resourceKind } from "../manufacturers/validators";

// What a proposal was made from: a description of the work, typed or
// dictated, with photos; or a Licitație's quantity lists.
export const proposalSource = v.union(
  v.literal("description"),
  v.literal("tender"),
);

// working: the AI is reading; ready: it waits for a person to review it;
// applied: the items the person kept are in the Deviz; dismissed: set aside.
// A proposal whose AI job failed stays working: its job says why.
export const proposalStatus = v.union(
  v.literal("working"),
  v.literal("ready"),
  v.literal("applied"),
  v.literal("dismissed"),
);

/** One resource of an article the AI wrote itself, per unit of the article. */
export const proposedResource = v.object({
  kind: resourceKind,
  name: v.string(),
  unit: v.string(),
  quantity: v.number(),
});

import { v } from "convex/values";
import {
  amountsByKind,
  lineItemOrigin,
  lineItemResource,
  sectionKind,
} from "../estimates/validators";
import { lineItemLayout } from "../materials/validators";

// A Șablon de deviz keeps its Deviz's works as copies, not as references:
// sections by a key of their own, line items with their resources as they
// were priced. See docs/adr/0040.

export const templateSection = v.object({
  key: v.string(),
  kind: sectionKind,
  parentKey: v.optional(v.string()),
  code: v.optional(v.string()),
  name: v.string(),
  position: v.number(),
});

export const templateLineItem = v.object({
  sectionKey: v.optional(v.string()),
  position: v.number(),
  origin: lineItemOrigin,
  normId: v.optional(v.id("norms")),
  code: v.string(),
  title: v.string(),
  unit: v.string(),
  quantity: v.number(),
  resources: v.array(lineItemResource),
  unitCost: amountsByKind,
  laborHours: v.number(),
  notes: v.optional(v.string()),
  layout: v.optional(lineItemLayout),
});

/** A starter of Devize's own library, with the measurements typed for it. */
export const starterChoice = v.object({
  key: v.string(),
  values: v.record(v.string(), v.number()),
});

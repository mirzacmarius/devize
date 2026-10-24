import { defineTable } from "convex/server";
import { v } from "convex/values";
import { templateLineItem, templateSection } from "./validators";

export const templateTables = {
  // Șabloane de deviz: a firm's Deviz saved to start new ones from. The
  // works are copied in, so a template stays as it was saved whatever
  // happens to its Deviz; starting from it prices them again, today.
  estimateTemplates: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    // The name, normalized, for the list's order and for a name taken twice.
    nameKey: v.string(),
    description: v.optional(v.string()),
    sections: v.array(templateSection),
    lineItems: v.array(templateLineItem),
    // The total with VAT when it was saved, for the list.
    total: v.number(),
    sourceEstimateId: v.optional(v.id("estimates")),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    usedCount: v.number(),
    lastUsedAt: v.optional(v.number()),
  }).index("by_organizationId_and_nameKey", ["organizationId", "nameKey"]),
};

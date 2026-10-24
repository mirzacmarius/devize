import { defineTable } from "convex/server";
import { v } from "convex/values";
import { templateLineItem, templateSection } from "./validators";

export const templateTables = {
  // Șabloane de deviz: a firm's Deviz saved to start new ones from. The
  // works are copied, so a template stays as it was saved whatever happens
  // to its Deviz; starting from it prices them again, today.
  estimateTemplates: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    // The name, normalized, for the list's order and for a name taken twice.
    nameKey: v.string(),
    description: v.optional(v.string()),
    // How much it holds, for the list. The works themselves are in
    // estimateTemplateContents, so the list doesn't read them.
    itemCount: v.optional(v.number()),
    sectionCount: v.optional(v.number()),
    // Where the first templates kept their works, before they moved to
    // estimateTemplateContents; read when a template has no contents row
    // and dropped when it is saved again.
    sections: v.optional(v.array(templateSection)),
    lineItems: v.optional(v.array(templateLineItem)),
    // The total with VAT when it was saved, for the list.
    total: v.number(),
    sourceEstimateId: v.optional(v.id("estimates")),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    usedCount: v.number(),
    lastUsedAt: v.optional(v.number()),
  }).index("by_organizationId_and_nameKey", ["organizationId", "nameKey"]),

  // A template's sections and works, one row per template.
  estimateTemplateContents: defineTable({
    templateId: v.id("estimateTemplates"),
    sections: v.array(templateSection),
    lineItems: v.array(templateLineItem),
  }).index("by_templateId", ["templateId"]),
};

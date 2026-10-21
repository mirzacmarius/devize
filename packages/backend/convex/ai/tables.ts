import { defineTable } from "convex/server";
import { v } from "convex/values";
import { aiConfidence, aiJobKind, aiJobStatus, aiUsage } from "./validators";

export const aiTables = {
  // Every call to a model, with what it cost. A job's output goes either to
  // the tables of the feature that started it or, while it waits for a
  // person, to `result`.
  aiJobs: defineTable({
    kind: aiJobKind,
    status: aiJobStatus,
    // The firm whose work started the job; none for admin work.
    organizationId: v.optional(v.id("organizations")),
    manufacturerId: v.optional(v.id("manufacturers")),
    normImportId: v.optional(v.id("normImports")),
    fileId: v.optional(v.id("_storage")),
    result: v.optional(v.any()),
    confidence: v.optional(aiConfidence),
    error: v.optional(v.string()),
    model: v.optional(v.string()),
    usage: v.optional(aiUsage),
    costUsd: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_organizationId", ["organizationId"])
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_normImportId", ["normImportId"]),
};

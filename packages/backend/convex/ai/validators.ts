import { v } from "convex/values";

// One union for every kind of AI work, so the admin can list and cost all of
// it in one place. Add a literal here for each new kind.
export const aiJobKind = v.union(
  v.literal("manufacturer_research"),
  v.literal("norm_import"),
  v.literal("datasheet_norm"),
  v.literal("estimate_proposal"),
  v.literal("tender_import"),
  v.literal("offer_question"),
);

// needs_review is for jobs whose result waits in `result` for a person to
// accept it; jobs that write their output to their own tables end in
// succeeded.
export const aiJobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("needs_review"),
  v.literal("succeeded"),
  v.literal("failed"),
);

export const aiConfidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export const aiUsage = v.object({
  inputTokens: v.number(),
  outputTokens: v.number(),
  cacheReadTokens: v.number(),
  cacheWriteTokens: v.number(),
  webSearches: v.number(),
  webFetches: v.number(),
});

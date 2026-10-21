import type { Infer } from "convex/values";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { env, internalMutation, query } from "../_generated/server";
import { requireSuperAdmin } from "../lib/roles";
import { aiModel } from "./models";
import { type AiUsage, addUsage, costUsd, emptyUsage } from "./pricing";
import { type aiConfidence, type aiJobKind, aiUsage } from "./validators";

// A job still queued or running after this long is dead: its action hit the
// platform's time limit or crashed before it could record the failure.
export const JOB_TIMEOUT_MS = 20 * 60 * 1000;

/** Queues a job and schedules the watchdog that fails it if it never ends. */
export async function createJob(
  ctx: MutationCtx,
  fields: {
    kind: Infer<typeof aiJobKind>;
    model?: string;
    organizationId?: Id<"organizations">;
    manufacturerId?: Id<"manufacturers">;
    normImportId?: Id<"normImports">;
    fileId?: Id<"_storage">;
    createdBy?: Id<"users">;
  },
  timeoutMs = JOB_TIMEOUT_MS,
): Promise<Id<"aiJobs">> {
  const jobId = await ctx.db.insert("aiJobs", { ...fields, status: "queued" });
  await ctx.scheduler.runAfter(timeoutMs, internal.ai.jobs.expire, { jobId });
  return jobId;
}

/**
 * Marks a queued job running and returns it, or returns null when the job was
 * failed or finished in the meantime. A job that continues in a new action
 * passes `resume` to pick up its own running job.
 */
export async function startJob(
  ctx: MutationCtx,
  jobId: Id<"aiJobs">,
  options: { resume?: boolean } = {},
): Promise<Doc<"aiJobs"> | null> {
  const job = await ctx.db.get("aiJobs", jobId);
  if (!job) {
    return null;
  }
  if (job.status === "running" && options.resume) {
    return job;
  }
  if (job.status !== "queued") {
    return null;
  }
  const startedAt = Date.now();
  await ctx.db.patch("aiJobs", jobId, { status: "running", startedAt });
  return { ...job, status: "running", startedAt };
}

function withUsage(job: Doc<"aiJobs">, usage: AiUsage | undefined) {
  if (!usage) {
    return {};
  }
  const total = addUsage(job.usage ?? emptyUsage, usage);
  return {
    usage: total,
    costUsd: job.model ? costUsd(job.model, total) : undefined,
  };
}

export async function finishJob(
  ctx: MutationCtx,
  jobId: Id<"aiJobs">,
  outcome: {
    status: "succeeded" | "needs_review";
    usage?: AiUsage;
    result?: unknown;
    confidence?: Infer<typeof aiConfidence>;
  },
) {
  const job = await ctx.db.get("aiJobs", jobId);
  if (!job) {
    return;
  }
  await ctx.db.patch("aiJobs", jobId, {
    status: outcome.status,
    finishedAt: Date.now(),
    result: outcome.result,
    confidence: outcome.confidence,
    ...withUsage(job, outcome.usage),
  });
}

export async function failJob(
  ctx: MutationCtx,
  job: Doc<"aiJobs">,
  error: string,
  usage?: AiUsage,
) {
  await ctx.db.patch("aiJobs", job._id, {
    status: "failed",
    error,
    finishedAt: Date.now(),
    ...withUsage(job, usage),
  });
  if (job.normImportId) {
    const normImport = await ctx.db.get("normImports", job.normImportId);
    if (normImport && normImport.status !== "review") {
      await ctx.db.patch("normImports", normImport._id, {
        status: "failed",
        error,
      });
    }
  }
}

/** Records a failure reported by the job's own action. */
export const fail = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    error: v.string(),
    usage: v.optional(aiUsage),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (job && (job.status === "queued" || job.status === "running")) {
      await failJob(ctx, job, args.error, args.usage);
    }
    return null;
  },
});

/** Adds the usage of one step of a job that runs in several actions. */
export const recordUsage = internalMutation({
  args: { jobId: v.id("aiJobs"), usage: aiUsage },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (job) {
      await ctx.db.patch("aiJobs", job._id, withUsage(job, args.usage));
    }
    return null;
  },
});

export const expire = internalMutation({
  args: { jobId: v.id("aiJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (job && (job.status === "queued" || job.status === "running")) {
      await failJob(ctx, job, "timeout");
    }
    return null;
  },
});

/** The AI jobs of one manufacturer, newest first. */
export const listForManufacturer = query({
  args: { manufacturerId: v.id("manufacturers") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await ctx.db
      .query("aiJobs")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", args.manufacturerId),
      )
      .order("desc")
      .take(20);
  },
});

/** How many jobs ran since `since` (a timestamp) and what they cost. */
export const costSummary = query({
  args: { since: v.number() },
  returns: v.object({
    jobs: v.number(),
    failed: v.number(),
    costUsd: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const jobs = await ctx.db
      .query("aiJobs")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.since))
      .take(2000);
    return {
      jobs: jobs.length,
      failed: jobs.filter((job) => job.status === "failed").length,
      costUsd: jobs.reduce((sum, job) => sum + (job.costUsd ?? 0), 0),
    };
  },
});

/** Whether the Claude API key is set, and the model new jobs use. */
export const apiStatus = query({
  args: {},
  returns: v.object({ hasApiKey: v.boolean(), model: v.string() }),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return {
      hasApiKey: Boolean(env.ANTHROPIC_API_KEY?.trim()),
      model: aiModel(),
    };
  },
});

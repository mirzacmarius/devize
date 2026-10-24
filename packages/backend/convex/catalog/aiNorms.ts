import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import {
  createJob,
  failJob,
  finishJob,
  JOB_TIMEOUT_MS,
  personLimitReached,
  startJob,
} from "../ai/jobs";
import { aiModel, defaultModel } from "../ai/models";
import { aiUsage } from "../ai/validators";
import { requireEditableEstimate } from "../estimates/helpers";
import { insertFromNorm } from "../estimates/lineItems";
import { requireFirmDoc, requireMember } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { isUsableBy } from "./access";
import { MAX_DESCRIPTION } from "./lib/aiNorm";
import { freeCode, insertDraftNorm, publishDraft } from "./norms";
import { normResourceInput } from "./validators";

// Norms a firm can have written, and a person across all their firms:
// enough for a day of estimating, few enough to keep a mistake from costing
// much.
const PER_HOUR = 10;
const PER_DAY = 40;
const HOUR_MS = 60 * 60 * 1000;

async function checkQuota(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
) {
  const now = Date.now();
  const lastDay = await ctx.db
    .query("normRequests")
    .withIndex("by_organizationId", (q) =>
      q
        .eq("organizationId", organizationId)
        .gt("_creationTime", now - 24 * HOUR_MS),
    )
    .take(PER_DAY);
  const lastHour = lastDay.filter((row) => row._creationTime > now - HOUR_MS);
  if (
    lastDay.length >= PER_DAY ||
    lastHour.length >= PER_HOUR ||
    (await personLimitReached(ctx, userId, ["norm_draft"], {
      perHour: PER_HOUR,
      perDay: PER_DAY,
    }))
  ) {
    throw appError("rate_limited", "aiNorms");
  }
}

/** Where a request stands: one whose job died has failed, whatever the row says. */
function stateOf(row: Doc<"normRequests">, job: Doc<"aiJobs"> | null) {
  if (row.status === "writing" && (!job || job.status === "failed")) {
    return { status: "failed" as const, error: job?.error ?? "unknown" };
  }
  return { status: row.status, error: row.error };
}

/**
 * Has Devize AI write a Normă proprie for the firm from a few sentences about
 * a work the catalog lacks. The writing runs in the background; `get` shows
 * how it goes and the draft it makes, which the firm checks before adding it
 * to a Deviz.
 */
export const start = mutation({
  args: {
    organizationId: v.id("organizations"),
    description: v.string(),
    // The Deviz the firm is working on, for the model's context.
    estimateId: v.optional(v.id("estimates")),
  },
  returns: v.id("normRequests"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const description = args.description.replace(/\s+/g, " ").trim();
    if (!description) {
      throw invalid("description");
    }
    if (description.length > MAX_DESCRIPTION) {
      throw invalid("length");
    }
    if (args.estimateId) {
      const estimate = await ctx.db.get("estimates", args.estimateId);
      if (!estimate || estimate.organizationId !== args.organizationId) {
        throw notFound("estimate");
      }
    }
    await checkQuota(ctx, args.organizationId, userId);
    const aiJobId = await createJob(
      ctx,
      {
        kind: "norm_draft",
        model: aiModel(),
        organizationId: args.organizationId,
        createdBy: userId,
      },
      JOB_TIMEOUT_MS,
    );
    const requestId = await ctx.db.insert("normRequests", {
      organizationId: args.organizationId,
      estimateId: args.estimateId,
      description,
      aiJobId,
      status: "writing",
      createdBy: userId,
    });
    await ctx.scheduler.runAfter(0, internal.catalog.aiNormsAi.write, {
      requestId,
    });
    return requestId;
  },
});

/**
 * How a firm's request goes: still being written, failed and why, or done,
 * with the draft and what the model assumed and asks the firm to check.
 */
export const get = query({
  args: { requestId: v.id("normRequests") },
  handler: async (ctx, args) => {
    const { doc: row } = await requireFirmDoc(
      ctx,
      "normRequests",
      args.requestId,
    );
    const job = await ctx.db.get("aiJobs", row.aiJobId);
    const norm = row.normId ? await ctx.db.get("norms", row.normId) : null;
    return {
      _id: row._id,
      description: row.description,
      ...stateOf(row, job),
      assumptions: row.assumptions ?? [],
      checks: row.checks ?? [],
      norm: norm
        ? {
            _id: norm._id,
            code: norm.code,
            title: norm.title,
            unit: norm.unit,
            status: norm.status,
          }
        : null,
    };
  },
});

/**
 * Puts the norm Devize AI wrote into a Deviz: publishes the draft in the
 * firm's own catalog, where the firm finds it again, and adds the line item
 * with the firm's prices today. A norm already published is only added.
 */
export const addToEstimate = mutation({
  args: {
    requestId: v.id("normRequests"),
    estimateId: v.id("estimates"),
    quantity: v.number(),
    sectionId: v.optional(v.id("sections")),
  },
  returns: v.id("lineItems"),
  handler: async (ctx, args) => {
    const { doc: row, userId } = await requireFirmDoc(
      ctx,
      "normRequests",
      args.requestId,
    );
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    const draft = row.normId ? await ctx.db.get("norms", row.normId) : null;
    if (
      !draft ||
      draft.organizationId !== row.organizationId ||
      estimate.organizationId !== row.organizationId
    ) {
      throw notFound("norm");
    }
    if (draft.status === "draft" || draft.status === "review") {
      await publishDraft(ctx, draft, userId);
    }
    const norm = await ctx.db.get("norms", draft._id);
    if (!norm || !isUsableBy(norm, estimate.organizationId)) {
      throw appError("locked", draft.status);
    }
    return await insertFromNorm(ctx, estimate, norm, args);
  },
});

const rateKind = v.union(
  v.literal("labor"),
  v.literal("equipment"),
  v.literal("transport"),
);

/** Marks the request's job running and returns what the model needs. */
export const begin = internalMutation({
  args: { requestId: v.id("normRequests") },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("aiJobs"),
      model: v.string(),
      firm: v.string(),
      description: v.string(),
      estimate: v.optional(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          county: v.optional(v.string()),
        }),
      ),
      rates: v.array(
        v.object({ kind: rateKind, name: v.string(), unit: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("normRequests", args.requestId);
    if (!row) {
      return null;
    }
    const job = await startJob(ctx, row.aiJobId);
    if (!job) {
      return null;
    }
    const firm = await ctx.db.get("organizations", row.organizationId);
    if (!firm) {
      await failJob(ctx, job, "not_found");
      await ctx.db.patch("normRequests", row._id, {
        status: "failed",
        error: "not_found",
      });
      return null;
    }
    const estimate = row.estimateId
      ? await ctx.db.get("estimates", row.estimateId)
      : null;
    const rates: {
      kind: "labor" | "equipment" | "transport";
      name: string;
      unit: string;
    }[] = [];
    for (const kind of ["labor", "equipment", "transport"] as const) {
      const ofKind = await ctx.db
        .query("companyRates")
        .withIndex("by_organizationId_and_kind", (q) =>
          q.eq("organizationId", row.organizationId).eq("kind", kind),
        )
        .take(60);
      rates.push(
        ...ofKind.map((rate) => ({ kind, name: rate.name, unit: rate.unit })),
      );
    }
    return {
      jobId: job._id,
      model: job.model ?? defaultModel,
      firm: firm.name,
      description: row.description,
      estimate:
        estimate && estimate.organizationId === row.organizationId
          ? {
              title: estimate.title,
              description: estimate.description,
              county: estimate.county,
            }
          : undefined,
      rates,
    };
  },
});

const aiNormDraft = v.object({
  norm: v.object({
    code: v.string(),
    title: v.string(),
    unit: v.string(),
    category: v.optional(v.string()),
    includes: v.optional(v.string()),
    excludes: v.optional(v.string()),
    measurement: v.optional(v.string()),
  }),
  resources: v.array(normResourceInput),
  assumptions: v.array(v.string()),
  checks: v.array(v.string()),
});

/**
 * Saves what the model wrote as a draft norm of the firm's, under a code no
 * other norm of theirs has, and finishes the job. A request whose job was
 * failed or replaced in the meantime saves nothing.
 */
export const save = internalMutation({
  args: {
    requestId: v.id("normRequests"),
    jobId: v.id("aiJobs"),
    usage: aiUsage,
    draft: aiNormDraft,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("normRequests", args.requestId);
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (!row || !job || row.aiJobId !== job._id || job.status !== "running") {
      return null;
    }
    const { draft } = args;
    const scope = {
      source: "organization" as const,
      organizationId: row.organizationId,
    };
    const normId = await insertDraftNorm(ctx, {
      ...scope,
      ...draft.norm,
      code: await freeCode(ctx, scope, draft.norm.code),
      resources: draft.resources,
      createdBy: row.createdBy,
    });
    await ctx.db.patch("normRequests", row._id, {
      status: "done",
      error: undefined,
      normId,
      assumptions: draft.assumptions,
      checks: draft.checks,
    });
    await finishJob(ctx, job._id, {
      status: "succeeded",
      usage: args.usage,
      result: { normId },
    });
    return null;
  },
});

/** Records a request that failed, with what its requests cost. */
export const fail = internalMutation({
  args: {
    requestId: v.id("normRequests"),
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
    const row = await ctx.db.get("normRequests", args.requestId);
    if (row?.aiJobId === args.jobId && row.status === "writing") {
      await ctx.db.patch("normRequests", row._id, {
        status: "failed",
        error: args.error,
      });
    }
    return null;
  },
});

/** Deletes a firm's requests, for when the firm itself is deleted. */
export async function deleteFirmNormRequests(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  limit: number,
): Promise<number> {
  const rows = await ctx.db
    .query("normRequests")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of rows) {
    await ctx.db.delete("normRequests", row._id);
  }
  return rows.length;
}

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
  startJob,
} from "../ai/jobs";
import { aiModel, defaultModel } from "../ai/models";
import { aiUsage } from "../ai/validators";
import { freeCode, insertDraftNorm } from "../catalog/norms";
import { normResourceInput } from "../catalog/validators";
import { isProducer, requireMember, requireUserId } from "../lib/access";
import { appError, forbidden, invalid, notFound } from "../lib/errors";
import { getSuperAdmin } from "../lib/roles";
import {
  isPdfFile,
  MAX_DATASHEET_BYTES,
  MAX_DATASHEET_WORK,
} from "./lib/datasheetFile";
import { datasheetCondition } from "./validators";

// Readings a producer's firm can start: enough for a product range in an
// afternoon, few enough to keep a mistake from costing much.
const PER_HOUR = 10;
const PER_DAY = 40;
const HOUR_MS = 60 * 60 * 1000;
// Readings a profile lists.
const MAX_LISTED = 20;

async function checkQuota(ctx: QueryCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const lastDay = await ctx.db
    .query("datasheetImports")
    .withIndex("by_organizationId", (q) =>
      q
        .eq("organizationId", organizationId)
        .gt("_creationTime", now - 24 * HOUR_MS),
    )
    .take(PER_DAY);
  const lastHour = lastDay.filter((row) => row._creationTime > now - HOUR_MS);
  if (lastDay.length >= PER_DAY || lastHour.length >= PER_HOUR) {
    throw appError("rate_limited", "datasheets");
  }
}

/** Where a reading stands: one whose job died has failed, whatever the row says. */
function stateOf(row: Doc<"datasheetImports">, job: Doc<"aiJobs"> | null) {
  if (row.status === "reading" && (!job || job.status === "failed")) {
    return { status: "failed" as const, error: job?.error ?? "unknown" };
  }
  return { status: row.status, error: row.error };
}

async function queueReading(
  ctx: MutationCtx,
  fields: {
    organizationId: Id<"organizations">;
    manufacturerId: Id<"manufacturers">;
    file: Doc<"files">;
    userId: Id<"users">;
  },
) {
  return await createJob(
    ctx,
    {
      kind: "datasheet_norm",
      model: aiModel(),
      organizationId: fields.organizationId,
      manufacturerId: fields.manufacturerId,
      fileId: fields.file.storageId,
      createdBy: fields.userId,
    },
    JOB_TIMEOUT_MS,
  );
}

/**
 * Has Devize AI read a technical data sheet, a PDF the producer's firm
 * uploaded as one of its files, into a draft Normă de producător. Only a
 * firm holding a producer's profile can; the reading runs in the background
 * and `list` shows how it goes.
 */
export const start = mutation({
  args: {
    organizationId: v.id("organizations"),
    fileId: v.id("files"),
    work: v.optional(v.string()),
  },
  returns: v.id("datasheetImports"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const firm = await ctx.db.get("organizations", args.organizationId);
    const manufacturerId = firm?.manufacturerId;
    if (!manufacturerId) {
      throw forbidden("manufacturer");
    }
    const file = await ctx.db.get("files", args.fileId);
    if (!file || file.organizationId !== args.organizationId) {
      throw notFound("file");
    }
    if (!isPdfFile(file.name, file.contentType)) {
      throw invalid("fileType");
    }
    if (file.size > MAX_DATASHEET_BYTES) {
      throw invalid("size");
    }
    const work = args.work?.trim() || undefined;
    if (work && work.length > MAX_DATASHEET_WORK) {
      throw invalid("length");
    }
    await checkQuota(ctx, args.organizationId);
    const aiJobId = await queueReading(ctx, {
      organizationId: args.organizationId,
      manufacturerId,
      file,
      userId,
    });
    const importId = await ctx.db.insert("datasheetImports", {
      manufacturerId,
      organizationId: args.organizationId,
      fileId: file._id,
      work,
      aiJobId,
      status: "reading",
      createdBy: userId,
    });
    await ctx.scheduler.runAfter(0, internal.producers.datasheetsAi.read, {
      importId,
    });
    return importId;
  },
});

/**
 * The data sheets read for a producer, newest first, for its own firm and
 * Devize staff: the ones still being read, the ones that failed and why, and
 * the draft each one made.
 */
export const list = query({
  args: { manufacturerId: v.id("manufacturers") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const allowed =
      (await isProducer(ctx, args.manufacturerId, userId)) ||
      (await getSuperAdmin(ctx)) !== null;
    if (!allowed) {
      return [];
    }
    const rows = await ctx.db
      .query("datasheetImports")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", args.manufacturerId),
      )
      .order("desc")
      .take(MAX_LISTED);
    return await Promise.all(
      rows.map(async (row) => {
        const file = await ctx.db.get("files", row.fileId);
        const job = await ctx.db.get("aiJobs", row.aiJobId);
        const norm = row.normId ? await ctx.db.get("norms", row.normId) : null;
        return {
          _id: row._id,
          fileName: file?.name ?? null,
          work: row.work,
          ...stateOf(row, job),
          createdAt: row._creationTime,
          norm: norm
            ? {
                _id: norm._id,
                code: norm.code,
                title: norm.title,
                status: norm.status,
              }
            : null,
        };
      }),
    );
  },
});

/** A reading of one of the user's firms; another firm's is not found. */
async function requireImport(ctx: QueryCtx, importId: Id<"datasheetImports">) {
  const row = await ctx.db.get("datasheetImports", importId);
  if (!row) {
    throw notFound("datasheet");
  }
  const { userId } = await requireMember(ctx, row.organizationId);
  return { row, userId };
}

/** Reads a data sheet again after a reading failed. */
export const retry = mutation({
  args: { importId: v.id("datasheetImports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row, userId } = await requireImport(ctx, args.importId);
    const job = await ctx.db.get("aiJobs", row.aiJobId);
    if (stateOf(row, job).status !== "failed") {
      throw appError("in_use", "datasheet");
    }
    const file = await ctx.db.get("files", row.fileId);
    const firm = await ctx.db.get("organizations", row.organizationId);
    if (!file) {
      throw notFound("file");
    }
    if (firm?.manufacturerId !== row.manufacturerId) {
      throw forbidden("manufacturer");
    }
    await checkQuota(ctx, row.organizationId);
    const aiJobId = await queueReading(ctx, {
      organizationId: row.organizationId,
      manufacturerId: row.manufacturerId,
      file,
      userId,
    });
    await ctx.db.patch("datasheetImports", row._id, {
      aiJobId,
      status: "reading",
      error: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.producers.datasheetsAi.read, {
      importId: row._id,
    });
    return null;
  },
});

/**
 * Lets a failed reading go, with the file it was for unless another reading
 * uses it: no norm came of it. A reading that made a draft stays, as the
 * record of where the norm came from.
 */
export const dismiss = mutation({
  args: { importId: v.id("datasheetImports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await requireImport(ctx, args.importId);
    const job = await ctx.db.get("aiJobs", row.aiJobId);
    if (stateOf(row, job).status !== "failed") {
      throw appError("in_use", "datasheet");
    }
    await ctx.db.delete("datasheetImports", row._id);
    const file = await ctx.db.get("files", row.fileId);
    const shared = await ctx.db
      .query("datasheetImports")
      .withIndex("by_fileId", (q) => q.eq("fileId", row.fileId))
      .first();
    if (file && !shared) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete("files", file._id);
    }
    return null;
  },
});

/** Marks the reading's job running and returns what the model needs. */
export const begin = internalMutation({
  args: { importId: v.id("datasheetImports") },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("aiJobs"),
      model: v.string(),
      storageId: v.id("_storage"),
      fileName: v.string(),
      work: v.optional(v.string()),
      producer: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("datasheetImports", args.importId);
    if (!row) {
      return null;
    }
    const job = await startJob(ctx, row.aiJobId);
    if (!job) {
      return null;
    }
    const file = await ctx.db.get("files", row.fileId);
    const manufacturer = await ctx.db.get("manufacturers", row.manufacturerId);
    if (!file || !manufacturer) {
      await failJob(ctx, job, "not_found");
      await ctx.db.patch("datasheetImports", row._id, {
        status: "failed",
        error: "not_found",
      });
      return null;
    }
    return {
      jobId: job._id,
      model: job.model ?? defaultModel,
      storageId: file.storageId,
      fileName: file.name,
      work: row.work,
      producer: manufacturer.displayName ?? manufacturer.name,
    };
  },
});

const draftNorm = v.object({
  product: v.object({ name: v.string(), packaging: v.optional(v.string()) }),
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
  sourcePages: v.array(v.number()),
  conditions: v.array(datasheetCondition),
  checks: v.array(v.string()),
});

/**
 * Saves what the model read as a draft norm of the producer's, under a code
 * no other norm of theirs has, and finishes the job. A reading whose job was
 * failed or replaced in the meantime saves nothing.
 */
export const save = internalMutation({
  args: {
    importId: v.id("datasheetImports"),
    jobId: v.id("aiJobs"),
    usage: aiUsage,
    draft: draftNorm,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("datasheetImports", args.importId);
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (!row || !job || row.aiJobId !== job._id || job.status !== "running") {
      return null;
    }
    // The firm may have let the profile go while the sheet was read.
    const firm = await ctx.db.get("organizations", row.organizationId);
    if (firm?.manufacturerId !== row.manufacturerId) {
      await failJob(ctx, job, "forbidden", args.usage);
      await ctx.db.patch("datasheetImports", row._id, {
        status: "failed",
        error: "forbidden",
      });
      return null;
    }
    const { draft } = args;
    const scope = {
      source: "manufacturer" as const,
      manufacturerId: row.manufacturerId,
    };
    const normId = await insertDraftNorm(ctx, {
      ...scope,
      ...draft.norm,
      code: await freeCode(ctx, scope, draft.norm.code),
      resources: draft.resources,
      createdBy: row.createdBy,
      datasheetImportId: row._id,
      sourcePages: draft.sourcePages,
    });
    await ctx.db.patch("datasheetImports", row._id, {
      status: "done",
      error: undefined,
      normId,
      product: draft.product,
      conditions: draft.conditions,
      checks: draft.checks,
    });
    await finishJob(ctx, job._id, { status: "succeeded", usage: args.usage });
    return null;
  },
});

/** Records a reading that failed, with what its requests cost. */
export const fail = internalMutation({
  args: {
    importId: v.id("datasheetImports"),
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
    const row = await ctx.db.get("datasheetImports", args.importId);
    if (row?.aiJobId === args.jobId && row.status === "reading") {
      await ctx.db.patch("datasheetImports", row._id, {
        status: "failed",
        error: args.error,
      });
    }
    return null;
  },
});

/** Deletes a firm's readings, for when the firm itself is deleted. */
export async function deleteFirmDatasheets(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  limit: number,
): Promise<number> {
  const rows = await ctx.db
    .query("datasheetImports")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of rows) {
    await ctx.db.delete("datasheetImports", row._id);
  }
  return rows.length;
}

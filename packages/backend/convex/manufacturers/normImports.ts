import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { createJob, failJob, finishJob, startJob } from "../ai/jobs";
import { aiModel, defaultModel } from "../ai/models";
import { aiUsage } from "../ai/validators";
import { requireSuperAdmin } from "../lib/roles";
import { deleteNormImport } from "./admin";
import { checkPrintedTotal } from "./lib/norms";
import { issue, normImportArticle, normResource } from "./validators";

// A PDF is sent to the model as base64, a third larger, and a request may not
// exceed 32 MB.
const maxFileBytes = 20 * 1024 * 1024;

// Extraction runs as a chain of actions, one batch of articles at a time, so
// a long document gets more time than one action allows.
const importTimeoutMs = 90 * 60 * 1000;

// Pipeline statuses that receiving norms moves a manufacturer past.
const beforeNorms = new Set([
  "new",
  "review",
  "approved",
  "contacted",
  "replied",
]);

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

async function queueExtraction(
  ctx: MutationCtx,
  admin: Doc<"users">,
  normImport: Pick<Doc<"normImports">, "_id" | "manufacturerId" | "fileId">,
) {
  const jobId = await createJob(
    ctx,
    {
      kind: "norm_import",
      model: aiModel(),
      manufacturerId: normImport.manufacturerId,
      normImportId: normImport._id,
      fileId: normImport.fileId,
      createdBy: admin._id,
    },
    importTimeoutMs,
  );
  await ctx.scheduler.runAfter(0, internal.manufacturers.ai.extractNorms, {
    jobId,
  });
}

/**
 * Starts importing an uploaded norms PDF: the model lists its articles, then
 * extracts them a few at a time into importedNorms for review.
 */
export const create = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    fileId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.id("normImports"),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    const file = await ctx.db.system.get("_storage", args.fileId);
    if (!manufacturer || !file) {
      throw new ConvexError({ code: "not_found" });
    }
    const isPdf =
      file.contentType === "application/pdf" ||
      args.fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf || file.size > maxFileBytes) {
      await ctx.storage.delete(args.fileId);
      throw new ConvexError({ code: isPdf ? "file_too_large" : "not_pdf" });
    }
    const normImportId = await ctx.db.insert("normImports", {
      manufacturerId: manufacturer._id,
      fileId: args.fileId,
      fileName: args.fileName.trim() || "norme.pdf",
      status: "queued",
      articles: [],
      articlesDone: 0,
      createdBy: admin._id,
    });
    await queueExtraction(ctx, admin, {
      _id: normImportId,
      manufacturerId: manufacturer._id,
      fileId: args.fileId,
    });
    await ctx.db.patch("manufacturers", manufacturer._id, {
      normsStatus: "received",
      ...(beforeNorms.has(manufacturer.status)
        ? { status: "norms_received" as const }
        : {}),
    });
    return normImportId;
  },
});

/** Extracts a failed import again from the start. */
export const retry = mutation({
  args: { normImportId: v.id("normImports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (!normImport) {
      throw new ConvexError({ code: "not_found" });
    }
    if (normImport.status !== "failed") {
      throw new ConvexError({ code: "already_running" });
    }
    const norms = ctx.db
      .query("importedNorms")
      .withIndex("by_normImportId_and_baseCode", (q) =>
        q.eq("normImportId", normImport._id),
      );
    for await (const norm of norms) {
      await ctx.db.delete("importedNorms", norm._id);
    }
    await ctx.db.patch("normImports", normImport._id, {
      status: "queued",
      articles: [],
      articlesDone: 0,
      error: undefined,
    });
    await queueExtraction(ctx, admin, normImport);
    return null;
  },
});

/** An import with its extracted norms, in document order, and the PDF. */
export const get = query({
  args: { normImportId: v.id("normImports") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (!normImport) {
      return null;
    }
    const norms = await ctx.db
      .query("importedNorms")
      .withIndex("by_normImportId_and_baseCode", (q) =>
        q.eq("normImportId", normImport._id),
      )
      .take(2000);
    const order = new Map(
      normImport.articles.map((article, index) => [article.baseCode, index]),
    );
    norms.sort(
      (a, b) =>
        (order.get(a.baseCode) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.baseCode) ?? Number.MAX_SAFE_INTEGER) ||
        a.code.localeCompare(b.code),
    );
    const consentBy = normImport.consent
      ? await ctx.db.get("users", normImport.consent.recordedBy)
      : null;
    return {
      normImport,
      consentBy: consentBy?.name ?? consentBy?.email ?? null,
      norms: await Promise.all(
        norms.map(async (norm) => ({
          ...norm,
          // Rows extracted before 22 October 2026 kept this comparison as a
          // check; it's made here now, from the document's labour rate.
          checks: norm.checks.filter((check) => check.code !== "price_total"),
          printedTotal: checkPrintedTotal(norm, normImport.laborRate),
          publishedAt: await publishedAt(ctx, norm),
        })),
      ),
      fileUrl: await ctx.storage.getUrl(normImport.fileId),
    };
  },
});

// Where the agreement is and who gave it fits in a sentence or two.
const maxConsentLength = 500;

/**
 * Records how the manufacturer agreed in writing to Devize publishing the
 * document's norms, such as "Email de la biroul tehnic, 21.10.2026". Recording
 * it again replaces the note.
 */
export const recordConsent = mutation({
  args: { normImportId: v.id("normImports"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (!normImport) {
      throw new ConvexError({ code: "not_found" });
    }
    const note = args.note.trim();
    if (!note || note.length > maxConsentLength) {
      throw new ConvexError({ code: "invalid" });
    }
    await ctx.db.patch("normImports", normImport._id, {
      consent: { note, recordedBy: admin._id, recordedAt: Date.now() },
    });
    return null;
  },
});

/** When a reviewed row went into the catalog, or null if it hasn't. */
async function publishedAt(ctx: QueryCtx, norm: Doc<"importedNorms">) {
  if (norm.status === "review") {
    return null;
  }
  const published = await ctx.db
    .query("norms")
    .withIndex("by_importedNormId", (q) => q.eq("importedNormId", norm._id))
    .first();
  return published?.publishedAt ?? null;
}

/**
 * Approves or rejects every Normă of one article. An article with an error
 * (trades that don't add up, a missing quantity) can only be rejected.
 */
export const review = mutation({
  args: {
    normImportId: v.id("normImports"),
    baseCode: v.string(),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const norms = await ctx.db
      .query("importedNorms")
      .withIndex("by_normImportId_and_baseCode", (q) =>
        q.eq("normImportId", args.normImportId).eq("baseCode", args.baseCode),
      )
      .take(500);
    if (
      args.decision === "approved" &&
      norms.some((norm) => norm.checks.some((check) => check.level === "error"))
    ) {
      throw new ConvexError({ code: "blocked" });
    }
    for (const norm of norms) {
      await ctx.db.patch("importedNorms", norm._id, {
        status: args.decision,
        reviewedBy: admin._id,
        reviewedAt: Date.now(),
      });
    }
    return norms.length;
  },
});

export const remove = mutation({
  args: { normImportId: v.id("normImports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (normImport) {
      await deleteNormImport(ctx, normImport);
    }
    return null;
  },
});

/**
 * Deletes the norm documents of a profile taken down, one per run, with the
 * norms extracted from them. Proof of the agreements under which some were
 * published stays on the manufacturer.
 */
export const dropImports = internalMutation({
  args: { manufacturerId: v.id("manufacturers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (manufacturer?.status !== "excluded") {
      return null;
    }
    const normImport = await ctx.db
      .query("normImports")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .first();
    if (normImport) {
      await deleteNormImport(ctx, normImport);
      await ctx.scheduler.runAfter(
        0,
        internal.manufacturers.normImports.dropImports,
        args,
      );
    }
    return null;
  },
});

/** Marks an extraction job running; `resume` continues one already running. */
export const begin = internalMutation({
  args: { jobId: v.id("aiJobs"), resume: v.boolean() },
  returns: v.union(
    v.null(),
    v.object({
      model: v.string(),
      normImportId: v.id("normImports"),
      fileId: v.id("_storage"),
      fileName: v.string(),
      manufacturerName: v.string(),
      articles: v.array(normImportArticle),
      articlesDone: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await startJob(ctx, args.jobId, { resume: args.resume });
    if (!job?.normImportId) {
      return null;
    }
    const normImport = await ctx.db.get("normImports", job.normImportId);
    const manufacturer = normImport
      ? await ctx.db.get("manufacturers", normImport.manufacturerId)
      : null;
    if (!normImport || !manufacturer) {
      await failJob(ctx, job, "not_found");
      return null;
    }
    if (normImport.status === "queued") {
      await ctx.db.patch("normImports", normImport._id, {
        status: "extracting",
      });
    }
    return {
      model: job.model ?? defaultModel,
      normImportId: normImport._id,
      fileId: normImport.fileId,
      fileName: normImport.fileName,
      manufacturerName: manufacturer.name,
      articles: normImport.articles,
      articlesDone: normImport.articlesDone,
    };
  },
});

/** Saves the document's table of contents from the first pass. */
export const saveIndex = internalMutation({
  args: {
    normImportId: v.id("normImports"),
    articles: v.array(normImportArticle),
    edition: v.optional(v.string()),
    laborRate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (normImport) {
      await ctx.db.patch("normImports", normImport._id, {
        articles: args.articles,
        edition: args.edition,
        laborRate: args.laborRate,
      });
    }
    return null;
  },
});

const normRow = v.object({
  baseCode: v.string(),
  code: v.string(),
  title: v.string(),
  unit: v.string(),
  unitRaw: v.string(),
  pages: v.array(v.number()),
  includes: v.optional(v.string()),
  excludes: v.optional(v.string()),
  resources: v.array(normResource),
  totalLaborHours: v.optional(v.number()),
  totalPrice: v.optional(v.number()),
  checks: v.array(issue),
});

/** Saves one batch of extracted norms, replacing any with the same code. */
export const saveNorms = internalMutation({
  args: {
    normImportId: v.id("normImports"),
    norms: v.array(normRow),
    articlesDone: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (!normImport) {
      return null;
    }
    const baseCodes = new Set(args.norms.map((norm) => norm.baseCode));
    for (const baseCode of baseCodes) {
      const existing = ctx.db
        .query("importedNorms")
        .withIndex("by_normImportId_and_baseCode", (q) =>
          q.eq("normImportId", normImport._id).eq("baseCode", baseCode),
        );
      for await (const norm of existing) {
        await ctx.db.delete("importedNorms", norm._id);
      }
    }
    for (const norm of args.norms) {
      await ctx.db.insert("importedNorms", {
        ...norm,
        normImportId: normImport._id,
        manufacturerId: normImport.manufacturerId,
        status: "review",
      });
    }
    await ctx.db.patch("normImports", normImport._id, {
      articlesDone: args.articlesDone,
    });
    return null;
  },
});

export const complete = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    normImportId: v.id("normImports"),
    usage: aiUsage,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (job?.status !== "running") {
      return null;
    }
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (normImport) {
      await ctx.db.patch("normImports", normImport._id, { status: "review" });
    }
    await finishJob(ctx, job._id, { status: "succeeded", usage: args.usage });
    return null;
  },
});

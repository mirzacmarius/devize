import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { finishJob, startJob } from "../ai/jobs";
import { defaultModel } from "../ai/models";
import { aiConfidence, aiUsage } from "../ai/validators";
import { proposedResource, tenderProgress, tenderSection } from "./validators";

// The steps of a tender import that touch the database, called by the
// action in tender.ts between its requests to the model.

// The longest title a line item takes; the full text stays in the item's
// tender position.
const MAX_TITLE = 500;

/**
 * Marks the import's job running and returns where it stands. An import set
 * aside in the meantime only gets its job closed.
 */
export const begin = internalMutation({
  args: { proposalId: v.id("proposals"), resume: v.boolean() },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("aiJobs"),
      model: v.string(),
      organizationId: v.id("organizations"),
      progress: tenderProgress,
      // By the proposal's files; null for one deleted since.
      files: v.array(
        v.union(
          v.null(),
          v.object({
            storageId: v.id("_storage"),
            name: v.string(),
            contentType: v.optional(v.string()),
          }),
        ),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.source !== "tender" || !proposal.progress) {
      return null;
    }
    const job = await startJob(ctx, proposal.aiJobId, { resume: args.resume });
    if (!job) {
      return null;
    }
    if (proposal.status !== "working") {
      await finishJob(ctx, job._id, {
        status: "succeeded",
        result: { dismissed: true },
      });
      return null;
    }
    const files = [];
    for (const fileId of proposal.fileIds) {
      const file = await ctx.db.get("files", fileId);
      files.push(
        file && file.organizationId === proposal.organizationId
          ? {
              storageId: file.storageId,
              name: file.name,
              contentType: file.contentType,
            }
          : null,
      );
    }
    return {
      jobId: job._id,
      model: job.model ?? defaultModel,
      organizationId: proposal.organizationId,
      progress: proposal.progress,
      files,
    };
  },
});

/**
 * Saves a batch of positions read from the lists, in order after the ones
 * before, and how far reading got. Returns false when the import was set
 * aside in the meantime.
 */
export const saveRead = internalMutation({
  args: {
    proposalId: v.id("proposals"),
    positions: v.array(
      v.object({
        position: v.string(),
        code: v.optional(v.string()),
        text: v.string(),
        unit: v.string(),
        quantity: v.number(),
        object: v.optional(tenderSection),
        chapter: v.optional(tenderSection),
        terms: v.array(v.string()),
      }),
    ),
    progress: tenderProgress,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.status !== "working" || !proposal.progress) {
      return false;
    }
    const start = proposal.progress.read;
    for (const [index, position] of args.positions.entries()) {
      await ctx.db.insert("proposalItems", {
        organizationId: proposal.organizationId,
        proposalId: proposal._id,
        position: start + index,
        chapter: position.chapter?.name ?? "",
        title: position.text.slice(0, MAX_TITLE),
        unit: position.unit,
        measured: position.quantity,
        takeoff: [],
        confidence: "medium",
        candidateIds: [],
        quantity: position.quantity,
        resources: [],
        tender: {
          position: position.position,
          code: position.code,
          text: position.text,
          object: position.object,
          chapter: position.chapter,
          terms: position.terms,
        },
        selected: true,
      });
    }
    await ctx.db.patch("proposals", proposal._id, {
      progress: { ...args.progress, read: start + args.positions.length },
      updatedAt: Date.now(),
    });
    return true;
  },
});

/** The next positions to match with norms, from position `after` on. */
export const toMatch = internalQuery({
  args: {
    proposalId: v.id("proposals"),
    after: v.number(),
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      position: v.number(),
      text: v.string(),
      unit: v.string(),
      measured: v.number(),
      chapter: v.string(),
      object: v.optional(v.string()),
      tenderPosition: v.string(),
      tenderCode: v.optional(v.string()),
      terms: v.array(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("proposalItems")
      .withIndex("by_proposalId_and_position", (q) =>
        q.eq("proposalId", args.proposalId).gte("position", args.after),
      )
      .take(args.limit);
    return items.map((item) => ({
      position: item.position,
      text: item.tender?.text ?? item.title,
      unit: item.unit,
      measured: item.measured,
      chapter: item.chapter,
      object: item.tender?.object?.name,
      tenderPosition: item.tender?.position ?? String(item.position + 1),
      tenderCode: item.tender?.code,
      terms: item.tender?.terms ?? [],
    }));
  },
});

/**
 * Keeps the norms matched to a batch of positions, or the AI's recipes for
 * the ones no norm fits, and moves the import on to position `matched`.
 * Returns false when the import was set aside in the meantime.
 */
export const saveMatches = internalMutation({
  args: {
    proposalId: v.id("proposals"),
    matches: v.array(
      v.object({
        position: v.number(),
        normId: v.optional(v.id("norms")),
        candidateIds: v.array(v.id("norms")),
        quantity: v.number(),
        matchNote: v.optional(v.string()),
        confidence: aiConfidence,
        resources: v.array(proposedResource),
      }),
    ),
    matched: v.number(),
    matchError: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.status !== "working" || !proposal.progress) {
      return false;
    }
    for (const match of args.matches) {
      const item = await ctx.db
        .query("proposalItems")
        .withIndex("by_proposalId_and_position", (q) =>
          q.eq("proposalId", proposal._id).eq("position", match.position),
        )
        .unique();
      if (item) {
        await ctx.db.patch("proposalItems", item._id, {
          normId: match.normId,
          candidateIds: match.candidateIds,
          quantity: match.quantity,
          matchNote: match.matchNote,
          confidence: match.confidence,
          resources: match.resources,
        });
      }
    }
    await ctx.db.patch("proposals", proposal._id, {
      progress: { ...proposal.progress, matched: args.matched },
      matchError: proposal.matchError ?? args.matchError,
      updatedAt: Date.now(),
    });
    return true;
  },
});

/** Opens the import for review and closes its job. */
export const complete = internalMutation({
  args: { proposalId: v.id("proposals"), usage: aiUsage },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (!proposal) {
      return null;
    }
    const job = await ctx.db.get("aiJobs", proposal.aiJobId);
    if (job?.status !== "running") {
      return null;
    }
    if (proposal.status === "working") {
      await ctx.db.patch("proposals", proposal._id, {
        status: "ready",
        updatedAt: Date.now(),
      });
    }
    await finishJob(ctx, job._id, {
      status: "succeeded",
      usage: args.usage,
      result: {
        positions: proposal.progress?.read ?? 0,
        issues: proposal.progress?.issues.length ?? 0,
        matchError: proposal.matchError,
        dismissed: proposal.status !== "working" || undefined,
      },
    });
    return null;
  },
});

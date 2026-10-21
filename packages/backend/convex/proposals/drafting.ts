import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { failJob, finishJob, startJob } from "../ai/jobs";
import { defaultModel } from "../ai/models";
import { aiConfidence, aiUsage } from "../ai/validators";
import { estimateKind, takeoffRow } from "../estimates/validators";
import { normalizeText } from "../lib/text";
import type { NormCandidate } from "./lib/match";
import { leaveOutPresent } from "./omissions";
import { proposedResource } from "./validators";

// The steps of drafting a proposal that touch the database, called by the
// action in ai.ts between its requests to the model.

// Norms the search keeps for one article, the model picks among them.
const CANDIDATES_PER_ARTICLE = 8;

/** Marks the proposal's job running and returns what the model needs. */
export const begin = internalMutation({
  args: { proposalId: v.id("proposals") },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("aiJobs"),
      model: v.string(),
      organizationId: v.id("organizations"),
      text: v.optional(v.string()),
      photos: v.array(
        v.object({ storageId: v.id("_storage"), contentType: v.string() }),
      ),
      estimate: v.object({
        title: v.string(),
        kind: estimateKind,
        description: v.optional(v.string()),
        county: v.optional(v.string()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.status !== "working") {
      return null;
    }
    const job = await startJob(ctx, proposal.aiJobId);
    if (!job) {
      return null;
    }
    const estimate = await ctx.db.get("estimates", proposal.estimateId);
    if (!estimate) {
      await failJob(ctx, job, "not_found");
      return null;
    }
    const photos = [];
    for (const fileId of proposal.fileIds) {
      const file = await ctx.db.get("files", fileId);
      if (
        file?.contentType &&
        file.organizationId === proposal.organizationId
      ) {
        photos.push({
          storageId: file.storageId,
          contentType: file.contentType,
        });
      }
    }
    return {
      jobId: job._id,
      model: job.model ?? defaultModel,
      organizationId: proposal.organizationId,
      text: proposal.text,
      photos,
      estimate: {
        title: estimate.title,
        kind: estimate.kind,
        description: estimate.description,
        county: estimate.county,
      },
    };
  },
});

/**
 * Saves what the model proposed, before its articles are matched with
 * norms, so the person sees it while matching runs. Returns false when the
 * proposal was set aside in the meantime.
 */
export const saveDraft = internalMutation({
  args: {
    proposalId: v.id("proposals"),
    summary: v.optional(v.string()),
    assumptions: v.array(v.string()),
    questions: v.array(v.string()),
    articles: v.array(
      v.object({
        chapter: v.string(),
        title: v.string(),
        unit: v.string(),
        measured: v.number(),
        takeoff: v.array(takeoffRow),
        note: v.optional(v.string()),
        confidence: aiConfidence,
        resources: v.array(proposedResource),
      }),
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.status !== "working") {
      return false;
    }
    for (const [position, article] of args.articles.entries()) {
      await ctx.db.insert("proposalItems", {
        ...article,
        organizationId: proposal.organizationId,
        proposalId: proposal._id,
        position,
        candidateIds: [],
        quantity: article.measured,
        selected: true,
      });
    }
    await ctx.db.patch("proposals", proposal._id, {
      summary: args.summary,
      assumptions: args.assumptions,
      questions: args.questions,
      updatedAt: Date.now(),
    });
    return true;
  },
});

const normCandidate = v.object({
  _id: v.id("norms"),
  code: v.string(),
  title: v.string(),
  unit: v.string(),
  scope: v.union(v.literal("firm"), v.literal("producer"), v.literal("base")),
  manufacturerName: v.optional(v.string()),
  category: v.optional(v.string()),
  includes: v.optional(v.string()),
  excludes: v.optional(v.string()),
});

/**
 * The published norms the firm can use that the search finds for each
 * article: its own first, then the public catalog's.
 */
export const candidates = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    articles: v.array(
      v.object({ position: v.number(), terms: v.array(v.string()) }),
    ),
  },
  returns: v.array(
    v.object({ position: v.number(), norms: v.array(normCandidate) }),
  ),
  handler: async (ctx, args) => {
    const names = new Map<Id<"manufacturers">, string | undefined>();
    async function manufacturerName(id: Id<"manufacturers">) {
      if (!names.has(id)) {
        const manufacturer = await ctx.db.get("manufacturers", id);
        names.set(id, manufacturer?.displayName ?? manufacturer?.name);
      }
      return names.get(id);
    }
    async function candidateOf(norm: Doc<"norms">): Promise<NormCandidate> {
      return {
        _id: norm._id,
        code: norm.code,
        title: norm.title,
        unit: norm.unit,
        scope:
          norm.source === "organization"
            ? "firm"
            : norm.source === "manufacturer"
              ? "producer"
              : "base",
        manufacturerName: norm.manufacturerId
          ? await manufacturerName(norm.manufacturerId)
          : undefined,
        category: norm.category,
        includes: norm.includes,
        excludes: norm.excludes,
      };
    }

    const result = [];
    for (const article of args.articles) {
      const found = new Map<Id<"norms">, Doc<"norms">>();
      for (const term of article.terms.slice(0, 4)) {
        const text = normalizeText(term);
        if (!text) {
          continue;
        }
        const own = await ctx.db
          .query("norms")
          .withSearchIndex("search_searchText", (q) =>
            q
              .search("searchText", text)
              .eq("organizationId", args.organizationId)
              .eq("status", "published"),
          )
          .take(3);
        const shared = await ctx.db
          .query("norms")
          .withSearchIndex("search_searchText", (q) =>
            q
              .search("searchText", text)
              .eq("visibility", "public")
              .eq("status", "published"),
          )
          .take(5);
        for (const norm of [...own, ...shared]) {
          if (found.size < CANDIDATES_PER_ARTICLE && !found.has(norm._id)) {
            found.set(norm._id, norm);
          }
        }
      }
      const norms = [];
      for (const norm of found.values()) {
        norms.push(await candidateOf(norm));
      }
      result.push({ position: article.position, norms });
    }
    return result;
  },
});

/**
 * Keeps the norms matched to the articles and opens the proposal for
 * review. A proposal set aside in the meantime only gets its job closed.
 */
export const complete = internalMutation({
  args: {
    proposalId: v.id("proposals"),
    usage: aiUsage,
    matches: v.array(
      v.object({
        position: v.number(),
        normId: v.optional(v.id("norms")),
        candidateIds: v.array(v.id("norms")),
        quantity: v.number(),
        matchNote: v.optional(v.string()),
      }),
    ),
    matchError: v.optional(v.string()),
  },
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
    let articles = 0;
    let matched = 0;
    if (proposal.status === "working") {
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
          });
          matched += match.normId ? 1 : 0;
        }
      }
      if (proposal.source === "omissions") {
        await leaveOutPresent(ctx, proposal);
      }
      articles = (
        await ctx.db
          .query("proposalItems")
          .withIndex("by_proposalId_and_position", (q) =>
            q.eq("proposalId", proposal._id),
          )
          .take(500)
      ).length;
      await ctx.db.patch("proposals", proposal._id, {
        status: "ready",
        matchError: args.matchError,
        updatedAt: Date.now(),
      });
    }
    await finishJob(ctx, job._id, {
      status: "succeeded",
      usage: args.usage,
      result: { articles, matched, matchError: args.matchError },
    });
    return null;
  },
});

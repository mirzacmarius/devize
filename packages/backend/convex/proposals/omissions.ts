import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { createJob, failJob, startJob } from "../ai/jobs";
import { defaultModel, aiModel } from "../ai/models";
import { aiConfidence } from "../ai/validators";
import {
  readLineItems,
  readSections,
  requireEditableEstimate,
} from "../estimates/helpers";
import { estimateKind, takeoffRow } from "../estimates/validators";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid } from "../lib/errors";
import { normalizeText } from "../lib/text";
import { compatibilityFindings } from "../systems/check";
import { MAX_LINES } from "./lib/omissions";
import {
  checkQuota,
  DRAFTING,
  JOB_TIMEOUT_MS,
  newestProposals,
  OMISSIONS,
  proposalView,
  setAsideOpen,
} from "./proposals";
import { proposedResource } from "./validators";

// The Detector de omisiuni: Devize AI reads a Deviz as an experienced site
// engineer would and proposes the works it misses, each with the articles
// that call for it, as a proposal the firm reviews like any other. A
// tender's lists can't take new positions, so for a tender the missing works
// become clarifications to request from the contracting authority. See
// docs/adr/0026.

// What the request shows of an article's norm and materials.
const MAX_NOTE = 200;
const MAX_MATERIALS = 8;

// What it shows of the compatibility check's findings.
const MAX_FLAGGED = 40;
const MAX_SENTENCE = 400;

/**
 * Asks Devize AI which works the Deviz misses. It works in the background;
 * `latest` shows its progress and then what it found.
 */
export const start = mutation({
  args: { estimateId: v.id("estimates") },
  returns: v.id("proposals"),
  handler: async (ctx, args) => {
    const { estimate, userId } = await requireEditableEstimate(
      ctx,
      args.estimateId,
    );
    const first = await ctx.db
      .query("lineItems")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", estimate._id),
      )
      .first();
    if (!first) {
      throw invalid("items");
    }
    // The check reads the Deviz as it stands, so not while a proposal is
    // still going into it.
    const [drafting] = await newestProposals(ctx, estimate._id, DRAFTING, 1);
    if (drafting?.status === "applying") {
      throw appError("in_use", "proposal");
    }
    await setAsideOpen(ctx, estimate._id, OMISSIONS);
    await checkQuota(ctx, estimate.organizationId);
    const aiJobId = await createJob(
      ctx,
      {
        kind: "omission_check",
        model: aiModel(),
        organizationId: estimate.organizationId,
        createdBy: userId,
      },
      JOB_TIMEOUT_MS,
    );
    const proposalId = await ctx.db.insert("proposals", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      aiJobId,
      source: "omissions",
      status: "working",
      fileIds: [],
      assumptions: [],
      questions: [],
      createdBy: userId,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.proposals.omissionsAi.check, {
      proposalId,
    });
    return proposalId;
  },
});

/** The Deviz's newest omissions check, with what it found, or null. */
export const latest = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const [proposal] = await newestProposals(ctx, estimate._id, OMISSIONS, 1);
    if (!proposal) {
      return null;
    }
    const items = await ctx.db
      .query("proposalItems")
      .withIndex("by_proposalId_and_position", (q) =>
        q.eq("proposalId", proposal._id),
      )
      .take(100);
    return {
      ...(await proposalView(ctx, estimate, proposal)),
      // The missing works it found, less those the Deviz has after all,
      // still counted once the check is applied or set aside.
      found: items.filter((item) => item.duplicateOf === undefined).length,
      appliedCount: proposal.applied ?? 0,
      appliedAt: proposal.appliedAt,
    };
  },
});

const devizLine = v.object({
  key: v.string(),
  lineItemId: v.id("lineItems"),
  section: v.optional(v.string()),
  code: v.optional(v.string()),
  position: v.optional(v.string()),
  title: v.string(),
  unit: v.string(),
  quantity: v.number(),
  includes: v.optional(v.string()),
  excludes: v.optional(v.string()),
  materials: v.array(v.string()),
});

function sectionLabel(section: Doc<"sections">) {
  return section.code ? `${section.code} ${section.name}` : section.name;
}

/** How the request names each section: a chapter with its object. */
function sectionLabels(sections: readonly Doc<"sections">[]) {
  const byId = new Map(sections.map((section) => [section._id, section]));
  const labels = new Map<Id<"sections">, string>();
  for (const section of sections) {
    const parent = section.parentId ? byId.get(section.parentId) : undefined;
    labels.set(
      section._id,
      parent?.kind === "object" && section.kind === "chapter"
        ? `${sectionLabel(parent)} / ${sectionLabel(section)}`
        : sectionLabel(section),
    );
  }
  return labels;
}

/** The Deviz's articles in the order they print, loose ones first. */
async function printedLines(ctx: MutationCtx, estimate: Doc<"estimates">) {
  const sections = await readSections(ctx, estimate._id);
  const items = await readLineItems(ctx, estimate._id);
  const byId = new Map(sections.map((section) => [section._id, section]));
  const labels = sectionLabels(sections);
  // A chapter inside an object prints after the object's own items.
  const order = new Map<Id<"sections">, number>();
  let next = 0;
  for (const section of sections) {
    const parent = section.parentId ? byId.get(section.parentId) : undefined;
    if (section.kind === "chapter" && parent?.kind === "object") {
      continue;
    }
    order.set(section._id, next++);
    for (const chapter of sections) {
      if (chapter.parentId === section._id && chapter.kind === "chapter") {
        order.set(chapter._id, next++);
      }
    }
  }
  const rank = (item: Doc<"lineItems">) =>
    item.sectionId !== undefined && order.has(item.sectionId)
      ? (order.get(item.sectionId) ?? 0) + 1
      : 0;
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    .map(({ item }) => item);
  return { sorted, labels };
}

/** Marks the check's job running and returns the Deviz for the model. */
export const begin = internalMutation({
  args: { proposalId: v.id("proposals") },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("aiJobs"),
      model: v.string(),
      organizationId: v.id("organizations"),
      estimate: v.object({
        title: v.string(),
        kind: estimateKind,
        description: v.optional(v.string()),
        county: v.optional(v.string()),
      }),
      lines: v.array(devizLine),
      more: v.number(),
      flagged: v.array(
        v.object({ keys: v.array(v.string()), sentence: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.status !== "working" || proposal.source !== "omissions") {
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
    const { sorted, labels } = await printedLines(ctx, estimate);
    const norms = new Map<Id<"norms">, Doc<"norms"> | null>();
    const lines = [];
    for (const [index, item] of sorted.slice(0, MAX_LINES).entries()) {
      let norm: Doc<"norms"> | null = null;
      if (item.normId) {
        if (!norms.has(item.normId)) {
          norms.set(item.normId, await ctx.db.get("norms", item.normId));
        }
        norm = norms.get(item.normId) ?? null;
      }
      const tender = item.tenderRef;
      lines.push({
        key: `L${index + 1}`,
        lineItemId: item._id,
        section: item.sectionId ? labels.get(item.sectionId) : undefined,
        code: item.code,
        position: tender?.position,
        // A tender's position reads as the authority wrote it.
        title: (tender?.text ?? item.title).slice(0, 600),
        unit: tender?.unit ?? item.unit,
        quantity: tender?.quantity ?? item.quantity,
        includes: norm?.includes?.slice(0, MAX_NOTE),
        excludes: norm?.excludes?.slice(0, MAX_NOTE),
        materials: [
          ...new Set(
            item.resources
              // "Material mărunt, 2 %" names no material.
              .filter(
                (resource) =>
                  resource.kind === "material" && resource.unit !== "%",
              )
              .map((resource) => resource.name),
          ),
        ].slice(0, MAX_MATERIALS),
      });
    }
    // What the compatibility check already found about these articles, so
    // the model doesn't propose it again (docs/adr/0028).
    const keys = new Map(lines.map((line) => [line.lineItemId, line.key]));
    const flagged = (await compatibilityFindings(ctx, estimate))
      .map((finding) => ({
        keys: finding.lineItemIds.flatMap((id) => keys.get(id) ?? []),
        sentence: finding.sentence.slice(0, MAX_SENTENCE),
      }))
      .filter((finding) => finding.keys.length > 0)
      .slice(0, MAX_FLAGGED);
    return {
      jobId: job._id,
      model: job.model ?? defaultModel,
      organizationId: proposal.organizationId,
      estimate: {
        title: estimate.title,
        kind: estimate.kind,
        description: estimate.description,
        county: estimate.county,
      },
      lines,
      more: Math.max(0, sorted.length - lines.length),
      flagged,
    };
  },
});

/**
 * The names of the Deviz's chapters, by any way the check may write one: as
 * the request labels it, with its code or its object, or by name alone.
 */
async function chapterNames(ctx: MutationCtx, estimateId: Id<"estimates">) {
  const sections = await readSections(ctx, estimateId);
  const labels = sectionLabels(sections);
  const names = new Map<string, string>();
  for (const section of sections) {
    if (section.kind !== "chapter") {
      continue;
    }
    for (const label of [
      section.name,
      sectionLabel(section),
      labels.get(section._id) ?? "",
    ]) {
      const key = normalizeText(label);
      if (key && !names.has(key)) {
        names.set(key, section.name);
      }
    }
  }
  return names;
}

/**
 * Saves what the check found, before the missing works are matched with
 * norms. A work goes in the Deviz's chapter the check names, however it
 * writes it, and the works the model is unsure of start left out. Returns
 * false when the check was set aside in the meantime.
 */
export const saveFindings = internalMutation({
  args: {
    proposalId: v.id("proposals"),
    summary: v.optional(v.string()),
    remarks: v.array(v.string()),
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
        basis: v.array(v.id("lineItems")),
      }),
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get("proposals", args.proposalId);
    if (proposal?.status !== "working") {
      return false;
    }
    const chapters = await chapterNames(ctx, proposal.estimateId);
    for (const [position, article] of args.articles.entries()) {
      await ctx.db.insert("proposalItems", {
        ...article,
        chapter:
          chapters.get(normalizeText(article.chapter)) ?? article.chapter,
        organizationId: proposal.organizationId,
        proposalId: proposal._id,
        position,
        candidateIds: [],
        quantity: article.measured,
        selected: article.confidence !== "low",
      });
    }
    await ctx.db.patch("proposals", proposal._id, {
      summary: args.summary,
      remarks: args.remarks,
      questions: args.questions,
      updatedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Leaves out the missing works the Deviz has after all: an article with the
 * same norm, in any of its versions, or with the same name.
 */
export async function leaveOutPresent(
  ctx: MutationCtx,
  proposal: Doc<"proposals">,
) {
  const norms = new Map<Id<"norms">, Doc<"norms"> | null>();
  async function normOf(normId: Id<"norms"> | undefined) {
    if (!normId) {
      return null;
    }
    if (!norms.has(normId)) {
      norms.set(normId, await ctx.db.get("norms", normId));
    }
    return norms.get(normId) ?? null;
  }
  const byLineage = new Map<Id<"norms">, Id<"lineItems">>();
  const byTitle = new Map<string, Id<"lineItems">>();
  for (const line of await readLineItems(ctx, proposal.estimateId)) {
    const title = normalizeText(line.title);
    if (!byTitle.has(title)) {
      byTitle.set(title, line._id);
    }
    const norm = await normOf(line.normId);
    if (norm && !byLineage.has(norm.lineageId ?? norm._id)) {
      byLineage.set(norm.lineageId ?? norm._id, line._id);
    }
  }
  const items = await ctx.db
    .query("proposalItems")
    .withIndex("by_proposalId_and_position", (q) =>
      q.eq("proposalId", proposal._id),
    )
    .take(100);
  for (const item of items) {
    const norm = await normOf(item.normId);
    const duplicateOf =
      (norm ? byLineage.get(norm.lineageId ?? norm._id) : undefined) ??
      byTitle.get(normalizeText(item.title));
    if (duplicateOf) {
      await ctx.db.patch("proposalItems", item._id, {
        duplicateOf,
        selected: false,
      });
    }
  }
}

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { createJob } from "../ai/jobs";
import { aiModel } from "../ai/models";
import { isUsableBy } from "../catalog/access";
import { readNormResources } from "../catalog/norms";
import {
  checkQuantity,
  nextPosition,
  pricedFields,
  readSections,
  refreshTotals,
  requireEditableEstimate,
  resolverFor,
  snapshotResources,
} from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { normalizeText } from "../lib/text";
import {
  isPhotoType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_PHOTOS_BYTES,
  MAX_TEXT,
} from "./lib/input";
import { convertQuantity } from "./lib/match";

// Proposals: what the AI suggests for a Deviz from a description of the work
// and photos of it. The AI writes the articles with their quantities; a
// person reviews them, and only the ones they keep go into the Deviz.

const MAX_ITEMS = 500;

// Proposals a firm may start, so a loop or a slip can't run up the AI bill.
const PER_HOUR = 6;
const PER_DAY = 30;
const HOUR_MS = 60 * 60 * 1000;

// The drafting action takes ten minutes at most; a job still running after
// twelve has died, and its proposal shows as failed.
const JOB_TIMEOUT_MS = 12 * 60 * 1000;

async function readItems(ctx: QueryCtx, proposalId: Id<"proposals">) {
  return await ctx.db
    .query("proposalItems")
    .withIndex("by_proposalId_and_position", (q) =>
      q.eq("proposalId", proposalId),
    )
    .take(MAX_ITEMS);
}

/** The norms a proposal's items use or could use, as the review shows them. */
async function normSummaries(
  ctx: QueryCtx,
  items: readonly Doc<"proposalItems">[],
  organizationId: Id<"organizations">,
) {
  const ids = new Set<Id<"norms">>();
  for (const item of items) {
    if (item.normId) {
      ids.add(item.normId);
    }
    for (const id of item.candidateIds) {
      ids.add(id);
    }
  }
  const manufacturers = new Map<Id<"manufacturers">, string | undefined>();
  const summaries = new Map<
    Id<"norms">,
    {
      _id: Id<"norms">;
      code: string;
      title: string;
      unit: string;
      source: Doc<"norms">["source"];
      manufacturerName?: string;
      usable: boolean;
    }
  >();
  for (const id of ids) {
    const norm = await ctx.db.get("norms", id);
    if (!norm) {
      continue;
    }
    let manufacturerName: string | undefined;
    if (norm.manufacturerId) {
      if (!manufacturers.has(norm.manufacturerId)) {
        const manufacturer = await ctx.db.get(
          "manufacturers",
          norm.manufacturerId,
        );
        manufacturers.set(
          norm.manufacturerId,
          manufacturer?.displayName ?? manufacturer?.name,
        );
      }
      manufacturerName = manufacturers.get(norm.manufacturerId);
    }
    summaries.set(id, {
      _id: norm._id,
      code: norm.code,
      title: norm.title,
      unit: norm.unit,
      source: norm.source,
      manufacturerName,
      usable: isUsableBy(norm, organizationId),
    });
  }
  return summaries;
}

/**
 * A Deviz's newest proposal with its items, or null. A proposal whose AI job
 * failed shows as failed, with the job's error code.
 */
export const latest = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
      .order("desc")
      .first();
    if (!proposal) {
      return null;
    }
    const job = await ctx.db.get("aiJobs", proposal.aiJobId);
    const failed =
      proposal.status === "working" && (!job || job.status === "failed");
    const status = failed ? ("failed" as const) : proposal.status;
    const photos = [];
    for (const fileId of proposal.fileIds) {
      const file = await ctx.db.get("files", fileId);
      if (file && file.organizationId === estimate.organizationId) {
        photos.push({
          _id: file._id,
          name: file.name,
          url: await ctx.storage.getUrl(file.storageId),
        });
      }
    }
    const items =
      status === "working" || status === "ready"
        ? await readItems(ctx, proposal._id)
        : [];
    const norms = await normSummaries(ctx, items, estimate.organizationId);
    return {
      _id: proposal._id,
      _creationTime: proposal._creationTime,
      status,
      error: failed ? (job?.error ?? "unknown") : undefined,
      startedAt: job?.startedAt,
      source: proposal.source,
      text: proposal.text,
      photos,
      summary: proposal.summary,
      assumptions: proposal.assumptions,
      questions: proposal.questions,
      matchError: proposal.matchError,
      items: items.map((item) => {
        const linked = item.normId ? norms.get(item.normId) : undefined;
        // A norm withdrawn since the proposal leaves the AI's own recipe and
        // quantity, as `apply` will.
        const norm = linked?.usable ? linked : undefined;
        return {
          _id: item._id,
          chapter: item.chapter,
          title: item.title,
          unit: item.unit,
          measured: item.measured,
          takeoff: item.takeoff,
          note: item.note,
          confidence: item.confidence,
          resources: item.resources,
          quantity: item.normId && !norm ? item.measured : item.quantity,
          selected: item.selected,
          matchNote: item.matchNote,
          norm: norm ?? null,
          // The norm's unit doesn't convert from the article's, so the
          // quantity needs a look.
          unitMismatch:
            norm !== undefined &&
            convertQuantity(item.measured, item.unit, norm.unit) === null,
          candidates: item.candidateIds.flatMap((id) => {
            const candidate = norms.get(id);
            return candidate?.usable ? [candidate] : [];
          }),
        };
      }),
    };
  },
});

async function checkPhotos(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  fileIds: readonly Id<"files">[],
) {
  if (fileIds.length > MAX_PHOTOS || new Set(fileIds).size < fileIds.length) {
    throw invalid("photos");
  }
  let total = 0;
  for (const fileId of fileIds) {
    const file = await ctx.db.get("files", fileId);
    if (!file || file.organizationId !== estimate.organizationId) {
      throw notFound("file");
    }
    if (!isPhotoType(file.contentType)) {
      throw invalid("photo");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw invalid("size");
    }
    total += file.size;
    // The photos stay with the Deviz, like any file uploaded for it.
    if (!file.estimateId) {
      await ctx.db.patch("files", file._id, { estimateId: estimate._id });
    }
  }
  if (total > MAX_PHOTOS_BYTES) {
    throw invalid("size");
  }
}

/**
 * Sets aside the Deviz's proposal still open, so only the new one is
 * reviewed. One the AI is still writing can't be replaced.
 */
async function setAsideOpen(ctx: MutationCtx, estimateId: Id<"estimates">) {
  const recent = await ctx.db
    .query("proposals")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .order("desc")
    .take(5);
  for (const proposal of recent) {
    if (proposal.status === "working") {
      const job = await ctx.db.get("aiJobs", proposal.aiJobId);
      if (job?.status === "queued" || job?.status === "running") {
        throw appError("in_use", "proposal");
      }
    }
    if (proposal.status === "working" || proposal.status === "ready") {
      await ctx.db.patch("proposals", proposal._id, {
        status: "dismissed",
        updatedAt: Date.now(),
      });
    }
  }
}

async function checkQuota(ctx: QueryCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const lastDay = await ctx.db
    .query("proposals")
    .withIndex("by_organizationId", (q) =>
      q
        .eq("organizationId", organizationId)
        .gt("_creationTime", now - 24 * HOUR_MS),
    )
    .take(PER_DAY);
  const lastHour = lastDay.filter(
    (proposal) => proposal._creationTime > now - HOUR_MS,
  );
  if (lastDay.length >= PER_DAY || lastHour.length >= PER_HOUR) {
    throw appError("rate_limited", "proposals");
  }
}

/**
 * Asks the AI for a proposal from a description of the work, typed or
 * dictated, and photos of it (the firm's files). The AI works in the
 * background; `latest` shows its progress.
 */
export const start = mutation({
  args: {
    estimateId: v.id("estimates"),
    text: v.optional(v.string()),
    fileIds: v.array(v.id("files")),
  },
  returns: v.id("proposals"),
  handler: async (ctx, args) => {
    const { estimate, userId } = await requireEditableEstimate(
      ctx,
      args.estimateId,
    );
    const text = args.text?.trim() || undefined;
    if (text && text.length > MAX_TEXT) {
      throw invalid("text");
    }
    if (!text && args.fileIds.length === 0) {
      throw invalid("description");
    }
    await checkPhotos(ctx, estimate, args.fileIds);
    await setAsideOpen(ctx, estimate._id);
    await checkQuota(ctx, estimate.organizationId);
    const aiJobId = await createJob(
      ctx,
      {
        kind: "estimate_proposal",
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
      source: "description",
      status: "working",
      text,
      fileIds: args.fileIds,
      assumptions: [],
      questions: [],
      createdBy: userId,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.proposals.ai.draft, {
      proposalId,
    });
    return proposalId;
  },
});

/** A proposal waiting for review, on a Deviz the user may change. */
async function requireOpenProposal(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
) {
  const { doc: proposal } = await requireFirmDoc(ctx, "proposals", proposalId);
  const { estimate, userId } = await requireEditableEstimate(
    ctx,
    proposal.estimateId,
  );
  if (proposal.status !== "ready") {
    throw invalid("status");
  }
  return { proposal, estimate, userId };
}

/**
 * Changes one proposed item before it goes into the Deviz: whether it is
 * kept, its quantity, or its norm (null for the AI's own recipe).
 */
export const updateItem = mutation({
  args: {
    itemId: v.id("proposalItems"),
    selected: v.optional(v.boolean()),
    quantity: v.optional(v.number()),
    normId: v.optional(v.union(v.id("norms"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: item } = await requireFirmDoc(
      ctx,
      "proposalItems",
      args.itemId,
    );
    const { proposal, estimate } = await requireOpenProposal(
      ctx,
      item.proposalId,
    );
    const patch: Partial<Doc<"proposalItems">> = {};
    if (args.selected !== undefined) {
      patch.selected = args.selected;
    }
    if (args.normId === null) {
      patch.normId = undefined;
      patch.quantity = item.measured;
    } else if (args.normId !== undefined) {
      const norm = await ctx.db.get("norms", args.normId);
      if (!norm || !isUsableBy(norm, estimate.organizationId)) {
        throw notFound("norm");
      }
      patch.normId = norm._id;
      patch.quantity =
        convertQuantity(item.measured, item.unit, norm.unit) ?? item.measured;
      if (!item.candidateIds.includes(norm._id)) {
        patch.candidateIds = [...item.candidateIds, norm._id];
      }
    }
    if (args.quantity !== undefined) {
      checkQuantity(args.quantity);
      if (args.quantity === 0) {
        throw invalid("quantity");
      }
      patch.quantity = args.quantity;
      // A quantity typed for an item whose norm was withdrawn is for the
      // AI's recipe, which the item now uses.
      if (item.normId && args.normId === undefined) {
        const norm = await ctx.db.get("norms", item.normId);
        if (!norm || !isUsableBy(norm, estimate.organizationId)) {
          patch.normId = undefined;
        }
      }
    }
    await ctx.db.patch("proposalItems", item._id, patch);
    await ctx.db.patch("proposals", proposal._id, { updatedAt: Date.now() });
    return null;
  },
});

/** Keeps or leaves out every item of a proposal. */
export const setAllSelected = mutation({
  args: { proposalId: v.id("proposals"), selected: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { proposal } = await requireOpenProposal(ctx, args.proposalId);
    for (const item of await readItems(ctx, proposal._id)) {
      if (item.selected !== args.selected) {
        await ctx.db.patch("proposalItems", item._id, {
          selected: args.selected,
        });
      }
    }
    await ctx.db.patch("proposals", proposal._id, { updatedAt: Date.now() });
    return null;
  },
});

/**
 * The Deviz's chapters by name, without diacritics or case, creating at the
 * end the ones it doesn't have yet.
 */
async function chaptersFor(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  names: readonly string[],
) {
  const chapters = new Map<string, Id<"sections">>();
  for (const section of await readSections(ctx, estimate._id)) {
    const key = normalizeText(section.name);
    if (section.kind === "chapter" && !chapters.has(key)) {
      chapters.set(key, section._id);
    }
  }
  let position = await nextPosition(ctx, "sections", estimate._id);
  for (const name of names) {
    const key = normalizeText(name);
    if (!chapters.has(key)) {
      chapters.set(
        key,
        await ctx.db.insert("sections", {
          organizationId: estimate.organizationId,
          estimateId: estimate._id,
          kind: "chapter",
          name,
          position: position++,
        }),
      );
    }
  }
  return chapters;
}

/**
 * Links the AI's resources to the catalog's resources with the same kind,
 * name and unit, the firm's own first, so the firm's prices for them apply.
 */
function resourceLinker(ctx: QueryCtx, organizationId: Id<"organizations">) {
  const found = new Map<string, Promise<Id<"resources"> | undefined>>();
  async function find(resource: Doc<"proposalItems">["resources"][number]) {
    const nameKey = normalizeText(resource.name);
    for (const owner of [organizationId, undefined]) {
      const matches = await ctx.db
        .query("resources")
        .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
          q
            .eq("organizationId", owner)
            .eq("kind", resource.kind)
            .eq("nameKey", nameKey),
        )
        .take(10);
      const match = matches.find((row) => row.unit === resource.unit);
      if (match) {
        return match._id;
      }
    }
    return undefined;
  }
  return async (resources: Doc<"proposalItems">["resources"]) =>
    await Promise.all(
      resources.map(async (resource) => {
        const key = [
          resource.kind,
          normalizeText(resource.name),
          resource.unit,
        ].join(":");
        let resourceId = found.get(key);
        if (!resourceId) {
          resourceId = find(resource);
          found.set(key, resourceId);
        }
        return { ...resource, resourceId: await resourceId };
      }),
    );
}

/**
 * Puts the items kept into the Deviz, in their chapters, and closes the
 * proposal. Items stay marked as proposed by AI until a person confirms
 * each one; each keeps its Antemăsurătoare.
 */
export const apply = mutation({
  args: { proposalId: v.id("proposals") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { proposal, estimate, userId } = await requireOpenProposal(
      ctx,
      args.proposalId,
    );
    const items = (await readItems(ctx, proposal._id)).filter(
      (item) => item.selected,
    );
    if (items.length === 0) {
      throw invalid("selection");
    }
    const chapters = await chaptersFor(
      ctx,
      estimate,
      items.map((item) => item.chapter),
    );
    const resolver = resolverFor(ctx, estimate);
    const linkResources = resourceLinker(ctx, estimate.organizationId);
    const method = proposal.fileIds.length > 0 ? "photo" : "voice";
    const now = Date.now();
    let position = await nextPosition(ctx, "lineItems", estimate._id);
    for (const item of items) {
      const linked = item.normId
        ? await ctx.db.get("norms", item.normId)
        : null;
      // A norm withdrawn since the proposal leaves the AI's own recipe.
      const norm =
        linked && isUsableBy(linked, estimate.organizationId) ? linked : null;
      const fields = norm
        ? {
            origin: "norm" as const,
            normId: norm._id,
            code: norm.code,
            title: norm.title,
            unit: norm.unit,
            quantity: item.quantity,
            resources: await snapshotResources(
              await readNormResources(ctx, norm._id),
              resolver,
            ),
          }
        : {
            origin: "ai" as const,
            code: "—",
            title: item.title,
            unit: item.unit,
            quantity: item.normId ? item.measured : item.quantity,
            resources: await snapshotResources(
              await linkResources(item.resources),
              resolver,
            ),
          };
      const lineItemId = await ctx.db.insert("lineItems", {
        ...fields,
        ...pricedFields(fields.resources),
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        sectionId: chapters.get(normalizeText(item.chapter)),
        position: position++,
        notes: item.note,
        confidence: item.confidence,
        aiJobId: proposal.aiJobId,
        updatedAt: now,
      });
      if (item.takeoff.length > 0) {
        await ctx.db.insert("takeoffs", {
          organizationId: estimate.organizationId,
          estimateId: estimate._id,
          lineItemId,
          method,
          title: item.title,
          unit: item.unit,
          rows: item.takeoff,
          total: item.measured,
          aiJobId: proposal.aiJobId,
          confidence: item.confidence,
          createdBy: userId,
        });
      }
      if (norm?.manufacturerId) {
        await ctx.db.insert("usageEvents", {
          kind: "norm_added",
          organizationId: estimate.organizationId,
          normId: norm._id,
          manufacturerId: norm.manufacturerId,
          quantity: fields.quantity,
          unit: norm.unit,
          county: estimate.county,
        });
      }
    }
    await refreshTotals(ctx, estimate);
    await ctx.db.patch("proposals", proposal._id, {
      status: "applied",
      appliedAt: now,
      updatedAt: now,
    });
    return items.length;
  },
});

/** Sets a proposal aside without adding anything to the Deviz. */
export const dismiss = mutation({
  args: { proposalId: v.id("proposals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: proposal } = await requireFirmDoc(
      ctx,
      "proposals",
      args.proposalId,
    );
    if (proposal.status === "working" || proposal.status === "ready") {
      await ctx.db.patch("proposals", proposal._id, {
        status: "dismissed",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Deletes up to `limit` rows of a Deviz's or a firm's proposals, each
 * proposal after its items, and returns how many it deleted.
 */
export async function deleteProposals(
  ctx: MutationCtx,
  owner:
    | { estimateId: Id<"estimates"> }
    | { organizationId: Id<"organizations"> },
  limit: number,
): Promise<number> {
  const proposals =
    "estimateId" in owner
      ? await ctx.db
          .query("proposals")
          .withIndex("by_estimateId", (q) =>
            q.eq("estimateId", owner.estimateId),
          )
          .take(limit)
      : await ctx.db
          .query("proposals")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", owner.organizationId),
          )
          .take(limit);
  let deleted = 0;
  for (const proposal of proposals) {
    const items = await ctx.db
      .query("proposalItems")
      .withIndex("by_proposalId_and_position", (q) =>
        q.eq("proposalId", proposal._id),
      )
      .take(limit - deleted);
    for (const item of items) {
      await ctx.db.delete("proposalItems", item._id);
    }
    deleted += items.length;
    if (deleted >= limit) {
      break;
    }
    await ctx.db.delete("proposals", proposal._id);
    deleted++;
  }
  return deleted;
}

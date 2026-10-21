import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
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
import { countNormAdded } from "../producers/usage";
import {
  isPhotoType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_PHOTOS_BYTES,
  MAX_TENDER_BYTES,
  MAX_TENDER_FILES,
  MAX_TENDER_ITEMS,
  MAX_TEXT,
  maxTenderFileBytes,
  tenderFileKind,
} from "./lib/input";
import { convertQuantity } from "./lib/match";

// Proposals: what the AI suggests for a Deviz from a description of the work
// and photos of it, or from a tender's quantity lists. The AI writes the
// articles with their quantities, or reads the lists' positions; a person
// reviews them, and only the ones they keep go into the Deviz. The omissions
// check (omissions.ts) proposes the works a Deviz misses the same way.

const MAX_ITEMS = MAX_TENDER_ITEMS;

// Items that go into the Deviz per mutation; the rest follow in scheduled
// ones, so a tender's hundreds of positions stay within a mutation's limits.
const APPLY_BATCH = 100;

// A line item's title; a tender position's full text stays in tenderRef.
const MAX_TITLE = 500;

// Proposals a firm may start, so a loop or a slip can't run up the AI bill.
const PER_HOUR = 6;
const PER_DAY = 30;
const HOUR_MS = 60 * 60 * 1000;

// The drafting action takes ten minutes at most; a job still running after
// twelve has died, and its proposal shows as failed. A tender import runs in
// a chain of actions and gets an hour.
export const JOB_TIMEOUT_MS = 12 * 60 * 1000;
const TENDER_TIMEOUT_MS = 60 * 60 * 1000;

type Source = Doc<"proposals">["source"];

// A Deviz's proposals come in two lanes, with at most one open in each: the
// articles drafted from a description or read from a tender's lists, and the
// works an omissions check finds missing.
export const DRAFTING: readonly Source[] = ["description", "tender"];
export const OMISSIONS: readonly Source[] = ["omissions"];

/** A Deviz's newest proposals from some sources, the newest first. */
export async function newestProposals(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
  sources: readonly Source[],
  count: number,
) {
  const rows: Doc<"proposals">[] = [];
  for (const source of sources) {
    rows.push(
      ...(await ctx.db
        .query("proposals")
        .withIndex("by_estimateId_and_source", (q) =>
          q.eq("estimateId", estimateId).eq("source", source),
        )
        .order("desc")
        .take(count)),
    );
  }
  return rows.sort((a, b) => b._creationTime - a._creationTime).slice(0, count);
}

async function readItems(ctx: QueryCtx, proposalId: Id<"proposals">) {
  return await ctx.db
    .query("proposalItems")
    .withIndex("by_proposalId_and_position", (q) =>
      q.eq("proposalId", proposalId),
    )
    .take(MAX_ITEMS);
}

/** Norms as the review shows them, by id; deleted ones are left out. */
async function normSummaries(
  ctx: QueryCtx,
  normIds: Iterable<Id<"norms">>,
  organizationId: Id<"organizations">,
) {
  const ids = new Set(normIds);
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
 * A proposal with its items, as the review shows it. A proposal whose AI job
 * failed shows as failed, with the job's error code.
 */
export async function proposalView(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
  proposal: Doc<"proposals">,
) {
  const job = await ctx.db.get("aiJobs", proposal.aiJobId);
  const failed =
    proposal.status === "working" && (!job || job.status === "failed");
  const status = failed ? ("failed" as const) : proposal.status;
  const tender = proposal.source === "tender";
  // A description's photos, with links to show them; a tender's lists.
  const photos = [];
  const files = [];
  for (const fileId of proposal.fileIds) {
    const file = await ctx.db.get("files", fileId);
    if (file && file.organizationId === estimate.organizationId) {
      if (tender) {
        files.push({ _id: file._id, name: file.name });
      } else {
        photos.push({
          _id: file._id,
          name: file.name,
          url: await ctx.storage.getUrl(file.storageId),
        });
      }
    }
  }
  // While a tender is read, its progress says enough.
  const items =
    status === "ready" || (status === "working" && !tender)
      ? await readItems(ctx, proposal._id)
      : [];
  const norms = await normSummaries(
    ctx,
    items.flatMap((item) => (item.normId ? [item.normId] : [])),
    estimate.organizationId,
  );
  // The Deviz's articles a missing work is for, by name; deleted ones are
  // left out.
  const lines = new Map<Id<"lineItems">, string | null>();
  for (const item of items) {
    for (const lineItemId of [
      ...(item.basis ?? []),
      ...(item.duplicateOf ? [item.duplicateOf] : []),
    ]) {
      if (!lines.has(lineItemId)) {
        const line = await ctx.db.get("lineItems", lineItemId);
        lines.set(
          lineItemId,
          line?.estimateId === estimate._id ? line.title : null,
        );
      }
    }
  }
  return {
    _id: proposal._id,
    _creationTime: proposal._creationTime,
    status,
    error: failed ? (job?.error ?? "unknown") : undefined,
    startedAt: job?.startedAt,
    source: proposal.source,
    text: proposal.text,
    photos,
    files,
    summary: proposal.summary,
    assumptions: proposal.assumptions,
    questions: proposal.questions,
    remarks: proposal.remarks ?? [],
    matchError: proposal.matchError,
    progress: proposal.progress && {
      stage: proposal.progress.stage,
      file: proposal.progress.file,
      read: proposal.progress.read,
      matched: proposal.progress.matched,
      issues: proposal.progress.issues,
    },
    applying:
      status === "applying"
        ? {
            applied: proposal.applied ?? 0,
            total: proposal.applyTotal ?? 0,
          }
        : undefined,
    // What the list shows of each item; `itemDetails` has the rest, so a
    // tender's hundreds of positions stay light.
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
        note: item.note,
        confidence: item.confidence,
        quantity: item.normId && !norm ? item.measured : item.quantity,
        selected: item.selected,
        norm: norm ?? null,
        // The norm's unit doesn't convert from the article's, so the
        // quantity needs a look.
        unitMismatch:
          norm !== undefined &&
          convertQuantity(item.measured, item.unit, norm.unit) === null,
        // Whether the AI wrote a recipe for it, used without a norm.
        recipe: item.resources.length > 0,
        tender: item.tender && {
          position: item.tender.position,
          code: item.tender.code,
          object: item.tender.object,
          chapter: item.tender.chapter,
        },
        basis: (item.basis ?? []).flatMap((lineItemId) => {
          const title = lines.get(lineItemId);
          return title ? [{ _id: lineItemId, title }] : [];
        }),
        duplicateOf: (item.duplicateOf && lines.get(item.duplicateOf)) || null,
      };
    }),
  };
}

/**
 * A Deviz's newest proposal from a description or a tender's lists, with its
 * items, or null.
 */
export const latest = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const [proposal] = await newestProposals(ctx, estimate._id, DRAFTING, 1);
    return proposal ? await proposalView(ctx, estimate, proposal) : null;
  },
});

/**
 * The rest of a proposed item, shown when it is opened in the review: the
 * norms it could use, the AI's Antemăsurătoare and recipe, and a tender
 * position's whole text.
 */
export const itemDetails = query({
  args: { itemId: v.id("proposalItems") },
  handler: async (ctx, args) => {
    const { doc: item } = await requireFirmDoc(
      ctx,
      "proposalItems",
      args.itemId,
    );
    const norms = await normSummaries(
      ctx,
      item.candidateIds,
      item.organizationId,
    );
    return {
      matchNote: item.matchNote,
      candidates: item.candidateIds.flatMap((id) => {
        const candidate = norms.get(id);
        return candidate?.usable ? [candidate] : [];
      }),
      takeoff: item.takeoff,
      resources: item.resources,
      text: item.tender?.text ?? item.title,
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
 * Sets aside the Deviz's proposal still open in a lane, so only the new one
 * is reviewed. One the AI is still writing, or one still going into the
 * Deviz, can't be replaced.
 */
export async function setAsideOpen(
  ctx: MutationCtx,
  estimateId: Id<"estimates">,
  lane: readonly Source[],
) {
  for (const proposal of await newestProposals(ctx, estimateId, lane, 5)) {
    if (proposal.status === "applying") {
      throw appError("in_use", "proposal");
    }
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

export async function checkQuota(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
) {
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
    await setAsideOpen(ctx, estimate._id, DRAFTING);
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

/**
 * Checks a tender's lists before reading them: the firm's files, of a kind
 * the import reads and within its sizes. The .xls format is refused with
 * its own reason, so the person knows to save it as .xlsx or PDF.
 */
async function checkTenderFiles(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  fileIds: readonly Id<"files">[],
) {
  if (
    fileIds.length === 0 ||
    fileIds.length > MAX_TENDER_FILES ||
    new Set(fileIds).size < fileIds.length
  ) {
    throw invalid("files");
  }
  let total = 0;
  for (const fileId of fileIds) {
    const file = await ctx.db.get("files", fileId);
    if (!file || file.organizationId !== estimate.organizationId) {
      throw notFound("file");
    }
    const kind = tenderFileKind(file.name, file.contentType);
    if (kind === "xls") {
      throw invalid("xls");
    }
    if (!kind) {
      throw invalid("fileType");
    }
    if (file.size > maxTenderFileBytes[kind]) {
      throw invalid("size");
    }
    total += file.size;
    if (!file.estimateId) {
      await ctx.db.patch("files", file._id, { estimateId: estimate._id });
    }
  }
  if (total > MAX_TENDER_BYTES) {
    throw invalid("size");
  }
}

/**
 * Imports a tender's quantity lists (formularul F3) from the firm's files:
 * spreadsheets, PDFs or photos of the pages. The AI reads the positions and
 * matches them with norms in the background; `latest` shows its progress.
 */
export const startTender = mutation({
  args: {
    estimateId: v.id("estimates"),
    fileIds: v.array(v.id("files")),
  },
  returns: v.id("proposals"),
  handler: async (ctx, args) => {
    const { estimate, userId } = await requireEditableEstimate(
      ctx,
      args.estimateId,
    );
    await checkTenderFiles(ctx, estimate, args.fileIds);
    await setAsideOpen(ctx, estimate._id, DRAFTING);
    await checkQuota(ctx, estimate.organizationId);
    const aiJobId = await createJob(
      ctx,
      {
        kind: "tender_import",
        model: aiModel(),
        organizationId: estimate.organizationId,
        createdBy: userId,
      },
      TENDER_TIMEOUT_MS,
    );
    const proposalId = await ctx.db.insert("proposals", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      aiJobId,
      source: "tender",
      status: "working",
      fileIds: args.fileIds,
      assumptions: [],
      questions: [],
      progress: {
        stage: "reading",
        file: 0,
        sheet: 0,
        next: 0,
        read: 0,
        matched: 0,
        issues: [],
      },
      createdBy: userId,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.proposals.tender.importTender, {
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
 * kept, its measured quantity (a tender's, in the list's unit), the quantity
 * that goes in the Deviz, or its norm (null for the AI's own recipe).
 */
export const updateItem = mutation({
  args: {
    itemId: v.id("proposalItems"),
    selected: v.optional(v.boolean()),
    measured: v.optional(v.number()),
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
    const measured = args.measured ?? item.measured;
    if (args.measured !== undefined) {
      checkQuantity(args.measured);
      if (args.measured === 0) {
        throw invalid("quantity");
      }
      patch.measured = args.measured;
    }
    if (args.normId === null) {
      patch.normId = undefined;
      patch.quantity = measured;
    } else if (args.normId !== undefined) {
      const norm = await ctx.db.get("norms", args.normId);
      if (!norm || !isUsableBy(norm, estimate.organizationId)) {
        throw notFound("norm");
      }
      patch.normId = norm._id;
      patch.quantity =
        convertQuantity(measured, item.unit, norm.unit) ?? measured;
      if (!item.candidateIds.includes(norm._id)) {
        patch.candidateIds = [...item.candidateIds, norm._id];
      }
    } else if (args.measured !== undefined) {
      // The Deviz quantity follows: converted to the norm's unit, or in the
      // same proportion when the units don't convert.
      const linked = item.normId
        ? await ctx.db.get("norms", item.normId)
        : null;
      const norm =
        linked && isUsableBy(linked, estimate.organizationId) ? linked : null;
      patch.quantity = norm
        ? (convertQuantity(measured, item.unit, norm.unit) ??
          Math.round(((item.quantity * measured) / item.measured) * 1e4) / 1e4)
        : measured;
      if (item.normId && !norm) {
        patch.normId = undefined;
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
 * The sections a tender's positions go in: its Obiecte, and its Capitole
 * inside them. A section is reused only when its kind, parent, code and name
 * all match, so one object's Capitolul 1 isn't another's; the others are
 * created in the lists' order.
 */
async function tenderSections(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  items: readonly Doc<"proposalItems">[],
) {
  type Section = { code?: string; name: string };
  const key = (
    kind: Doc<"sections">["kind"],
    parentId: Id<"sections"> | undefined,
    section: Section,
  ) =>
    [
      kind,
      parentId ?? "",
      normalizeText(section.code ?? ""),
      normalizeText(section.name),
    ].join("|");
  const found = new Map<string, Id<"sections">>();
  for (const section of await readSections(ctx, estimate._id)) {
    const at = key(section.kind, section.parentId, section);
    if (!found.has(at)) {
      found.set(at, section._id);
    }
  }
  let position = await nextPosition(ctx, "sections", estimate._id);
  const sectionFor = async (
    kind: Doc<"sections">["kind"],
    parentId: Id<"sections"> | undefined,
    section: Section,
  ) => {
    const at = key(kind, parentId, section);
    let sectionId = found.get(at);
    if (!sectionId) {
      sectionId = await ctx.db.insert("sections", {
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        kind,
        parentId,
        code: section.code,
        name: section.name,
        position: position++,
      });
      found.set(at, sectionId);
    }
    return sectionId;
  };
  const result = new Map<Id<"proposalItems">, Id<"sections"> | undefined>();
  for (const item of items) {
    const object = item.tender?.object
      ? await sectionFor("object", undefined, item.tender.object)
      : undefined;
    const chapter = item.tender?.chapter
      ? await sectionFor("chapter", object, item.tender.chapter)
      : undefined;
    result.set(item._id, chapter ?? object);
  }
  return result;
}

/**
 * Puts the next batch of a proposal's kept items into the Deviz, in position
 * order, and schedules the batch after it; the last one closes the proposal.
 * Items stay marked as proposed by AI until a person confirms each one; each
 * keeps its Antemăsurătoare, and a tender's position its tenderRef.
 */
async function applyBatch(ctx: MutationCtx, proposalId: Id<"proposals">) {
  const proposal = await ctx.db.get("proposals", proposalId);
  if (proposal?.status !== "applying") {
    return;
  }
  const now = Date.now();
  const estimate = await ctx.db.get("estimates", proposal.estimateId);
  if (!estimate || estimate.lockedAt !== undefined) {
    // The Deviz was sent meanwhile: what went in stays.
    await ctx.db.patch("proposals", proposal._id, {
      status: "applied",
      appliedAt: now,
      updatedAt: now,
    });
    return;
  }
  const after = proposal.appliedThrough ?? -1;
  const batch: Doc<"proposalItems">[] = [];
  let through = after;
  let more = false;
  for await (const item of ctx.db
    .query("proposalItems")
    .withIndex("by_proposalId_and_position", (q) =>
      q.eq("proposalId", proposal._id).gt("position", after),
    )) {
    if (item.selected) {
      if (batch.length === APPLY_BATCH) {
        more = true;
        break;
      }
      batch.push(item);
    }
    through = item.position;
  }
  const tender = proposal.source === "tender";
  const sections = tender
    ? await tenderSections(ctx, estimate, batch)
    : undefined;
  const chapters = tender
    ? undefined
    : await chaptersFor(
        ctx,
        estimate,
        batch.map((item) => item.chapter),
      );
  const resolver = resolverFor(ctx, estimate);
  const linkResources = resourceLinker(ctx, estimate.organizationId);
  const method =
    proposal.source === "omissions"
      ? "derived"
      : proposal.fileIds.length > 0
        ? "photo"
        : "voice";
  const userId = proposal.appliedBy ?? proposal.createdBy;
  let position = await nextPosition(ctx, "lineItems", estimate._id);
  for (const item of batch) {
    const linked = item.normId ? await ctx.db.get("norms", item.normId) : null;
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
          origin: item.tender ? ("tender" as const) : ("ai" as const),
          code: "—",
          title: item.title.slice(0, MAX_TITLE),
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
      sectionId: sections
        ? sections.get(item._id)
        : chapters?.get(normalizeText(item.chapter)),
      position: position++,
      notes: item.note,
      confidence: item.confidence,
      aiJobId: proposal.aiJobId,
      // The authority's unit and quantity, as the list writes them.
      tenderRef: item.tender && {
        position: item.tender.position,
        code: item.tender.code,
        text: item.tender.text,
        unit: item.unit,
        quantity: item.measured,
      },
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
    if (norm) {
      await countNormAdded(ctx, estimate, norm, fields.quantity);
    }
  }
  await refreshTotals(ctx, estimate);
  await ctx.db.patch("proposals", proposal._id, {
    applied: (proposal.applied ?? 0) + batch.length,
    appliedThrough: through,
    ...(more ? {} : { status: "applied" as const, appliedAt: now }),
    updatedAt: now,
  });
  if (more) {
    await ctx.scheduler.runAfter(0, internal.proposals.proposals.applyMore, {
      proposalId,
    });
  }
}

/**
 * Puts the items kept into the Deviz, in their sections: the first batch at
 * once, the rest in scheduled mutations. Returns how many go in.
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
    // Every section first, so they keep the proposal's order.
    if (proposal.source === "tender") {
      await tenderSections(ctx, estimate, items);
    } else {
      await chaptersFor(
        ctx,
        estimate,
        items.map((item) => item.chapter),
      );
    }
    await ctx.db.patch("proposals", proposal._id, {
      status: "applying",
      appliedBy: userId,
      applyTotal: items.length,
      applied: 0,
      appliedThrough: -1,
      updatedAt: Date.now(),
    });
    await applyBatch(ctx, proposal._id);
    return items.length;
  },
});

/** Puts the next batch of a proposal's kept items into the Deviz. */
export const applyMore = internalMutation({
  args: { proposalId: v.id("proposals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await applyBatch(ctx, args.proposalId);
    return null;
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
          .withIndex("by_estimateId_and_source", (q) =>
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

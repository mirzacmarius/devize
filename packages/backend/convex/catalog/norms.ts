import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  isProducer,
  requireManufacturerEditor,
  requireMember,
  requireUserId,
} from "../lib/access";
import { appError, forbidden, invalid, notFound } from "../lib/errors";
import { getSuperAdmin, requireSuperAdmin } from "../lib/roles";
import { normalizeText, normalizeUnit } from "../lib/text";
import {
  canEditNorm,
  canReadNorm,
  isReadableByAll,
  requireEditableNorm,
  requireReadableNorm,
} from "./access";
import {
  baseCategoryByKey,
  baseCategoryByName,
  codeRangeOf,
} from "./baseCategories";
import { type NormResourceInput, writeNormResources } from "./resourceRows";
import { normResourceInput, normSource, normStatus } from "./validators";

const descriptiveFields = {
  baseCode: v.optional(v.string()),
  category: v.optional(v.string()),
  includes: v.optional(v.string()),
  excludes: v.optional(v.string()),
  measurement: v.optional(v.string()),
};

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function cleanRequired(fields: { code: string; title: string; unit: string }) {
  const code = fields.code.trim();
  const title = fields.title.trim();
  const unit = normalizeUnit(fields.unit);
  if (!code || code.length > 40) {
    throw invalid("code");
  }
  if (!title || title.length > 500) {
    throw invalid("title");
  }
  if (!unit || unit === "%") {
    throw invalid("unit");
  }
  return { code, title, unit };
}

function searchText(norm: { code: string; title: string; baseCode?: string }) {
  return normalizeText(
    [norm.code, norm.baseCode, norm.title].filter(Boolean).join(" "),
  );
}

export async function readNormResources(ctx: QueryCtx, normId: Id<"norms">) {
  return await ctx.db
    .query("normResources")
    .withIndex("by_normId_and_position", (q) => q.eq("normId", normId))
    .take(200);
}

function lineageOf(norm: Doc<"norms">): Id<"norms"> {
  return norm.lineageId ?? norm._id;
}

/** Every version of a norm, newest first. */
export async function versionsOf(ctx: QueryCtx, norm: Doc<"norms">) {
  return await ctx.db
    .query("norms")
    .withIndex("by_lineageId_and_version", (q) =>
      q.eq("lineageId", lineageOf(norm)),
    )
    .order("desc")
    .take(100);
}

/** The newest published version of a norm, which may be the norm itself. */
export async function latestPublishedVersion(
  ctx: QueryCtx,
  norm: Doc<"norms">,
): Promise<Doc<"norms"> | null> {
  const versions = await versionsOf(ctx, norm);
  return versions.find((version) => version.status === "published") ?? null;
}

// Which catalog a norm is in: Devize's, one producer's or one firm's.
type Scope = Pick<Doc<"norms">, "source" | "manufacturerId" | "organizationId">;

function sameScope(a: Scope, b: Scope) {
  return (
    a.source === b.source &&
    a.manufacturerId === b.manufacturerId &&
    a.organizationId === b.organizationId
  );
}

/**
 * Whether a norm of another lineage in the same catalog, not archived, has
 * this code.
 */
async function codeTaken(
  ctx: QueryCtx,
  scope: Scope,
  code: string,
  lineageId?: Id<"norms">,
) {
  const sameCode = ctx.db
    .query("norms")
    .withIndex("by_code", (q) => q.eq("code", code));
  for await (const other of sameCode) {
    if (
      lineageOf(other) !== lineageId &&
      sameScope(other, scope) &&
      other.status !== "archived"
    ) {
      return true;
    }
  }
  return false;
}

/** A code names one norm in its catalog: Devize's, a producer's or a firm's. */
async function assertCodeFree(ctx: QueryCtx, norm: Doc<"norms">) {
  if (await codeTaken(ctx, norm, norm.code, lineageOf(norm))) {
    throw appError("in_use", "code");
  }
}

/** The code itself, or the first of "-2", "-3"… after it that is free. */
export async function freeCode(ctx: QueryCtx, scope: Scope, code: string) {
  for (let copy = 1; copy <= 50; copy++) {
    const suffix = copy === 1 ? "" : `-${copy}`;
    const candidate = `${code.slice(0, 40 - suffix.length)}${suffix}`;
    if (!(await codeTaken(ctx, scope, candidate))) {
      return candidate;
    }
  }
  throw appError("in_use", "code");
}

async function manufacturerNames(
  ctx: QueryCtx,
  norms: readonly Doc<"norms">[],
): Promise<Map<Id<"manufacturers">, string>> {
  const names = new Map<Id<"manufacturers">, string>();
  for (const norm of norms) {
    if (norm.manufacturerId && !names.has(norm.manufacturerId)) {
      const manufacturer = await ctx.db.get(
        "manufacturers",
        norm.manufacturerId,
      );
      if (manufacturer) {
        names.set(
          norm.manufacturerId,
          manufacturer.displayName ?? manufacturer.name,
        );
      }
    }
  }
  return names;
}

async function summaries(ctx: QueryCtx, norms: readonly Doc<"norms">[]) {
  const names = await manufacturerNames(ctx, norms);
  return norms.map((norm) => ({
    _id: norm._id,
    code: norm.code,
    baseCode: norm.baseCode,
    title: norm.title,
    unit: norm.unit,
    category: norm.category,
    source: norm.source,
    visibility: norm.visibility,
    status: norm.status,
    version: norm.version,
    manufacturerId: norm.manufacturerId,
    manufacturerName: norm.manufacturerId
      ? names.get(norm.manufacturerId)
      : undefined,
    verified: norm.verifiedAt !== undefined,
    confirmed: norm.confirmedAt !== undefined,
    edition: norm.edition,
    updatedAt: norm.updatedAt,
  }));
}

/**
 * Public norms as a search found them, those their producer confirmed first;
 * the search's own order holds within each group.
 */
export function confirmedFirst(norms: Doc<"norms">[]): Doc<"norms">[] {
  return [...norms].sort(
    (a, b) =>
      Number(b.confirmedAt !== undefined) - Number(a.confirmedAt !== undefined),
  );
}

/**
 * Published norms a firm can put in a Deviz that match the words typed, its own
 * first, or only the public ones. Words are matched without diacritics, the
 * last one as a prefix.
 */
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    text: v.string(),
    category: v.optional(v.string()),
    scope: v.optional(v.union(v.literal("all"), v.literal("public"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const text = normalizeText(args.text);
    if (!text) {
      return [];
    }
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 50);
    const own =
      args.scope === "public"
        ? []
        : await ctx.db
            .query("norms")
            .withSearchIndex("search_searchText", (q) => {
              const scoped = q
                .search("searchText", text)
                .eq("organizationId", args.organizationId)
                .eq("status", "published");
              return args.category
                ? scoped.eq("category", args.category)
                : scoped;
            })
            .take(limit);
    const shared = await ctx.db
      .query("norms")
      .withSearchIndex("search_searchText", (q) => {
        const scoped = q
          .search("searchText", text)
          .eq("visibility", "public")
          .eq("status", "published");
        return args.category ? scoped.eq("category", args.category) : scoped;
      })
      .take(limit);
    return await summaries(
      ctx,
      [...own, ...confirmedFirst(shared)].slice(0, limit),
    );
  },
});

/**
 * The published norms of one category of the base catalog, by code. A
 * category owns a series of codes (DV-ZID-01, DV-ZID-02 …), so the index on
 * codes lists it and the norm needs no field for it; a producer's norms,
 * with codes of their own, are left out.
 */
export const listBaseCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const category =
      baseCategoryByKey(args.category) ?? baseCategoryByName(args.category);
    if (!category) {
      throw invalid("category");
    }
    const { start, end } = codeRangeOf(category);
    const norms = await ctx.db
      .query("norms")
      .withIndex("by_visibility_and_status_and_code", (q) =>
        q
          .eq("visibility", "public")
          .eq("status", "published")
          .gte("code", start)
          .lt("code", end),
      )
      .take(100);
    return await summaries(
      ctx,
      norms.filter((norm) => norm.source === "base"),
    );
  },
});

/** The published public catalog, or one Producător's part of it, by code. */
export const listPublished = query({
  args: {
    paginationOpts: paginationOptsValidator,
    manufacturerId: v.optional(v.id("manufacturers")),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const manufacturerId = args.manufacturerId;
    const result = manufacturerId
      ? await ctx.db
          .query("norms")
          .withIndex("by_manufacturerId_and_status_and_code", (q) =>
            q.eq("manufacturerId", manufacturerId).eq("status", "published"),
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("norms")
          .withIndex("by_visibility_and_status_and_code", (q) =>
            q.eq("visibility", "public").eq("status", "published"),
          )
          .paginate(args.paginationOpts);
    return { ...result, page: await summaries(ctx, result.page) };
  },
});

// A firm's norms that are still current: superseded versions only matter to
// the devize that used them.
const currentStatuses: Doc<"norms">["status"][] = [
  "draft",
  "review",
  "published",
  "archived",
];

/**
 * A firm's private norms in one status, or all its current ones, the most
 * recently changed first and the archived ones last.
 */
export const listForOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(normStatus),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const norms: Doc<"norms">[] = [];
    for (const status of args.status ? [args.status] : currentStatuses) {
      norms.push(
        ...(await ctx.db
          .query("norms")
          .withIndex("by_organizationId_and_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status),
          )
          .take(500)),
      );
    }
    const archived = (norm: Doc<"norms">) =>
      norm.status === "archived" ? 1 : 0;
    norms.sort(
      (a, b) => archived(a) - archived(b) || b.updatedAt - a.updatedAt,
    );
    return await summaries(ctx, norms);
  },
});

/** Producer and base norms waiting for a super admin to verify them. */
export const listForReview = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const norms = await ctx.db
      .query("norms")
      .withIndex("by_visibility_and_status_and_code", (q) =>
        q.eq("visibility", "public").eq("status", "review"),
      )
      .take(200);
    return await summaries(ctx, norms);
  },
});

/**
 * The technical data sheet Devize AI drafted a norm from: the file, and what
 * the sheet says about applying the product and the AI said to check.
 */
async function datasheetOf(ctx: QueryCtx, importId: Id<"datasheetImports">) {
  const row = await ctx.db.get("datasheetImports", importId);
  if (!row) {
    return null;
  }
  const file = await ctx.db.get("files", row.fileId);
  return {
    fileName: file?.name ?? null,
    url: file ? await ctx.storage.getUrl(file.storageId) : null,
    product: row.product ?? null,
    conditions: row.conditions ?? [],
    checks: row.checks ?? [],
  };
}

/**
 * A norm version with its resources, the newest published version, the norm
 * it was copied from and what the signed-in user may do with it.
 */
export const get = query({
  args: { normId: v.id("norms") },
  handler: async (ctx, args) => {
    const norm = await requireReadableNorm(ctx, args.normId);
    const userId = await requireUserId(ctx);
    const [summary] = await summaries(ctx, [norm]);
    const latest = await latestPublishedVersion(ctx, norm);
    const canEdit = await canEditNorm(ctx, norm);
    const original = norm.copiedFromId
      ? await ctx.db.get("norms", norm.copiedFromId)
      : null;
    const [copiedFrom] =
      original && (await canReadNorm(ctx, original))
        ? await summaries(ctx, [original])
        : [];
    return {
      ...norm,
      manufacturerName: summary?.manufacturerName,
      resources: await readNormResources(ctx, norm._id),
      canEdit,
      // A firm publishes its own norms; a super admin publishes public ones.
      canPublish:
        canEdit &&
        (norm.visibility === "private" || (await getSuperAdmin(ctx)) !== null),
      // Only someone from the producer's own firm confirms its norms.
      canConfirm:
        norm.source === "manufacturer" &&
        norm.manufacturerId !== undefined &&
        norm.status === "published" &&
        norm.confirmedAt === undefined &&
        (await isProducer(ctx, norm.manufacturerId, userId)),
      copiedFrom,
      latestVersionId:
        latest && latest._id !== norm._id ? latest._id : undefined,
      // The data sheet it was drafted from, for the producer and Devize staff
      // who check it: the file is the producer's own.
      datasheet:
        canEdit && norm.datasheetImportId
          ? await datasheetOf(ctx, norm.datasheetImportId)
          : null,
      // Or the description Devize AI wrote it from, for the firm that asked.
      aiRequest: canEdit ? await aiRequestOf(ctx, norm._id) : null,
    };
  },
});

/** What a firm asked Devize AI for, when the norm came from that. */
async function aiRequestOf(ctx: QueryCtx, normId: Id<"norms">) {
  const request = await ctx.db
    .query("normRequests")
    .withIndex("by_normId", (q) => q.eq("normId", normId))
    .first();
  return request
    ? {
        description: request.description,
        assumptions: request.assumptions ?? [],
        checks: request.checks ?? [],
      }
    : null;
}

/** The versions of a norm the signed-in user may read, newest first. */
export const versions = query({
  args: { normId: v.id("norms") },
  handler: async (ctx, args) => {
    const norm = await requireReadableNorm(ctx, args.normId);
    // Every version is in the same catalog, so one check covers them all.
    const canEdit = await canEditNorm(ctx, norm);
    return (await versionsOf(ctx, norm))
      .filter((version) => canEdit || isReadableByAll(version))
      .map((version) => ({
        _id: version._id,
        version: version.version,
        status: version.status,
        publishedAt: version.publishedAt,
        updatedAt: version.updatedAt,
      }));
  },
});

async function checkCreate(
  ctx: MutationCtx,
  args: {
    source: Doc<"norms">["source"];
    organizationId?: Id<"organizations">;
    manufacturerId?: Id<"manufacturers">;
  },
) {
  switch (args.source) {
    case "base":
      await requireSuperAdmin(ctx);
      return {};
    case "manufacturer": {
      if (!args.manufacturerId) {
        throw invalid("manufacturerId");
      }
      await requireManufacturerEditor(ctx, args.manufacturerId);
      if (!(await ctx.db.get("manufacturers", args.manufacturerId))) {
        throw notFound("manufacturer");
      }
      return { manufacturerId: args.manufacturerId };
    }
    case "organization":
      if (!args.organizationId) {
        throw invalid("organizationId");
      }
      await requireMember(ctx, args.organizationId);
      return { organizationId: args.organizationId };
  }
}

/** Starts a draft norm in Devize's catalog, a producer's or a firm's. */
export const create = mutation({
  args: {
    source: normSource,
    organizationId: v.optional(v.id("organizations")),
    manufacturerId: v.optional(v.id("manufacturers")),
    code: v.string(),
    title: v.string(),
    unit: v.string(),
    ...descriptiveFields,
    resources: v.array(normResourceInput),
  },
  returns: v.id("norms"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const scope = await checkCreate(ctx, args);
    return await insertDraftNorm(ctx, {
      ...args,
      // Only the ids the norm's catalog has.
      manufacturerId: undefined,
      organizationId: undefined,
      ...scope,
      createdBy: userId,
    });
  },
});

/**
 * Inserts the first version of a draft norm and its resources, once the
 * caller checked who may write it in that catalog.
 */
export async function insertDraftNorm(
  ctx: MutationCtx,
  args: {
    source: Doc<"norms">["source"];
    manufacturerId?: Id<"manufacturers">;
    organizationId?: Id<"organizations">;
    code: string;
    title: string;
    unit: string;
    baseCode?: string;
    category?: string;
    includes?: string;
    excludes?: string;
    measurement?: string;
    resources: readonly NormResourceInput[];
    createdBy: Id<"users">;
    // Where Devize AI read it from, for a norm drafted from a data sheet.
    datasheetImportId?: Id<"datasheetImports">;
    sourcePages?: number[];
  },
): Promise<Id<"norms">> {
  const required = cleanRequired(args);
  const fields = {
    ...required,
    baseCode: trimmed(args.baseCode),
    category: trimmed(args.category),
    includes: trimmed(args.includes),
    excludes: trimmed(args.excludes),
    measurement: trimmed(args.measurement),
  };
  const normId = await ctx.db.insert("norms", {
    source: args.source,
    visibility: args.source === "organization" ? "private" : "public",
    manufacturerId: args.manufacturerId,
    organizationId: args.organizationId,
    ...fields,
    searchText: searchText(fields),
    version: 1,
    status: "draft",
    datasheetImportId: args.datasheetImportId,
    sourcePages: args.sourcePages,
    createdBy: args.createdBy,
    updatedAt: Date.now(),
  });
  await ctx.db.patch("norms", normId, { lineageId: normId });
  const norm = await ctx.db.get("norms", normId);
  if (norm) {
    await assertCodeFree(ctx, norm);
  }
  await writeNormResources(ctx, normId, args.resources, {
    organizationId: args.organizationId,
    createdBy: args.createdBy,
  });
  return normId;
}

/** Only drafts change; editing one in review takes it back to draft. */
async function requireDraft(ctx: MutationCtx, normId: Id<"norms">) {
  const { norm, userId } = await requireEditableNorm(ctx, normId);
  if (norm.status !== "draft" && norm.status !== "review") {
    throw appError("locked", norm.status);
  }
  return { norm, userId };
}

/**
 * Changes a draft's fields, and its resources too when they are given. An
 * empty optional field is cleared.
 */
export const update = mutation({
  args: {
    normId: v.id("norms"),
    code: v.optional(v.string()),
    title: v.optional(v.string()),
    unit: v.optional(v.string()),
    ...descriptiveFields,
    resources: v.optional(v.array(normResourceInput)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm, userId } = await requireDraft(ctx, args.normId);
    const required = cleanRequired({
      code: args.code ?? norm.code,
      title: args.title ?? norm.title,
      unit: args.unit ?? norm.unit,
    });
    const next = {
      ...required,
      baseCode:
        args.baseCode === undefined ? norm.baseCode : trimmed(args.baseCode),
      category:
        args.category === undefined ? norm.category : trimmed(args.category),
      includes:
        args.includes === undefined ? norm.includes : trimmed(args.includes),
      excludes:
        args.excludes === undefined ? norm.excludes : trimmed(args.excludes),
      measurement:
        args.measurement === undefined
          ? norm.measurement
          : trimmed(args.measurement),
    };
    await ctx.db.patch("norms", norm._id, {
      ...next,
      searchText: searchText(next),
      status: "draft",
      updatedAt: Date.now(),
    });
    if (next.code !== norm.code) {
      await assertCodeFree(ctx, { ...norm, code: next.code });
    }
    if (args.resources) {
      await writeNormResources(ctx, norm._id, args.resources, {
        organizationId: norm.organizationId,
        createdBy: userId,
      });
    }
    return null;
  },
});

export const setResources = mutation({
  args: {
    normId: v.id("norms"),
    resources: v.array(normResourceInput),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm, userId } = await requireDraft(ctx, args.normId);
    await writeNormResources(ctx, norm._id, args.resources, {
      organizationId: norm.organizationId,
      createdBy: userId,
    });
    await ctx.db.patch("norms", norm._id, {
      status: "draft",
      updatedAt: Date.now(),
    });
    return null;
  },
});

async function assertPublishable(ctx: QueryCtx, norm: Doc<"norms">) {
  const resources = await readNormResources(ctx, norm._id);
  if (resources.length === 0) {
    throw invalid("resources");
  }
  await assertCodeFree(ctx, norm);
}

/** Sends a producer or base norm to the Devize team for verification. */
export const submit = mutation({
  args: { normId: v.id("norms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm } = await requireEditableNorm(ctx, args.normId);
    if (norm.visibility !== "public") {
      throw invalid("visibility");
    }
    if (norm.status !== "draft") {
      throw appError("locked", norm.status);
    }
    await assertPublishable(ctx, norm);
    await ctx.db.patch("norms", norm._id, {
      status: "review",
      reviewNote: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Publishes a norm version and supersedes the version it replaces. A firm
 * publishes its own norms; public norms are verified and published by a super
 * admin, which earns them the verified badge.
 */
export const publish = mutation({
  args: { normId: v.id("norms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm, userId } = await requireEditableNorm(ctx, args.normId);
    if (norm.visibility === "public") {
      await requireSuperAdmin(ctx);
    }
    await publishDraft(ctx, norm, userId);
    return null;
  },
});

/**
 * Publishes a draft (or a norm in review) and supersedes the version it
 * replaces, once the caller checked who may publish in that catalog.
 */
export async function publishDraft(
  ctx: MutationCtx,
  norm: Doc<"norms">,
  userId: Id<"users">,
) {
  if (norm.status !== "draft" && norm.status !== "review") {
    throw appError("locked", norm.status);
  }
  await assertPublishable(ctx, norm);
  const now = Date.now();
  for (const version of await versionsOf(ctx, norm)) {
    if (version._id !== norm._id && version.status === "published") {
      await ctx.db.patch("norms", version._id, {
        status: "superseded",
        updatedAt: now,
      });
    }
  }
  await ctx.db.patch("norms", norm._id, {
    status: "published",
    publishedAt: now,
    reviewNote: undefined,
    ...(norm.visibility === "public"
      ? { verifiedBy: userId, verifiedAt: now }
      : {}),
    updatedAt: now,
  });
}

/** Sends a norm in review back to its author with a note. */
export const reject = mutation({
  args: { normId: v.id("norms"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const norm = await ctx.db.get("norms", args.normId);
    if (!norm) {
      throw notFound("norm");
    }
    if (norm.status !== "review") {
      throw appError("locked", norm.status);
    }
    const note = args.note.trim();
    if (note.length > 1000) {
      throw invalid("length");
    }
    await ctx.db.patch("norms", norm._id, {
      status: "draft",
      reviewNote: note || undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Opens a new draft version of a published norm, a copy to edit. Returns the
 * lineage's draft instead when one is already open.
 */
export const createVersion = mutation({
  args: { normId: v.id("norms") },
  returns: v.id("norms"),
  handler: async (ctx, args) => {
    const { norm, userId } = await requireEditableNorm(ctx, args.normId);
    const versions = await versionsOf(ctx, norm);
    const open = versions.find(
      (version) => version.status === "draft" || version.status === "review",
    );
    if (open) {
      return open._id;
    }
    const newest = versions[0] ?? norm;
    const {
      _id,
      _creationTime,
      status,
      reviewNote,
      verifiedBy,
      verifiedAt,
      confirmedBy,
      confirmedAt,
      publishedAt,
      importedNormId,
      ...copied
    } = newest;
    const normId = await ctx.db.insert("norms", {
      ...copied,
      lineageId: lineageOf(newest),
      version: newest.version + 1,
      status: "draft",
      createdBy: userId,
      updatedAt: Date.now(),
    });
    for (const row of await readNormResources(ctx, newest._id)) {
      const { _id: rowId, _creationTime: rowTime, ...resource } = row;
      await ctx.db.insert("normResources", { ...resource, normId });
    }
    return normId;
  },
});

/**
 * The producer confirms that a published norm of theirs matches their own
 * documents. Devize publishes producers' norms after a super admin checks the
 * transcription; only someone from the producer's own firm can confirm one,
 * and each new version needs confirming again.
 */
export const confirm = mutation({
  args: { normId: v.id("norms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const norm = await requireReadableNorm(ctx, args.normId);
    const userId = await requireUserId(ctx);
    if (norm.source !== "manufacturer" || !norm.manufacturerId) {
      throw invalid("source");
    }
    if (!(await isProducer(ctx, norm.manufacturerId, userId))) {
      throw forbidden();
    }
    if (norm.status !== "published") {
      throw appError("locked", norm.status);
    }
    if (norm.confirmedAt === undefined) {
      await ctx.db.patch("norms", norm._id, {
        confirmedBy: userId,
        confirmedAt: Date.now(),
      });
    }
    return null;
  },
});

/** Takes a norm out of the catalog. Devize that used it keep their copy. */
export const archive = mutation({
  args: { normId: v.id("norms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm } = await requireEditableNorm(ctx, args.normId);
    await ctx.db.patch("norms", norm._id, {
      status: "archived",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Deletes a draft that was never published. */
export const removeDraft = mutation({
  args: { normId: v.id("norms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm } = await requireDraft(ctx, args.normId);
    for (const row of await readNormResources(ctx, norm._id)) {
      await ctx.db.delete("normResources", row._id);
    }
    await ctx.db.delete("norms", norm._id);
    return null;
  },
});

/**
 * Copies a norm into a firm's own catalog as a draft, to adjust its
 * consumptions or prices to the firm's work. The copy keeps the code, or takes
 * the first free "-2", "-3"… after it when the firm already uses that code.
 */
export const copyToOrganization = mutation({
  args: {
    normId: v.id("norms"),
    organizationId: v.id("organizations"),
  },
  returns: v.id("norms"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const original = await requireReadableNorm(ctx, args.normId);
    const scope = {
      source: "organization" as const,
      organizationId: args.organizationId,
    };
    const fields = {
      code: await freeCode(ctx, scope, original.code),
      title: original.title,
      unit: original.unit,
      baseCode: original.baseCode,
      category: original.category,
      includes: original.includes,
      excludes: original.excludes,
      measurement: original.measurement,
    };
    const normId = await ctx.db.insert("norms", {
      ...scope,
      visibility: "private",
      ...fields,
      searchText: searchText(fields),
      version: 1,
      status: "draft",
      copiedFromId: original._id,
      createdBy: userId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("norms", normId, { lineageId: normId });
    const resources: NormResourceInput[] = [];
    for (const row of await readNormResources(ctx, original._id)) {
      // Another firm's own resource is matched by name in this firm instead.
      const linked = row.resourceId
        ? await ctx.db.get("resources", row.resourceId)
        : null;
      const usable =
        linked !== null &&
        (linked.organizationId === undefined ||
          linked.organizationId === args.organizationId);
      const product = row.productId
        ? await ctx.db.get("products", row.productId)
        : null;
      resources.push({
        kind: row.kind,
        name: row.name,
        unit: row.unit,
        quantity: row.quantity,
        resourceId: usable ? linked._id : undefined,
        productId:
          product && product.status !== "archived" ? product._id : undefined,
        referencePrice: row.referencePrice,
        note: row.note,
      });
    }
    await writeNormResources(ctx, normId, resources, {
      organizationId: args.organizationId,
      createdBy: userId,
    });
    return normId;
  },
});

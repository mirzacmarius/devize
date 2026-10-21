import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  requireManufacturerEditor,
  requireMember,
  requireUserId,
} from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { requireSuperAdmin } from "../lib/roles";
import { normalizeText, normalizeUnit } from "../lib/text";
import {
  canEditNorm,
  requireEditableNorm,
  requireReadableNorm,
} from "./access";
import { writeNormResources } from "./resourceRows";
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

function sameScope(a: Doc<"norms">, b: Doc<"norms">) {
  return (
    a.source === b.source &&
    a.manufacturerId === b.manufacturerId &&
    a.organizationId === b.organizationId
  );
}

/** A code names one norm in its catalog: Devize's, a producer's or a firm's. */
async function assertCodeFree(ctx: QueryCtx, norm: Doc<"norms">) {
  const sameCode = ctx.db
    .query("norms")
    .withIndex("by_code", (q) => q.eq("code", norm.code));
  for await (const other of sameCode) {
    if (
      lineageOf(other) !== lineageOf(norm) &&
      sameScope(other, norm) &&
      other.status !== "archived"
    ) {
      throw appError("in_use", "code");
    }
  }
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
    edition: norm.edition,
  }));
}

/**
 * Published norms a firm can put in a Deviz that match the words typed, its own
 * first. Words are matched without diacritics, the last one as a prefix.
 */
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    text: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const text = normalizeText(args.text);
    if (!text) {
      return [];
    }
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 50);
    const own = await ctx.db
      .query("norms")
      .withSearchIndex("search_searchText", (q) => {
        const scoped = q
          .search("searchText", text)
          .eq("organizationId", args.organizationId)
          .eq("status", "published");
        return args.category ? scoped.eq("category", args.category) : scoped;
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
    return await summaries(ctx, [...own, ...shared].slice(0, limit));
  },
});

/** The published public catalog, or one Producător's part of it. */
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
          .withIndex("by_manufacturerId_and_status", (q) =>
            q.eq("manufacturerId", manufacturerId).eq("status", "published"),
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("norms")
          .withIndex("by_visibility_and_status", (q) =>
            q.eq("visibility", "public").eq("status", "published"),
          )
          .paginate(args.paginationOpts);
    return { ...result, page: await summaries(ctx, result.page) };
  },
});

/** A firm's private norms in one status. */
export const listForOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(normStatus),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const norms = await ctx.db
      .query("norms")
      .withIndex("by_organizationId_and_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", args.status ?? "published"),
      )
      .take(500);
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
      .withIndex("by_visibility_and_status", (q) =>
        q.eq("visibility", "public").eq("status", "review"),
      )
      .take(200);
    return await summaries(ctx, norms);
  },
});

/** A norm version with its resources and the newest published version. */
export const get = query({
  args: { normId: v.id("norms") },
  handler: async (ctx, args) => {
    const norm = await requireReadableNorm(ctx, args.normId);
    const [summary] = await summaries(ctx, [norm]);
    const latest = await latestPublishedVersion(ctx, norm);
    return {
      ...norm,
      manufacturerName: summary?.manufacturerName,
      resources: await readNormResources(ctx, norm._id),
      canEdit: await canEditNorm(ctx, norm),
      latestVersionId:
        latest && latest._id !== norm._id ? latest._id : undefined,
    };
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
      ...scope,
      ...fields,
      searchText: searchText(fields),
      version: 1,
      status: "draft",
      createdBy: userId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("norms", normId, { lineageId: normId });
    const norm = await ctx.db.get("norms", normId);
    if (norm) {
      await assertCodeFree(ctx, norm);
    }
    await writeNormResources(ctx, normId, args.resources, {
      organizationId: scope.organizationId,
      createdBy: userId,
    });
    return normId;
  },
});

/** Only drafts change; editing one in review takes it back to draft. */
async function requireDraft(ctx: MutationCtx, normId: Id<"norms">) {
  const { norm, userId } = await requireEditableNorm(ctx, normId);
  if (norm.status !== "draft" && norm.status !== "review") {
    throw appError("locked", norm.status);
  }
  return { norm, userId };
}

export const update = mutation({
  args: {
    normId: v.id("norms"),
    code: v.optional(v.string()),
    title: v.optional(v.string()),
    unit: v.optional(v.string()),
    ...descriptiveFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { norm } = await requireDraft(ctx, args.normId);
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
    return null;
  },
});

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
    await ctx.db.patch("norms", norm._id, {
      status: "draft",
      reviewNote: args.note.trim() || undefined,
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

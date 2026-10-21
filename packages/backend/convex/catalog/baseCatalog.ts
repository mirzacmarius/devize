import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireSuperAdmin } from "../lib/roles";
import { normalizeText, normalizeUnit } from "../lib/text";
import { BASE_EDITION, type BaseNorm, baseNorms } from "./baseNorms";
import { readNormResources, versionsOf } from "./norms";
import { findOrCreateResource, type NormResourceInput } from "./resourceRows";

// Publishing Devize's own catalog of Norme de bază, which ships with the code
// (catalog/baseNorms.ts, docs/adr/0012). A norm is new until a version of it
// is published, changed when its published version differs from the code, and
// unchanged otherwise.

type State = "new" | "changed" | "unchanged";

const state = v.union(
  v.literal("new"),
  v.literal("changed"),
  v.literal("unchanged"),
);

const statusRow = v.object({
  code: v.string(),
  title: v.string(),
  category: v.string(),
  unit: v.string(),
  state,
  // The version published now, if any.
  normId: v.optional(v.id("norms")),
  version: v.optional(v.number()),
});

// Norms one transaction publishes; the rest follow in the background.
const BATCH = 20;

/**
 * Every version of the base norm with this code, newest first: the lineage
 * that has a published version, else the newest lineage that used the code.
 */
async function baseVersions(
  ctx: QueryCtx,
  code: string,
): Promise<Doc<"norms">[]> {
  const seen = new Set<Id<"norms">>();
  let fallback: Doc<"norms">[] = [];
  const sameCode = ctx.db
    .query("norms")
    .withIndex("by_code", (q) => q.eq("code", code));
  for await (const norm of sameCode) {
    const lineageId = norm.lineageId ?? norm._id;
    if (norm.source !== "base" || seen.has(lineageId)) {
      continue;
    }
    seen.add(lineageId);
    const versions = await versionsOf(ctx, norm);
    if (versions.some((version) => version.status === "published")) {
      return versions;
    }
    fallback = versions;
  }
  return fallback;
}

function sameResource(row: Doc<"normResources">, resource: NormResourceInput) {
  return (
    row.kind === resource.kind &&
    row.name === resource.name &&
    row.unit === normalizeUnit(resource.unit) &&
    row.quantity === resource.quantity &&
    row.referencePrice === resource.referencePrice &&
    row.productId === undefined &&
    row.note === resource.note
  );
}

/** Whether a published version says what the code says. */
function sameNorm(
  published: Doc<"norms">,
  rows: readonly Doc<"normResources">[],
  norm: BaseNorm,
) {
  return (
    published.title === norm.title &&
    published.unit === normalizeUnit(norm.unit) &&
    published.category === norm.category &&
    published.includes === norm.includes &&
    published.excludes === norm.excludes &&
    published.measurement === norm.measurement &&
    rows.length === norm.resources.length &&
    rows.every((row, index) => {
      const resource = norm.resources[index];
      return resource !== undefined && sameResource(row, resource);
    })
  );
}

async function compare(ctx: QueryCtx, norm: BaseNorm) {
  const versions = await baseVersions(ctx, norm.code);
  const published =
    versions.find((version) => version.status === "published") ?? null;
  let current: State = "new";
  if (published) {
    const rows = await readNormResources(ctx, published._id);
    current = sameNorm(published, rows, norm) ? "unchanged" : "changed";
  }
  return { state: current, versions, published };
}

/**
 * The shared catalog resource a base norm consumes. Its reference price comes
 * from the base catalog unless it already has one.
 */
async function catalogResource(
  ctx: MutationCtx,
  resource: NormResourceInput,
  adminId: Id<"users">,
): Promise<Id<"resources">> {
  const resourceId = await findOrCreateResource(ctx, {
    kind: resource.kind,
    name: resource.name,
    unit: resource.unit,
    referencePrice: resource.referencePrice,
    createdBy: adminId,
  });
  if (resource.referencePrice !== undefined) {
    const row = await ctx.db.get("resources", resourceId);
    if (row && row.referencePrice === undefined) {
      await ctx.db.patch("resources", resourceId, {
        referencePrice: resource.referencePrice,
      });
    }
  }
  return resourceId;
}

/**
 * Publishes one norm of the code as a verified Normă de bază, as a new version
 * of the published one when it changed. Returns whether it published.
 */
async function publishNorm(
  ctx: MutationCtx,
  norm: BaseNorm,
  adminId: Id<"users">,
  now: number,
): Promise<boolean> {
  const { state: current, versions } = await compare(ctx, norm);
  if (current === "unchanged") {
    return false;
  }
  const newest = versions[0];
  const normId = await ctx.db.insert("norms", {
    source: "base",
    visibility: "public",
    code: norm.code,
    title: norm.title,
    unit: normalizeUnit(norm.unit),
    category: norm.category,
    includes: norm.includes,
    excludes: norm.excludes,
    measurement: norm.measurement,
    searchText: normalizeText(`${norm.code} ${norm.title}`),
    version: (newest?.version ?? 0) + 1,
    lineageId: newest ? (newest.lineageId ?? newest._id) : undefined,
    status: "published",
    verifiedBy: adminId,
    verifiedAt: now,
    publishedAt: now,
    edition: BASE_EDITION,
    createdBy: adminId,
    updatedAt: now,
  });
  if (!newest) {
    await ctx.db.patch("norms", normId, { lineageId: normId });
  }
  for (const version of versions) {
    if (version.status === "published") {
      await ctx.db.patch("norms", version._id, {
        status: "superseded",
        updatedAt: now,
      });
    }
  }
  for (const [position, resource] of norm.resources.entries()) {
    await ctx.db.insert("normResources", {
      normId,
      position,
      kind: resource.kind,
      resourceId: await catalogResource(ctx, resource, adminId),
      name: resource.name,
      unit: normalizeUnit(resource.unit),
      quantity: resource.quantity,
      referencePrice: resource.referencePrice,
      note: resource.note,
    });
  }
  return true;
}

async function publishFrom(
  ctx: MutationCtx,
  adminId: Id<"users">,
  start: number,
) {
  const now = Date.now();
  for (const norm of baseNorms.slice(start, start + BATCH)) {
    await publishNorm(ctx, norm, adminId, now);
  }
  if (start + BATCH < baseNorms.length) {
    await ctx.scheduler.runAfter(0, internal.catalog.baseCatalog.publishBatch, {
      adminId,
      start: start + BATCH,
    });
  }
}

/** The code's edition of the base catalog, and what publishing would change. */
export const status = query({
  args: {},
  returns: v.object({ edition: v.string(), norms: v.array(statusRow) }),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const norms: Infer<typeof statusRow>[] = [];
    for (const norm of baseNorms) {
      const { state: current, published } = await compare(ctx, norm);
      norms.push({
        code: norm.code,
        title: norm.title,
        category: norm.category,
        unit: normalizeUnit(norm.unit),
        state: current,
        normId: published?._id,
        version: published?.version,
      });
    }
    return { edition: BASE_EDITION, norms };
  },
});

/**
 * Publishes the base catalog's new and changed norms as verified Norme de
 * bază: the first batch right away, the rest in the background.
 */
export const publish = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const admin = await requireSuperAdmin(ctx);
    await publishFrom(ctx, admin._id, 0);
    return null;
  },
});

/** Publishes the next batch of the base catalog, then schedules the rest. */
export const publishBatch = internalMutation({
  args: { adminId: v.id("users"), start: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get("users", args.adminId);
    // Someone who is no longer a super admin publishes nothing more.
    if (admin?.role !== "superadmin") {
      return null;
    }
    await publishFrom(ctx, admin._id, args.start);
    return null;
  },
});

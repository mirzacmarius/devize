import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { invalid, notFound } from "../lib/errors";
import { requireSuperAdmin } from "../lib/roles";
import { normalizeText, normalizeUnit } from "../lib/text";
import { readNormResources, versionsOf } from "./norms";
import { findOrCreateResource } from "./resourceRows";

type ImportedResource = Doc<"importedNorms">["resources"][number];

function sameResources(
  current: readonly Doc<"normResources">[],
  imported: readonly ImportedResource[],
) {
  return (
    current.length === imported.length &&
    current.every((row, index) => {
      const other = imported[index];
      return (
        other !== undefined &&
        row.kind === other.kind &&
        row.name === other.name.trim() &&
        row.unit === normalizeUnit(other.unit) &&
        row.quantity === other.quantity &&
        row.referencePrice === other.unitPrice
      );
    })
  );
}

/** The published norm of this Producător with this code, if any. */
async function publishedWithCode(
  ctx: MutationCtx,
  manufacturerId: Id<"manufacturers">,
  code: string,
) {
  const sameCode = ctx.db
    .query("norms")
    .withIndex("by_code", (q) => q.eq("code", code));
  for await (const norm of sameCode) {
    if (
      norm.source === "manufacturer" &&
      norm.manufacturerId === manufacturerId &&
      norm.status === "published"
    ) {
      return norm;
    }
  }
  return null;
}

/**
 * Publishes the approved rows of a norms document into the public catalog as
 * verified Norme de producător, one article (base code) or all of them. A row
 * already published is skipped; a changed row with a code already in the
 * catalog becomes that norm's new version.
 */
export const publishImportedNorms = mutation({
  args: {
    normImportId: v.id("normImports"),
    baseCode: v.optional(v.string()),
  },
  returns: v.object({ published: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const normImport = await ctx.db.get("normImports", args.normImportId);
    if (!normImport) {
      throw notFound("normImport");
    }
    const baseCode = args.baseCode;
    const rows = await ctx.db
      .query("importedNorms")
      .withIndex("by_normImportId_and_baseCode", (q) =>
        baseCode
          ? q.eq("normImportId", normImport._id).eq("baseCode", baseCode)
          : q.eq("normImportId", normImport._id),
      )
      .take(500);
    let published = 0;
    let skipped = 0;
    const now = Date.now();
    for (const row of rows) {
      if (row.status !== "approved") {
        continue;
      }
      const alreadyPublished = await ctx.db
        .query("norms")
        .withIndex("by_importedNormId", (q) => q.eq("importedNormId", row._id))
        .first();
      if (alreadyPublished) {
        skipped++;
        continue;
      }
      const unit = normalizeUnit(row.unit);
      if (!unit || unit === "%" || row.resources.length === 0) {
        throw invalid(`importedNorm.${row.code}`);
      }
      const previous = await publishedWithCode(
        ctx,
        row.manufacturerId,
        row.code,
      );
      if (
        previous &&
        previous.title === row.title &&
        sameResources(await readNormResources(ctx, previous._id), row.resources)
      ) {
        skipped++;
        continue;
      }
      const [newest] = previous ? await versionsOf(ctx, previous) : [];
      const title = row.title.trim();
      const normId = await ctx.db.insert("norms", {
        source: "manufacturer",
        visibility: "public",
        manufacturerId: row.manufacturerId,
        code: row.code,
        baseCode: row.baseCode,
        title,
        unit,
        includes: row.includes,
        excludes: row.excludes,
        searchText: normalizeText(`${row.code} ${row.baseCode} ${title}`),
        version: (newest?.version ?? 0) + 1,
        lineageId: previous ? (previous.lineageId ?? previous._id) : undefined,
        status: "published",
        verifiedBy: admin._id,
        verifiedAt: now,
        publishedAt: now,
        importedNormId: row._id,
        edition: normImport.edition,
        sourcePages: row.pages,
        createdBy: admin._id,
        updatedAt: now,
      });
      if (!previous) {
        await ctx.db.patch("norms", normId, { lineageId: normId });
      } else {
        await ctx.db.patch("norms", previous._id, {
          status: "superseded",
          updatedAt: now,
        });
      }
      for (const [position, resource] of row.resources.entries()) {
        const resourceId = await findOrCreateResource(ctx, {
          kind: resource.kind,
          name: resource.name,
          unit: resource.unit,
          createdBy: admin._id,
        });
        await ctx.db.insert("normResources", {
          normId,
          position,
          kind: resource.kind,
          resourceId,
          name: resource.name.trim(),
          unit: normalizeUnit(resource.unit),
          quantity: resource.quantity,
          referencePrice: resource.unitPrice,
        });
      }
      published++;
    }
    return { published, skipped };
  },
});

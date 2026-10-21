import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { invalid } from "../lib/errors";
import { normalizeText, normalizeUnit } from "../lib/text";
import type { resourceKind } from "../manufacturers/validators";
import type { normResourceInput } from "./validators";

type ResourceKind = Infer<typeof resourceKind>;

/**
 * The catalog resource with this kind, name and unit, created when there is
 * none. A firm's resources are looked up among its own, the shared catalog's
 * among the shared ones.
 */
export async function findOrCreateResource(
  ctx: MutationCtx,
  fields: {
    kind: ResourceKind;
    name: string;
    unit: string;
    organizationId?: Id<"organizations">;
    referencePrice?: number;
    createdBy?: Id<"users">;
  },
): Promise<Id<"resources">> {
  const name = fields.name.trim();
  const nameKey = normalizeText(name);
  const unit = normalizeUnit(fields.unit);
  if (!nameKey || !unit) {
    throw invalid("resource");
  }
  const matches = ctx.db
    .query("resources")
    .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
      q
        .eq("organizationId", fields.organizationId)
        .eq("kind", fields.kind)
        .eq("nameKey", nameKey),
    );
  for await (const resource of matches) {
    if (resource.unit === unit) {
      return resource._id;
    }
  }
  return await ctx.db.insert("resources", {
    kind: fields.kind,
    name,
    nameKey,
    unit,
    visibility: fields.organizationId ? "private" : "public",
    organizationId: fields.organizationId,
    referencePrice: fields.referencePrice,
    createdBy: fields.createdBy,
  });
}

export type NormResourceInput = Infer<typeof normResourceInput>;

/** Checks a norm's resources before they are saved. */
export function validateResources(resources: readonly NormResourceInput[]) {
  if (resources.length > 200) {
    throw invalid("resources");
  }
  for (const resource of resources) {
    if (!resource.name.trim()) {
      throw invalid("resource.name");
    }
    if (!normalizeUnit(resource.unit)) {
      throw invalid("resource.unit");
    }
    if (!Number.isFinite(resource.quantity) || resource.quantity < 0) {
      throw invalid("resource.quantity");
    }
    if (
      resource.referencePrice !== undefined &&
      (!Number.isFinite(resource.referencePrice) || resource.referencePrice < 0)
    ) {
      throw invalid("resource.referencePrice");
    }
  }
}

/**
 * Replaces a norm version's resources. Each row links to a catalog resource,
 * found or created from its name, so firms price it once for every norm.
 */
export async function writeNormResources(
  ctx: MutationCtx,
  normId: Id<"norms">,
  resources: readonly NormResourceInput[],
  scope: { organizationId?: Id<"organizations">; createdBy: Id<"users"> },
) {
  validateResources(resources);
  const existing = ctx.db
    .query("normResources")
    .withIndex("by_normId_and_position", (q) => q.eq("normId", normId));
  for await (const row of existing) {
    await ctx.db.delete("normResources", row._id);
  }
  for (const [position, resource] of resources.entries()) {
    let resourceId = resource.resourceId;
    if (resourceId) {
      const linked = await ctx.db.get("resources", resourceId);
      // A firm may use the shared catalog's resources and its own, never
      // another firm's.
      if (
        !linked ||
        (linked.organizationId !== undefined &&
          linked.organizationId !== scope.organizationId)
      ) {
        throw invalid("resource.resourceId");
      }
    } else {
      resourceId = await findOrCreateResource(ctx, {
        kind: resource.kind,
        name: resource.name,
        unit: resource.unit,
        organizationId: scope.organizationId,
        createdBy: scope.createdBy,
      });
    }
    if (resource.productId) {
      const product = await ctx.db.get("products", resource.productId);
      if (!product || product.status === "archived") {
        throw invalid("resource.productId");
      }
    }
    await ctx.db.insert("normResources", {
      normId,
      position,
      kind: resource.kind,
      resourceId,
      productId: resource.productId,
      name: resource.name.trim(),
      unit: normalizeUnit(resource.unit),
      quantity: resource.quantity,
      referencePrice: resource.referencePrice,
      note: resource.note,
    });
  }
}

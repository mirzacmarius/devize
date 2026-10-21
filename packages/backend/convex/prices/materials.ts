import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canEditManufacturer } from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import { unitsPerSale } from "./units";

/** A material a firm prices: a catalog product, or a generic resource. */
export type Material =
  | { productId: Id<"products">; resourceId?: undefined }
  | { resourceId: Id<"resources">; productId?: undefined };

/** Exactly one of a product or a resource, as functions receive them. */
export function materialOf(args: {
  productId?: Id<"products">;
  resourceId?: Id<"resources">;
}): Material {
  if (args.productId && !args.resourceId) {
    return { productId: args.productId };
  }
  if (args.resourceId && !args.productId) {
    return { resourceId: args.resourceId };
  }
  throw invalid("productId");
}

/**
 * The name and unit of a material the firm may price: a published product (or
 * one the user may edit), a shared material resource or the firm's own.
 * Anything else is reported as missing.
 */
export async function requireMaterial(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  material: Material,
): Promise<{ name: string; unit: string }> {
  if (material.productId) {
    const product = await ctx.db.get("products", material.productId);
    if (
      !product ||
      (product.status !== "published" &&
        !(await canEditManufacturer(ctx, product.manufacturerId)))
    ) {
      throw notFound("product");
    }
    return { name: product.name, unit: product.unit };
  }
  const resource = material.resourceId
    ? await ctx.db.get("resources", material.resourceId)
    : null;
  if (
    resource?.kind !== "material" ||
    (resource.organizationId !== undefined &&
      resource.organizationId !== organizationId)
  ) {
    throw notFound("resource");
  }
  return { name: resource.name, unit: resource.unit };
}

/**
 * How many of the material's units one item of a store listing holds, as
 * Devize guesses it: the match a listing has to the product, else what its
 * title says, else 1.
 */
export function guessUnits(
  listing: Doc<"listings">,
  material: Material,
  unit: string,
): number {
  if (material.productId && listing.productId === material.productId) {
    return listing.unitsPerSale;
  }
  return unitsPerSale(listing.title, unit) ?? 1;
}

/** The firm's choices for a material, one per store at most. */
export async function choicesFor(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  material: Material,
): Promise<Doc<"storeChoices">[]> {
  return material.productId
    ? await ctx.db
        .query("storeChoices")
        .withIndex("by_organizationId_and_productId", (q) =>
          q
            .eq("organizationId", organizationId)
            .eq("productId", material.productId),
        )
        .take(20)
    : await ctx.db
        .query("storeChoices")
        .withIndex("by_organizationId_and_resourceId", (q) =>
          q
            .eq("organizationId", organizationId)
            .eq("resourceId", material.resourceId),
        )
        .take(20);
}

/**
 * Makes `listingId` the firm's product for a material at the listing's store,
 * replacing the one chosen there before. Keeps a conversion a person checked
 * while the listing stays the same.
 */
export async function choose(
  ctx: MutationCtx,
  fields: {
    organizationId: Id<"organizations">;
    material: Material;
    listing: Doc<"listings">;
    unitsPerSale: number;
    unitsChecked: boolean;
    userId: Id<"users">;
  },
): Promise<Id<"storeChoices">> {
  const { organizationId, material, listing } = fields;
  const store = listing.store;
  if (!store) {
    throw invalid("store");
  }
  const existing = (await choicesFor(ctx, organizationId, material)).find(
    (choice) => choice.store === store,
  );
  const now = Date.now();
  if (existing) {
    const keep =
      existing.listingId === listing._id &&
      existing.unitsChecked &&
      !fields.unitsChecked;
    await ctx.db.patch("storeChoices", existing._id, {
      listingId: listing._id,
      unitsPerSale: keep ? existing.unitsPerSale : fields.unitsPerSale,
      unitsChecked: keep || fields.unitsChecked,
      updatedAt: now,
    });
    return existing._id;
  }
  return await ctx.db.insert("storeChoices", {
    organizationId,
    store,
    productId: material.productId,
    resourceId: material.resourceId,
    listingId: listing._id,
    unitsPerSale: fields.unitsPerSale,
    unitsChecked: fields.unitsChecked,
    createdBy: fields.userId,
    updatedAt: now,
  });
}

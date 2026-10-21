import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  canEditManufacturer,
  getMembership,
  requireUserId,
} from "../lib/access";
import { forbidden, notFound } from "../lib/errors";
import { getSuperAdmin } from "../lib/roles";

/**
 * Who may change a norm: super admins for the base catalog, the Producător's
 * firm (or a super admin) for its norms, and the owning firm's members for a
 * private norm.
 */
export async function canEditNorm(
  ctx: QueryCtx,
  norm: Pick<Doc<"norms">, "source" | "manufacturerId" | "organizationId">,
): Promise<boolean> {
  const userId = await requireUserId(ctx);
  switch (norm.source) {
    case "base":
      return (await getSuperAdmin(ctx)) !== null;
    case "manufacturer":
      return norm.manufacturerId
        ? await canEditManufacturer(ctx, norm.manufacturerId)
        : false;
    case "organization":
      return norm.organizationId
        ? (await getMembership(ctx, norm.organizationId, userId)) !== null
        : false;
  }
}

/**
 * Whether the signed-in user may read a norm. Published public norms, and the
 * versions they superseded, are for every signed-in user; everything else only
 * for those who may edit it.
 */
export async function canReadNorm(
  ctx: QueryCtx,
  norm: Doc<"norms">,
): Promise<boolean> {
  await requireUserId(ctx);
  if (
    norm.visibility === "public" &&
    (norm.status === "published" || norm.status === "superseded")
  ) {
    return true;
  }
  return await canEditNorm(ctx, norm);
}

export async function requireReadableNorm(
  ctx: QueryCtx,
  normId: Id<"norms">,
): Promise<Doc<"norms">> {
  const norm = await ctx.db.get("norms", normId);
  if (!norm || !(await canReadNorm(ctx, norm))) {
    throw notFound("norm");
  }
  return norm;
}

export async function requireEditableNorm(
  ctx: QueryCtx,
  normId: Id<"norms">,
): Promise<{ norm: Doc<"norms">; userId: Id<"users"> }> {
  const userId = await requireUserId(ctx);
  const norm = await ctx.db.get("norms", normId);
  if (!norm || !(await canReadNorm(ctx, norm))) {
    throw notFound("norm");
  }
  if (!(await canEditNorm(ctx, norm))) {
    throw forbidden("norm");
  }
  return { norm, userId };
}

/** Whether a norm may go into one firm's Deviz. */
export function isUsableBy(
  norm: Doc<"norms">,
  organizationId: Id<"organizations">,
): boolean {
  if (norm.status !== "published") {
    return false;
  }
  return norm.visibility === "public" || norm.organizationId === organizationId;
}

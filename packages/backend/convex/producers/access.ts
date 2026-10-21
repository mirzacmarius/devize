import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { normalizeEmail } from "../accounts/invitations";
import { requireUserId } from "../lib/access";
import { notFound } from "../lib/errors";

/**
 * The signed-in user, the address on their account and whether they proved
 * they own it. Google and an emailed code both prove it; only a verified
 * address counts towards claiming a profile.
 */
export async function viewerEmail(ctx: QueryCtx): Promise<{
  userId: Id<"users">;
  email: string | null;
  verified: string | null;
}> {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get("users", userId);
  const email = user?.email ? normalizeEmail(user.email) : null;
  return {
    userId,
    email,
    verified: user?.emailVerificationTime !== undefined ? email : null,
  };
}

/**
 * Whether a Producător's profile shows in the app: Devize published at least
 * one of its norms, which needs the producer's written consent, and it didn't
 * ask to be left out.
 */
export async function isVisible(
  ctx: QueryCtx,
  manufacturer: Doc<"manufacturers">,
): Promise<boolean> {
  if (manufacturer.status === "excluded") {
    return false;
  }
  const norm = await ctx.db
    .query("norms")
    .withIndex("by_manufacturerId_and_status_and_code", (q) =>
      q.eq("manufacturerId", manufacturer._id).eq("status", "published"),
    )
    .first();
  return norm !== null;
}

/** A profile the signed-in user can see, or `not_found`. */
export async function requireVisibleManufacturer(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
): Promise<Doc<"manufacturers">> {
  const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
  if (!manufacturer || !(await isVisible(ctx, manufacturer))) {
    throw notFound("manufacturer");
  }
  return manufacturer;
}

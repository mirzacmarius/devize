import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * The signed-in user when they are a Devize super admin, otherwise null.
 * Accepts a mutation context too.
 */
export async function getSuperAdmin(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  const user = await ctx.db.get("users", userId);
  return user?.role === "superadmin" ? user : null;
}

/**
 * The signed-in super admin. Throws `ConvexError({ code: "forbidden" })` for
 * anyone else, so every admin query and mutation starts with this call.
 * Actions check through an internal query or mutation instead.
 */
export async function requireSuperAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getSuperAdmin(ctx);
  if (!user) {
    throw new ConvexError({ code: "forbidden" });
  }
  return user;
}

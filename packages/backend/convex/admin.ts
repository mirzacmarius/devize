import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import { getSuperAdmin } from "./lib/roles";

/** What the signed-in user may see in the admin area. */
export const viewer = query({
  args: {},
  returns: v.object({ isSuperAdmin: v.boolean() }),
  handler: async (ctx) => ({
    isSuperAdmin: (await getSuperAdmin(ctx)) !== null,
  }),
});

async function findUserByEmail(ctx: MutationCtx, email: string) {
  const trimmed = email.trim();
  const exact = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", trimmed))
    .first();
  if (exact) {
    return exact;
  }
  const lower = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", trimmed.toLowerCase()))
    .first();
  if (!lower) {
    throw new Error(
      `No user signed in with ${trimmed} yet. Sign in once with Google, then run this again.`,
    );
  }
  return lower;
}

/**
 * Makes a user a super admin. Run it from the Convex dashboard or with
 * `bunx convex run admin:grantSuperAdmin '{"email":"you@example.com"}'`;
 * nobody can call it from the app.
 */
export const grantSuperAdmin = internalMutation({
  args: { email: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const user = await findUserByEmail(ctx, args.email);
    await ctx.db.patch("users", user._id, { role: "superadmin" });
    return user._id;
  },
});

export const revokeSuperAdmin = internalMutation({
  args: { email: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const user = await findUserByEmail(ctx, args.email);
    await ctx.db.patch("users", user._id, { role: undefined });
    return user._id;
  },
});

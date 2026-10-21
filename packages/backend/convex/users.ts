import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { username } from "./utils/validators";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }
    return {
      ...user,
      name: user.username || user.name,
      avatarUrl: user.imageId
        ? await ctx.storage.getUrl(user.imageId)
        : undefined,
    };
  },
});

export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const validatedUsername = username.safeParse(args.username);

    if (!validatedUsername.success) {
      throw new Error(validatedUsername.error.message);
    }
    await ctx.db.patch("users", userId, { username: validatedUsername.data });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateUserImage = mutation({
  args: {
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const user = await ctx.db.get("users", userId);
    if (user?.imageId && user.imageId !== args.imageId) {
      await ctx.storage.delete(user.imageId);
    }
    await ctx.db.patch("users", userId, { imageId: args.imageId });
  },
});

export const removeUserImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const user = await ctx.db.get("users", userId);
    if (user?.imageId) {
      await ctx.storage.delete(user.imageId);
    }
    await ctx.db.patch("users", userId, {
      imageId: undefined,
      image: undefined,
    });
  },
});

/**
 * Takes a user out of their firms. A firm left without members is deleted; a
 * firm left without an owner passes to its longest-standing admin, or member.
 */
async function leaveFirms(ctx: MutationCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  for (const membership of memberships) {
    const colleagues = (
      await ctx.db
        .query("memberships")
        .withIndex("by_organizationId_and_userId", (q) =>
          q.eq("organizationId", membership.organizationId),
        )
        .take(200)
    )
      .filter((other) => other._id !== membership._id)
      .sort((a, b) => a._creationTime - b._creationTime);
    await ctx.db.delete("memberships", membership._id);
    if (colleagues.length === 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.accounts.cleanup.deleteOrganization,
        { organizationId: membership.organizationId },
      );
      continue;
    }
    if (
      membership.role === "owner" &&
      !colleagues.some((other) => other.role === "owner")
    ) {
      const heir =
        colleagues.find((other) => other.role === "admin") ?? colleagues[0];
      if (heir) {
        await ctx.db.patch("memberships", heir._id, { role: "owner" });
      }
    }
  }
}

/**
 * Deletes the signed-in user with their sign-in accounts, sessions and avatar,
 * and takes them out of their firms. The client signs out afterwards.
 */
export const deleteCurrentUserAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const user = await ctx.db.get("users", userId);
    if (user?.imageId) {
      await ctx.storage.delete(user.imageId);
    }
    await leaveFirms(ctx, userId);
    const emails = await ctx.db
      .query("invitationEmails")
      .withIndex("by_userId_and_sentAt", (q) => q.eq("userId", userId))
      .take(100);
    for (const row of emails) {
      await ctx.db.delete("invitationEmails", row._id);
    }
    const accounts = ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId));
    for await (const account of accounts) {
      const codes = ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id));
      for await (const code of codes) {
        await ctx.db.delete("authVerificationCodes", code._id);
      }
      await ctx.db.delete("authAccounts", account._id);
    }
    const sessions = ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId));
    for await (const session of sessions) {
      const refreshTokens = ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id));
      for await (const token of refreshTokens) {
        await ctx.db.delete("authRefreshTokens", token._id);
      }
      await ctx.db.delete("authSessions", session._id);
    }
    await ctx.db.delete("users", userId);
  },
});

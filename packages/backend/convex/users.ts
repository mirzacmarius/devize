import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
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
 * Deletes the signed-in user with their sign-in accounts, sessions and avatar.
 * The client signs out afterwards.
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

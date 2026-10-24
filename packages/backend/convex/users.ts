import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { unclaimedUpload } from "./accounts/files";
import { EMAIL_CODE_PROVIDER } from "./emailSignIn";
import { numberedInvoiceCount } from "./invoices/archive";
import { appError, invalid } from "./lib/errors";
import { forgetSender } from "./manufacturers/outreach";
import { forgetClaimant } from "./producers/claims";
import { forgetContact } from "./producers/details";
import { forgetAddress } from "./signInLeftovers";
import { username } from "./utils/validators";

// A photo for the account menu: a picture every browser shows, and not a big
// one.
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

/**
 * Sets the account's photo to a picture just uploaded, deleting the one it
 * replaces. Only a fresh upload qualifies, so nobody can show, then delete,
 * someone else's file by its id.
 */
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
    if (user?.imageId === args.imageId) {
      return;
    }
    const stored = await unclaimedUpload(ctx, args.imageId);
    if (
      !AVATAR_TYPES.includes(stored.contentType ?? "") ||
      stored.size > MAX_AVATAR_BYTES
    ) {
      throw invalid("avatar");
    }
    if (user?.imageId) {
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

/** The firms the user is the only member of, which go with their account. */
async function soleFirms(ctx: QueryCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  const firms = [];
  for (const membership of memberships) {
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_organizationId_and_userId", (q) =>
        q.eq("organizationId", membership.organizationId),
      )
      .take(2);
    if (members.some((other) => other._id !== membership._id)) {
      continue;
    }
    const firm = await ctx.db.get("organizations", membership.organizationId);
    if (firm) {
      firms.push(firm);
    }
  }
  return firms;
}

// Invoices are counted up to one past this, for "peste 100".
const INVOICES_COUNTED = 100;

/**
 * What deleting the account takes with it: the firms the user is the only
 * member of, each with how many numbered invoices it has, so the warning can
 * name them and offer their archive first (ADR 0050).
 */
export const deletionPreview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const firms = await soleFirms(ctx, userId);
    const preview = [];
    for (const firm of firms) {
      preview.push({
        _id: firm._id,
        name: firm.name,
        invoices: await numberedInvoiceCount(
          ctx,
          firm._id,
          INVOICES_COUNTED + 1,
        ),
      });
    }
    return preview;
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
 * takes them out of their firms and forgets them on producers' profiles. A
 * firm left without members goes too, with its invoices only once the person
 * confirms. The client signs out afterwards.
 */
export const deleteCurrentUserAccount = mutation({
  args: {
    // The person read that their firm's invoices go too, and was offered
    // the archive (ADR 0050).
    deleteInvoices: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    if (!args.deleteInvoices) {
      for (const firm of await soleFirms(ctx, userId)) {
        if ((await numberedInvoiceCount(ctx, firm._id, 1)) > 0) {
          throw appError("in_use", "firmInvoices");
        }
      }
    }
    const user = await ctx.db.get("users", userId);
    if (user?.imageId) {
      await ctx.storage.delete(user.imageId);
    }
    await leaveFirms(ctx, userId);
    await forgetClaimant(ctx, userId);
    await forgetContact(ctx, userId);
    const emails = await ctx.db
      .query("invitationEmails")
      .withIndex("by_userId_and_sentAt", (q) => q.eq("userId", userId))
      .take(100);
    for (const row of emails) {
      await ctx.db.delete("invitationEmails", row._id);
    }
    // The codes sent to the account's addresses, and the wrong ones typed.
    const addresses = new Set(user?.email === undefined ? [] : [user.email]);
    const codeAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", EMAIL_CODE_PROVIDER),
      )
      .take(20);
    for (const account of codeAccounts) {
      addresses.add(account.providerAccountId);
    }
    for (const address of addresses) {
      await forgetAddress(ctx, address);
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
    await forgetSender(ctx, userId);
    await ctx.db.delete("users", userId);
  },
});

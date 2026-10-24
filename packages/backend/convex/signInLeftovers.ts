import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { EMAIL_CODE_PROVIDER } from "./emailSignIn";

// What signing in leaves behind goes in a daily sweep once it's no longer of
// use (docs/adr/0045): a code sent, or a wrong code typed, counts against its
// address for an hour; a code works for minutes, and Google's sign-in comes
// back within minutes; the user Convex Auth makes when someone asks for a
// code stays a day unless they sign in; a session ends after 30 days. The
// scheduled functions here take times and cursors only, since their
// arguments outlive what they delete.
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BATCH = 100;
// More sign-in accounts than a user who never signed in can have.
const MAX_ACCOUNTS = 20;
// A session's refresh tokens deleted in one go, out of one every refresh.
const TOKENS_AT_ONCE = 1000;

/**
 * Forgets the codes sent to an address and the wrong ones typed for it, when
 * its user deletes their account.
 */
export async function forgetAddress(ctx: MutationCtx, address: string) {
  const email = address.trim().toLowerCase();
  const sends = await ctx.db
    .query("emailCodeSends")
    .withIndex("by_email_and_sentAt", (q) => q.eq("email", email))
    .take(BATCH);
  for (const row of sends) {
    await ctx.db.delete("emailCodeSends", row._id);
  }
  // Convex Auth counts wrong codes under the address as it was typed.
  for (const identifier of new Set([address, email])) {
    const limit = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", identifier))
      .unique();
    if (limit !== null) {
      await ctx.db.delete("authRateLimits", limit._id);
    }
  }
}

/**
 * The sign-in accounts of a user Convex Auth made for someone who asked for a
 * code and never signed in with it, or null for anyone else. Such a user has
 * no proven address, session, firm or role, and only code accounts, none with
 * a code still waiting to be typed.
 */
async function unusedAccounts(
  ctx: MutationCtx,
  user: Doc<"users">,
  now: number,
): Promise<Doc<"authAccounts">[] | null> {
  if (
    user.emailVerificationTime !== undefined ||
    user.phoneVerificationTime !== undefined ||
    user.role !== undefined
  ) {
    return null;
  }
  const session = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", user._id))
    .first();
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .first();
  if (session !== null || membership !== null) {
    return null;
  }
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
    .take(MAX_ACCOUNTS);
  if (
    accounts.length === MAX_ACCOUNTS ||
    accounts.some((account) => account.provider !== EMAIL_CODE_PROVIDER)
  ) {
    return null;
  }
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .take(BATCH);
    if (codes.some((code) => code.expirationTime > now)) {
      return null;
    }
  }
  return accounts;
}

/**
 * Deletes a user who never signed in, with their accounts and codes. The
 * codes sent to the address still count against it until the hour is up.
 */
async function deleteUnusedUser(
  ctx: MutationCtx,
  user: Doc<"users">,
  accounts: Doc<"authAccounts">[],
) {
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .take(BATCH);
    for (const code of codes) {
      await ctx.db.delete("authVerificationCodes", code._id);
    }
    await ctx.db.delete("authAccounts", account._id);
  }
  await ctx.db.delete("users", user._id);
}

/** Every day: starts deleting what signing in left behind. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const { signInLeftovers } = internal;
    await ctx.scheduler.runAfter(0, signInLeftovers.deleteCodeSends, {
      before: now - HOUR_MS,
    });
    await ctx.scheduler.runAfter(0, signInLeftovers.deleteRateLimits, {
      before: now - HOUR_MS,
      cursor: null,
    });
    await ctx.scheduler.runAfter(0, signInLeftovers.deleteUnusedUsers, {
      before: now - DAY_MS,
      cursor: null,
    });
    await ctx.scheduler.runAfter(0, signInLeftovers.deleteStaleCodes, {
      before: now - DAY_MS,
    });
    await ctx.scheduler.runAfter(0, signInLeftovers.deleteEndedSessions, {
      before: now,
      cursor: null,
    });
    return null;
  },
});

/**
 * Deletes the records of codes sent before `before`, which no longer count
 * against their address, a batch at a time.
 */
export const deleteCodeSends = internalMutation({
  args: { before: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("emailCodeSends")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", args.before))
      .take(BATCH);
    for (const row of rows) {
      await ctx.db.delete("emailCodeSends", row._id);
    }
    if (rows.length === BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.signInLeftovers.deleteCodeSends,
        args,
      );
    }
    return null;
  },
});

/**
 * Deletes Convex Auth's counts of wrong codes last typed before `before`. An
 * hour after the last wrong code an address may try again as many times as
 * if it had none, so the count no longer changes anything.
 */
export const deleteRateLimits = internalMutation({
  args: { before: v.number(), cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("authRateLimits")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", args.before))
      .paginate({ numItems: BATCH, cursor: args.cursor });
    for (const limit of batch.page) {
      if (limit.lastAttemptTime < args.before) {
        await ctx.db.delete("authRateLimits", limit._id);
      }
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.signInLeftovers.deleteRateLimits,
        { ...args, cursor: batch.continueCursor },
      );
    }
    return null;
  },
});

/**
 * Deletes the users made before `before` for someone who asked for a code and
 * never signed in, a batch at a time.
 */
export const deleteUnusedUsers = internalMutation({
  args: { before: v.number(), cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const batch = await ctx.db
      .query("users")
      .withIndex("by_emailVerificationTime", (q) =>
        q
          .eq("emailVerificationTime", undefined)
          .lt("_creationTime", args.before),
      )
      .paginate({ numItems: BATCH, cursor: args.cursor });
    for (const user of batch.page) {
      const accounts = await unusedAccounts(ctx, user, now);
      if (accounts !== null) {
        await deleteUnusedUser(ctx, user, accounts);
      }
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.signInLeftovers.deleteUnusedUsers,
        { ...args, cursor: batch.continueCursor },
      );
    }
    return null;
  },
});

/**
 * Deletes the codes and the Google sign-in states made before `before`, long
 * past their use, a batch at a time.
 */
export const deleteStaleCodes = internalMutation({
  args: { before: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", args.before))
      .take(BATCH);
    for (const code of codes) {
      await ctx.db.delete("authVerificationCodes", code._id);
    }
    const verifiers = await ctx.db
      .query("authVerifiers")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", args.before))
      .take(BATCH);
    for (const verifier of verifiers) {
      await ctx.db.delete("authVerifiers", verifier._id);
    }
    if (codes.length === BATCH || verifiers.length === BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.signInLeftovers.deleteStaleCodes,
        args,
      );
    }
    return null;
  },
});

/**
 * Deletes the sessions that ended before `before` with their refresh tokens,
 * a batch at a time: nobody can use either again.
 */
export const deleteEndedSessions = internalMutation({
  args: { before: v.number(), cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("authSessions")
      .paginate({ numItems: BATCH, cursor: args.cursor });
    let budget = TOKENS_AT_ONCE;
    for (const session of batch.page) {
      if (session.expirationTime >= args.before) {
        continue;
      }
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .take(budget);
      for (const token of tokens) {
        await ctx.db.delete("authRefreshTokens", token._id);
      }
      budget -= tokens.length;
      if (budget === 0) {
        // This session may have more: the next batch starts over here.
        await ctx.scheduler.runAfter(
          0,
          internal.signInLeftovers.deleteEndedSessions,
          args,
        );
        return null;
      }
      await ctx.db.delete("authSessions", session._id);
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.signInLeftovers.deleteEndedSessions,
        { ...args, cursor: batch.continueCursor },
      );
    }
    return null;
  },
});

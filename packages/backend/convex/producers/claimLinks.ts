import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { env, internalMutation, mutation, query } from "../_generated/server";
import { cleanEmail } from "../accounts/invitations";
import { isProducer } from "../lib/access";
import { appError, notFound } from "../lib/errors";
import { newToken } from "../lib/tokens";
import { viewerEmail } from "./access";
import { grantClaim, linkableFirms } from "./handover";

// A claim link lasts 30 days; after that, Devize sends a new one.
export const CLAIM_LINK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// Asking again for the same address gives the link already out while it has
// at least this long left, so a redrafted email doesn't mint a new one.
const REUSE_MS = 14 * DAY_MS;
// How long a link, used or not, stays listed in Admin after it expires.
export const KEEP_EXPIRED_DAYS = 30;
const SWEEP_BATCH = 200;

/** The page that opens a claim link, or null when SITE_URL isn't set. */
export function claimUrl(token: string): string | null {
  const site = env.SITE_URL?.trim().replace(/\/+$/, "");
  return site ? `${site}/claim/${token}` : null;
}

/**
 * A link that lets the person at `email` claim the Producător's profile, for
 * the thank-you email Devize writes after they sent their norms. Only someone
 * signed in with that address can use it, once, within 30 days. `url` is null
 * when SITE_URL isn't set; the page is then /claim/<token> on the app.
 */
export async function createClaimLink(
  ctx: MutationCtx,
  args: {
    manufacturerId: Id<"manufacturers">;
    email: string;
    createdBy: Id<"users">;
  },
): Promise<{ token: string; url: string | null; expiresAt: number }> {
  const email = cleanEmail(args.email);
  const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
  if (!manufacturer) {
    throw notFound("manufacturer");
  }
  if (manufacturer.claimStatus === "claimed") {
    throw appError("in_use", "manufacturer");
  }
  const now = Date.now();
  const links = await ctx.db
    .query("claimLinks")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .take(100);
  const current = links.find(
    (link) =>
      link.email === email &&
      link.usedAt === undefined &&
      link.expiresAt - now >= REUSE_MS,
  );
  if (current) {
    return {
      token: current.token,
      url: claimUrl(current.token),
      expiresAt: current.expiresAt,
    };
  }
  const token = newToken();
  const expiresAt = now + CLAIM_LINK_DAYS * DAY_MS;
  await ctx.db.insert("claimLinks", {
    manufacturerId: manufacturer._id,
    email,
    token,
    expiresAt,
    createdBy: args.createdBy,
  });
  return { token, url: claimUrl(token), expiresAt };
}

/**
 * The claim link behind a token, for the page that opens it, or null once it
 * was revoked or the profile taken down. The page compares `expiresAt` with
 * the time itself.
 */
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const viewer = await viewerEmail(ctx);
    const link = await ctx.db
      .query("claimLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    const manufacturer = link
      ? await ctx.db.get("manufacturers", link.manufacturerId)
      : null;
    if (!link || !manufacturer || manufacturer.status === "excluded") {
      return null;
    }
    const forYou = viewer.verified === link.email;
    return {
      manufacturerId: manufacturer._id,
      manufacturerName: manufacturer.displayName ?? manufacturer.name,
      email: link.email,
      signedInAs: viewer.email,
      forYou,
      expiresAt: link.expiresAt,
      used: link.usedAt !== undefined,
      claimed: manufacturer.claimStatus === "claimed",
      isProducer: await isProducer(ctx, manufacturer._id, viewer.userId),
      // Firms of theirs that could take the profile over.
      firms: forYou ? await linkableFirms(ctx, viewer.userId) : [],
    };
  },
});

/**
 * Claims the profile a link is for, for the firm chosen or a new one. Only
 * the person it was sent to can, signed in with that address; anyone else is
 * told the link doesn't exist.
 */
export const claim = mutation({
  args: {
    token: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.object({
    organizationId: v.id("organizations"),
    manufacturerId: v.id("manufacturers"),
  }),
  handler: async (ctx, args) => {
    const viewer = await viewerEmail(ctx);
    const link = await ctx.db
      .query("claimLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    const now = Date.now();
    if (
      !link ||
      link.usedAt !== undefined ||
      link.expiresAt <= now ||
      viewer.verified !== link.email
    ) {
      throw notFound("claimLink");
    }
    const manufacturer = await ctx.db.get("manufacturers", link.manufacturerId);
    if (!manufacturer || manufacturer.status === "excluded") {
      throw notFound("claimLink");
    }
    const organizationId = await grantClaim(ctx, {
      manufacturer,
      claimant: { userId: viewer.userId, email: link.email },
      method: "link",
      organizationId: args.organizationId,
    });
    await ctx.db.patch("claimLinks", link._id, { usedAt: now });
    return { organizationId, manufacturerId: manufacturer._id };
  },
});

/**
 * Deletes the claim links that expired more than a month ago, used or not: a
 * used one's claim keeps how and when the profile was claimed. Runs daily.
 */
export const deleteExpired = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const before = Date.now() - KEEP_EXPIRED_DAYS * DAY_MS;
    const links = await ctx.db
      .query("claimLinks")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", before))
      .take(SWEEP_BATCH);
    for (const link of links) {
      await ctx.db.delete("claimLinks", link._id);
    }
    if (links.length === SWEEP_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.producers.claimLinks.deleteExpired,
        {},
      );
    }
    return null;
  },
});

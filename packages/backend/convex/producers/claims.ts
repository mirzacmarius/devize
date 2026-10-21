import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { cleanCui, optionalText } from "../accounts/identifiers";
import { appError, forbidden, invalid, notFound } from "../lib/errors";
import { requireVisibleManufacturer, viewerEmail } from "./access";
import { domainOf } from "./domains";
import { assertUnclaimed, grantClaim, linkableFirms } from "./handover";

// Requests one person can have waiting at once, of each kind.
export const MAX_PENDING = 5;

function cleanMessage(message: string): string {
  const result = message.trim();
  if (!result || result.length > 1000) {
    throw invalid("message");
  }
  return result;
}

/**
 * Claims a profile on the spot, for someone signed in with a verified address
 * on one of the producer's domains, for the firm chosen or a new one.
 */
export const claimWithDomain = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const viewer = await viewerEmail(ctx);
    const manufacturer = await requireVisibleManufacturer(
      ctx,
      args.manufacturerId,
    );
    const domain = viewer.verified
      ? await ctx.db
          .query("manufacturerDomains")
          .withIndex("by_domain", (q) =>
            q.eq("domain", domainOf(viewer.verified ?? "")),
          )
          .unique()
      : null;
    if (!viewer.verified || domain?.manufacturerId !== manufacturer._id) {
      throw forbidden("domain");
    }
    return await grantClaim(ctx, {
      manufacturer,
      claimant: { userId: viewer.userId, email: viewer.verified },
      method: "domain",
      organizationId: args.organizationId,
    });
  },
});

/**
 * Asks Devize to hand a profile over, with who the person is at the producer
 * and optionally the producer's CUI, which is then checked with ANAF. A super
 * admin decides.
 */
export const request = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    message: v.string(),
    cui: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.id("manufacturerClaims"),
  handler: async (ctx, args) => {
    const viewer = await viewerEmail(ctx);
    if (!viewer.verified) {
      throw forbidden("email");
    }
    const manufacturer = await requireVisibleManufacturer(
      ctx,
      args.manufacturerId,
    );
    await assertUnclaimed(ctx, manufacturer);
    const message = cleanMessage(args.message);
    const cuiText = optionalText(args.cui, 20);
    const cui = cuiText ? cleanCui(cuiText) : undefined;
    const chosen = args.organizationId;
    if (
      chosen !== undefined &&
      !(await linkableFirms(ctx, viewer.userId)).some(
        (firm) => firm._id === chosen,
      )
    ) {
      throw invalid("organizationId");
    }
    const mine = await ctx.db
      .query("manufacturerClaims")
      .withIndex("by_userId", (q) => q.eq("userId", viewer.userId))
      .order("desc")
      .take(100);
    const pending = mine.filter((claim) => claim.status === "pending");
    if (pending.some((claim) => claim.manufacturerId === manufacturer._id)) {
      throw appError("in_use", "claim");
    }
    if (pending.length >= MAX_PENDING) {
      throw invalid("claims");
    }
    const claimId = await ctx.db.insert("manufacturerClaims", {
      manufacturerId: manufacturer._id,
      method: "manual",
      status: "pending",
      userId: viewer.userId,
      email: viewer.verified,
      message,
      cui,
      organizationId: chosen,
    });
    if (cui) {
      await ctx.scheduler.runAfter(0, internal.producers.anaf.lookup, {
        claimId,
      });
    }
    return claimId;
  },
});

/** Withdraws one's own claim while it waits for a decision. */
export const withdraw = mutation({
  args: { claimId: v.id("manufacturerClaims") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await viewerEmail(ctx);
    const claim = await ctx.db.get("manufacturerClaims", args.claimId);
    if (!claim || claim.userId !== userId || claim.status !== "pending") {
      throw notFound("claim");
    }
    await ctx.db.delete("manufacturerClaims", claim._id);
    return null;
  },
});

/**
 * Asks Devize to take a profile down, saying why. A super admin decides; the
 * profile stays up until then.
 */
export const requestRemoval = mutation({
  args: { manufacturerId: v.id("manufacturers"), message: v.string() },
  returns: v.id("removalRequests"),
  handler: async (ctx, args) => {
    const viewer = await viewerEmail(ctx);
    const manufacturer = await requireVisibleManufacturer(
      ctx,
      args.manufacturerId,
    );
    const message = cleanMessage(args.message);
    const mine = await ctx.db
      .query("removalRequests")
      .withIndex("by_userId", (q) => q.eq("userId", viewer.userId))
      .order("desc")
      .take(100);
    const pending = mine.filter((request) => request.status === "pending");
    if (
      pending.some((request) => request.manufacturerId === manufacturer._id)
    ) {
      throw appError("in_use", "removal");
    }
    if (pending.length >= MAX_PENDING) {
      throw invalid("removals");
    }
    return await ctx.db.insert("removalRequests", {
      manufacturerId: manufacturer._id,
      userId: viewer.userId,
      email: viewer.email ?? undefined,
      message,
      status: "pending",
    });
  },
});

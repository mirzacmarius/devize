import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { insertFirm, MAX_FIRMS_PER_USER } from "../accounts/organizations";
import { getMembership } from "../lib/access";
import { appError, invalid } from "../lib/errors";
import type { claimMethod } from "./validators";

/** A Producător's profile is held by one firm at most. */
export async function assertUnclaimed(
  ctx: QueryCtx,
  manufacturer: Doc<"manufacturers">,
) {
  const holder = await ctx.db
    .query("organizations")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturer._id),
    )
    .first();
  if (manufacturer.claimStatus === "claimed" || holder) {
    throw appError("in_use", "manufacturer");
  }
}

/**
 * The user's firms that can take a profile over instead of a new one:
 * Producător firms they own that hold no profile yet.
 */
export async function linkableFirms(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<{ _id: Id<"organizations">; name: string }[]> {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(MAX_FIRMS_PER_USER);
  const firms = [];
  for (const membership of memberships) {
    if (membership.role !== "owner") {
      continue;
    }
    const firm = await ctx.db.get("organizations", membership.organizationId);
    if (firm?.kind === "manufacturer" && firm.manufacturerId === undefined) {
      firms.push({ _id: firm._id, name: firm.name });
    }
  }
  return firms;
}

/**
 * Hands a profile over to the person who claimed it: links the firm they
 * chose, or creates the producer's firm with them as its owner, and records
 * the claim as approved. That firm opens first for them. A manual claim whose
 * firm can no longer take the profile gets a new firm instead.
 */
export async function grantClaim(
  ctx: MutationCtx,
  args: {
    manufacturer: Doc<"manufacturers">;
    claimant: { userId: Id<"users">; email: string };
    method: Infer<typeof claimMethod>;
    organizationId?: Id<"organizations">;
    // A manual claim, approved by a super admin.
    claim?: Doc<"manufacturerClaims">;
    decidedBy?: Id<"users">;
  },
): Promise<Id<"organizations">> {
  const { manufacturer, claimant } = args;
  await assertUnclaimed(ctx, manufacturer);
  const now = Date.now();
  const chosen = args.organizationId;
  const linkable =
    chosen !== undefined &&
    (await linkableFirms(ctx, claimant.userId)).some(
      (firm) => firm._id === chosen,
    );
  if (chosen !== undefined && !linkable && !args.claim) {
    throw invalid("organizationId");
  }
  let organizationId: Id<"organizations">;
  if (chosen !== undefined && linkable) {
    organizationId = chosen;
    await ctx.db.patch("organizations", organizationId, {
      manufacturerId: manufacturer._id,
    });
    const membership = await getMembership(
      ctx,
      organizationId,
      claimant.userId,
    );
    if (membership) {
      await ctx.db.patch("memberships", membership._id, { lastActiveAt: now });
    }
  } else {
    organizationId = await insertFirm(ctx, claimant.userId, {
      name: manufacturer.displayName ?? manufacturer.name,
      kind: "manufacturer",
      cui: args.claim?.cui,
      manufacturerId: manufacturer._id,
    });
  }
  await ctx.db.patch("manufacturers", manufacturer._id, {
    claimStatus: "claimed",
  });
  const decision = {
    status: "approved" as const,
    organizationId,
    decidedBy: args.decidedBy,
    decidedAt: now,
  };
  if (args.claim) {
    await ctx.db.patch("manufacturerClaims", args.claim._id, decision);
  } else {
    await ctx.db.insert("manufacturerClaims", {
      manufacturerId: manufacturer._id,
      method: args.method,
      userId: claimant.userId,
      email: claimant.email,
      ...decision,
    });
  }
  return organizationId;
}

/**
 * Deletes a Producător's claims, claim links, domains and removal requests,
 * for when Devize deletes the manufacturer itself.
 */
export async function deleteProducerRows(
  ctx: MutationCtx,
  manufacturerId: Id<"manufacturers">,
) {
  const claims = ctx.db
    .query("manufacturerClaims")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const row of claims) {
    await ctx.db.delete("manufacturerClaims", row._id);
  }
  const links = ctx.db
    .query("claimLinks")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const row of links) {
    await ctx.db.delete("claimLinks", row._id);
  }
  const domains = ctx.db
    .query("manufacturerDomains")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const row of domains) {
    await ctx.db.delete("manufacturerDomains", row._id);
  }
  const removals = ctx.db
    .query("removalRequests")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const row of removals) {
    await ctx.db.delete("removalRequests", row._id);
  }
}

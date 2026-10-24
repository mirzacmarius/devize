import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { appError, forbidden, notFound } from "./errors";
import { getSuperAdmin } from "./roles";

export type MemberRole = Doc<"memberships">["role"];

const roleRank: Record<MemberRole, number> = { member: 0, admin: 1, owner: 2 };

/** The signed-in user's id. Throws for anyone signed out. */
export async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw appError("unauthenticated");
  }
  return userId;
}

export async function getMembership(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
): Promise<Doc<"memberships"> | null> {
  return await ctx.db
    .query("memberships")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .unique();
}

/**
 * The signed-in user's membership in a firm, checked against the least role
 * the call needs. Every function that touches a firm's data starts here.
 * Accepts a mutation context too.
 */
export async function requireMember(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  role: MemberRole = "member",
): Promise<{ userId: Id<"users">; membership: Doc<"memberships"> }> {
  const userId = await requireUserId(ctx);
  const membership = await getMembership(ctx, organizationId, userId);
  if (!membership) {
    throw notFound("organization");
  }
  if (roleRank[membership.role] < roleRank[role]) {
    throw forbidden(role);
  }
  return { userId, membership };
}

// Tables whose rows belong to one firm through `organizationId`.
type FirmTable =
  | "clients"
  | "companyRates"
  | "files"
  | "estimates"
  | "sections"
  | "lineItems"
  | "takeoffs"
  | "rooms"
  | "variants"
  | "offers"
  | "offerQuestions"
  | "storeChoices"
  | "storeReads"
  | "priceAlerts"
  | "proposals"
  | "proposalItems"
  | "workStatements"
  | "workStatementRows"
  | "receptions"
  | "guarantees"
  | "normRequests";

/**
 * Loads a firm's row and checks that the signed-in user belongs to that firm.
 * Another firm's row is reported as missing, so ids can't be probed.
 */
export async function requireFirmDoc<T extends FirmTable>(
  ctx: QueryCtx,
  table: T,
  id: Id<T>,
  role: MemberRole = "member",
): Promise<{ doc: Doc<T>; userId: Id<"users"> }> {
  const userId = await requireUserId(ctx);
  const doc = await ctx.db.get(table, id);
  if (!doc) {
    throw notFound(table);
  }
  // Every FirmTable has organizationId; TypeScript can't see it through T.
  const { organizationId } = doc as unknown as {
    organizationId: Id<"organizations">;
  };
  const membership = await getMembership(ctx, organizationId, userId);
  if (!membership) {
    throw notFound(table);
  }
  if (roleRank[membership.role] < roleRank[role]) {
    throw forbidden(role);
  }
  return { doc, userId };
}

/**
 * Whether the signed-in user may edit a Producător's catalog: a Devize super
 * admin, or a member of the firm that claimed the manufacturer.
 */
export async function canEditManufacturer(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
): Promise<boolean> {
  if (await getSuperAdmin(ctx)) {
    return true;
  }
  const userId = await getAuthUserId(ctx);
  return userId !== null && (await isProducer(ctx, manufacturerId, userId));
}

/**
 * Whether the user works for the producer itself: a member of a firm that
 * claimed the manufacturer. Super admins are not, however much they may edit.
 */
export async function isProducer(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
  userId: Id<"users">,
): Promise<boolean> {
  const firms = ctx.db
    .query("organizations")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const firm of firms) {
    if (await getMembership(ctx, firm._id, userId)) {
      return true;
    }
  }
  return false;
}

export async function requireManufacturerEditor(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
): Promise<Id<"users">> {
  const userId = await requireUserId(ctx);
  if (!(await canEditManufacturer(ctx, manufacturerId))) {
    throw forbidden("manufacturer");
  }
  return userId;
}

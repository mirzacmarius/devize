import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getMembership } from "../lib/access";
import { appError } from "../lib/errors";

// A page opened again within half an hour is the same visit.
export const VISIT_GAP_MS = 30 * 60_000;

/** A Deviz's code as its pages show it: DVZ-0142, or DVZ-0142-R2. */
export function estimateCode(
  estimate: Pick<Doc<"estimates">, "number" | "revision">,
) {
  const code = `DVZ-${String(estimate.number).padStart(4, "0")}`;
  return estimate.revision > 1 ? `${code}-R${estimate.revision}` : code;
}

const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * The secret in an Ofertă's link: 32 characters of 64, 192 random bits, safe
 * in a URL and short enough for a text message.
 */
export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // 256 is a multiple of 64, so every character is equally likely.
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte & 63]).join("");
}

/** The Ofertă behind a link, or null for a token nobody was given. */
export async function offerByToken(
  ctx: QueryCtx,
  token: string,
): Promise<Doc<"offers"> | null> {
  if (token.length < 16 || token.length > 64) {
    return null;
  }
  return await ctx.db
    .query("offers")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

/**
 * Whether the client can still choose and answer: the link is out and not
 * replaced, and the firm hasn't closed the Deviz. Queries pass no time, since
 * a scheduled mutation marks the link expired; mutations pass `now`.
 */
export function isOpen(
  offer: Doc<"offers">,
  estimate: Doc<"estimates">,
  now?: number,
): boolean {
  return (
    (offer.status === "sent" || offer.status === "viewed") &&
    offer.replacedBy === undefined &&
    (now === undefined ||
      offer.expiresAt === undefined ||
      now < offer.expiresAt) &&
    (estimate.status === "sent" || estimate.status === "accepted")
  );
}

/**
 * Whether the signed-in user belongs to the firm: someone from the firm
 * opening the link previews it, and their visits and choices don't count.
 */
export async function isFirmMember(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  return (
    userId !== null &&
    (await getMembership(ctx, organizationId, userId)) !== null
  );
}

/**
 * The open Ofertă behind a link, for the client's answers and questions. A
 * closed one can't be answered.
 */
export async function requireOpen(ctx: MutationCtx, token: string) {
  const offer = await offerByToken(ctx, token);
  const estimate = offer
    ? await ctx.db.get("estimates", offer.estimateId)
    : null;
  if (!offer || !estimate) {
    throw appError("not_found", "offer");
  }
  if (!isOpen(offer, estimate, Date.now())) {
    throw appError("locked", "offer");
  }
  return { offer, estimate };
}

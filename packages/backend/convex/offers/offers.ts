import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { changeStatus, readLineItems } from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { defaultChoice, priceChoice } from "./choice";
import { newToken } from "./helpers";
import { checkPaymentSchedule, depositOf } from "./payments";
import { optionalItem, paymentStage } from "./validators";
import { MAX_VARIANTS } from "./variants";

// The firm's side of an Ofertă: making the client's link, taking it back, and
// following what the client does with it. The client's side is public.ts.

const DAY_MS = 24 * 60 * 60 * 1000;
// Expiry is checked at most this far ahead and then again, since timers
// longer than about 24 days overflow in tests.
const CHECK_AHEAD_MS = 20 * DAY_MS;
export const DEFAULT_VALID_DAYS = 30;
const MAX_VALID_DAYS = 180;
const MAX_OPTIONAL_ITEMS = 100;

/** Whether an Ofertă is still waiting for the client's answer. */
function isLive(offer: Doc<"offers">) {
  return offer.status === "sent" || offer.status === "viewed";
}

async function offersOf(ctx: MutationCtx, estimateId: Id<"estimates">) {
  return await ctx.db
    .query("offers")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .order("desc")
    .take(20);
}

/**
 * Makes the client's link for a Deviz. A draft is marked sent first, which
 * locks it, so what the client reads can't change. The live links of the
 * Deviz's earlier revisions now lead to this one.
 */
export const create = mutation({
  args: {
    estimateId: v.id("estimates"),
    message: v.optional(v.string()),
    validDays: v.optional(v.number()),
    // The share due at signing alone, or the whole schedule of payments.
    depositPercent: v.optional(v.number()),
    paymentSchedule: v.optional(v.array(paymentStage)),
    // Whether the client is a consumer; the client's kind decides when left out.
    consumer: v.optional(v.boolean()),
    variantIds: v.optional(v.array(v.id("variants"))),
    baseLabel: v.optional(v.string()),
    optionalItems: v.optional(v.array(optionalItem)),
    assistant: v.optional(v.boolean()),
    showEur: v.optional(v.boolean()),
  },
  returns: v.object({ offerId: v.id("offers"), token: v.string() }),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    if (estimate.status !== "draft" && estimate.status !== "sent") {
      throw invalid("status");
    }
    const existing = await offersOf(ctx, estimate._id);
    if (
      existing.some((offer) => isLive(offer) || offer.status === "accepted")
    ) {
      throw appError("in_use", "offer");
    }
    const firstItem = await ctx.db
      .query("lineItems")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", estimate._id),
      )
      .first();
    if (!firstItem) {
      throw invalid("lineItems");
    }

    const validDays = args.validDays ?? DEFAULT_VALID_DAYS;
    if (
      !Number.isInteger(validDays) ||
      validDays < 1 ||
      validDays > MAX_VALID_DAYS
    ) {
      throw invalid("validDays");
    }
    const deposit = args.depositPercent;
    if (
      deposit !== undefined &&
      (!Number.isFinite(deposit) || deposit <= 0 || deposit > 100)
    ) {
      throw invalid("depositPercent");
    }
    const paymentSchedule = args.paymentSchedule
      ? checkPaymentSchedule(args.paymentSchedule)
      : undefined;
    const depositPercent = paymentSchedule
      ? depositOf(paymentSchedule)
      : deposit === undefined
        ? undefined
        : Math.round(deposit * 100) / 100;
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    const consumer = args.consumer ?? client?.kind === "person";
    const variantIds = [...new Set(args.variantIds ?? [])];
    if (variantIds.length > MAX_VARIANTS) {
      throw invalid("variants");
    }
    for (const variantId of variantIds) {
      const variant = await ctx.db.get("variants", variantId);
      if (!variant || variant.estimateId !== estimate._id) {
        throw notFound("variant");
      }
    }
    const optionalItems = args.optionalItems ?? [];
    const optionalIds = new Set(optionalItems.map((o) => o.lineItemId));
    if (
      optionalItems.length > MAX_OPTIONAL_ITEMS ||
      optionalIds.size !== optionalItems.length
    ) {
      throw invalid("optionalItems");
    }
    for (const { lineItemId } of optionalItems) {
      const item = await ctx.db.get("lineItems", lineItemId);
      if (!item || item.estimateId !== estimate._id) {
        throw notFound("lineItem");
      }
    }

    if (estimate.status === "draft") {
      await changeStatus(ctx, estimate, "sent");
    }
    const now = Date.now();
    const expiresAt = now + validDays * DAY_MS;
    const token = newToken();
    const offerId = await ctx.db.insert("offers", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      token,
      status: "sent",
      message: optionalText(args.message, 2000),
      variantIds,
      baseLabel:
        variantIds.length > 0
          ? (optionalText(args.baseLabel, 40) ?? "Standard")
          : undefined,
      optionalItems,
      assistant: args.assistant ?? true,
      showEur: args.showEur ?? false,
      expiresAt,
      sentAt: now,
      viewCount: 0,
      depositPercent,
      paymentSchedule,
      consumer,
      createdBy: userId,
    });
    await scheduleExpiry(ctx, offerId, expiresAt);
    await replaceEarlierRevisions(ctx, estimate, offerId);
    return { offerId, token };
  },
});

async function scheduleExpiry(
  ctx: MutationCtx,
  offerId: Id<"offers">,
  expiresAt: number,
) {
  await ctx.scheduler.runAt(
    Math.min(expiresAt, Date.now() + CHECK_AHEAD_MS),
    internal.offers.offers.expire,
    { offerId },
  );
}

/**
 * A client holding the link of an earlier revision is sent on to the new
 * one: that link closes and says where the new one is.
 */
async function replaceEarlierRevisions(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  offerId: Id<"offers">,
) {
  const revisions = await ctx.db
    .query("estimates")
    .withIndex("by_organizationId_and_number", (q) =>
      q
        .eq("organizationId", estimate.organizationId)
        .eq("number", estimate.number),
    )
    .take(200);
  for (const revision of revisions) {
    if (revision._id === estimate._id) {
      continue;
    }
    for (const offer of await offersOf(ctx, revision._id)) {
      if (isLive(offer)) {
        await ctx.db.patch("offers", offer._id, {
          status: "withdrawn",
          replacedBy: offerId,
        });
      }
    }
  }
}

/** Takes a link back before the client answers, so it stops working. */
export const withdraw = mutation({
  args: { offerId: v.id("offers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: offer } = await requireFirmDoc(ctx, "offers", args.offerId);
    if (!isLive(offer)) {
      throw appError("locked", "offer");
    }
    await ctx.db.patch("offers", offer._id, { status: "withdrawn" });
    return null;
  },
});

/**
 * Turns the assistant on or off on a live link. Off, the client's questions
 * go straight to the firm.
 */
export const setAssistant = mutation({
  args: { offerId: v.id("offers"), assistant: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: offer } = await requireFirmDoc(ctx, "offers", args.offerId);
    if (!isLive(offer)) {
      throw appError("locked", "offer");
    }
    await ctx.db.patch("offers", offer._id, { assistant: args.assistant });
    return null;
  },
});

/** Marks a link expired once its last day is over, unless the client answered. */
export const expire = internalMutation({
  args: { offerId: v.id("offers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const offer = await ctx.db.get("offers", args.offerId);
    if (!offer || !isLive(offer) || offer.expiresAt === undefined) {
      return null;
    }
    if (offer.expiresAt <= Date.now()) {
      await ctx.db.patch("offers", offer._id, { status: "expired" });
    } else {
      await scheduleExpiry(ctx, offer._id, offer.expiresAt);
    }
    return null;
  },
});

/**
 * A Deviz's latest Ofertă as the firm follows it: the link, the client's
 * visits, what they are looking at, and their answer with the signature.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const offer = await ctx.db
      .query("offers")
      .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
      .order("desc")
      .first();
    if (!offer) {
      return null;
    }
    const items = await readLineItems(ctx, estimate._id);
    const titles = new Map(items.map((item) => [item._id, item.title]));
    const variantNames = new Map<Id<"variants">, string>();
    for (const variantId of offer.variantIds) {
      const variant = await ctx.db.get("variants", variantId);
      if (variant) {
        variantNames.set(variant._id, variant.name);
      }
    }
    // Until the client chooses, they see the Deviz as the firm set it.
    const choice = offer.choice ?? {
      ...defaultChoice(offer),
      totals: priceChoice(
        items,
        null,
        defaultChoice(offer).excludedItemIds,
        estimate.markups,
      ).totals,
      updatedAt: undefined,
    };
    const creator = await ctx.db.get("users", offer.createdBy);
    return {
      _id: offer._id,
      token: offer.token,
      status: offer.status,
      message: offer.message,
      assistant: offer.assistant,
      showEur: offer.showEur ?? false,
      sentAt: offer.sentAt,
      expiresAt: offer.expiresAt,
      depositPercent: offer.depositPercent,
      paymentSchedule: offer.paymentSchedule ?? [],
      consumer: offer.consumer ?? false,
      confirmation: offer.confirmation ?? null,
      viewCount: offer.viewCount,
      viewedAt: offer.viewedAt,
      lastViewedAt: offer.lastViewedAt,
      decidedAt: offer.decidedAt,
      declineReason: offer.declineReason,
      signature: offer.signature
        ? {
            name: offer.signature.name,
            signedAt: offer.signature.signedAt,
            path: offer.signature.path,
            contentHash: offer.signature.contentHash,
            evidence: offer.signature.evidence,
            earlyStart: offer.signature.earlyStart ?? false,
          }
        : null,
      baseLabel: offer.baseLabel,
      variants: offer.variantIds.flatMap((variantId) => {
        const name = variantNames.get(variantId);
        return name ? [{ _id: variantId, name }] : [];
      }),
      optionalItems: offer.optionalItems.map((optional) => ({
        ...optional,
        title: titles.get(optional.lineItemId) ?? "",
      })),
      choice: {
        chosen: offer.choice !== undefined,
        variantName: choice.variantId
          ? variantNames.get(choice.variantId)
          : undefined,
        excluded: choice.excludedItemIds.map((id) => ({
          _id: id,
          title: titles.get(id) ?? "",
        })),
        totals: choice.totals,
        updatedAt: choice.updatedAt,
      },
      createdByName: creator?.username || creator?.name || null,
    };
  },
});

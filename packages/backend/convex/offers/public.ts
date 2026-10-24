import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  changeStatus,
  readLineItems,
  readSections,
} from "../estimates/helpers";
import { latestRateOf } from "../exchange/rates";
import { forbidden, invalid } from "../lib/errors";
import { sha256Hex } from "../lib/sha256";
import { type Choice, checkChoice, priceChoice } from "./choice";
import { cleanEvidence, maskEmail, withdrawalDeadline } from "./consumer";
import { effectiveChoice, firmView, offerContent } from "./content";
import {
  estimateCode,
  isFirmMember,
  isOpen,
  offerByToken,
  requireOpen,
  VISIT_GAP_MS,
} from "./helpers";
import { checkSignaturePath, checkSignerName } from "./signature";
import { choiceArgs, signatureEvidence } from "./validators";

// The client's side of an Ofertă: everything here is reached with the link's
// token alone, without an account. What the link shows is built field by
// field in content.ts, so nothing else of the firm's leaks.

const MAX_REASON = 1000;

/**
 * What the client's link shows. Null for a link nobody was given; a closed
 * link (withdrawn, expired, replaced) shows only who to contact. The prices
 * follow the choice the page passes, so the client compares before saving.
 */
export const view = query({
  args: { token: v.string(), ...choiceArgs },
  handler: async (ctx, args) => {
    const offer = await offerByToken(ctx, args.token);
    const estimate = offer
      ? await ctx.db.get("estimates", offer.estimateId)
      : null;
    const firm = offer
      ? await ctx.db.get("organizations", offer.organizationId)
      : null;
    if (!offer || !estimate || !firm) {
      return null;
    }
    const preview = await isFirmMember(ctx, firm._id);
    const head = {
      number: estimate.number,
      revision: estimate.revision,
      title: estimate.title,
      firm: await firmView(ctx, firm),
      preview,
    };
    const decided = offer.status === "accepted" || offer.status === "declined";
    const open = isOpen(offer, estimate);
    if (!open && !decided) {
      const replacement = offer.replacedBy
        ? await ctx.db.get("offers", offer.replacedBy)
        : null;
      return {
        state: "closed" as const,
        ...head,
        reason:
          offer.status === "expired"
            ? ("expired" as const)
            : replacement
              ? ("replaced" as const)
              : ("withdrawn" as const),
        replacementToken: replacement?.token,
      };
    }

    const choice = effectiveChoice(offer, open, args);
    const content = await offerContent(ctx, offer, estimate, choice);
    return {
      state: open
        ? ("open" as const)
        : offer.status === "accepted"
          ? ("accepted" as const)
          : ("declined" as const),
      ...head,
      ...content,
      // The euro beside the lei while the client decides, if the firm asked.
      eur: open && offer.showEur ? await latestRateOf(ctx, "EUR") : null,
      accepted:
        offer.status === "accepted" && offer.signature
          ? {
              name: offer.signature.name,
              signedAt: offer.signature.signedAt,
              path: offer.signature.path,
              contentHash: offer.signature.contentHash,
              earlyStart: offer.signature.earlyStart ?? false,
              // A consumer may still withdraw until then.
              withdrawalUntil: offer.consumer
                ? withdrawalDeadline(offer.signature.signedAt)
                : undefined,
              variantName: content.variants.find(
                (x) => x._id === choice.variantId,
              )?.name,
            }
          : null,
      // Where the signed copy was emailed, with the address mostly hidden.
      confirmation: offer.confirmation
        ? {
            email: maskEmail(offer.confirmation.email),
            sentAt: offer.confirmation.sentAt,
          }
        : null,
      declined:
        offer.status === "declined"
          ? { at: offer.decidedAt, reason: offer.declineReason }
          : null,
    };
  },
});

/**
 * Counts the client's visit, so the firm knows the link was opened. Visits
 * within half an hour count once; the firm's own previews don't count.
 */
export const recordView = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const offer = await offerByToken(ctx, args.token);
    if (!offer || (offer.status !== "sent" && offer.status !== "viewed")) {
      return null;
    }
    if (await isFirmMember(ctx, offer.organizationId)) {
      return null;
    }
    const now = Date.now();
    if (
      offer.lastViewedAt !== undefined &&
      now - offer.lastViewedAt < VISIT_GAP_MS
    ) {
      return null;
    }
    await ctx.db.patch("offers", offer._id, {
      status: "viewed",
      viewedAt: offer.viewedAt ?? now,
      lastViewedAt: now,
      viewCount: offer.viewCount + 1,
    });
    return null;
  },
});

async function priceFor(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  choice: Choice,
) {
  const variant = choice.variantId
    ? await ctx.db.get("variants", choice.variantId)
    : null;
  return priceChoice(
    await readLineItems(ctx, estimate._id),
    variant,
    choice.excludedItemIds,
    estimate.markups,
  );
}

/**
 * Saves what the client is looking at, so the firm sees which Variantă and
 * works they lean towards. The totals are always computed here.
 */
export const choose = mutation({
  args: { token: v.string(), ...choiceArgs },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { offer, estimate } = await requireOpen(ctx, args.token);
    const choice = checkChoice(offer, args);
    if (await isFirmMember(ctx, offer.organizationId)) {
      return null;
    }
    const saved = offer.choice;
    if (
      saved &&
      saved.variantId === choice.variantId &&
      saved.excludedItemIds.length === choice.excludedItemIds.length &&
      saved.excludedItemIds.every((id) => choice.excludedItemIds.includes(id))
    ) {
      return null;
    }
    const { totals } = await priceFor(ctx, estimate, choice);
    await ctx.db.patch("offers", offer._id, {
      choice: { ...choice, totals, updatedAt: Date.now() },
    });
    return null;
  },
});

/**
 * The client accepts the Ofertă as they chose it and signs it, by drawing or,
 * when they can't draw, with their typed name alone. The choice and its
 * totals are frozen, and the Deviz becomes accepted. What was accepted is
 * hashed and kept with the browser's evidence, and the client is sent a
 * confirmation.
 */
export const accept = mutation({
  args: {
    token: v.string(),
    ...choiceArgs,
    name: v.string(),
    signature: v.optional(v.string()),
    evidence: v.optional(signatureEvidence),
    // A consumer asks for the works to begin within the withdrawal period.
    earlyStart: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { offer, estimate } = await requireOpen(ctx, args.token);
    if (await isFirmMember(ctx, offer.organizationId)) {
      throw forbidden("preview");
    }
    const choice = checkChoice(offer, args);
    const name = checkSignerName(args.name);
    const path =
      args.signature === undefined
        ? undefined
        : checkSignaturePath(args.signature);
    const evidence = cleanEvidence(args.evidence);
    const { lines, totals } = await priceFor(ctx, estimate, choice);
    if (!lines.some((line) => line.included)) {
      throw invalid("excludedItemIds");
    }
    const now = Date.now();
    const earlyStart = offer.consumer ? (args.earlyStart ?? false) : undefined;
    // What the signature covers, so the signed copy can be checked later.
    const contentHash = sha256Hex(
      JSON.stringify({
        estimate: estimateCode(estimate),
        title: estimate.title,
        variantId: choice.variantId ?? null,
        excludedItemIds: [...choice.excludedItemIds].sort(),
        lines: lines
          .filter((line) => line.included)
          .map((line) => [
            line.item._id,
            line.item.title,
            line.item.unit,
            line.item.quantity,
            line.unitPrice,
            line.total,
          ]),
        totals,
        paymentSchedule: offer.paymentSchedule ?? null,
        signer: name,
        signedAt: now,
        earlyStart: earlyStart ?? null,
      }),
    );
    await ctx.db.patch("offers", offer._id, {
      status: "accepted",
      decidedAt: now,
      acceptedVariantId: choice.variantId,
      choice: { ...choice, totals, updatedAt: now },
      signature: {
        name,
        signedAt: now,
        path,
        contentHash,
        evidence,
        earlyStart,
      },
    });
    await changeStatus(ctx, estimate, "accepted");
    await ctx.scheduler.runAfter(0, internal.offers.notify.decision, {
      offerId: offer._id,
    });
    await ctx.scheduler.runAfter(0, internal.offers.notify.confirmation, {
      offerId: offer._id,
    });
    return null;
  },
});

/** The client turns the Ofertă down, optionally saying why. */
export const decline = mutation({
  args: { token: v.string(), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { offer, estimate } = await requireOpen(ctx, args.token);
    if (await isFirmMember(ctx, offer.organizationId)) {
      throw forbidden("preview");
    }
    const reason = args.reason?.trim();
    if (reason && reason.length > MAX_REASON) {
      throw invalid("reason");
    }
    await ctx.db.patch("offers", offer._id, {
      status: "declined",
      decidedAt: Date.now(),
      declineReason: reason || undefined,
    });
    await changeStatus(ctx, estimate, "rejected");
    await ctx.scheduler.runAfter(0, internal.offers.notify.decision, {
      offerId: offer._id,
    });
    return null;
  },
});

/**
 * The Deviz as the client's PDF prints it, for the choice shown: the chosen
 * Variantă's prices, without the works left out. Only what the PDF prints.
 */
export const document = query({
  args: { token: v.string(), ...choiceArgs },
  handler: async (ctx, args) => {
    const offer = await offerByToken(ctx, args.token);
    const estimate = offer
      ? await ctx.db.get("estimates", offer.estimateId)
      : null;
    const firm = offer
      ? await ctx.db.get("organizations", offer.organizationId)
      : null;
    if (!offer || !estimate || !firm) {
      return null;
    }
    const open = isOpen(offer, estimate);
    const decided = offer.status === "accepted" || offer.status === "declined";
    if (!open && !decided) {
      return null;
    }
    const choice = effectiveChoice(offer, open, args);
    const variant = choice.variantId
      ? await ctx.db.get("variants", choice.variantId)
      : null;
    const { lines } = priceChoice(
      await readLineItems(ctx, estimate._id),
      variant,
      choice.excludedItemIds,
      estimate.markups,
    );
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    return {
      estimate: {
        number: estimate.number,
        revision: estimate.revision,
        title: variant ? `${estimate.title} (${variant.name})` : estimate.title,
        kind: estimate.kind,
        priceDate: estimate.priceDate,
        markups: estimate.markups,
        siteAddress: estimate.siteAddress,
        county: estimate.county,
      },
      sections: (await readSections(ctx, estimate._id)).map((section) => ({
        _id: section._id,
        kind: section.kind,
        parentId: section.parentId,
        code: section.code,
        name: section.name,
        position: section.position,
      })),
      lineItems: lines
        .filter((line) => line.included)
        .map((line) => ({
          _id: line.item._id,
          sectionId: line.item.sectionId,
          position: line.item.position,
          code: line.item.code,
          title: line.item.title,
          unit: line.item.unit,
          quantity: line.item.quantity,
          unitCost: line.unitCost,
          laborHours: line.laborHours,
        })),
      firm: {
        name: firm.name,
        cui: firm.cui,
        tradeRegister: firm.tradeRegister,
        address: firm.address,
        county: firm.county,
        email: firm.email,
        phone: firm.phone,
      },
      client: client
        ? { name: client.name, address: client.address, email: client.email }
        : null,
      // The terms the Deviz prints with: how it is paid, the consumer's
      // rights and, once accepted, the client's electronic signature.
      offer: {
        paymentSchedule: offer.paymentSchedule,
        consumer: offer.consumer ?? false,
        signature:
          offer.status === "accepted" && offer.signature
            ? {
                name: offer.signature.name,
                signedAt: offer.signature.signedAt,
                contentHash: offer.signature.contentHash,
                evidence: offer.signature.evidence,
                earlyStart: offer.signature.earlyStart ?? false,
                withdrawalUntil: offer.consumer
                  ? withdrawalDeadline(offer.signature.signedAt)
                  : undefined,
              }
            : null,
        confirmation: offer.confirmation
          ? {
              email: maskEmail(offer.confirmation.email),
              sentAt: offer.confirmation.sentAt,
            }
          : null,
      },
    };
  },
});

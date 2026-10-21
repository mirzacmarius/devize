import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import {
  changeStatus,
  readLineItems,
  readSections,
} from "../estimates/helpers";
import { appError, forbidden, invalid } from "../lib/errors";
import {
  type Choice,
  checkChoice,
  defaultChoice,
  materialNames,
  priceChoice,
} from "./choice";
import { isFirmMember, isOpen, offerByToken, VISIT_GAP_MS } from "./helpers";
import { checkSignaturePath, checkSignerName } from "./signature";

// The client's side of an Ofertă: everything here is reached with the link's
// token alone, without an account. What the client reads is built field by
// field from the Deviz, so nothing else of the firm's leaks: no notes, no
// members, no price sources or store choices, no resource prices.

const MAX_REASON = 1000;

const choiceArgs = {
  variantId: v.optional(v.id("variants")),
  excludedItemIds: v.optional(v.array(v.id("lineItems"))),
};

async function firmView(ctx: QueryCtx, firm: Doc<"organizations">) {
  return {
    name: firm.name,
    logoUrl: firm.logoId ? await ctx.storage.getUrl(firm.logoId) : null,
    cui: firm.cui,
    tradeRegister: firm.tradeRegister,
    address: firm.address,
    county: firm.county,
    email: firm.email,
    phone: firm.phone,
  };
}

async function variantsOf(ctx: QueryCtx, offer: Doc<"offers">) {
  const variants: Doc<"variants">[] = [];
  for (const variantId of offer.variantIds) {
    const variant = await ctx.db.get("variants", variantId);
    if (variant && variant.estimateId === offer.estimateId) {
      variants.push(variant);
    }
  }
  return variants;
}

/**
 * The choice to show: once the client decided, the one they decided on;
 * otherwise what the page asks for, or the last one saved, or the default.
 */
function effectiveChoice(
  offer: Doc<"offers">,
  open: boolean,
  asked: { variantId?: Id<"variants">; excludedItemIds?: Id<"lineItems">[] },
): Choice {
  if (!open || (asked.variantId === undefined && !asked.excludedItemIds)) {
    return offer.choice
      ? {
          variantId: offer.choice.variantId,
          excludedItemIds: offer.choice.excludedItemIds,
        }
      : defaultChoice(offer);
  }
  return checkChoice(offer, asked);
}

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

    const items = await readLineItems(ctx, estimate._id);
    const sections = await readSections(ctx, estimate._id);
    const variants = await variantsOf(ctx, offer);
    const choice = effectiveChoice(offer, open, args);
    const variant = variants.find((x) => x._id === choice.variantId) ?? null;
    const priced = priceChoice(
      items,
      variant,
      choice.excludedItemIds,
      estimate.markups,
    );
    const optional = new Map(
      offer.optionalItems.map((o) => [o.lineItemId, o.included]),
    );
    // Each option's total with the same works left out, for comparing.
    const totalWith = (option: Doc<"variants"> | null) =>
      priceChoice(items, option, choice.excludedItemIds, estimate.markups)
        .totals.total;
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;

    return {
      state: open
        ? ("open" as const)
        : offer.status === "accepted"
          ? ("accepted" as const)
          : ("declined" as const),
      ...head,
      description: estimate.description,
      siteAddress: estimate.siteAddress,
      county: estimate.county,
      priceDate: estimate.priceDate,
      message: offer.message,
      expiresAt: offer.expiresAt,
      depositPercent: offer.depositPercent,
      assistant: offer.assistant,
      client: client ? { name: client.name } : null,
      markups: estimate.markups,
      sections: sections.map((section) => ({
        _id: section._id,
        kind: section.kind,
        parentId: section.parentId,
        code: section.code,
        name: section.name,
        position: section.position,
      })),
      items: priced.lines.map((line) => ({
        _id: line.item._id,
        sectionId: line.item.sectionId,
        position: line.item.position,
        code: line.item.code,
        title: line.item.title,
        unit: line.item.unit,
        quantity: line.item.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
        materials: materialNames(line.resources),
        changes: line.changes,
        optional: optional.has(line.item._id),
        included: line.included,
      })),
      baseLabel: offer.baseLabel,
      baseTotal: variants.length > 0 ? totalWith(null) : priced.totals.total,
      variants: variants.map((option) => ({
        _id: option._id,
        name: option.name,
        tier: option.tier,
        total: totalWith(option),
      })),
      choice: { ...choice, totals: priced.totals },
      accepted:
        offer.status === "accepted" && offer.signature
          ? {
              name: offer.signature.name,
              signedAt: offer.signature.signedAt,
              path: offer.signature.path,
              variantName: variant?.name,
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

/**
 * The open Ofertă behind a link, for the client's answers. A closed one, or
 * one the firm is previewing, can't be answered.
 */
async function requireOpen(ctx: MutationCtx, token: string) {
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
 * totals are frozen, and the Deviz becomes accepted.
 */
export const accept = mutation({
  args: {
    token: v.string(),
    ...choiceArgs,
    name: v.string(),
    signature: v.optional(v.string()),
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
    const { lines, totals } = await priceFor(ctx, estimate, choice);
    if (!lines.some((line) => line.included)) {
      throw invalid("excludedItemIds");
    }
    const now = Date.now();
    await ctx.db.patch("offers", offer._id, {
      status: "accepted",
      decidedAt: now,
      acceptedVariantId: choice.variantId,
      choice: { ...choice, totals, updatedAt: now },
      signature: { name, signedAt: now, path },
    });
    await changeStatus(ctx, estimate, "accepted");
    await ctx.scheduler.runAfter(0, internal.offers.notify.decision, {
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
      client: client ? { name: client.name } : null,
    };
  },
});

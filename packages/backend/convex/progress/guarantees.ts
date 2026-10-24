import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { roundLei } from "../estimates/recap";
import { requireFirmDoc } from "../lib/access";
import { checkDate } from "../lib/dates";
import { invalid, notFound } from "../lib/errors";
import { addDays, releaseAmounts } from "./arithmetic";
import { guaranteeFor, latestStatement, refreshStatement } from "./helpers";
import { progressOf } from "./summary";
import { guaranteeMethod, guaranteeStage } from "./validators";

// The Garanție de bună execuție of a Deviz: at most 10 % of the contract
// without VAT (HG 395/2016 art. 40), kept back from each Situație de lucrări
// or given as a bank guarantee or an insurance policy, and given back 70 %
// after the PV de recepție la terminarea lucrărilor and 30 % after the PV
// de recepție finală, each within 14 days (art. 42).

const MAX_PERCENT = 10;
const MAX_RELEASES = 10;
const RELEASE_DAYS = 14;

function checkPercent(percent: number) {
  if (!Number.isFinite(percent) || percent < 0 || percent > MAX_PERCENT) {
    throw invalid("percent");
  }
  return Math.round(percent * 100) / 100;
}

function checkAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) {
    throw invalid("amount");
  }
  return roundLei(amount);
}

async function receptionsOf(ctx: QueryCtx, estimate: Doc<"estimates">) {
  const receptions = await ctx.db
    .query("receptions")
    .withIndex("by_estimateId_and_kind", (q) =>
      q.eq("estimateId", estimate._id),
    )
    .take(2);
  const of = (kind: "completion" | "final") => {
    const reception = receptions.find((r) => r.kind === kind);
    return reception
      ? {
          status: reception.status,
          decision: reception.decision,
          date: reception.date,
        }
      : null;
  };
  return { completion: of("completion"), final: of("final") };
}

/**
 * The guarantee and where it stands: what it should come to, what was kept
 * back so far, what each reception frees and when, what was given back and
 * what the firm still has to recover.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const guarantee = await guaranteeFor(ctx, estimate._id);
    const progress = await progressOf(ctx, estimate);
    const receptions = await receptionsOf(ctx, estimate);
    const contractSubtotal = progress.contract.subtotal;
    const percent = guarantee?.percent ?? 0;
    const total = roundLei((contractSubtotal * percent) / 100);
    const amounts = releaseAmounts(total);
    const released = (stage: "completion" | "final") =>
      (guarantee?.releases ?? [])
        .filter((release) => release.stage === stage)
        .reduce((sum, release) => roundLei(sum + release.amount), 0);
    const stage = (kind: "completion" | "final") => {
      const reception = receptions[kind];
      const admitted =
        reception?.status === "concluded" && reception.decision === "admitted";
      return {
        amount: amounts[kind],
        released: released(kind),
        // Counted from the PV, once the reception is admitted.
        dueDate: admitted ? addDays(reception.date, RELEASE_DAYS) : undefined,
        receptionDate: admitted ? reception.date : undefined,
      };
    };
    // What the firm has out: kept back from its statements, or the
    // instrument it gave, less what came back.
    const held =
      guarantee?.method === "instrument"
        ? (guarantee.instrument?.amount ?? total)
        : progress.withheld;
    const releasedTotal = released("completion") + released("final");
    return {
      guarantee: guarantee
        ? {
            percent: guarantee.percent,
            method: guarantee.method,
            instrument: guarantee.instrument,
            releases: guarantee.releases,
            updatedAt: guarantee.updatedAt,
          }
        : null,
      contractSubtotal,
      total,
      withheld: progress.withheld,
      // Still to keep back from the statements to come.
      remainingToWithhold:
        guarantee?.method === "retention"
          ? Math.max(0, roundLei(total - progress.withheld))
          : 0,
      stages: { completion: stage("completion"), final: stage("final") },
      releasedTotal: roundLei(releasedTotal),
      outstanding: Math.max(0, roundLei(held - releasedTotal)),
      receptions,
      locked: estimate.status !== "accepted",
    };
  },
});

/** Refreshes the open statement's retention after the guarantee changed. */
async function refreshOpenStatement(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
) {
  const latest = await latestStatement(ctx, estimate._id);
  if (latest && latest.status !== "approved") {
    await refreshStatement(ctx, latest);
  }
}

/** Sets the Deviz's guarantee: its share and how it is held. */
export const set = mutation({
  args: {
    estimateId: v.id("estimates"),
    percent: v.number(),
    method: guaranteeMethod,
    instrument: v.optional(
      v.object({
        issuer: v.string(),
        reference: v.string(),
        amount: v.number(),
        validUntil: v.optional(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const instrument =
      args.method === "instrument" && args.instrument
        ? {
            issuer: optionalText(args.instrument.issuer, 200) ?? "",
            reference: optionalText(args.instrument.reference, 100) ?? "",
            amount: checkAmount(args.instrument.amount),
            validUntil: args.instrument.validUntil
              ? checkDate(args.instrument.validUntil)
              : undefined,
          }
        : undefined;
    const fields = {
      percent: checkPercent(args.percent),
      method: args.method,
      instrument,
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    const existing = await guaranteeFor(ctx, estimate._id);
    if (existing) {
      await ctx.db.patch("guarantees", existing._id, fields);
    } else {
      await ctx.db.insert("guarantees", {
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        releases: [],
        ...fields,
      });
    }
    await refreshOpenStatement(ctx, estimate);
    return null;
  },
});

/** Records a part of the guarantee given back to the firm. */
export const release = mutation({
  args: {
    estimateId: v.id("estimates"),
    stage: guaranteeStage,
    amount: v.number(),
    date: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const guarantee = await guaranteeFor(ctx, estimate._id);
    if (!guarantee) {
      throw notFound("guarantee");
    }
    if (guarantee.releases.length >= MAX_RELEASES) {
      throw invalid("releases");
    }
    const amount = checkAmount(args.amount);
    if (amount <= 0) {
      throw invalid("amount");
    }
    await ctx.db.patch("guarantees", guarantee._id, {
      releases: [
        ...guarantee.releases,
        {
          stage: args.stage,
          amount,
          date: checkDate(args.date),
          note: optionalText(args.note, 500),
        },
      ],
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Takes a recorded release back, by its place in the list. */
export const removeRelease = mutation({
  args: { estimateId: v.id("estimates"), index: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const guarantee = await guaranteeFor(ctx, estimate._id);
    if (!guarantee?.releases[args.index]) {
      throw notFound("release");
    }
    await ctx.db.patch("guarantees", guarantee._id, {
      releases: guarantee.releases.filter((_, index) => index !== args.index),
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Drops the guarantee; the open statement keeps nothing back any more. */
export const remove = mutation({
  args: { estimateId: v.id("estimates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const guarantee = await guaranteeFor(ctx, estimate._id);
    if (guarantee) {
      await ctx.db.delete("guarantees", guarantee._id);
      await refreshOpenStatement(ctx, estimate);
    }
    return null;
  },
});

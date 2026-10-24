import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { requireFirmDoc } from "../lib/access";
import { checkDate } from "../lib/dates";
import { appError, invalid } from "../lib/errors";
import { progressOf } from "./summary";
import {
  receptionDecision,
  receptionKind,
  receptionObjection,
  receptionPerson,
} from "./validators";

// Procesele-verbale de recepție (HG 343/2017): what the firm fills in for
// the reception at the end of the works and for the final one, which Devize
// draws as the regulation's models. A concluded PV doesn't change.

const MAX_PEOPLE = 30;
const MAX_OBJECTIONS = 50;

function checkPeople(people: readonly Infer<typeof receptionPerson>[]) {
  if (people.length > MAX_PEOPLE) {
    throw invalid("people");
  }
  return people.map((person) => {
    const name = optionalText(person.name, 120);
    if (!name) {
      throw invalid("people");
    }
    return {
      name,
      role: person.role,
      organization: optionalText(person.organization, 200),
    };
  });
}

function checkObjections(
  objections: readonly Infer<typeof receptionObjection>[],
) {
  if (objections.length > MAX_OBJECTIONS) {
    throw invalid("objections");
  }
  return objections.map((objection) => {
    const text = optionalText(objection.text, 1000);
    if (!text) {
      throw invalid("objections");
    }
    return {
      text,
      deadline: objection.deadline ? checkDate(objection.deadline) : undefined,
    };
  });
}

function optionalDate(value: string | undefined) {
  return value ? checkDate(value) : undefined;
}

function checkMonths(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 0 || value > 240) {
    throw invalid("warrantyMonths");
  }
  return value;
}

function checkCopies(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw invalid("copies");
  }
  return value;
}

async function readReceptions(ctx: QueryCtx, estimate: Doc<"estimates">) {
  return await ctx.db
    .query("receptions")
    .withIndex("by_estimateId_and_kind", (q) =>
      q.eq("estimateId", estimate._id),
    )
    .take(2);
}

/**
 * The Deviz's two receptions, and what the statements suggest for them:
 * when the works ran and what they came to.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const receptions = await readReceptions(ctx, estimate);
    const progress = await progressOf(ctx, estimate);
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    return {
      estimate: {
        _id: estimate._id,
        organizationId: estimate.organizationId,
        number: estimate.number,
        revision: estimate.revision,
        title: estimate.title,
        status: estimate.status,
        siteAddress: estimate.siteAddress,
        county: estimate.county,
        client: client ? { _id: client._id, name: client.name } : null,
      },
      completion: receptions.find((r) => r.kind === "completion") ?? null,
      final: receptions.find((r) => r.kind === "final") ?? null,
      suggested: {
        executionStart: progress.executionStart,
        executionEnd: progress.executionEnd,
        // The approved works, without and with VAT.
        value: progress.approved?.subtotal ?? 0,
        valueWithVat: progress.approved?.total ?? 0,
        approvedStatements: progress.statements.filter(
          (s) => s.status === "approved",
        ).length,
        allExecuted:
          progress.approved !== null && progress.remainingSubtotal === 0,
      },
    };
  },
});

const receptionFields = {
  number: v.optional(v.string()),
  date: v.string(),
  place: v.optional(v.string()),
  contract: v.optional(
    v.object({ number: v.string(), date: v.optional(v.string()) }),
  ),
  permit: v.optional(
    v.object({
      number: v.string(),
      date: v.optional(v.string()),
      issuer: v.optional(v.string()),
      validUntil: v.optional(v.string()),
    }),
  ),
  executionStart: v.optional(v.string()),
  executionEnd: v.optional(v.string()),
  committeeStart: v.optional(v.string()),
  committeeEnd: v.optional(v.string()),
  warrantyMonths: v.optional(v.number()),
  people: v.array(receptionPerson),
  findings: v.optional(v.string()),
  objections: v.array(receptionObjection),
  decision: v.optional(receptionDecision),
  reasons: v.optional(v.string()),
  measures: v.optional(v.string()),
  copies: v.optional(v.number()),
};

/** Writes a reception's PV, new or as a draft, as the firm fills it in. */
export const save = mutation({
  args: {
    estimateId: v.id("estimates"),
    kind: receptionKind,
    ...receptionFields,
  },
  returns: v.id("receptions"),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const existing = (await readReceptions(ctx, estimate)).find(
      (r) => r.kind === args.kind,
    );
    if (existing?.status === "concluded") {
      throw appError("locked", "reception");
    }
    const contractNumber = optionalText(args.contract?.number, 100);
    const permitNumber = optionalText(args.permit?.number, 100);
    const fields = {
      number: optionalText(args.number, 50),
      date: checkDate(args.date),
      place: optionalText(args.place, 200),
      contract: contractNumber
        ? { number: contractNumber, date: optionalDate(args.contract?.date) }
        : undefined,
      permit: permitNumber
        ? {
            number: permitNumber,
            date: optionalDate(args.permit?.date),
            issuer: optionalText(args.permit?.issuer, 200),
            validUntil: optionalDate(args.permit?.validUntil),
          }
        : undefined,
      executionStart: optionalDate(args.executionStart),
      executionEnd: optionalDate(args.executionEnd),
      committeeStart: optionalDate(args.committeeStart),
      committeeEnd: optionalDate(args.committeeEnd),
      warrantyMonths: checkMonths(args.warrantyMonths),
      people: checkPeople(args.people),
      findings: optionalText(args.findings, 3000),
      objections: checkObjections(args.objections),
      decision: args.decision,
      reasons: optionalText(args.reasons, 3000),
      measures: optionalText(args.measures, 3000),
      copies: checkCopies(args.copies),
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch("receptions", existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("receptions", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      kind: args.kind,
      status: "draft",
      createdBy: userId,
      ...fields,
    });
  },
});

/**
 * Concludes a PV: with the committee's decision in, it stops changing and
 * records the value of the works as the approved statements add up. An
 * admitted reception at the end of the works frees 70 % of the guarantee,
 * the final one the rest.
 */
export const conclude = mutation({
  args: { receptionId: v.id("receptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: reception } = await requireFirmDoc(
      ctx,
      "receptions",
      args.receptionId,
    );
    if (reception.status === "concluded") {
      return null;
    }
    if (!reception.decision) {
      throw invalid("decision");
    }
    const estimate = await ctx.db.get("estimates", reception.estimateId);
    if (!estimate) {
      throw appError("not_found", "estimate");
    }
    const progress = await progressOf(ctx, estimate);
    await ctx.db.patch("receptions", reception._id, {
      status: "concluded",
      value: progress.approved?.subtotal ?? 0,
      concludedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Opens a concluded PV again, to correct it. */
export const reopen = mutation({
  args: { receptionId: v.id("receptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: reception } = await requireFirmDoc(
      ctx,
      "receptions",
      args.receptionId,
    );
    await ctx.db.patch("receptions", reception._id, {
      status: "draft",
      value: undefined,
      concludedAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { receptionId: v.id("receptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: reception } = await requireFirmDoc(
      ctx,
      "receptions",
      args.receptionId,
    );
    await ctx.db.delete("receptions", reception._id);
    return null;
  },
});

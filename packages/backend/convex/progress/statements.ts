import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { requireFirmDoc } from "../lib/access";
import { checkDate, romanianDate } from "../lib/dates";
import { appError, invalid } from "../lib/errors";
import {
  addDays,
  attachmentTotal,
  roundQuantity,
  rowFigures,
  statementTotals,
} from "./arithmetic";
import { contractRows } from "./contract";
import {
  checkQuantity,
  guaranteeFor,
  latestStatement,
  readRows,
  readStatements,
  refreshStatement,
  requireDraftStatement,
} from "./helpers";
import { readStatementForInvoice } from "./invoiceData";
import { attachmentRow, statementStatus } from "./validators";

// Situațiile de lucrări of an accepted Deviz: what was executed in each
// period, article by article, what that is worth, and the Atașament behind
// every quantity. One statement at a time is open; a new one starts once
// the last is approved, from the quantities it reached.

const MAX_ATTACHMENT_ROWS = 300;

/** The period's two dates, in order. */
function checkPeriod(start: string, end: string) {
  const periodStart = checkDate(start);
  const periodEnd = checkDate(end);
  if (periodStart > periodEnd) {
    throw invalid("period");
  }
  return { periodStart, periodEnd };
}

function checkAttachment(
  rows: readonly Doc<"workStatementRows">["attachment"][number][],
) {
  if (rows.length > MAX_ATTACHMENT_ROWS) {
    throw invalid("attachment");
  }
  return rows.map((row) => {
    const sides = [row.count, row.length, row.width, row.height];
    if (
      sides.some(
        (side) =>
          side !== undefined &&
          (!Number.isFinite(side) || side < 0 || side > 1e9),
      )
    ) {
      throw invalid("attachment");
    }
    return {
      label: optionalText(row.label, 200),
      count: row.count,
      length: row.length,
      width: row.width,
      height: row.height,
      deduct: row.deduct,
    };
  });
}

function about(estimate: Doc<"estimates">, client: Doc<"clients"> | null) {
  return {
    _id: estimate._id,
    organizationId: estimate.organizationId,
    number: estimate.number,
    revision: estimate.revision,
    title: estimate.title,
    status: estimate.status,
    siteAddress: estimate.siteAddress,
    county: estimate.county,
    markups: estimate.markups,
    clientId: estimate.clientId,
    client: client ? { _id: client._id, name: client.name } : null,
  };
}

async function clientOf(ctx: QueryCtx, estimate: Doc<"estimates">) {
  return estimate.clientId
    ? await ctx.db.get("clients", estimate.clientId)
    : null;
}

function listed(statement: Doc<"workStatements">) {
  return {
    _id: statement._id,
    number: statement.number,
    status: statement.status,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    date: statement.date,
    subtotal: statement.totals.subtotal,
    total: statement.totals.total,
    retention: statement.retention,
    sentAt: statement.sentAt,
    approvedAt: statement.approvedAt,
    approvedBy: statement.approvedBy,
    updatedAt: statement.updatedAt,
  };
}

/**
 * A Deviz's Situații de lucrări and how far its works have come: the
 * contract's value, what is executed, what is approved, what is left.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const statements = await readStatements(ctx, estimate._id);
    const latest = statements.at(-1) ?? null;
    const lastApproved = [...statements]
      .reverse()
      .find((statement) => statement.status === "approved");
    // The contract as the statements hold it, or as it would be.
    const rows = latest
      ? await readRows(ctx, latest._id)
      : (await contractRows(ctx, estimate)).map((row) => ({
          ...row,
          previousQuantity: 0,
          quantity: 0,
        }));
    const totals = statementTotals(rows, latest?.markups ?? estimate.markups);
    const approvedRows = lastApproved
      ? lastApproved._id === latest?._id
        ? rows
        : await readRows(ctx, lastApproved._id)
      : [];
    const approved = statementTotals(
      approvedRows,
      lastApproved?.markups ?? estimate.markups,
    );
    const guarantee = await guaranteeFor(ctx, estimate._id);
    return {
      estimate: about(estimate, await clientOf(ctx, estimate)),
      accepted: estimate.status === "accepted",
      statements: statements.map(listed),
      contract: {
        rows: rows.length,
        subtotal: totals.contract.subtotal,
        total: totals.contract.total,
      },
      // Through the last statement, draft included.
      executed: {
        subtotal: totals.cumulative.subtotal,
        total: totals.cumulative.total,
        percent: totals.percent,
      },
      // Through the last approved statement: what can be invoiced.
      approved: lastApproved
        ? {
            subtotal: approved.cumulative.subtotal,
            total: approved.cumulative.total,
            percent: approved.percent,
          }
        : null,
      remainingSubtotal: totals.remainingSubtotal,
      // A new statement starts once the last is approved, on a contract
      // with works in it.
      canCreate:
        estimate.status === "accepted" &&
        rows.length > 0 &&
        (latest === null || latest.status === "approved"),
      // The day after the last period, for the next statement's start.
      nextPeriodStart: latest ? addDays(latest.periodEnd, 1) : undefined,
      guarantee: guarantee
        ? { percent: guarantee.percent, method: guarantee.method }
        : null,
    };
  },
});

/** A Situație de lucrări with its rows and everything worked out from them. */
export const get = query({
  args: { statementId: v.id("workStatements") },
  handler: async (ctx, args) => {
    const { doc: statement } = await requireFirmDoc(
      ctx,
      "workStatements",
      args.statementId,
    );
    const estimate = await ctx.db.get("estimates", statement.estimateId);
    if (!estimate) {
      throw appError("not_found", "estimate");
    }
    const rows = await readRows(ctx, statement._id);
    const latest = await latestStatement(ctx, estimate._id);
    const guarantee = await guaranteeFor(ctx, estimate._id);
    const totals = statementTotals(rows, statement.markups);
    return {
      ...statement,
      estimate: about(estimate, await clientOf(ctx, estimate)),
      latest: latest?._id === statement._id,
      editable: statement.status === "draft" && latest?._id === statement._id,
      rows: rows.map((row) => ({
        ...row,
        ...rowFigures(row),
        attachmentTotal: attachmentTotal(row.attachment),
      })),
      period: totals.period,
      cumulative: totals.cumulative,
      contract: totals.contract,
      remainingSubtotal: totals.remainingSubtotal,
      percent: totals.percent,
      guarantee: guarantee
        ? { percent: guarantee.percent, method: guarantee.method }
        : null,
    };
  },
});

/** What the invoicing reads of an approved statement. */
export const forInvoice = query({
  args: { statementId: v.id("workStatements") },
  handler: async (ctx, args) => {
    await requireFirmDoc(ctx, "workStatements", args.statementId);
    return await readStatementForInvoice(ctx, args.statementId);
  },
});

/**
 * Starts the next Situație de lucrări of an accepted Deviz, from the
 * contract as the last statement holds it, or from the Deviz as the client
 * accepted it for the first one.
 */
export const create = mutation({
  args: {
    estimateId: v.id("estimates"),
    periodStart: v.string(),
    periodEnd: v.string(),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("workStatements"),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    if (estimate.status !== "accepted") {
      throw appError("locked", "accepted");
    }
    const previous = await latestStatement(ctx, estimate._id);
    if (previous && previous.status !== "approved") {
      throw appError("locked", "statement");
    }
    const period = checkPeriod(args.periodStart, args.periodEnd);
    const now = Date.now();
    const date = args.date ? checkDate(args.date) : romanianDate(now);
    const rows = previous
      ? (await readRows(ctx, previous._id)).map((row) => ({
          lineItemId: row.lineItemId,
          position: row.position,
          group: row.group,
          code: row.code,
          title: row.title,
          unit: row.unit,
          contractQuantity: row.contractQuantity,
          unitCost: row.unitCost,
          laborHours: row.laborHours,
          previousQuantity: roundQuantity(row.previousQuantity + row.quantity),
        }))
      : (await contractRows(ctx, estimate)).map((row) => ({
          ...row,
          previousQuantity: 0,
        }));
    if (rows.length === 0) {
      throw invalid("lineItems");
    }
    const statementId = await ctx.db.insert("workStatements", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      number: (previous?.number ?? 0) + 1,
      status: "draft",
      ...period,
      date,
      notes: optionalText(args.notes, 2000),
      markups: previous?.markups ?? estimate.markups,
      totals: statementTotals([], estimate.markups).period,
      retention: 0,
      createdBy: userId,
      updatedAt: now,
    });
    for (const row of rows) {
      await ctx.db.insert("workStatementRows", {
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        statementId,
        ...row,
        quantity: 0,
        attachment: [],
        updatedAt: now,
      });
    }
    return statementId;
  },
});

export const update = mutation({
  args: {
    statementId: v.id("workStatements"),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { statement } = await requireDraftStatement(ctx, args.statementId);
    const patch: Partial<Doc<"workStatements">> = { updatedAt: Date.now() };
    if (args.periodStart !== undefined || args.periodEnd !== undefined) {
      Object.assign(
        patch,
        checkPeriod(
          args.periodStart ?? statement.periodStart,
          args.periodEnd ?? statement.periodEnd,
        ),
      );
    }
    if (args.date !== undefined) {
      patch.date = checkDate(args.date);
    }
    if (args.notes !== undefined) {
      patch.notes = optionalText(args.notes, 2000);
    }
    await ctx.db.patch("workStatements", statement._id, patch);
    return null;
  },
});

/** A row of a statement the user may change, with its statement. */
async function requireDraftRow(
  ctx: MutationCtx,
  rowId: Id<"workStatementRows">,
) {
  const { doc: row } = await requireFirmDoc(ctx, "workStatementRows", rowId);
  const { statement } = await requireDraftStatement(ctx, row.statementId);
  return { row, statement };
}

/** Sets what of an Articol was executed in the statement's period. */
export const setQuantity = mutation({
  args: { rowId: v.id("workStatementRows"), quantity: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row, statement } = await requireDraftRow(ctx, args.rowId);
    await ctx.db.patch("workStatementRows", row._id, {
      quantity: checkQuantity(args.quantity),
      updatedAt: Date.now(),
    });
    await refreshStatement(ctx, statement);
    return null;
  },
});

/**
 * Writes the Atașament of a row: the measurements behind its quantity. With
 * `applyTotal`, the quantity becomes what they add up to.
 */
export const setAttachment = mutation({
  args: {
    rowId: v.id("workStatementRows"),
    rows: v.array(attachmentRow),
    applyTotal: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row, statement } = await requireDraftRow(ctx, args.rowId);
    const attachment = checkAttachment(args.rows);
    await ctx.db.patch("workStatementRows", row._id, {
      attachment,
      ...(args.applyTotal ? { quantity: attachmentTotal(attachment) } : {}),
      updatedAt: Date.now(),
    });
    if (args.applyTotal) {
      await refreshStatement(ctx, statement);
    }
    return null;
  },
});

/**
 * Marks everything left as executed in this period, for the last statement
 * of a job; rows already over their contract quantity are left as they are.
 */
export const completeAll = mutation({
  args: { statementId: v.id("workStatements") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { statement } = await requireDraftStatement(ctx, args.statementId);
    const rows = await readRows(ctx, statement._id);
    const now = Date.now();
    let changed = 0;
    const updated = [];
    for (const row of rows) {
      const remaining = roundQuantity(
        row.contractQuantity - row.previousQuantity,
      );
      const quantity = Math.max(remaining, 0);
      if (quantity !== row.quantity) {
        await ctx.db.patch("workStatementRows", row._id, {
          quantity,
          updatedAt: now,
        });
        changed += 1;
      }
      updated.push({ ...row, quantity });
    }
    await refreshStatement(ctx, statement, updated);
    return changed;
  },
});

/**
 * Moves the last statement along: to the beneficiary, approved by them, or
 * back to a draft. Approving freezes it, and the next statement can start.
 */
export const setStatus = mutation({
  args: {
    statementId: v.id("workStatements"),
    status: statementStatus,
    // Who confirmed the quantities for the beneficiary, when approving.
    approvedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: statement } = await requireFirmDoc(
      ctx,
      "workStatements",
      args.statementId,
    );
    const latest = await latestStatement(ctx, statement.estimateId);
    if (latest?._id !== statement._id) {
      throw appError("locked", "statement");
    }
    const now = Date.now();
    switch (args.status) {
      case "draft":
        await ctx.db.patch("workStatements", statement._id, {
          status: "draft",
          sentAt: undefined,
          approvedAt: undefined,
          approvedBy: undefined,
          updatedAt: now,
        });
        return null;
      case "sent":
        if (statement.status !== "draft") {
          throw appError("locked", "statement");
        }
        await ctx.db.patch("workStatements", statement._id, {
          status: "sent",
          sentAt: now,
          updatedAt: now,
        });
        return null;
      case "approved":
        if (statement.status === "approved") {
          return null;
        }
        await ctx.db.patch("workStatements", statement._id, {
          status: "approved",
          sentAt: statement.sentAt ?? now,
          approvedAt: now,
          approvedBy: optionalText(args.approvedBy, 200),
          updatedAt: now,
        });
        return null;
    }
  },
});

/** Deletes the last statement of a Deviz, with its rows. */
export const remove = mutation({
  args: { statementId: v.id("workStatements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: statement } = await requireFirmDoc(
      ctx,
      "workStatements",
      args.statementId,
    );
    const latest = await latestStatement(ctx, statement.estimateId);
    if (latest?._id !== statement._id) {
      throw appError("locked", "statement");
    }
    for (const row of await readRows(ctx, statement._id)) {
      await ctx.db.delete("workStatementRows", row._id);
    }
    await ctx.db.delete("workStatements", statement._id);
    return null;
  },
});

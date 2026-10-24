import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { withClientNames } from "./estimates/estimates";
import { requireMember } from "./lib/access";
import { listAlerts } from "./prices/alerts";

// Acasă: what the firm has in hand and what wants doing today, in one read.

const DAY_MS = 24 * 60 * 60_000;
// Devize read in each status, and recent ones listed.
const PER_STATUS = 200;
const RECENT = 6;
// Client questions read for the ones still waiting for the firm.
const QUESTIONS = 100;
const MAX_TODO = 12;
// A sent Ofertă the client hasn't opened after this long is worth a call.
const UNREAD_AFTER_MS = 2 * DAY_MS;
const EXPIRING_WITHIN_MS = 7 * DAY_MS;
const DEADLINE_WITHIN_MS = 14 * DAY_MS;
const ACCEPTED_WINDOW_MS = 30 * DAY_MS;

type EstimateSummary = {
  _id: Id<"estimates">;
  number: number;
  revision: number;
  title: string;
  clientName?: string;
};

// What wants doing, most pressing kind first: a client waiting for an answer,
// money moving, a tender's deadline, an Ofertă about to expire, one unread.
type Todo = { estimate: EstimateSummary } & (
  | { kind: "question"; count: number }
  | { kind: "alert"; percent: number }
  | { kind: "deadline"; date: string; days: number }
  | { kind: "expiring"; days: number }
  | { kind: "unread"; days: number }
);

const todoOrder: Record<Todo["kind"], number> = {
  question: 0,
  alert: 1,
  deadline: 2,
  expiring: 3,
  unread: 4,
};

async function byStatus(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  status: Doc<"estimates">["status"],
) {
  return await ctx.db
    .query("estimates")
    .withIndex("by_organizationId_and_status_and_updatedAt", (q) =>
      q.eq("organizationId", organizationId).eq("status", status),
    )
    .order("desc")
    .take(PER_STATUS);
}

function sumTotals(estimates: readonly Doc<"estimates">[]) {
  return estimates.reduce((sum, estimate) => sum + estimate.totals.total, 0);
}

/** The day a tender closes, as a moment: the end of that day, UTC. */
function deadlineAt(deadline: string): number | undefined {
  const at = Date.parse(`${deadline}T23:59:59Z`);
  return Number.isNaN(at) ? undefined : at;
}

/** The firm's page of the day: figures, what to do and the recent devize. */
export const overview = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const now = Date.now();
    const [drafts, sent, accepted, rejected] = await Promise.all([
      byStatus(ctx, args.organizationId, "draft"),
      byStatus(ctx, args.organizationId, "sent"),
      byStatus(ctx, args.organizationId, "accepted"),
      byStatus(ctx, args.organizationId, "rejected"),
    ]);

    const names = new Map<Id<"clients">, string | undefined>();
    const summarize = async (
      estimate: Doc<"estimates">,
    ): Promise<EstimateSummary> => {
      let clientName: string | undefined;
      if (estimate.clientId) {
        if (!names.has(estimate.clientId)) {
          const client = await ctx.db.get("clients", estimate.clientId);
          names.set(estimate.clientId, client?.name);
        }
        clientName = names.get(estimate.clientId);
      }
      return {
        _id: estimate._id,
        number: estimate.number,
        revision: estimate.revision,
        title: estimate.title,
        clientName,
      };
    };

    const todo: Todo[] = [];
    let unread = 0;
    for (const estimate of sent) {
      const offers = await ctx.db
        .query("offers")
        .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
        .take(20);
      const live = offers.find(
        (offer) =>
          (offer.status === "sent" || offer.status === "viewed") &&
          offer.replacedBy === undefined,
      );
      if (!live) {
        continue;
      }
      if (live.status === "sent") {
        unread++;
        if (now - live.sentAt >= UNREAD_AFTER_MS) {
          todo.push({
            kind: "unread",
            estimate: await summarize(estimate),
            days: Math.floor((now - live.sentAt) / DAY_MS),
          });
        }
      }
      if (
        live.expiresAt !== undefined &&
        live.expiresAt > now &&
        live.expiresAt - now <= EXPIRING_WITHIN_MS
      ) {
        todo.push({
          kind: "expiring",
          estimate: await summarize(estimate),
          days: Math.ceil((live.expiresAt - now) / DAY_MS),
        });
      }
    }

    const questions = await ctx.db
      .query("offerQuestions")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(QUESTIONS);
    const waiting = new Map<Id<"estimates">, number>();
    for (const question of questions) {
      if (question.status === "waiting") {
        waiting.set(
          question.estimateId,
          (waiting.get(question.estimateId) ?? 0) + 1,
        );
      }
    }
    for (const [estimateId, count] of waiting) {
      const estimate = await ctx.db.get("estimates", estimateId);
      if (estimate) {
        todo.push({
          kind: "question",
          estimate: await summarize(estimate),
          count,
        });
      }
    }

    const { alerts } = await listAlerts(ctx, args.organizationId);
    for (const alert of alerts.slice(0, 5)) {
      todo.push({
        kind: "alert",
        estimate: {
          _id: alert.estimate._id,
          number: alert.estimate.number,
          revision: alert.estimate.revision,
          title: alert.estimate.title,
          clientName: alert.estimate.clientName,
        },
        percent: alert.percent,
      });
    }

    for (const estimate of drafts) {
      const deadline = estimate.tender?.deadline;
      const at = deadline ? deadlineAt(deadline) : undefined;
      if (
        deadline &&
        at !== undefined &&
        at >= now &&
        at - now <= DEADLINE_WITHIN_MS
      ) {
        todo.push({
          kind: "deadline",
          estimate: await summarize(estimate),
          date: deadline,
          days: Math.floor((at - now) / DAY_MS),
        });
      }
    }
    todo.sort((a, b) => todoOrder[a.kind] - todoOrder[b.kind]);

    const recentRows = await ctx.db
      .query("estimates")
      .withIndex("by_organizationId_and_updatedAt", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(RECENT);
    const recent = await withClientNames(ctx, recentRows);

    const acceptedLately = accepted.filter(
      (estimate) => now - estimate.updatedAt <= ACCEPTED_WINDOW_MS,
    );
    const firm = await ctx.db.get("organizations", args.organizationId);
    const rate = await ctx.db
      .query("companyRates")
      .withIndex("by_organizationId_and_kind", (q) =>
        q.eq("organizationId", args.organizationId).eq("kind", "labor"),
      )
      .first();

    return {
      drafts: { count: drafts.length, total: sumTotals(drafts) },
      sent: { count: sent.length, total: sumTotals(sent), unread },
      accepted: {
        count: acceptedLately.length,
        total: sumTotals(acceptedLately),
        allTime: accepted.length,
      },
      acceptance: {
        accepted: accepted.length,
        decided: accepted.length + rejected.length,
      },
      todo: todo.slice(0, MAX_TODO),
      recent,
      // The steps a new firm still has in front of it.
      setup: {
        firmDetails: Boolean(firm?.cui),
        rates: rate !== null,
        estimates: recentRows.length > 0,
      },
    };
  },
});

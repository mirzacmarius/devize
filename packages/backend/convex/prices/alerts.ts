import type { Infer } from "convex/values";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { pricedFields, readLineItems, resolverFor } from "../estimates/helpers";
import { computeRecap, roundLei } from "../estimates/recap";
import { requireFirmDoc, requireMember } from "../lib/access";
import { invalid } from "../lib/errors";
import { isPercentUnit, normalizeText } from "../lib/text";
import { alertPercentOf, priceSettingsOf, savePriceSettings } from "./settings";
import type { priceChange } from "./validators";

// Alerte de preț (docs/adr/0010): every morning Devize prices each sent or
// accepted Deviz again at today's prices, the way `checkUpdates` does, and
// tells the firm when its total would change by at least the firm's
// threshold, with what that does to its costs and profit. The Deviz itself
// never changes (docs/adr/0005).

// Devize whose status changed longer ago are no longer checked.
const WATCH_MS = 180 * 24 * 60 * 60_000;
// An alert the daily check didn't renew is dropped after this long.
const STALE_MS = 36 * 60 * 60_000;
// How soon a firm may ask for its devize to be checked again.
const CHECK_AGAIN_MS = 5 * 60_000;
// The changes kept with an alert.
const TOP_CHANGES = 5;
// Devize scheduled for a check per batch, and a firm's devize checked at
// once in each status.
const BATCH = 100;
const FIRM_CHECKS = 200;
// Alerts read for a firm's list.
const MAX_ALERTS = 100;

const watchedStatus = v.union(v.literal("sent"), v.literal("accepted"));

function isWatched(status: Doc<"estimates">["status"]): boolean {
  return status === "sent" || status === "accepted";
}

type Change = Infer<typeof priceChange>;

/**
 * A Deviz priced again at today's prices, like `estimates.checkUpdates`: its
 * Recapitulație and the resources whose price changed, by what they add to
 * the direct costs. Prices typed on the Deviz stay as they are.
 */
export async function reprice(ctx: QueryCtx, estimate: Doc<"estimates">) {
  const resolver = resolverFor(ctx, estimate);
  const byKey = new Map<string, Change>();
  const repriced: Doc<"lineItems">[] = [];
  for (const item of await readLineItems(ctx, estimate._id)) {
    let changed = false;
    const resources = [];
    for (const resource of item.resources) {
      const price =
        resource.priceSource === "manual" || isPercentUnit(resource.unit)
          ? null
          : await resolver.resolve(resource);
      if (!price || Math.abs(price.unitPrice - resource.unitPrice) < 0.005) {
        resources.push(resource);
        continue;
      }
      changed = true;
      resources.push({ ...resource, unitPrice: price.unitPrice });
      const key =
        resource.productId ??
        resource.resourceId ??
        `${resource.kind}:${normalizeText(resource.name)}:${resource.unit}`;
      const quantity = item.quantity * resource.quantity;
      const change = byKey.get(key) ?? {
        name: resource.name,
        unit: resource.unit,
        oldPrice: resource.unitPrice,
        newPrice: price.unitPrice,
        quantity: 0,
        impact: 0,
      };
      change.quantity += quantity;
      change.impact += quantity * (price.unitPrice - resource.unitPrice);
      byKey.set(key, change);
    }
    repriced.push(changed ? { ...item, ...pricedFields(resources) } : item);
  }
  const changes = [...byKey.values()]
    .map((change) => ({
      ...change,
      quantity: Number(change.quantity.toFixed(4)),
      impact: roundLei(change.impact),
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return { totals: computeRecap(repriced, estimate.markups), changes };
}

async function alertFor(ctx: QueryCtx, estimateId: Id<"estimates">) {
  return await ctx.db
    .query("priceAlerts")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .unique();
}

/**
 * Checks one Deviz: an alert when its total at today's prices is off by at
 * least the firm's threshold, none otherwise. A dismissed alert stays
 * dismissed until the change moves by the threshold again.
 */
export const check = internalMutation({
  args: { estimateId: v.id("estimates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const alert = await alertFor(ctx, args.estimateId);
    const estimate = await ctx.db.get("estimates", args.estimateId);
    const threshold = estimate
      ? alertPercentOf(await priceSettingsOf(ctx, estimate.organizationId))
      : 0;
    if (!estimate || !isWatched(estimate.status) || threshold <= 0) {
      if (alert) {
        await ctx.db.delete("priceAlerts", alert._id);
      }
      return null;
    }
    const sent = estimate.totals;
    const { totals, changes } = await reprice(ctx, estimate);
    const percent =
      sent.total > 0
        ? Math.round(((totals.total - sent.total) / sent.total) * 1000) / 10
        : 0;
    if (Math.abs(percent) < threshold) {
      if (alert) {
        await ctx.db.delete("priceAlerts", alert._id);
      }
      return null;
    }
    const fields = {
      sentTotal: sent.total,
      currentTotal: totals.total,
      percent,
      sentDirect: sent.direct,
      currentDirect: totals.direct,
      sentProfit: sent.profit,
      // The client pays what was sent: what the costs grew by comes out of
      // the profit, and what they fell by adds to it.
      profitLeft: roundLei(sent.profit - (totals.direct - sent.direct)),
      changes: changes.slice(0, TOP_CHANGES),
      changeCount: changes.length,
      checkedAt: Date.now(),
    };
    if (!alert) {
      await ctx.db.insert("priceAlerts", {
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        ...fields,
      });
      return null;
    }
    const back =
      alert.dismissedPercent !== undefined &&
      Math.abs(percent - alert.dismissedPercent) >= threshold;
    await ctx.db.patch("priceAlerts", alert._id, {
      ...fields,
      ...(back ? { dismissedAt: undefined, dismissedPercent: undefined } : {}),
    });
    return null;
  },
});

/** The daily check: every sent or accepted Deviz, one mutation each. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const since = Date.now() - WATCH_MS;
    for (const status of ["sent", "accepted"] as const) {
      await ctx.scheduler.runAfter(0, internal.prices.alerts.sweepBatch, {
        status,
        since,
        cursor: null,
      });
    }
    await ctx.scheduler.runAfter(0, internal.prices.alerts.dropStale, {});
    return null;
  },
});

/** Schedules the check of one batch of devize, then the next batch. */
export const sweepBatch = internalMutation({
  args: {
    status: watchedStatus,
    since: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("estimates")
      .withIndex("by_status_and_updatedAt", (q) =>
        q.eq("status", args.status).gt("updatedAt", args.since),
      )
      .paginate({ numItems: BATCH, cursor: args.cursor });
    for (const estimate of batch.page) {
      await ctx.scheduler.runAfter(0, internal.prices.alerts.check, {
        estimateId: estimate._id,
      });
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.prices.alerts.sweepBatch, {
        ...args,
        cursor: batch.continueCursor,
      });
    }
    return null;
  },
});

/**
 * Drops alerts the daily check stopped renewing: their Deviz was deleted,
 * left the sent and accepted ones, or got too old.
 */
export const dropStale = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("priceAlerts")
      .withIndex("by_checkedAt", (q) =>
        q.lt("checkedAt", Date.now() - STALE_MS),
      )
      .take(BATCH);
    for (const alert of stale) {
      await ctx.db.delete("priceAlerts", alert._id);
    }
    if (stale.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.prices.alerts.dropStale, {});
    }
    return null;
  },
});

/** Schedules a check of the firm's sent and accepted devize, newest first. */
async function checkFirm(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
): Promise<number> {
  const since = Date.now() - WATCH_MS;
  let count = 0;
  for (const status of ["sent", "accepted"] as const) {
    const estimates = await ctx.db
      .query("estimates")
      .withIndex("by_organizationId_and_status_and_updatedAt", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("status", status)
          .gt("updatedAt", since),
      )
      .order("desc")
      .take(FIRM_CHECKS);
    for (const estimate of estimates) {
      await ctx.scheduler.runAfter(0, internal.prices.alerts.check, {
        estimateId: estimate._id,
      });
    }
    count += estimates.length;
  }
  return count;
}

/** The firm's alerts, biggest change first, and its threshold. */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const alertPercent = alertPercentOf(
      await priceSettingsOf(ctx, args.organizationId),
    );
    const alerts = [];
    let dismissed = 0;
    const rows =
      alertPercent > 0
        ? await ctx.db
            .query("priceAlerts")
            .withIndex("by_organizationId_and_checkedAt", (q) =>
              q.eq("organizationId", args.organizationId),
            )
            .order("desc")
            .take(MAX_ALERTS)
        : [];
    for (const alert of rows) {
      const estimate = await ctx.db.get("estimates", alert.estimateId);
      if (
        !estimate ||
        !isWatched(estimate.status) ||
        Math.abs(alert.percent) < alertPercent
      ) {
        continue;
      }
      if (alert.dismissedAt !== undefined) {
        dismissed++;
        continue;
      }
      const client = estimate.clientId
        ? await ctx.db.get("clients", estimate.clientId)
        : null;
      const { organizationId, estimateId, dismissedPercent, ...fields } = alert;
      alerts.push({
        ...fields,
        estimate: {
          _id: estimate._id,
          number: estimate.number,
          revision: estimate.revision,
          title: estimate.title,
          status: estimate.status,
          clientName: client?.name,
        },
      });
    }
    alerts.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
    return { alertPercent, alerts, dismissed };
  },
});

/** How many alerts the firm hasn't dismissed, for the menu. */
export const count = query({
  args: { organizationId: v.id("organizations") },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const alertPercent = alertPercentOf(
      await priceSettingsOf(ctx, args.organizationId),
    );
    if (alertPercent <= 0) {
      return 0;
    }
    const rows = await ctx.db
      .query("priceAlerts")
      .withIndex("by_organizationId_and_checkedAt", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(MAX_ALERTS);
    let count = 0;
    for (const alert of rows) {
      if (
        alert.dismissedAt !== undefined ||
        Math.abs(alert.percent) < alertPercent
      ) {
        continue;
      }
      const estimate = await ctx.db.get("estimates", alert.estimateId);
      if (estimate && isWatched(estimate.status)) {
        count++;
      }
    }
    return count;
  },
});

/** Hides an alert until its change moves by the threshold again. */
export const dismiss = mutation({
  args: { alertId: v.id("priceAlerts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: alert } = await requireFirmDoc(
      ctx,
      "priceAlerts",
      args.alertId,
    );
    await ctx.db.patch("priceAlerts", alert._id, {
      dismissedAt: Date.now(),
      dismissedPercent: alert.percent,
    });
    return null;
  },
});

/**
 * Sets the change of a sent Deviz's total, in percent, from which the firm
 * gets an alert; 0 turns alerts off. The firm's devize are checked again.
 */
export const setThreshold = mutation({
  args: { organizationId: v.id("organizations"), percent: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    if (
      !Number.isFinite(args.percent) ||
      args.percent < 0 ||
      args.percent > 100
    ) {
      throw invalid("percent");
    }
    await savePriceSettings(ctx, args.organizationId, {
      alertPercent: Math.round(args.percent * 10) / 10,
    });
    await checkFirm(ctx, args.organizationId);
    return null;
  },
});

/**
 * Checks the firm's sent and accepted devize now rather than tomorrow
 * morning. Asked again within minutes, it does nothing.
 */
export const checkNow = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.object({ started: v.boolean(), count: v.number() }),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const settings = await priceSettingsOf(ctx, args.organizationId);
    const now = Date.now();
    if (
      settings?.alertsCheckedAt !== undefined &&
      now - settings.alertsCheckedAt < CHECK_AGAIN_MS
    ) {
      return { started: false, count: 0 };
    }
    await savePriceSettings(ctx, args.organizationId, {
      alertsCheckedAt: now,
    });
    return { started: true, count: await checkFirm(ctx, args.organizationId) };
  },
});

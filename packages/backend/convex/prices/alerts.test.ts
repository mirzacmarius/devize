import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  signIn,
  type TestConvex,
} from "../test.helper";

// Made-up norms and prices: a wall tiling norm and a store selling its tiles.

type Firm = Awaited<ReturnType<typeof firmOwner>>;

/** The base norm and its shared tiles resource. */
async function tilingNorm(t: TestConvex) {
  const { normId } = await publishedBaseNorm(t);
  const tiles = await t.run(
    async (ctx) =>
      await ctx.db
        .query("resources")
        .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
          q
            .eq("organizationId", undefined)
            .eq("kind", "material")
            .eq("nameKey", "faianta"),
        )
        .unique(),
  );
  if (!tiles) {
    throw new Error("no tiles resource");
  }
  return { normId, tilesId: tiles._id };
}

/** A Deviz of 20 mp of tiling, priced at the norm's prices, then sent. */
async function sentEstimate(
  firm: Firm,
  normId: Id<"norms">,
  status: "sent" | "draft" = "sent",
) {
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie Popescu",
  });
  await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
    estimateId,
    normId,
    quantity: 20,
  });
  if (status === "sent") {
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId,
      status,
    });
  }
  return estimateId;
}

/** A store's price for the tiles, read from its page: lei with VAT a mp. */
async function tilesPrice(
  t: TestConvex,
  tilesId: Id<"resources">,
  price: number,
) {
  await t.run(async (ctx) => {
    const url = "https://www.dedeman.ro/ro/faianta-alba/p/1";
    const fields = { price, checkedAt: Date.now() };
    const listing = await ctx.db
      .query("listings")
      .withIndex("by_url", (q) => q.eq("url", url))
      .unique();
    if (listing) {
      await ctx.db.patch("listings", listing._id, fields);
      return;
    }
    await ctx.db.insert("listings", {
      source: "retailer",
      store: "dedeman",
      resourceId: tilesId,
      title: "Faianță albă 25×40",
      url,
      includedVat: 21,
      saleUnit: "mp",
      unitsPerSale: 1,
      status: "active",
      ...fields,
    });
  });
}

async function check(t: TestConvex, estimateId: Id<"estimates">) {
  await t.mutation(internal.prices.alerts.check, { estimateId });
}

describe("price alerts", () => {
  test("tell what today's prices do to a sent Deviz, without changing it", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    const estimateId = await sentEstimate(ana, normId);
    const before = await ana.as.query(api.estimates.estimates.get, {
      estimateId,
    });

    // At the norm's prices nothing changed.
    await check(t, estimateId);
    let list = await ana.as.query(api.prices.alerts.list, {
      organizationId: ana.organizationId,
    });
    expect(list).toEqual({ alertPercent: 5, alerts: [], dismissed: 0 });

    // The tiles now cost 60 lei a mp without VAT instead of 45.
    await tilesPrice(t, tilesId, 72.6);
    await check(t, estimateId);
    list = await ana.as.query(api.prices.alerts.list, {
      organizationId: ana.organizationId,
    });
    expect(list.alerts).toHaveLength(1);
    const [alert] = list.alerts;
    const updates = await ana.as.query(api.estimates.estimates.checkUpdates, {
      estimateId,
    });
    expect(alert).toMatchObject({
      sentTotal: before.totals.total,
      currentTotal: updates.repricedTotals.total,
      sentDirect: before.totals.direct,
      currentDirect: updates.repricedTotals.direct,
      sentProfit: before.totals.profit,
      changeCount: 1,
      changes: [
        {
          name: "Faianță",
          unit: "mp",
          oldPrice: 45,
          newPrice: 60,
          quantity: 21,
          impact: 315,
        },
      ],
      estimate: { _id: estimateId, title: "Baie Popescu", status: "sent" },
    });
    expect(alert?.percent).toBeCloseTo(
      ((updates.repricedTotals.total - before.totals.total) /
        before.totals.total) *
        100,
      1,
    );
    expect(alert?.percent).toBeGreaterThan(5);
    // The client pays what was sent, so the dearer tiles come out of profit.
    expect(alert?.profitLeft).toBeCloseTo(
      before.totals.profit -
        (updates.repricedTotals.direct - before.totals.direct),
      2,
    );
    expect(
      await ana.as.query(api.prices.alerts.count, {
        organizationId: ana.organizationId,
      }),
    ).toBe(1);

    // The Deviz the client saw is untouched.
    const after = await ana.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(after.totals).toEqual(before.totals);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  test("follow the firm's threshold, and come back after a dismissal only when prices move again", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    const estimateId = await sentEstimate(ana, normId);
    await tilesPrice(t, tilesId, 72.6);
    await check(t, estimateId);
    const active = async () =>
      await ana.as.query(api.prices.alerts.list, {
        organizationId: ana.organizationId,
      });

    // A higher threshold checks the firm's devize again at once.
    await ana.as.mutation(api.prices.alerts.setThreshold, {
      organizationId: ana.organizationId,
      percent: 50,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect(await active()).toMatchObject({ alertPercent: 50, alerts: [] });
    await ana.as.mutation(api.prices.alerts.setThreshold, {
      organizationId: ana.organizationId,
      percent: 5,
    });
    await t.finishAllScheduledFunctions(() => {});
    const [alert] = (await active()).alerts;
    expect(alert).toBeDefined();

    await ana.as.mutation(api.prices.alerts.dismiss, {
      alertId: alert?._id as Id<"priceAlerts">,
    });
    expect(await active()).toMatchObject({ alerts: [], dismissed: 1 });
    expect(
      await ana.as.query(api.prices.alerts.count, {
        organizationId: ana.organizationId,
      }),
    ).toBe(0);
    // The same change tomorrow stays dismissed...
    await check(t, estimateId);
    expect((await active()).alerts).toEqual([]);
    // ...a bigger one comes back.
    await tilesPrice(t, tilesId, 96.8);
    await check(t, estimateId);
    expect((await active()).alerts).toHaveLength(1);

    // Turned off, there are none.
    await ana.as.mutation(api.prices.alerts.setThreshold, {
      organizationId: ana.organizationId,
      percent: 0,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect(await active()).toEqual({
      alertPercent: 0,
      alerts: [],
      dismissed: 0,
    });
    expect(
      await t.run(async (ctx) => await ctx.db.query("priceAlerts").collect()),
    ).toEqual([]);
  });

  test("watch sent and accepted devize only", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    const sentId = await sentEstimate(ana, normId);
    await sentEstimate(ana, normId, "draft");
    await tilesPrice(t, tilesId, 72.6);

    await t.mutation(internal.prices.alerts.sweep, {});
    await t.finishAllScheduledFunctions(() => {});
    const alerts = await t.run(
      async (ctx) => await ctx.db.query("priceAlerts").collect(),
    );
    expect(alerts.map((alert) => alert.estimateId)).toEqual([sentId]);

    // Back to draft, it is no longer listed, and its alert goes.
    await ana.as.mutation(api.estimates.estimates.setStatus, {
      estimateId: sentId,
      status: "draft",
    });
    expect(
      (
        await ana.as.query(api.prices.alerts.list, {
          organizationId: ana.organizationId,
        })
      ).alerts,
    ).toEqual([]);
    await check(t, sentId);
    expect(
      await t.run(async (ctx) => await ctx.db.query("priceAlerts").collect()),
    ).toEqual([]);
  });

  test("drop alerts the daily check stopped renewing", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    const estimateId = await sentEstimate(ana, normId);
    await tilesPrice(t, tilesId, 72.6);
    await check(t, estimateId);
    await t.run(async (ctx) => {
      for (const alert of await ctx.db.query("priceAlerts").collect()) {
        await ctx.db.patch("priceAlerts", alert._id, {
          checkedAt: Date.now() - 2 * 24 * 60 * 60_000,
        });
      }
    });
    await t.mutation(internal.prices.alerts.dropStale, {});
    expect(
      await t.run(async (ctx) => await ctx.db.query("priceAlerts").collect()),
    ).toEqual([]);
  });

  test("check a firm's devize again on demand, once in a few minutes", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    await sentEstimate(ana, normId);
    await tilesPrice(t, tilesId, 72.6);
    expect(
      await ana.as.mutation(api.prices.alerts.checkNow, {
        organizationId: ana.organizationId,
      }),
    ).toEqual({ started: true, count: 1 });
    await t.finishAllScheduledFunctions(() => {});
    expect(
      await ana.as.query(api.prices.alerts.count, {
        organizationId: ana.organizationId,
      }),
    ).toBe(1);
    expect(
      await ana.as.mutation(api.prices.alerts.checkNow, {
        organizationId: ana.organizationId,
      }),
    ).toEqual({ started: false, count: 0 });
  });

  test("belong to the firm: others can't see or dismiss them, and members can't change the threshold", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    const estimateId = await sentEstimate(ana, normId);
    await tilesPrice(t, tilesId, 72.6);
    await check(t, estimateId);
    const [alert] = await t.run(
      async (ctx) => await ctx.db.query("priceAlerts").collect(),
    );

    await expect(
      bogdan.as.query(api.prices.alerts.list, {
        organizationId: ana.organizationId,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.mutation(api.prices.alerts.dismiss, {
        alertId: alert?._id as Id<"priceAlerts">,
      }),
    ).rejects.toThrow(/not_found/);

    const cristi = await signIn(t, { name: "Cristi" });
    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", {
        organizationId: ana.organizationId,
        userId: cristi.userId,
        role: "member",
        lastActiveAt: Date.now(),
      });
    });
    await expect(
      cristi.as.mutation(api.prices.alerts.setThreshold, {
        organizationId: ana.organizationId,
        percent: 10,
      }),
    ).rejects.toThrow(/forbidden/);
    await expect(
      ana.as.mutation(api.prices.alerts.setThreshold, {
        organizationId: ana.organizationId,
        percent: -1,
      }),
    ).rejects.toThrow(/invalid/);
  });

  test("go with the firm when it is deleted", async () => {
    const t = setup();
    const { normId, tilesId } = await tilingNorm(t);
    const ana = await firmOwner(t, "Ana");
    const estimateId = await sentEstimate(ana, normId);
    await tilesPrice(t, tilesId, 72.6);
    await check(t, estimateId);

    await ana.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});
    expect(
      await t.run(async (ctx) => ({
        alerts: await ctx.db.query("priceAlerts").collect(),
        settings: await ctx.db.query("priceSettings").collect(),
      })),
    ).toEqual({ alerts: [], settings: [] });
  });
});

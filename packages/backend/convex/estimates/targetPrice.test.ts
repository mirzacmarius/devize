import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { devizFor } from "../offers/test.helper";
import { firmOwner, setup } from "../test.helper";

describe("a target price", () => {
  test("is reached through the profit rate", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const before = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const target = Math.round(before.totals.total * 1.05);
    const result = await firm.as.mutation(api.estimates.targetPrice.apply, {
      estimateId,
      target,
      basis: "total",
      method: "profit",
    });
    const after = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(result.total).toBe(after.totals.total);
    expect(Math.abs(after.totals.total - target)).toBeLessThan(1);
    expect(after.markups.profit).toBeGreaterThan(before.markups.profit);
    expect(after.totals.direct).toBe(before.totals.direct);
    expect(after.lineItems.map((item) => item.resources)).toEqual(
      before.lineItems.map((item) => item.resources),
    );
  });

  test("is reached through the labour, whose prices then stay as set", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const before = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const target = Math.round(before.totals.subtotal * 0.97);
    const result = await firm.as.mutation(api.estimates.targetPrice.apply, {
      estimateId,
      target,
      basis: "subtotal",
      method: "labor",
    });
    const after = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(result.total).toBe(after.totals.subtotal);
    expect(Math.abs(after.totals.subtotal - target)).toBeLessThan(1);
    expect(after.totals.material).toBe(before.totals.material);
    expect(after.markups).toEqual(before.markups);
    const labor = after.lineItems
      .flatMap((item) => item.resources)
      .filter((resource) => resource.kind === "labor");
    expect(labor.length).toBeGreaterThan(0);
    for (const resource of labor) {
      expect(resource.priceSource).toBe("manual");
    }

    // Repricing the Deviz keeps them.
    await firm.as.mutation(api.estimates.lineItems.refreshPrices, {
      estimateId,
    });
    const repriced = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(repriced.totals.subtotal).toBe(after.totals.subtotal);
  });

  test("below cost, on a sent Deviz or another firm's, is refused", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const before = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    await expect(
      firm.as.mutation(api.estimates.targetPrice.apply, {
        estimateId,
        target: Math.round(before.totals.direct / 2),
        basis: "total",
        method: "profit",
      }),
    ).rejects.toThrow(/target/);
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.mutation(api.estimates.targetPrice.apply, {
        estimateId,
        target: before.totals.total,
        basis: "total",
        method: "profit",
      }),
    ).rejects.toThrow(/not_found/);
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId,
      status: "sent",
    });
    await expect(
      firm.as.mutation(api.estimates.targetPrice.apply, {
        estimateId,
        target: before.totals.total,
        basis: "total",
        method: "profit",
      }),
    ).rejects.toThrow(/locked/);
  });
});

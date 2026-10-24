import { describe, expect, test } from "bun:test";
import { tilingResources } from "../test.helper";
import { applyMarkups, computeRecap, type Markups, unitCost } from "./recap";
import { fitLabor, fitProfit, onBasis, type TargetBasis } from "./target";

// The made-up tiling norm priced: tiler 40 lei/h, helper 25 lei/h, the rest
// at its reference prices.
const tiling = tilingResources.map((resource) => ({
  ...resource,
  unitPrice:
    resource.name === "Faianțar"
      ? 40
      : resource.name === "Muncitor deservire"
        ? 25
        : (resource.referencePrice ?? 0),
}));
const markups: Markups = { cam: 2.25, indirect: 10, profit: 5, vat: 21 };
const lines = [{ quantity: 24, resources: tiling }];
const totals = computeRecap(
  lines.map((line) => ({
    quantity: line.quantity,
    ...unitCost(line.resources),
  })),
  markups,
);

describe("fitting a target through the profit", () => {
  test("starts from the Deviz as priced", () => {
    expect(totals.total).toBe(3552.43);
  });

  for (const [target, basis] of [
    [3800, "total"],
    [4000, "subtotal"],
    [3383.28, "total"],
  ] as [number, TargetBasis][]) {
    test(`finds the nearest rate to ${target} lei (${basis})`, () => {
      const fit = fitProfit(totals, markups, target, basis);
      if (!fit.ok) {
        throw new Error(`no fit: ${fit.reason}`);
      }
      // Two decimals, as the Cote print.
      expect(Math.round(fit.profit * 100) / 100).toBe(fit.profit);
      const gap = (profit: number) =>
        Math.abs(
          onBasis(
            applyMarkups(totals, totals.laborHours, { ...markups, profit }),
            basis,
          ) - target,
        );
      expect(gap(fit.profit)).toBeLessThanOrEqual(gap(fit.profit - 0.01));
      expect(gap(fit.profit)).toBeLessThanOrEqual(gap(fit.profit + 0.01));
      // A step of the rate moves the total by about 0,28 lei here.
      expect(gap(fit.profit)).toBeLessThan(0.3);
      expect(fit.recap.direct).toBe(totals.direct);
      expect(onBasis(fit.recap, basis)).toBe(
        onBasis(
          applyMarkups(totals, totals.laborHours, {
            ...markups,
            profit: fit.profit,
          }),
          basis,
        ),
      );
    });
  }

  test("won't go below what the Deviz costs with no profit", () => {
    const fit = fitProfit(totals, markups, 3000, "total");
    expect(fit).toEqual({
      ok: false,
      reason: "belowCost",
      limit: applyMarkups(totals, totals.laborHours, { ...markups, profit: 0 })
        .total,
    });
  });

  test("won't go past a 100% profit", () => {
    const fit = fitProfit(totals, markups, 10_000, "total");
    expect(fit).toMatchObject({ ok: false, reason: "tooHigh" });
  });
});

describe("fitting a target through the labour", () => {
  test("changes every hour of labour by the same factor, nothing else", () => {
    const fit = fitLabor(lines, markups, 3400, "total");
    if (!fit.ok) {
      throw new Error(`no fit: ${fit.reason}`);
    }
    expect(Math.abs(fit.recap.total - 3400)).toBeLessThan(1);
    expect(fit.recap.material).toBe(totals.material);
    expect(fit.recap.labor).toBeLessThan(totals.labor);
    const price = (name: string) =>
      fit.resources[0]?.find((resource) => resource.name === name)?.unitPrice;
    expect(price("Faianță")).toBe(45);
    const tiler = price("Faianțar") ?? 0;
    const helper = price("Muncitor deservire") ?? 0;
    expect(tiler / 40).toBeCloseTo(helper / 25, 2);
    expect(fit.lowestHourly).toBe(helper);
    // Whatever the dialog shows is what the line items will add up to.
    expect(
      computeRecap(
        [{ quantity: 24, ...unitCost(fit.resources[0] ?? []) }],
        markups,
      ),
    ).toEqual(fit.recap);
  });

  test("raises it too, on the total without VAT", () => {
    const fit = fitLabor(lines, markups, 3500, "subtotal");
    expect(fit.ok && Math.abs(fit.recap.subtotal - 3500) < 1).toBe(true);
  });

  test("says when the labour can't get there", () => {
    expect(fitLabor(lines, markups, 2000, "total")).toMatchObject({
      ok: false,
      reason: "belowCost",
    });
    expect(fitLabor(lines, markups, 100_000, "total")).toMatchObject({
      ok: false,
      reason: "tooHigh",
    });
    const materials = [
      {
        quantity: 10,
        resources: tiling.filter((resource) => resource.kind !== "labor"),
      },
    ];
    expect(fitLabor(materials, markups, 5000, "total")).toMatchObject({
      ok: false,
      reason: "noLabor",
    });
  });
});

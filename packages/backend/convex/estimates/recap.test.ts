import { describe, expect, test } from "bun:test";
import {
  applyMarkups,
  computeRecap,
  lineTotals,
  type PricedResource,
  roundLei,
  sumLines,
  unitCost,
  zeroAmounts,
} from "./recap";

// A made-up wall tiling norm, per mp.
const tiling: PricedResource[] = [
  { kind: "material", unit: "kg", quantity: 4.5, unitPrice: 2.4 },
  { kind: "material", unit: "mp", quantity: 1.05, unitPrice: 45 },
  { kind: "material", unit: "kg", quantity: 0.5, unitPrice: 6 },
  { kind: "material", unit: "%", quantity: 2, unitPrice: 0 },
  { kind: "labor", unit: "ora", quantity: 0.9, unitPrice: 40 },
  { kind: "labor", unit: "ora", quantity: 0.2, unitPrice: 25 },
  { kind: "equipment", unit: "ora", quantity: 0.05, unitPrice: 10 },
  { kind: "transport", unit: "%", quantity: 2, unitPrice: 0 },
];

const markups = { cam: 2.25, indirect: 10, profit: 5, vat: 21 };

describe("roundLei", () => {
  test("rounds halves away from zero despite float noise", () => {
    expect(roundLei(1.005)).toBe(1.01);
    expect(roundLei(2.675)).toBe(2.68);
    expect(roundLei(-1.005)).toBe(-1.01);
    expect(roundLei(139.8045)).toBe(139.8);
  });

  test("never returns negative zero", () => {
    expect(Object.is(roundLei(-0.001), 0)).toBe(true);
  });
});

describe("unitCost", () => {
  test("prices each kind and rounds it to bani", () => {
    const result = unitCost(tiling);
    expect(result.unitCost).toEqual({
      // 10.80 + 47.25 + 3.00, plus 2% small materials
      material: 62.27,
      labor: 41,
      equipment: 0.5,
      // 2% of the materials before small materials
      transport: 1.22,
    });
  });

  test("counts labour hours", () => {
    expect(unitCost(tiling).laborHours).toBe(1.1);
  });

  test("applies labour percentages to labour", () => {
    const result = unitCost([
      { kind: "labor", unit: "ora", quantity: 1, unitPrice: 30 },
      { kind: "labor", unit: "%", quantity: 10, unitPrice: 0 },
    ]);
    expect(result.unitCost.labor).toBe(33);
    expect(result.laborHours).toBe(1);
  });

  test("is zero without resources", () => {
    expect(unitCost([])).toEqual({ unitCost: zeroAmounts, laborHours: 0 });
  });
});

describe("lineTotals", () => {
  test("multiplies each kind's unit cost by the quantity", () => {
    const { unitCost: cost, laborHours } = unitCost(tiling);
    expect(lineTotals({ unitCost: cost, quantity: 24, laborHours })).toEqual({
      material: 1494.48,
      labor: 984,
      equipment: 12,
      transport: 29.28,
      total: 2519.76,
    });
  });
});

describe("sumLines", () => {
  test("adds bani exactly", () => {
    const line = {
      unitCost: { ...zeroAmounts, material: 0.1 },
      quantity: 1,
      laborHours: 0,
    };
    const { amounts } = sumLines(Array.from({ length: 10 }, () => line));
    expect(amounts.material).toBe(1);
    const mixed = sumLines([
      line,
      { ...line, unitCost: { ...zeroAmounts, material: 0.2 } },
    ]);
    expect(mixed.amounts.material).toBe(0.3);
  });
});

describe("computeRecap", () => {
  test("adds CAM, indirect costs, profit and VAT in order", () => {
    const { unitCost: cost, laborHours } = unitCost(tiling);
    const recap = computeRecap(
      [{ unitCost: cost, quantity: 24, laborHours }],
      markups,
    );
    expect(recap).toEqual({
      material: 1494.48,
      labor: 984,
      equipment: 12,
      transport: 29.28,
      // 2.25% of labour
      cam: 22.14,
      direct: 2541.9,
      // 10% of direct costs
      indirect: 254.19,
      // 5% of 2796.09
      profit: 139.8,
      subtotal: 2935.89,
      // 21% of 2935.89 = 616.5369
      vat: 616.54,
      total: 3552.43,
      laborHours: 26.4,
    });
  });

  test("has no VAT for a firm that doesn't charge it", () => {
    const recap = applyMarkups({ ...zeroAmounts, material: 100 }, 0, {
      ...markups,
      vat: 0,
    });
    expect(recap.vat).toBe(0);
    expect(recap.total).toBe(recap.subtotal);
    // 100 + 10% + 5% of 110
    expect(recap.subtotal).toBe(115.5);
  });

  test("is all zeros for an empty Deviz", () => {
    const recap = computeRecap([], markups);
    expect(recap.total).toBe(0);
    expect(recap.laborHours).toBe(0);
  });
});

import { describe, expect, test } from "bun:test";
import {
  addDays,
  attachmentRowQuantity,
  attachmentTotal,
  releaseAmounts,
  retentionOf,
  roundQuantity,
  rowFigures,
  statementTotals,
  unitPriceOf,
} from "./arithmetic";

const unitCost = { material: 60.5, labor: 31, equipment: 0.5, transport: 1.21 };
const markups = { cam: 2.25, indirect: 10, profit: 5, vat: 21 };

describe("attachment", () => {
  test("multiplies the sides it has and subtracts deductions", () => {
    expect(
      attachmentRowQuantity({
        count: 2,
        length: 3.5,
        width: 2.6,
        deduct: false,
      }),
    ).toBe(18.2);
    expect(attachmentRowQuantity({ count: 1, length: 4, deduct: false })).toBe(
      4,
    );
    expect(
      attachmentRowQuantity({
        count: 1,
        length: 0.9,
        width: 2.1,
        deduct: true,
      }),
    ).toBe(-1.89);
    expect(
      attachmentTotal([
        {
          label: "Perete nord",
          count: 1,
          length: 3.5,
          height: 2.6,
          deduct: false,
        },
        { label: "Ușă", count: 1, length: 0.9, height: 2.1, deduct: true },
      ]),
    ).toBe(7.21);
    // Deductions never take a total below zero.
    expect(attachmentTotal([{ count: 1, length: 2, deduct: true }])).toBe(0);
    expect(roundQuantity(1.00049)).toBe(1);
    expect(roundQuantity(1.0005)).toBe(1.001);
  });
});

describe("rowFigures", () => {
  test("adds the executed quantities up and prices them like the Deviz", () => {
    const figures = rowFigures({
      unitCost,
      laborHours: 1.1,
      contractQuantity: 24,
      previousQuantity: 10,
      quantity: 8,
    });
    expect(figures.unitPrice).toBe(93.21);
    expect(figures.cumulativeQuantity).toBe(18);
    expect(figures.remainingQuantity).toBe(6);
    expect(figures.percent).toBe(75);
    expect(figures.over).toBe(false);
    expect(figures.value).toBe(745.68);
    expect(figures.cumulativeValue).toBe(1677.78);
    expect(figures.contractValue).toBe(2237.04);
  });

  test("flags more than the contract, and a contract of nothing", () => {
    const over = rowFigures({
      unitCost,
      laborHours: 0,
      contractQuantity: 10,
      previousQuantity: 8,
      quantity: 3,
    });
    expect(over.over).toBe(true);
    expect(over.remainingQuantity).toBe(-1);
    expect(over.percent).toBe(110);
    const nothing = rowFigures({
      unitCost,
      laborHours: 0,
      contractQuantity: 0,
      previousQuantity: 0,
      quantity: 0,
    });
    expect(nothing.percent).toBe(0);
    expect(nothing.over).toBe(false);
  });
});

describe("statementTotals", () => {
  test("gives the period, the cumulative and the contract Recapitulație", () => {
    const rows = [
      {
        unitCost,
        laborHours: 1.1,
        contractQuantity: 24,
        previousQuantity: 10,
        quantity: 8,
      },
      {
        unitCost: { material: 30, labor: 32, equipment: 0, transport: 0 },
        laborHours: 0.8,
        contractQuantity: 6,
        previousQuantity: 0,
        quantity: 0,
      },
    ];
    const totals = statementTotals(rows, markups);
    expect(totals.period.material).toBe(484);
    expect(totals.period.labor).toBe(248);
    expect(totals.period.laborHours).toBe(8.8);
    expect(totals.cumulative.material).toBe(1089);
    expect(totals.contract.material).toBe(1452 + 180);
    expect(totals.remainingSubtotal).toBe(
      Math.round(
        (totals.contract.subtotal - totals.cumulative.subtotal) * 100,
      ) / 100,
    );
    expect(totals.percent).toBeCloseTo(
      (totals.cumulative.subtotal / totals.contract.subtotal) * 100,
      0,
    );
    // Nothing contracted, nothing done.
    expect(statementTotals([], markups).percent).toBe(0);
  });

  test("never pays for a negative quantity", () => {
    const totals = statementTotals(
      [
        {
          unitCost,
          laborHours: 0,
          contractQuantity: 5,
          previousQuantity: 0,
          quantity: 0,
        },
      ],
      markups,
    );
    expect(totals.period.total).toBe(0);
    expect(totals.remainingSubtotal).toBe(totals.contract.subtotal);
  });
});

describe("guarantee", () => {
  test("keeps back the statement's share only by retention", () => {
    expect(retentionOf(12345.67, { percent: 5, method: "retention" })).toBe(
      617.28,
    );
    expect(retentionOf(12345.67, { percent: 5, method: "instrument" })).toBe(0);
    expect(retentionOf(12345.67, null)).toBe(0);
  });

  test("frees 70 % after the first reception and the rest after the final", () => {
    expect(releaseAmounts(1000.01)).toEqual({ completion: 700.01, final: 300 });
    expect(releaseAmounts(0)).toEqual({ completion: 0, final: 0 });
  });

  test("counts the 14 days from the PV", () => {
    expect(addDays("2026-10-23", 14)).toBe("2026-11-06");
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
    expect(addDays("nope", 14)).toBeUndefined();
  });

  test("unitPriceOf rounds the four kinds together", () => {
    expect(
      unitPriceOf({
        material: 0.004,
        labor: 0.004,
        equipment: 0,
        transport: 0,
      }),
    ).toBe(0.01);
  });
});

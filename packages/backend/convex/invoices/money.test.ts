import { describe, expect, test } from "bun:test";
import {
  amount,
  computeTotals,
  defaultCategory,
  lineVat,
  priceLine,
} from "./money";

describe("invoice arithmetic", () => {
  test("a line's value is its quantity times its price, in bani", () => {
    const priced = priceLine(
      {
        description: "Faianță",
        unit: "mp",
        quantity: 24.5,
        unitPrice: 33.333,
        vatRate: 21,
      },
      true,
    );
    expect(priced.net).toBe(816.66);
    expect(priced.vatCategory).toBe("S");
    expect(lineVat(priced)).toBe(171.5);
  });

  test("VAT is worked out on each rate's taxable amount, not line by line", () => {
    const lines = [1, 2, 3].map(() =>
      priceLine(
        {
          description: "Lucrare",
          unit: "buc",
          quantity: 3,
          unitPrice: 33.33,
          vatRate: 21,
        },
        true,
      ),
    );
    // 99.99 × 21% is 20.9979, 21.00 on each line; 299.97 × 21% is 62.99.
    expect(lines.map(lineVat)).toEqual([21, 21, 21]);
    const totals = computeTotals(lines);
    expect(totals).toEqual({
      net: 299.97,
      vat: 62.99,
      total: 362.96,
      byRate: [{ vatRate: 21, vatCategory: "S", net: 299.97, vat: 62.99 }],
    });
  });

  test("rates are grouped, the higher first, and negative lines deduct", () => {
    const totals = computeTotals([
      priceLine(
        {
          description: "a",
          unit: "buc",
          quantity: 1,
          unitPrice: 1000,
          vatRate: 21,
        },
        true,
      ),
      priceLine(
        {
          description: "b",
          unit: "buc",
          quantity: 2,
          unitPrice: 100,
          vatRate: 11,
        },
        true,
      ),
      // The advance taken back.
      priceLine(
        {
          description: "c",
          unit: "buc",
          quantity: -1,
          unitPrice: 300,
          vatRate: 21,
        },
        true,
      ),
    ]);
    expect(totals.byRate).toEqual([
      { vatRate: 21, vatCategory: "S", net: 700, vat: 147 },
      { vatRate: 11, vatCategory: "S", net: 200, vat: 22 },
    ]);
    expect(totals.net).toBe(900);
    expect(totals.vat).toBe(169);
    expect(totals.total).toBe(1069);
  });

  test("a firm outside VAT bills as not subject to VAT; a registered one at 0% as zero rated", () => {
    expect(defaultCategory(21, true)).toBe("S");
    expect(defaultCategory(0, true)).toBe("Z");
    expect(defaultCategory(0, false)).toBe("O");
    const outside = priceLine(
      {
        description: "a",
        unit: "buc",
        quantity: 1,
        unitPrice: 500,
        vatRate: 0,
      },
      false,
    );
    expect(outside.vatCategory).toBe("O");
    expect(computeTotals([outside])).toEqual({
      net: 500,
      vat: 0,
      total: 500,
      byRate: [{ vatRate: 0, vatCategory: "O", net: 500, vat: 0 }],
    });
  });

  test("amounts print with two decimals and a dot", () => {
    expect(amount(1234.5)).toBe("1234.50");
    expect(amount(0.005)).toBe("0.01");
    expect(amount(-12)).toBe("-12.00");
  });
});

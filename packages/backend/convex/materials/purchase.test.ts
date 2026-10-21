import { describe, expect, test } from "bun:test";
import { bestMix, poolingSaves, purchaseOf } from "./purchase";

describe("bestMix", () => {
  test("buys just enough whole packages of one size", () => {
    expect(bestMix(26, [25])).toEqual({
      counts: [{ size: 25, count: 2 }],
      bought: 50,
      packages: 2,
    });
    expect(bestMix(50, [25]).packages).toBe(2);
    expect(bestMix(50.0000001, [25]).packages).toBe(2);
    expect(bestMix(0.2, [25]).packages).toBe(1);
    expect(bestMix(0, [25]).packages).toBe(0);
    expect(bestMix(10, []).packages).toBe(0);
  });

  test("mixes sizes for the least money, not the fewest packages", () => {
    // Two 15 l buckets would leave 8 l.
    expect(bestMix(22, [15, 8.5, 4, 2.5]).counts).toEqual([
      { size: 15, count: 1 },
      { size: 8.5, count: 1 },
    ]);
    expect(bestMix(16, [2.5, 15, 8.5, 4]).counts).toEqual([
      { size: 15, count: 1 },
      { size: 2.5, count: 1 },
    ]);
    // A small job takes a small bucket.
    expect(bestMix(3, [15, 8.5, 4, 2.5]).counts).toEqual([
      { size: 4, count: 1 },
    ]);
    // Exactly 40 l in two large and four small cans is cheaper than three
    // large ones.
    expect(bestMix(40, [15, 2.5])).toEqual({
      counts: [
        { size: 15, count: 2 },
        { size: 2.5, count: 4 },
      ],
      bought: 40,
      packages: 6,
    });
  });

  test("handles big quantities", () => {
    const mix = bestMix(3000.5, [15, 8.5, 4, 2.5]);
    expect(mix.bought).toBeGreaterThanOrEqual(3000.5);
    expect(mix.bought - 3000.5).toBeLessThan(2.5);
  });
});

describe("purchaseOf", () => {
  test("says what is left over, also in packages", () => {
    expect(purchaseOf(262.5, [25])).toEqual({
      counts: [{ size: 25, count: 11 }],
      bought: 275,
      packages: 11,
      need: 262.5,
      leftover: 12.5,
      leftoverShare: 0.5,
    });
    expect(purchaseOf(27.6, [1.44]).leftover).toBe(1.2);
  });
});

describe("poolingSaves", () => {
  test("counts the packages bought once for the whole Deviz", () => {
    expect(poolingSaves([11, 11, 11], [5])).toEqual({
      packages: 2,
      quantity: 10,
    });
    expect(poolingSaves([20], [5])).toEqual({ packages: 0, quantity: 0 });
  });
});

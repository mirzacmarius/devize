import { describe, expect, test } from "bun:test";
import {
  priceMove,
  signedMoney,
  signedPercent,
  thresholdOptions,
} from "./prices-view";

describe("prices page", () => {
  test("writes changes with their sign", () => {
    expect(signedPercent(6.1, "ro")).toBe("+6,1%");
    expect(signedPercent(-4.25, "ro")).toBe("−4,25%");
    expect(signedPercent(0, "ro")).toBe("0%");
    expect(signedMoney(315, "ro")).toBe("+315,00");
    expect(signedMoney(-1234.5, "ro")).toBe("−1.234,50");
  });

  test("measures how far a price moved", () => {
    expect(priceMove(45.9, 49.9)).toBe(8.7);
    expect(priceMove(50, 45)).toBe(-10);
    expect(priceMove(0, 10)).toBe(0);
  });

  test("offers the usual thresholds and the firm's own", () => {
    expect(thresholdOptions(5)).toEqual([0, 3, 5, 10, 20]);
    expect(thresholdOptions(7.5)).toEqual([0, 3, 5, 7.5, 10, 20]);
    expect(thresholdOptions(undefined)).toEqual([0, 3, 5, 10, 20]);
  });
});

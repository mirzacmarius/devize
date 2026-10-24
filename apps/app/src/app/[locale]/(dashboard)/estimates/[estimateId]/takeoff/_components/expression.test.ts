import { describe, expect, test } from "bun:test";
import { evaluateExpression } from "./expression";

describe("evaluateExpression", () => {
  test("reads plain numbers both ways", () => {
    expect(evaluateExpression("42,5")).toBe(42.5);
    expect(evaluateExpression("1.234,5")).toBe(1234.5);
    expect(evaluateExpression("3.25")).toBe(3.25);
  });

  test("adds, multiplies and groups", () => {
    expect(evaluateExpression("3,2+1,5")).toBe(4.7);
    expect(evaluateExpression("2*0,9")).toBe(1.8);
    expect(evaluateExpression("2*(0,9+0,1)")).toBe(2);
    expect(evaluateExpression("4,2 × 2 - 1")).toBe(7.4);
    expect(evaluateExpression("10/4")).toBe(2.5);
  });

  test("refuses what isn't a number", () => {
    expect(evaluateExpression("")).toBeUndefined();
    expect(evaluateExpression("abc")).toBeUndefined();
    expect(evaluateExpression("3+")).toBeUndefined();
    expect(evaluateExpression("(3")).toBeUndefined();
    expect(evaluateExpression("3/0")).toBeUndefined();
  });
});

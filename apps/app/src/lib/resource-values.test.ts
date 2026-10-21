import { describe, expect, test } from "bun:test";
import { costByKind, resourceValues } from "./resource-values";

// A made-up tiling norm, per mp.
const tiling = [
  { kind: "material" as const, unit: "kg", quantity: 4.5, price: 2.4 },
  { kind: "material" as const, unit: "mp", quantity: 1.05, price: 45 },
  { kind: "material" as const, unit: "%", quantity: 2 },
  { kind: "labor" as const, unit: "ora", quantity: 0.9, price: 30 },
  { kind: "labor" as const, unit: "%", quantity: 10 },
  { kind: "transport" as const, unit: "%", quantity: 5 },
];

describe("resourceValues", () => {
  test("prices each resource and takes shares of its kind or the materials", () => {
    const values = resourceValues(tiling);
    // Materials 10,80 + 47,25 = 58,05; labour 27.
    expect(values[0]).toBeCloseTo(10.8);
    expect(values[1]).toBeCloseTo(47.25);
    expect(values[2]).toBeCloseTo(1.161);
    expect(values[3]).toBeCloseTo(27);
    expect(values[4]).toBeCloseTo(2.7);
    // Transport in % is a share of the materials.
    expect(values[5]).toBeCloseTo(2.9025);
  });

  test("count a resource without a price as nothing", () => {
    expect(
      resourceValues([{ kind: "material", unit: "kg", quantity: 3 }]),
    ).toEqual([0]);
  });
});

describe("costByKind", () => {
  test("adds the values up by kind and in all", () => {
    const cost = costByKind(tiling);
    expect(cost.material).toBeCloseTo(59.211);
    expect(cost.labor).toBeCloseTo(29.7);
    expect(cost.equipment).toBe(0);
    expect(cost.transport).toBeCloseTo(2.9025);
    expect(cost.total).toBeCloseTo(91.8135);
  });
});

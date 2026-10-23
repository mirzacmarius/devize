import { describe, expect, test } from "bun:test";
import { belowLaborFloor, laborFloor } from "./labor";

describe("laborFloor", () => {
  test("is the sector's minimum gross wage for one hour, in bani", () => {
    expect(laborFloor.hourly).toBe(27.71);
  });
});

describe("belowLaborFloor", () => {
  test("flags labour by the hour priced under the minimum", () => {
    expect(belowLaborFloor({ kind: "labor", unit: "oră", unitPrice: 25 })).toBe(
      true,
    );
    expect(belowLaborFloor({ kind: "labor", unit: "h", unitPrice: 27.7 })).toBe(
      true,
    );
  });

  test("passes labour at or over the minimum", () => {
    expect(
      belowLaborFloor({ kind: "labor", unit: "ore", unitPrice: 27.71 }),
    ).toBe(false);
    expect(belowLaborFloor({ kind: "labor", unit: "oră", unitPrice: 45 })).toBe(
      false,
    );
  });

  test("ignores other kinds, other units and unpriced labour", () => {
    expect(
      belowLaborFloor({ kind: "material", unit: "oră", unitPrice: 5 }),
    ).toBe(false);
    expect(belowLaborFloor({ kind: "labor", unit: "mp", unitPrice: 5 })).toBe(
      false,
    );
    expect(belowLaborFloor({ kind: "labor", unit: "oră", unitPrice: 0 })).toBe(
      false,
    );
  });
});

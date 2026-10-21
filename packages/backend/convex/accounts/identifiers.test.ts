import { describe, expect, test } from "bun:test";
import { cleanCui, optionalText } from "./identifiers";

describe("cleanCui", () => {
  test("accepts a valid CUI with or without the RO prefix", () => {
    expect(cleanCui("2816464")).toBe("2816464");
    expect(cleanCui(" RO 2816464 ")).toBe("2816464");
    expect(cleanCui("ro2816464")).toBe("2816464");
  });

  test("rejects a wrong control digit or a malformed code", () => {
    expect(() => cleanCui("2816465")).toThrow();
    expect(() => cleanCui("28A6464")).toThrow();
    expect(() => cleanCui("1")).toThrow();
    expect(() => cleanCui("12345678901")).toThrow();
  });
});

describe("optionalText", () => {
  test("trims and drops empty text", () => {
    expect(optionalText("  Str. Lalelelor 3 ")).toBe("Str. Lalelelor 3");
    expect(optionalText("   ")).toBeUndefined();
    expect(optionalText(undefined)).toBeUndefined();
  });

  test("rejects text over the limit", () => {
    expect(() => optionalText("a".repeat(11), 10)).toThrow();
  });
});

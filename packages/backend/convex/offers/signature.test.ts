import { describe, expect, test } from "bun:test";
import { checkSignaturePath, checkSignerName } from "./signature";

describe("signatures", () => {
  test("a drawn signature is moves and lines inside the box", () => {
    const path = "M10 100 L40 60 L70 140 L100 50 M120 90 L190 95";
    expect(checkSignaturePath(` ${path} `)).toBe(path);
  });

  test("anything else is refused", () => {
    for (const path of [
      "",
      "M10 10",
      // Too small to be a signature.
      "M10 10 L12 12 L14 10 L16 12 L18 10",
      // Outside the box.
      "M10 100 L40 60 L70 140 L100 50 L700 90",
      "M10 100 L40 60 L70 140 L100 50 L120 250",
      // Curves, relative moves, decimals and markup are not drawn by the page.
      "M10 100 C40 60 70 140 100 50",
      "M10 100 l40 60 l70 140 l100 50 l20 20",
      "M10.5 100 L40 60 L70 140 L100 50 L130 90",
      'M10 100 L40 60"/><script>alert(1)</script>',
      `M10 100${" L40 60 L70 140".repeat(3000)}`,
    ]) {
      expect(() => checkSignaturePath(path)).toThrow(/invalid/);
    }
  });

  test("the signer's name is trimmed and has to be a name", () => {
    expect(checkSignerName("  Ion   Popescu ")).toBe("Ion Popescu");
    expect(() => checkSignerName(" I ")).toThrow(/invalid/);
    expect(() => checkSignerName("x".repeat(121))).toThrow(/invalid/);
  });
});

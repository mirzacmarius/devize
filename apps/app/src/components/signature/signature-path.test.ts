import { describe, expect, test } from "bun:test";
import { checkSignaturePath } from "@devize/backend/convex/offers/signature";
import { type Point, signaturePath } from "./signature-path";

describe("signature paths", () => {
  test("strokes become whole-pixel moves and lines inside the box", () => {
    const path = signaturePath([
      [
        { x: 10.4, y: 100.6 },
        { x: 11, y: 101 },
        { x: 40, y: 60 },
        { x: 70.2, y: 140 },
        { x: 650, y: -5 },
      ],
      [
        { x: 120, y: 90 },
        { x: 190, y: 95 },
      ],
    ]);
    // The point a pixel away is dropped; the one outside lands on the edge.
    expect(path).toBe("M10 101 L40 60 L70 140 L600 0 M120 90 L190 95");
    expect(checkSignaturePath(path)).toBe(path);
  });

  test("a long signature is thinned to what the server takes", () => {
    const stroke: Point[] = [];
    for (let i = 0; i < 20_000; i += 1) {
      stroke.push({
        x: 300 + 250 * Math.sin(i / 50),
        y: 100 + 90 * Math.cos(i / 7),
      });
    }
    const path = signaturePath([stroke]);
    expect(path.length).toBeLessThanOrEqual(30_000);
    expect(checkSignaturePath(path)).toBe(path);
  });

  test("nothing drawn is an empty path", () => {
    expect(signaturePath([])).toBe("");
    expect(signaturePath([[]])).toBe("");
  });
});

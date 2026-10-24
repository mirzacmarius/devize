import { describe, expect, test } from "bun:test";
import { baseNorms } from "../catalog/baseNorms";
import { starterLines, starterOf, starters, starterValues } from "./starters";

describe("Devize's starters", () => {
  test("are written only with Norme de bază that exist", () => {
    const codes = new Set(baseNorms.map((norm) => norm.code));
    for (const starter of starters) {
      for (const line of starter.lines) {
        expect(`${starter.key} ${line.code}`).toBe(
          `${starter.key} ${codes.has(line.code) ? line.code : "missing"}`,
        );
      }
    }
  });

  test("give every measurement a default within its bounds", () => {
    for (const starter of starters) {
      const values = starterValues(starter, {});
      expect(values).toBeDefined();
      // The defaults make a Deviz with works in it.
      expect(starterLines(starter, values ?? {}).length).toBeGreaterThan(0);
    }
  });

  test("measure a bathroom from its length, width and tiled height", () => {
    const bathroom = starterOf("bathroom");
    if (!bathroom) {
      throw new Error("no bathroom");
    }
    const values = starterValues(bathroom, {
      length: 2.5,
      width: 2,
      tileHeight: 2.4,
    });
    const lines = new Map(
      starterLines(bathroom, values ?? {}).map((line) => [
        line.code,
        line.quantity,
      ]),
    );
    // 9 m of walls tiled to 2,4 m, less the door's 1,6 mp.
    expect(lines.get("DV-PLC-01")).toBe(20);
    expect(lines.get("DV-PRD-03")).toBe(5);
    // The floor, 20 cm up the walls and 3 mp of shower.
    expect(lines.get("DV-HDR-03")).toBe(9.8);
    expect(lines.get("DV-DEM-02")).toBe(25);
    expect(lines.get("DV-SAN-05")).toBe(1);
  });

  test("refuse a measurement out of bounds and leave out works of nothing", () => {
    const roof = starterOf("roof");
    if (!roof) {
      throw new Error("no roof");
    }
    expect(starterValues(roof, { roofArea: 5 })).toBeUndefined();
    expect(starterValues(roof, { roofArea: Number.NaN })).toBeUndefined();
    const lines = starterLines(roof, starterValues(roof, {}) ?? {});
    // No insulation by default.
    expect(lines.map((line) => line.code)).not.toContain("DV-TRM-03");
    expect(starterOf("garage")).toBeUndefined();
  });
});

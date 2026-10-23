import { describe, expect, test } from "bun:test";
import {
  cleanRoom,
  cleanRows,
  guessMeasure,
  measuresFor,
  measuresOf,
  roomRows,
  rowsTotal,
  takeoffTotal,
  unitParts,
} from "./measures";

// A made-up bedroom: 4 × 3 m, 2,70 m high, a door and a window.
const bedroom = {
  name: "Dormitor",
  length: 4,
  width: 3,
  height: 2.7,
  openings: [
    { kind: "door" as const, count: 1, width: 0.9, height: 2.1 },
    { kind: "window" as const, count: 1, width: 1.2, height: 1.4 },
  ],
};

describe("measuresOf", () => {
  test("works a room out from its sides, height and openings", () => {
    const m = measuresOf(bedroom);
    expect(m.floor).toBe(12);
    expect(m.ceiling).toBe(12);
    expect(m.perimeter).toBe(14);
    expect(m.wallsGross).toBe(37.8);
    expect(m.openings).toBe(3.57);
    expect(m.walls).toBe(34.23);
    expect(m.wallsAndCeiling).toBe(46.23);
    // The skirting skips the door, not the window.
    expect(m.skirting).toBe(13.1);
    expect(m.doors).toBe(1);
    expect(m.windows).toBe(1);
  });

  test("takes a measured floor and perimeter over the sides", () => {
    const m = measuresOf({ ...bedroom, floorArea: 14.5, perimeter: 16 });
    expect(m.floor).toBe(14.5);
    expect(m.perimeter).toBe(16);
    expect(m.wallsGross).toBe(43.2);
  });

  test("measures nothing without sides, and no walls without a height", () => {
    expect(measuresOf({ name: "?", openings: [] }).floor).toBe(0);
    const flat = measuresOf({ ...bedroom, height: undefined });
    expect(flat.floor).toBe(12);
    expect(flat.walls).toBe(0);
  });
});

describe("rows", () => {
  test("add up count × length × width × height and take deductions out", () => {
    const rows = [
      { count: 2, length: 3, width: 2, deduct: false },
      { count: 1, length: 1, width: 1, deduct: true },
      { count: 3, deduct: false },
    ];
    expect(rowsTotal(rows)).toBe(14);
    expect(takeoffTotal(rows, "mp")).toBe(14);
    // An Articol counted per 100 mp measures the rows over 100.
    expect(takeoffTotal(rows, "100 mp")).toBe(0.14);
    expect(unitParts("100 m²")).toEqual({ factor: 100, base: "mp" });
    expect(unitParts("buc")).toEqual({ factor: 1, base: "buc" });
  });

  test("never go below zero", () => {
    expect(rowsTotal([{ count: 1, length: 2, deduct: true }])).toBe(0);
  });

  test("are checked: a count above zero, no negative side, not too many", () => {
    expect(cleanRows([])).toBeUndefined();
    expect(cleanRows([{ count: 0, deduct: false }])).toBeUndefined();
    expect(
      cleanRows([{ count: 1, length: -2, deduct: false }]),
    ).toBeUndefined();
    expect(
      cleanRows([
        { label: "  Hol  ", count: 1.23456, length: 2.00004, deduct: false },
      ]),
    ).toEqual([{ label: "Hol", count: 1.235, length: 2, deduct: false }]);
  });
});

describe("roomRows", () => {
  test("write the floor as length × width and the walls less each opening", () => {
    expect(roomRows("floor", [bedroom])).toEqual([
      { label: "Dormitor", count: 1, length: 4, width: 3, deduct: false },
    ]);
    const walls = roomRows("walls", [bedroom]);
    expect(walls).toEqual([
      {
        label: "Dormitor: perimetru × înălțime",
        count: 1,
        length: 14,
        height: 2.7,
        deduct: false,
      },
      {
        label: "Dormitor: ușă 0,90 × 2,10",
        count: 1,
        length: 0.9,
        height: 2.1,
        deduct: true,
      },
      {
        label: "Dormitor: fereastră 1,20 × 1,40",
        count: 1,
        length: 1.2,
        height: 1.4,
        deduct: true,
      },
    ]);
    expect(rowsTotal(walls)).toBe(34.23);
    expect(rowsTotal(roomRows("skirting", [bedroom]))).toBe(13.1);
    expect(rowsTotal(roomRows("doors", [bedroom]))).toBe(1);
    expect(rowsTotal(roomRows("openings", [bedroom]))).toBe(3.57);
    expect(rowsTotal(roomRows("wallsAndCeiling", [bedroom]))).toBe(46.23);
  });

  test("leave out a room that doesn't measure", () => {
    expect(roomRows("floor", [{ name: "?", openings: [] }])).toEqual([]);
    expect(roomRows("walls", [{ ...bedroom, height: undefined }])).toEqual([]);
  });
});

describe("measures by unit", () => {
  test("offer areas for mp, lengths for m and counts for buc", () => {
    expect(measuresFor("m2")).toEqual([
      "floor",
      "ceiling",
      "walls",
      "wallsAndCeiling",
      "openings",
    ]);
    expect(measuresFor("ml")).toEqual(["perimeter", "skirting"]);
    expect(measuresFor("100 mp")).toContain("floor");
    expect(measuresFor("buc")).toEqual(["doors", "windows"]);
    expect(measuresFor("kg")).toEqual([]);
  });

  test("guess the measure from the Articol's title", () => {
    expect(guessMeasure("Zugrăveli lavabile la pereți și tavane", "mp")).toBe(
      "wallsAndCeiling",
    );
    expect(guessMeasure("Tencuieli interioare driscuite", "mp")).toBe("walls");
    expect(guessMeasure("Pardoseală din gresie porțelanată", "mp")).toBe(
      "floor",
    );
    expect(guessMeasure("Tavan fals din gips-carton", "mp")).toBe("ceiling");
    expect(guessMeasure("Plintă din lemn", "m")).toBe("skirting");
    expect(guessMeasure("Profil de colț", "m")).toBe("perimeter");
    expect(guessMeasure("Montaj uși interioare", "buc")).toBe("doors");
    expect(guessMeasure("Ferestre PVC cu geam termopan", "buc")).toBe(
      "windows",
    );
    expect(guessMeasure("Montaj ferestre", "mp")).toBe("openings");
    expect(guessMeasure("Adeziv", "kg")).toBeUndefined();
    expect(guessMeasure("Demolare", "mp")).toBeUndefined();
  });
});

describe("cleanRoom", () => {
  test("needs a name and sides above zero, and trims what it keeps", () => {
    expect(cleanRoom({ name: " ", openings: [] })).toBeUndefined();
    expect(
      cleanRoom({ name: "Baie", length: 0, openings: [] }),
    ).toBeUndefined();
    expect(
      cleanRoom({
        name: "Baie",
        openings: [{ kind: "door", count: 1, width: 0, height: 2 }],
      }),
    ).toBeUndefined();
    expect(
      cleanRoom({ name: " Baie ", level: "", length: 2.5, openings: [] }),
    ).toEqual({
      name: "Baie",
      level: undefined,
      length: 2.5,
      width: undefined,
      height: undefined,
      floorArea: undefined,
      perimeter: undefined,
      openings: [],
      notes: undefined,
    });
  });
});

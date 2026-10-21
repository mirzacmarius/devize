import { describe, expect, test } from "bun:test";
import type { PagesOutput, SheetOutput } from "./schemas";
import {
  type Columns,
  columnsFrom,
  gridLine,
  isComplete,
  parseAmount,
  readPages,
  readRows,
} from "./tender";
import type { SheetRow } from "./xlsx";

/** A row of a made-up list; numbers are numeric cells. */
const row = (
  number: number,
  cells: Record<string, string | number>,
): SheetRow => ({
  row: number,
  cells: Object.fromEntries(
    Object.entries(cells).map(([column, value]) => [
      column,
      typeof value === "number"
        ? { text: String(value), value }
        : { text: value },
    ]),
  ),
});

type Entry = SheetOutput["entries"][number];

const entry = (
  kind: Entry["kind"],
  firstRow: number,
  fields: Partial<Entry> = {},
): Entry => ({
  kind,
  firstRow,
  lastRow: firstRow,
  code: null,
  name: null,
  terms: [],
  ...fields,
});

// A made-up quantity list, laid out as contracting authorities write them.
const rows = [
  row(1, {
    A: "Nr. crt.",
    B: "Cod",
    C: "Denumirea lucrării",
    D: "U.M.",
    E: "Cantitate",
  }),
  row(2, { A: "0", B: "1", C: "2", D: "3", E: "4" }),
  row(3, { A: "OBIECTUL 01 - CLĂDIRE ATELIER" }),
  row(4, { A: "Capitolul 1", C: "Zidării" }),
  row(5, {
    A: 1,
    B: "ZID01A",
    C: "Zidărie din blocuri ceramice de 25 cm",
    D: "mc",
    E: 12.5,
  }),
  row(6, {
    A: 2,
    B: "TEN02B",
    C: "Tencuială interioară drișcuită",
    D: "mp",
    E: "1.234,5",
  }),
  row(7, { C: "pe pereți de zidărie" }),
  row(8, { A: 3, C: "Glet de ipsos", D: "mp" }),
  row(9, { C: "Total capitol", E: 1247 }),
];

const columns: Columns = {
  position: "A",
  code: "B",
  text: "C",
  unit: "D",
  quantity: "E",
};

const object = { code: "01", name: "Clădire atelier" };
const chapter = { code: "1", name: "Zidării" };

describe("readRows", () => {
  test("takes each position's values from the cells the model points to", () => {
    const result = readRows({
      rows,
      columns,
      entries: [
        entry("object", 3, { code: "01", name: "Clădire atelier" }),
        entry("chapter", 4, { code: "1", name: "Zidării" }),
        entry("position", 5, { terms: ["zidarie blocuri ceramice 25 cm"] }),
        entry("position", 6, { lastRow: 7, terms: ["tencuiala interioara"] }),
        entry("position", 8),
      ],
      first: 1,
      last: 9,
      shown: 9,
      through: 0,
      headings: {},
    });
    expect(result.positions).toEqual([
      {
        position: "1",
        code: "ZID01A",
        text: "Zidărie din blocuri ceramice de 25 cm",
        unit: "mc",
        quantity: 12.5,
        terms: ["zidarie blocuri ceramice 25 cm"],
        object,
        chapter,
      },
      {
        position: "2",
        code: "TEN02B",
        text: "Tencuială interioară drișcuită pe pereți de zidărie",
        unit: "mp",
        quantity: 1234.5,
        terms: ["tencuiala interioara"],
        object,
        chapter,
      },
      // Without a quantity: settled into an issue later.
      {
        position: "3",
        text: "Glet de ipsos",
        unit: "mp",
        terms: [],
        object,
        chapter,
      },
    ]);
    expect(result.headings).toEqual({ object, chapter });
    expect(result.through).toBe(8);
  });

  test("never reads a row twice, nor past what the model saw", () => {
    const first = readRows({
      rows,
      columns,
      entries: [
        entry("chapter", 4),
        entry("position", 5),
        entry("position", 6, { lastRow: 12 }),
      ],
      first: 5,
      last: 6,
      shown: 7,
      through: 4,
      headings: {},
    });
    expect(first.positions.map((position) => position.text)).toEqual([
      "Zidărie din blocuri ceramice de 25 cm",
      "Tencuială interioară drișcuită pe pereți de zidărie",
    ]);
    expect(first.through).toBe(7);
    // The next batch saw row 7 as its first, but the one before took it.
    const next = readRows({
      rows,
      columns,
      entries: [entry("position", 7), entry("position", 8)],
      first: 7,
      last: 9,
      shown: 9,
      through: first.through,
      headings: first.headings,
    });
    expect(next.positions.map((position) => position.position)).toEqual(["3"]);
  });

  test("names a heading as its row does", () => {
    const result = readRows({
      rows,
      columns,
      entries: [
        entry("object", 3, { code: "01", name: "Clădire atelier" }),
        // Neither is in the row: the row's own text is the name.
        entry("chapter", 4, { code: "7", name: "Instalații sanitare" }),
      ],
      first: 1,
      last: 9,
      shown: 9,
      through: 0,
      headings: { object: { name: "Vechi" }, chapter: { name: "Vechi" } },
    });
    expect(result.headings).toEqual({
      object,
      chapter: { name: "Capitolul 1 Zidării" },
    });
  });

  test("splits the code off the text when they share a column", () => {
    const shared = [
      row(1, {
        A: 1,
        B: "CZ0101A1 - Zidărie din blocuri ceramice",
        C: "mc",
        D: "3,5",
      }),
      row(2, { A: 2, B: "Zidărie de cărămidă plină", C: "mc", D: 2 }),
    ];
    const result = readRows({
      rows: shared,
      columns: { position: "A", text: "B", unit: "C", quantity: "D" },
      entries: [
        entry("position", 1, { code: "CZ0101A1" }),
        entry("position", 2, { code: "CZ0102A1" }),
      ],
      first: 1,
      last: 2,
      shown: 2,
      through: 0,
      headings: {},
    });
    expect(result.positions).toEqual([
      {
        position: "1",
        code: "CZ0101A1",
        text: "Zidărie din blocuri ceramice",
        unit: "mc",
        quantity: 3.5,
        terms: [],
      },
      {
        position: "2",
        text: "Zidărie de cărămidă plină",
        unit: "mc",
        quantity: 2,
        terms: [],
      },
    ]);
  });
});

type PageEntry = PagesOutput["entries"][number];

const pageEntry = (
  kind: PageEntry["kind"],
  page: number,
  fields: Partial<PageEntry> = {},
): PageEntry => ({
  kind,
  page,
  position: null,
  code: null,
  text: "",
  unit: null,
  quantity: null,
  terms: [],
  ...fields,
});

describe("readPages", () => {
  test("keeps the batch's pages, without the position read before", () => {
    const result = readPages({
      entries: [
        pageEntry("chapter", 3, { code: "2", text: "Finisaje" }),
        // Read again at the top of the batch.
        pageEntry("position", 3, {
          position: "14",
          text: "Glet de ipsos  pe pereți",
          unit: "mp",
          quantity: 120.5,
        }),
        pageEntry("position", 4, {
          position: "15",
          code: "CZ0101A1",
          text: "Zugrăveli lavabile",
          unit: "mp",
          quantity: 120.5,
          terms: ["zugraveli lavabile"],
        }),
        pageEntry("position", 5, { position: "16", text: "Plintă" }),
        pageEntry("position", 7, { position: "17", text: "Altă pagină" }),
      ],
      from: 3,
      to: 5,
      headings: { object: { name: "Clădire" } },
      previous: { position: "14", text: "Glet de ipsos pe pereți", terms: [] },
    });
    const headings = {
      object: { name: "Clădire" },
      chapter: { code: "2", name: "Finisaje" },
    };
    expect(result.positions).toEqual([
      {
        position: "15",
        code: "CZ0101A1",
        text: "Zugrăveli lavabile",
        unit: "mp",
        quantity: 120.5,
        terms: ["zugraveli lavabile"],
        ...headings,
      },
      { position: "16", text: "Plintă", terms: [], ...headings },
    ]);
    expect(result.headings).toEqual(headings);
  });
});

describe("values", () => {
  test("amounts as Romanian lists write them", () => {
    expect(parseAmount("1.234,5")).toBe(1234.5);
    expect(parseAmount("1 234,50")).toBe(1234.5);
    expect(parseAmount("1,234.5")).toBe(1234.5);
    expect(parseAmount("243,2")).toBe(243.2);
    expect(parseAmount("1.234.567")).toBe(1234567);
    expect(parseAmount("12")).toBe(12);
    expect(parseAmount("mp")).toBeUndefined();
    expect(parseAmount("2 x 3")).toBeUndefined();
    expect(parseAmount("")).toBeUndefined();
  });

  test("column letters only when they look like ones", () => {
    expect(
      columnsFrom({
        position: "a",
        code: null,
        text: " C ",
        unit: "coloana D",
        quantity: "ABCD",
      }),
    ).toEqual({ position: "A", text: "C" });
  });

  test("a row on one line, its cells in column order", () => {
    expect(gridLine(row(12, { C: "Glet", A: 3, AA: "x" }))).toBe(
      "12 | A: 3 | C: Glet | AA: x",
    );
    expect(gridLine(row(1, { A: "abcdef" }), 3)).toBe("1 | A: abc…");
  });

  test("a position is complete with a unit and a quantity above 0", () => {
    const position = { text: "Glet", terms: [] };
    expect(isComplete({ ...position, unit: "mp", quantity: 12 })).toBe(true);
    expect(isComplete({ ...position, unit: "mp" })).toBe(false);
    expect(isComplete({ ...position, quantity: 12 })).toBe(false);
    expect(isComplete({ ...position, unit: "mp", quantity: 0 })).toBe(false);
    expect(isComplete({ ...position, unit: "mp", quantity: 2e9 })).toBe(false);
  });
});

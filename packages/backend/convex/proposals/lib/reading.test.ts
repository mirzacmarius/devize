import { describe, expect, test } from "bun:test";
import { MAX_TENDER_ITEMS } from "./input";
import {
  nextFile,
  nextSheet,
  type Progress,
  pageRanges,
  ROWS_PER_BATCH,
  searchTerms,
  settle,
  sheetBatches,
  withIssue,
} from "./reading";
import type { SheetRow } from "./xlsx";

const progress = (fields: Partial<Progress> = {}): Progress => ({
  stage: "reading",
  file: 0,
  sheet: 0,
  next: 0,
  read: 0,
  matched: 0,
  issues: [],
  ...fields,
});

describe("progress", () => {
  test("a new sheet or file starts afresh", () => {
    const within = progress({
      file: 1,
      sheet: 2,
      next: 240,
      columns: { text: "C" },
      object: { name: "Clădire" },
      chapter: { name: "Zidării" },
      read: 12,
    });
    expect(nextSheet(within)).toEqual(
      progress({ file: 1, sheet: 3, read: 12 }),
    );
    expect(nextFile({ ...within, pages: 9 })).toEqual(
      progress({ file: 2, read: 12 }),
    );
  });

  test("gathers a file's issues of one kind", () => {
    let found = withIssue(progress(), {
      kind: "no_quantity",
      file: "F3.xlsx",
      positions: ["3"],
    });
    found = withIssue(found, {
      kind: "no_quantity",
      file: "F3.xlsx",
      positions: ["7", "9"],
    });
    found = withIssue(found, {
      kind: "no_quantity",
      file: "Anexa.pdf",
      positions: ["1"],
    });
    found = withIssue(found, { kind: "unreadable", file: "F3.xlsx" });
    expect(found.issues).toEqual([
      { kind: "no_quantity", file: "F3.xlsx", positions: ["3", "7", "9"] },
      { kind: "no_quantity", file: "Anexa.pdf", positions: ["1"] },
      { kind: "unreadable", file: "F3.xlsx" },
    ]);

    const many = Array.from({ length: 60 }, (_, index) => String(index + 1));
    const capped = withIssue(
      withIssue(progress(), {
        kind: "no_quantity",
        file: "F3.xlsx",
        positions: many.slice(0, 40),
      }),
      { kind: "no_quantity", file: "F3.xlsx", positions: many.slice(40) },
    );
    expect(capped.issues[0]?.positions).toEqual(many.slice(0, 50));
  });
});

describe("batches", () => {
  // Rows 1, 3, 5 … 599: a sheet's empty rows are left out.
  const rows: SheetRow[] = Array.from({ length: 300 }, (_, index) => ({
    row: index * 2 + 1,
    cells: {},
  }));

  test("a sheet's rows, from the first numbered `next` or more", () => {
    expect(sheetBatches(rows, 0, 1)).toEqual([
      { from: 0, to: ROWS_PER_BATCH - 1 },
    ]);
    // Row 243 is the 122nd.
    expect(sheetBatches(rows, 242, 4)).toEqual([
      { from: 121, to: 240 },
      { from: 241, to: 299 },
    ]);
    expect(sheetBatches(rows, 600, 4)).toEqual([]);
  });

  test("a document's pages, within its count when known", () => {
    expect(pageRanges(0, undefined, 1)).toEqual([{ from: 1, to: 3 }]);
    expect(pageRanges(4, 11, 4)).toEqual([
      { from: 4, to: 6 },
      { from: 7, to: 9 },
      { from: 10, to: 11 },
    ]);
    expect(pageRanges(4, undefined, 2)).toEqual([
      { from: 4, to: 6 },
      { from: 7, to: 9 },
    ]);
  });
});

describe("settle", () => {
  test("keeps the complete positions, numbered, and reports the others", () => {
    const settled = settle(
      {
        positions: [
          {
            text: "Zidărie din blocuri ceramice",
            unit: "mc",
            quantity: 12.5,
            terms: ["zidarie"],
            chapter: { name: "Zidării" },
          },
          { position: "B7", text: "Glet de ipsos", unit: "mp", terms: [] },
          {
            text: "Tencuială fără număr și fără unitate",
            quantity: 3,
            terms: [],
          },
          { text: "Zugrăveli", unit: "mp", quantity: 40, terms: [] },
        ],
        progress: progress({ next: 120 }),
      },
      "F3.xlsx",
      10,
    );
    expect(settled.positions).toEqual([
      {
        position: "11",
        text: "Zidărie din blocuri ceramice",
        unit: "mc",
        quantity: 12.5,
        terms: ["zidarie"],
        chapter: { name: "Zidării" },
      },
      {
        position: "12",
        text: "Zugrăveli",
        unit: "mp",
        quantity: 40,
        terms: [],
      },
    ]);
    expect(settled.progress).toEqual(
      progress({
        next: 120,
        issues: [
          {
            kind: "no_quantity",
            file: "F3.xlsx",
            positions: ["B7", "Tencuială fără număr și fără unitate"],
          },
        ],
      }),
    );
  });

  test("stops reading at the import's limit", () => {
    const position = { text: "Glet", unit: "mp", quantity: 1, terms: [] };
    const settled = settle(
      { positions: [position, position, position], progress: progress() },
      "F3.xlsx",
      MAX_TENDER_ITEMS - 2,
    );
    expect(settled.positions).toHaveLength(2);
    expect(settled.progress.stage).toBe("matching");
    expect(settled.progress.issues).toEqual([
      { kind: "too_many", file: "F3.xlsx" },
    ]);
  });
});

describe("searchTerms", () => {
  test("the code, then the model's phrasings or the text's start", () => {
    expect(
      searchTerms({
        tenderCode: "CZ0101A1",
        terms: ["zidarie blocuri ceramice"],
        text: "Zidărie din blocuri ceramice",
      }),
    ).toEqual(["CZ0101A1", "zidarie blocuri ceramice"]);
    expect(
      searchTerms({
        terms: [],
        text: "Zidărie din blocuri ceramice cu goluri verticale de 25 cm grosime, cu mortar M10 Z",
      }),
    ).toEqual([
      "Zidărie din blocuri ceramice cu goluri verticale de 25 cm grosime, cu",
    ]);
  });
});

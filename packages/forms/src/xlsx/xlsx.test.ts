import { describe, expect, test } from "bun:test";
import { strFromU8 } from "fflate";
import { amountsOf, rowLabelled, tablesOf } from "../documents.helper";
import { buildDocuments, documentKinds } from "../index";
import type { FormDocument, Table } from "../model";
import { sampleData, schoolData } from "../sample.helper";
import { openWorkbook } from "../workbook/read";
import { renderXlsx, sheetNames } from "./index";
import { gridOf, layOut, placeTable, splitColumns } from "./layout";
import { numberFormat } from "./styles";
import { lineCount, lineHeight, textHeight } from "./text";

const options = { withValues: true, date: "2026-10-21" };

function documentOf(
  blocks: FormDocument["blocks"],
  orientation: FormDocument["orientation"] = "portrait",
): FormDocument {
  return { id: "F6", name: "F6", orientation, footer: "", blocks };
}

/** A schedule's year, as F6 lays it out: its months between the works and the total. */
function scheduleYear(months: number): Table {
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 24 },
      { width: 1, flex: true },
      ...Array.from({ length: months }, () => ({
        width: Math.min(60, 540 / months),
      })),
      { width: 62 },
    ],
    header: [],
    rows: [],
  };
}

describe("renderXlsx", () => {
  test("writes each document on a sheet of its own, named as Excel allows", () => {
    const documents = buildDocuments(sampleData(), documentKinds, options);
    const workbook = openWorkbook(
      renderXlsx(documents, {
        title: "DVZ-0142 · Formulare oficiale",
        author: "Constructor Exemplu SRL",
        date: new Date("2026-10-21T10:00:00Z"),
      }),
    );
    const names = workbook.sheets.map((sheet) => sheet.name);
    expect(names).toEqual(sheetNames(documents));
    expect(names).toContain("Deviz DVZ-0142");
    expect(names).toContain("F3 · 01 Demolări");
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(
      documents.length,
    );
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(31);
      expect(name).not.toMatch(/[[\]:*?/\\]/);
    }
    const core = strFromU8(
      workbook.parts["docProps/core.xml"] ?? new Uint8Array(),
    );
    expect(core).toContain(
      "<dc:title>DVZ-0142 · Formulare oficiale</dc:title>",
    );
    expect(core).toContain("<dc:creator>Constructor Exemplu SRL</dc:creator>");
    expect(core).toContain("2026-10-21T10:00:00Z");
    // C5 lies down on A4, fitted to the page's width.
    const c5 = documents.findIndex((document) => document.id === "C5");
    const sheet = strFromU8(
      workbook.parts[`xl/worksheets/sheet${c5 + 1}.xml`] ?? new Uint8Array(),
    );
    expect(sheet).toContain(
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"',
    );
    expect(sheet).toContain("DVZ-0142 · Formularul C5");
  });

  test("keeps the amounts as numbers, shown with the PDF's decimals", () => {
    const documents = buildDocuments(sampleData(), ["F3"], options);
    const bytes = renderXlsx(documents, { title: "F3" });
    const workbook = openWorkbook(bytes);
    documents.forEach((document, index) => {
      const total = amountsOf(
        rowLabelled(tablesOf(document)[0], "TOTAL fără TVA"),
      )[0];
      const row = workbook.sheets[index]?.rows.find(
        (found) => found.cells.B?.text === "TOTAL fără TVA",
      );
      expect(total).toBeGreaterThan(0);
      expect(row?.cells.F?.value).toBe(total);
    });
    const styles = strFromU8(
      workbook.parts["xl/styles.xml"] ?? new Uint8Array(),
    );
    expect(styles).toContain('formatCode="#,##0.00"');
    // An item's code and title are in one cell, on two lines.
    const demolition = workbook.sheets.find(
      (sheet) => sheet.name === "F3 · 01 Demolări",
    );
    expect(
      demolition?.rows.some((row) =>
        row.cells.B?.text.startsWith("DX01 Desfacerea pardoselii"),
      ),
    ).toBe(true);
  });

  test("merges a header's cells as they span, and repeats it on every page", () => {
    const documents = buildDocuments(sampleData(), ["C5"], options);
    const workbook = openWorkbook(renderXlsx(documents, { title: "C5" }));
    const sheet = workbook.sheets[0];
    const header = sheet?.rows.find((row) => row.cells.A?.text === "Nr. crt.");
    const prices = Object.entries(header?.cells ?? {}).find(
      ([, cell]) => cell.text === "Prețul unitar (lei/U.M.)",
    )?.[0];
    expect(prices).toBe("F");
    // Four columns wide, over Material to Transport, and two rows tall
    // beside them.
    expect(sheet?.merges).toContainEqual({
      fromColumn: 6,
      fromRow: header?.row ?? 0,
      toColumn: 9,
      toRow: header?.row ?? 0,
    });
    expect(sheet?.merges).toContainEqual({
      fromColumn: 1,
      fromRow: header?.row ?? 0,
      toColumn: 1,
      toRow: (header?.row ?? 0) + 1,
    });
    const book = strFromU8(
      workbook.parts["xl/workbook.xml"] ?? new Uint8Array(),
    );
    const row = header?.row ?? 0;
    // With the row of column numbers under it.
    expect(book).toContain(
      `<definedName name="_xlnm.Print_Titles" localSheetId="0">'C5 · Lucrări diverse'!$${row}:$${row + 2}</definedName>`,
    );
  });

  test("writes text as it is, & and < included", () => {
    const data = sampleData();
    data.estimate.title = "Renovare R&D <bloc A>";
    const workbook = openWorkbook(
      renderXlsx(buildDocuments(data, ["DEVIZ"], options), {
        title: data.estimate.title,
      }),
    );
    expect(
      workbook.sheets[0]?.rows.some((row) =>
        Object.values(row.cells).some(
          (cell) => cell.text === "Renovare R&D <bloc A>",
        ),
      ),
    ).toBe(true);
  });

  test("never merges a cell into another", () => {
    for (const data of [sampleData(), schoolData()]) {
      for (const document of buildDocuments(data, documentKinds, {
        ...options,
        schedule: { months: 18 },
      })) {
        const { merges } = layOut(document);
        merges.forEach((one, index) => {
          for (const other of merges.slice(index + 1)) {
            const apart =
              one.right < other.left ||
              other.right < one.left ||
              one.bottom < other.top ||
              other.bottom < one.top;
            expect(apart).toBe(true);
          }
        });
      }
    }
  });
});

describe("layOut", () => {
  test("puts a narrower table on the columns under it", () => {
    const [deviz] = buildDocuments(sampleData(), ["DEVIZ"], options);
    if (!deviz) {
      throw new Error("No Deviz");
    }
    const layout = layOut(deviz);
    const recap = layout.rows.findIndex(
      (row) => row.cells.get(2)?.runs?.[0]?.text === "Recapitulație",
    );
    // Under the items' U.M., quantity and price, its amounts under their values.
    expect(layout.merges).toContainEqual({
      top: recap,
      bottom: recap,
      left: 2,
      right: 4,
    });
    expect(layout.rows[recap]?.cells.get(5)?.runs?.[0]?.text).toBe("lei");
    expect(layout.rows[recap + 1]?.cells.get(5)?.value).toBeGreaterThan(0);
    expect(layout.rows[recap]?.cells.get(1)).toBeUndefined();
  });

  test("gives a merged cell's row the height of its wrapped text", () => {
    const text =
      "Au valori subcapitolele lucrărilor din acest deviz, cu CAM, cheltuieli indirecte și profit, iar celelalte cheltuieli ale obiectivului se adaugă de beneficiar.";
    const layout = layOut(documentOf([{ type: "text", text, size: 7.5 }]));
    const row = layout.rows[0];
    const width = layout.widths.reduce((total, one) => total + one, 0);
    expect(layout.merges).toContainEqual({
      top: 0,
      bottom: 0,
      left: 0,
      right: 1,
    });
    expect(row?.height).toBe(textHeight([{ text, size: 9.5 }], width));
    expect(row?.height).toBeGreaterThan(lineHeight(9.5));
  });

  test("lines up a schedule's shorter year with its months beside the total", () => {
    const document = documentOf(
      [scheduleYear(12), scheduleYear(6)],
      "landscape",
    );
    const grid = gridOf(document);
    expect(grid).toHaveLength(15);
    expect(placeTable(scheduleYear(12), grid)).toEqual(
      Array.from({ length: 15 }, (_, index) => [index, index]),
    );
    expect(placeTable(scheduleYear(6), grid)).toEqual([
      [0, 0],
      [1, 7],
      [8, 8],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [13, 13],
      [14, 14],
    ]);
  });

  test("splits the columns in halves for blocks side by side", () => {
    expect(splitColumns([30, 233, 36, 60, 76, 88], 2)).toEqual([
      [0, 1],
      [2, 5],
    ]);
    expect(splitColumns([400, 50, 50], 3)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    // A document without tables has two halves of the page.
    expect(gridOf(documentOf([]))).toHaveLength(2);
  });
});

describe("sheetNames", () => {
  const named = (name: string, label?: string): FormDocument => ({
    id: "F3",
    label,
    name,
    orientation: "portrait",
    footer: "",
    blocks: [],
  });

  test("names a sheet as Excel allows, each once", () => {
    expect(
      sheetNames([
        named("Formularul F3 · 01 Demolări", "Formularul F3"),
        named("Formularul F3 · 01 demolări", "Formularul F3"),
        named("Formularul de ofertă", "Formularul de ofertă"),
        named("Deviz: A/B [1]?"),
        named("x".repeat(40)),
        named("X".repeat(40)),
        named("  "),
      ]),
    ).toEqual([
      "F3 · 01 Demolări",
      "F3 · 01 demolări (2)",
      "Formularul de ofertă",
      "Deviz A B 1",
      "x".repeat(31),
      `${"X".repeat(27)} (2)`,
      "Foaia 7",
    ]);
  });
});

describe("text", () => {
  test("shows a number with as many decimals as the PDF", () => {
    expect(numberFormat("1.615,00")).toBe("#,##0.00");
    expect(numberFormat("0,035")).toBe("#,##0.000");
    expect(numberFormat("12")).toBe("#,##0");
  });

  test("wraps a paragraph at its spaces, and a word too long where it must", () => {
    expect(lineCount("Placare cu gresie porțelanată", 10, false, 400)).toBe(1);
    expect(lineCount("Placare cu gresie porțelanată", 10, false, 80)).toBe(3);
    expect(lineCount("A".repeat(60), 10, false, 100)).toBe(5);
    expect(
      textHeight(
        [
          { text: "DX01", size: 10, bold: true },
          { text: "\nDesfacerea pardoselii", size: 10 },
        ],
        400,
      ),
    ).toBe(2 * lineHeight(10) + 1);
  });
});

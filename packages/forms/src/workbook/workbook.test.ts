import { describe, expect, test } from "bun:test";
import { applyMarkups, roundLei } from "@devize/backend/convex/estimates/recap";
import { strFromU8, unzipSync } from "fflate";
import type { ExportData, LineItemInput } from "../input";
import {
  addedMarkups,
  fillWorkbook,
  formulaRows,
  lineValues,
  sheetTotal,
} from "./fill";
import { planWorkbook } from "./plan";
import { openWorkbook, SpreadsheetError, type Workbook } from "./read";
import { makeWorkbook, type TestSheet, tenderData } from "./workbook.helper";

// A made-up school's tender lists, as three authorities could lay them out:
// a plain F3 with the code in front of each text, a detailed C5 with its
// Recapitulație, and an F3 that splits each price into its kinds.

const header = {
  A: "Nr. crt.",
  B: "Capitol de lucrări",
  C: "U.M.",
  D: "Cantitatea",
  E: "Prețul unitar (lei)",
  F: "Total (lei) (col. 3 x col. 4)",
};

const plainF3: TestSheet = {
  name: "F3 Construcții",
  merges: ["A1:F1", "A3:F3"],
  cols: '<cols><col min="5" max="6" width="14" style="2" customWidth="1"/></cols>',
  rows: {
    1: { A: "Obiectiv: Reabilitarea școlii din Exemplu" },
    3: { A: "LISTA cuprinzând cantitățile de lucrări" },
    4: { A: "Categoria de lucrări: Construcții" },
    5: header,
    6: { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 },
    7: {
      A: 1,
      B: "TX01A1 Săpătură manuală în pământ cu umiditate naturală, adâncime până la 1,5 m",
      C: "mc",
      D: 12.5,
      E: { style: 2 },
      F: { formula: "D7*E7", style: 2 },
    },
    8: {
      A: 2,
      B: "CX02B1 Beton simplu C12/15 turnat în fundații",
      C: "mc",
      D: 4.2,
      E: { style: 2 },
      F: { formula: "D8*E8", style: 2 },
    },
    // A text over two rows, with the quantity on the second.
    9: { A: 3, B: "AX03C1 Tencuieli interioare drișcuite cu mortar" },
    10: {
      B: "var-ciment, pe pereți",
      C: "m2",
      D: 243.2,
      E: { style: 2 },
      F: { formula: "D10*E10", style: 2 },
    },
    // A quantity written as text, and no price cells at all.
    11: {
      A: 4,
      B: { inline: "Transport pământ cu autobasculanta la 10 km" },
      C: "t",
      D: "21,25",
    },
    12: {
      A: 6,
      B: "Curățenie finală a încăperilor",
      C: "mp",
      D: 300,
      E: { style: 2 },
      F: { formula: "D12*E12", style: 2 },
    },
    13: { B: "TOTAL", F: { formula: "SUM(F7:F12)", style: 2 } },
  },
};

const yardF3: TestSheet = {
  name: "F3 Curte",
  rows: {
    5: header,
    7: {
      A: 1,
      B: "Curățarea terenului de iarbă și buruieni",
      C: "mp",
      D: 150,
      E: { style: 2 },
      F: { formula: "D7*E7", style: 2 },
    },
    8: { B: "TOTAL", F: { formula: "SUM(F7:F7)", style: 2 } },
  },
};

// A hidden sheet of the designer's, with the same numbers.
const workings: TestSheet = {
  name: "Calcule",
  hidden: true,
  rows: { 7: { A: 1, B: "Săpătură manuală în pământ", C: "mc", D: 12.5 } },
};

const detailedC5: TestSheet = {
  name: "C5",
  merges: ["F4:I4", "J4:N4", "A4:A5", "B4:B5", "C4:C5", "D4:D5", "E4:E5"],
  rows: {
    2: { A: "Lista cuprinzând cantitățile de lucrări" },
    4: {
      A: "Nr",
      B: "Cod",
      C: "Denumire",
      D: "UM",
      E: "Cantitate",
      F: "Preț unitar (lei)",
      J: "Valoare (lei)",
    },
    5: {
      F: "Material",
      G: "Manoperă",
      H: "Utilaj",
      I: "Transport",
      J: "Material",
      K: "Manoperă",
      L: "Utilaj",
      M: "Transport",
      N: "Total",
    },
    6: {
      A: "1.",
      B: "TX01A1",
      C: "Săpătură manuală în pământ cu umiditate naturală, adâncime până la 1,5 m",
      D: "mc",
      E: 12.5,
    },
    7: {
      A: "2.",
      B: "CX02B1",
      C: "Beton simplu C12/15 turnat în fundații",
      D: "mc",
      E: 4.2,
    },
    8: { C: "TOTAL" },
    9: { C: "CAM 2,25%" },
    10: { C: "Total cheltuieli directe" },
    11: { C: "Cheltuieli indirecte 10%" },
    12: { C: "Profit 5%" },
    13: { C: "TOTAL GENERAL fără TVA" },
    14: { C: "TVA 21%" },
    15: { C: "TOTAL cu TVA" },
  },
};

const kindRows = (from: number) => ({
  [from]: { B: "a) materiale" },
  [from + 1]: { B: "b) manoperă" },
  [from + 2]: { B: "c) utilaj" },
  [from + 3]: { B: "d) transport" },
});

const splitF3: TestSheet = {
  name: "F3",
  rows: {
    5: header,
    7: {
      A: 1,
      B: "TX01A1 Săpătură manuală în pământ cu umiditate naturală, adâncime până la 1,5 m",
      C: "mc",
      D: 12.5,
    },
    ...kindRows(8),
    12: {
      A: 2,
      B: "CX02B1 Beton simplu C12/15 turnat în fundații",
      C: "mc",
      D: 4.2,
    },
    ...kindRows(13),
    17: { B: "Total articole, din care:" },
    ...kindRows(18),
    22: { B: "CAM (2,25% din manoperă)" },
    23: { B: "Total cheltuieli directe" },
    24: { B: "Cheltuieli indirecte (10% din cheltuielile directe)" },
    25: { B: "Profit (5% din cheltuielile directe și indirecte)" },
    26: { B: "TOTAL fără TVA" },
  },
};

function byPosition(data: ExportData, position: string, unit?: string) {
  const item = data.lineItems.find(
    (line) =>
      line.tenderRef?.position === position &&
      (!unit || line.tenderRef.unit === unit),
  );
  if (!item) {
    throw new Error(`No position ${position}`);
  }
  return item;
}

/** A sheet's cells after filling, by reference such as "E7". */
function cellsOf(workbook: Workbook, name: string) {
  const sheet = workbook.sheets.find((found) => found.name === name);
  const cells = new Map<
    string,
    { text: string; value?: number; formula: boolean }
  >();
  for (const row of sheet?.rows ?? []) {
    for (const [column, cell] of Object.entries(row.cells)) {
      cells.set(`${column}${row.row}`, cell);
    }
  }
  return cells;
}

const markups = tenderData().estimate.markups;
// A position's prices with all the Cote in its unit prices, or none of them,
// for a list whose Recapitulație adds them all.
const values = (item: LineItemInput, basis: "direct" | "inclusive") =>
  lineValues(
    item,
    basis === "inclusive"
      ? { ...markups, vat: 0 }
      : { cam: 0, indirect: 0, profit: 0, vat: 0 },
  );

describe("an authority's workbook", () => {
  test("reads its visible sheets, their cells and where they are", () => {
    const workbook = openWorkbook(makeWorkbook([plainF3, workings, yardF3]));
    expect(workbook.sheets.map((sheet) => [sheet.name, sheet.path])).toEqual([
      ["F3 Construcții", "xl/worksheets/sheet1.xml"],
      ["F3 Curte", "xl/worksheets/sheet3.xml"],
    ]);
    const cells = cellsOf(workbook, "F3 Construcții");
    expect(cells.get("B11")?.text).toBe(
      "Transport pământ cu autobasculanta la 10 km",
    );
    expect(cells.get("D7")).toEqual({
      text: "12.5",
      value: 12.5,
      formula: false,
    });
    expect(cells.get("D11")?.text).toBe("21,25");
    // A formula that hasn't computed yet has nothing to show.
    expect(cells.get("F7")).toEqual({ text: "", formula: true });
    expect(workbook.sheets[0]?.merges[0]).toEqual({
      fromColumn: 1,
      fromRow: 1,
      toColumn: 6,
      toRow: 1,
    });
  });

  test("refuses what isn't an .xlsx", () => {
    expect(() =>
      openWorkbook(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])),
    ).toThrow(SpreadsheetError);
  });

  test("refuses a part that says it unpacks too large", () => {
    const bytes = makeWorkbook([plainF3]);
    // The archive's first entry in its central directory, at 2 GB.
    const entry = bytes.findIndex(
      (byte, at) =>
        byte === 0x50 &&
        bytes[at + 1] === 0x4b &&
        bytes[at + 2] === 0x01 &&
        bytes[at + 3] === 0x02,
    );
    new DataView(bytes.buffer, bytes.byteOffset).setUint32(
      entry + 24,
      0x7fff_ffff,
      true,
    );
    expect(() => openWorkbook(bytes)).toThrow("too large");
  });
});

describe("finding a Deviz's positions in the lists", () => {
  test("finds each by its quantity and U.M., then its number, code and text", () => {
    const data = tenderData();
    const plan = planWorkbook(
      openWorkbook(makeWorkbook([plainF3, workings, yardF3])),
      data,
    );
    const [construction, yard] = plan.sheets;
    expect(plan.sheets.map((sheet) => sheet.name)).toEqual([
      "F3 Construcții",
      "F3 Curte",
    ]);
    expect(construction?.positions).toEqual([
      { lineItemId: byPosition(data, "1", "mc")._id, row: 7 },
      { lineItemId: byPosition(data, "2")._id, row: 8 },
      { lineItemId: byPosition(data, "3")._id, row: 10 },
      { lineItemId: byPosition(data, "4")._id, row: 11 },
    ]);
    expect(yard?.positions).toEqual([
      { lineItemId: byPosition(data, "1", "mp")._id, row: 7 },
    ]);
    expect(construction?.quantityColumn).toBe("D");
    expect(construction?.columns).toEqual({
      unitPrice: "E",
      total: "F",
      unitByKind: {},
      totalByKind: {},
    });
    expect(construction?.guessed).toBe(false);
    expect(construction?.choices).toEqual([
      { column: "E", header: "Prețul unitar (lei)" },
      { column: "F", header: "Total (lei) (col. 3 x col. 4)" },
    ]);
    // A position the Deviz lacks, and one of the Deviz the file lacks.
    expect(construction?.unpriced).toEqual([
      { row: 12, position: "6", text: "Curățenie finală a încăperilor" },
    ]);
    expect(plan.missing).toEqual([
      {
        lineItemId: byPosition(data, "5")._id,
        position: "5",
        text: "Hidroizolație cu membrană bituminoasă",
      },
    ]);
    // The bidder's own line, which no list has.
    expect(plan.extra).toEqual([
      {
        lineItemId: String(
          data.lineItems.find((item) => item.code === "OWN1")?._id,
        ),
        title: "Curățenie de șantier, a ofertantului",
      },
    ]);
    // No rows for indirect costs and profit: the prices include them.
    expect(construction?.closing).toEqual([
      { row: 13, line: "items", group: 0 },
    ]);
    expect(construction?.basis).toBe("inclusive");
  });

  test("takes the same position in two lists in their order", () => {
    const data = tenderData();
    const second = byPosition(data, "1", "mp");
    const first = {
      ...second,
      _id: "first-yard",
      position: 0,
      sectionId: "construction",
    };
    const plan = planWorkbook(
      openWorkbook(makeWorkbook([yardF3, { ...yardF3, name: "F3 Curte 2" }])),
      { ...data, lineItems: [first, ...data.lineItems] },
    );
    expect(plan.sheets.map((sheet) => sheet.positions[0]?.lineItemId)).toEqual([
      "first-yard",
      second._id,
    ]);
  });

  test("guesses the price columns beside the quantities when no header names them", () => {
    const bare: TestSheet = {
      name: "Lista",
      rows: {
        2: {
          A: 1,
          B: "Curățarea terenului de iarbă și buruieni",
          C: "mp",
          D: 150,
        },
      },
    };
    const [sheet] = planWorkbook(
      openWorkbook(makeWorkbook([bare])),
      tenderData(),
    ).sheets;
    expect(sheet?.guessed).toBe(true);
    expect(sheet?.columns.unitPrice).toBe("E");
    expect(sheet?.columns.total).toBe("F");
  });

  test("reads a detailed list's columns by kind and its Recapitulație", () => {
    const [sheet] = planWorkbook(
      openWorkbook(makeWorkbook([detailedC5])),
      tenderData(),
    ).sheets;
    expect(sheet?.columns).toEqual({
      unitByKind: { material: "F", labor: "G", equipment: "H", transport: "I" },
      totalByKind: {
        material: "J",
        labor: "K",
        equipment: "L",
        transport: "M",
      },
      total: "N",
    });
    expect(sheet?.closing.map((row) => row.line)).toEqual([
      "items",
      "cam",
      "direct",
      "indirect",
      "profit",
      "subtotal",
      "vat",
      "total",
    ]);
    expect(sheet?.basis).toBe("direct");
  });

  test("finds the rows a)–d) under each position", () => {
    const data = tenderData();
    const [sheet] = planWorkbook(
      openWorkbook(makeWorkbook([splitF3])),
      data,
    ).sheets;
    expect(sheet?.details.map((row) => [row.row, row.kind])).toEqual([
      [8, "material"],
      [9, "labor"],
      [10, "equipment"],
      [11, "transport"],
      [13, "material"],
      [14, "labor"],
      [15, "equipment"],
      [16, "transport"],
    ]);
    expect(sheet?.closing.map((row) => [row.row, row.line])).toEqual([
      [17, "items"],
      [18, "material"],
      [19, "labor"],
      [20, "equipment"],
      [21, "transport"],
      [22, "cam"],
      [23, "direct"],
      [24, "indirect"],
      [25, "profit"],
      [26, "subtotal"],
    ]);
  });
});

describe("filling the lists", () => {
  test("writes prices that include the closing into a list without rows for it", () => {
    const data = tenderData();
    const source = openWorkbook(makeWorkbook([plainF3, workings, yardF3]));
    const plan = planWorkbook(source, data);
    const filled = openWorkbook(fillWorkbook(source, plan, data));
    const cells = cellsOf(filled, "F3 Construcții");

    // 75 lei of labour a mc, with CAM, indirect costs and profit.
    expect(cells.get("E7")?.value).toBe(88.57);
    expect(cells.get("F7")).toEqual({
      text: "1107.13",
      value: 1107.13,
      formula: true,
    });
    // Priced per m², as the authority counts, though the norm counts 100 mp.
    const plaster = values(byPosition(data, "3"), "inclusive");
    expect(cells.get("E10")?.value).toBe(plaster.unitPrice);
    expect(cells.get("F10")?.value).toBe(plaster.total);
    const transport = values(byPosition(data, "4"), "inclusive");
    expect(cells.get("E11")?.value).toBe(transport.unitPrice);
    // The row without a Deviz position is left for the bidder.
    expect(cells.has("E12")).toBe(false);
    const total = sheetTotal(plan.sheets[0]!, data, "inclusive");
    expect(cells.get("F13")?.value).toBe(total);
    expect(cellsOf(filled, "F3 Curte").get("E7")?.value).toBe(
      values(byPosition(data, "1", "mp"), "inclusive").unitPrice,
    );
  });

  test("keeps the file's styles, formulas and other parts", () => {
    const data = tenderData();
    const bytes = makeWorkbook([plainF3, workings, yardF3]);
    const source = openWorkbook(bytes);
    const filled = unzipSync(
      fillWorkbook(source, planWorkbook(source, data), data),
    );
    const before = unzipSync(bytes);
    expect(Object.keys(filled)).toEqual(Object.keys(before));
    for (const part of [
      "xl/styles.xml",
      "xl/sharedStrings.xml",
      "xl/worksheets/sheet2.xml",
      "[Content_Types].xml",
    ]) {
      expect(strFromU8(filled[part]!)).toBe(strFromU8(before[part]!));
    }
    const sheet = strFromU8(filled["xl/worksheets/sheet1.xml"]!);
    expect(sheet).toContain('<c r="E7" s="2"><v>88.57</v></c>');
    expect(sheet).toContain('<c r="F7" s="2"><f>D7*E7</f><v>1107.13</v></c>');
    // Cells added where the row had none take their column's style, in order.
    expect(sheet).toMatch(
      /<row r="11" spans="1:6"><c r="A11"><v>4<\/v><\/c><c r="B11"[^>]*>.*<\/c><c r="C11"[^>]*>.*<\/c><c r="D11"[^>]*>.*<\/c><c r="E11" s="2"><v>[\d.]+<\/v><\/c><c r="F11" s="2"><v>[\d.]+<\/v><\/c><\/row>/,
    );
    expect(strFromU8(filled["xl/workbook.xml"]!)).toContain(
      '<calcPr fullCalcOnLoad="1"/></workbook>',
    );
  });

  test("sets an existing calculation to run again on opening", () => {
    const data = tenderData();
    const source = openWorkbook(
      makeWorkbook([yardF3], { calc: '<calcPr calcId="191029"/>' }),
    );
    const filled = unzipSync(
      fillWorkbook(source, planWorkbook(source, data), data),
    );
    expect(strFromU8(filled["xl/workbook.xml"]!)).toContain(
      '<calcPr calcId="191029" fullCalcOnLoad="1"/>',
    );
  });

  test("splits a detailed list by kind and adds up its Recapitulație", () => {
    const data = tenderData();
    const source = openWorkbook(makeWorkbook([detailedC5]));
    const plan = planWorkbook(source, data);
    const cells = cellsOf(openWorkbook(fillWorkbook(source, plan, data)), "C5");
    const digging = values(byPosition(data, "1", "mc"), "direct");
    const concrete = values(byPosition(data, "2"), "direct");
    // Labour only: 2,5 h at 30 lei for each of the 12,5 mc, the other kinds 0.
    expect(
      ["F6", "G6", "H6", "I6", "J6", "K6", "L6", "M6", "N6"].map(
        (reference) => cells.get(reference)?.value,
      ),
    ).toEqual([0, 75, 0, 0, 0, 937.5, 0, 0, 937.5]);
    expect(cells.get("F7")?.value).toBe(concrete.unitByKind.material);
    expect(cells.get("N7")?.value).toBe(concrete.total);

    const recap = applyMarkups(
      {
        material: concrete.totalByKind.material,
        labor: roundLei(digging.totalByKind.labor + concrete.totalByKind.labor),
        equipment: concrete.totalByKind.equipment,
        transport: 0,
      },
      0,
      markups,
    );
    expect(
      ["N8", "N9", "N10", "N11", "N12", "N13", "N14", "N15"].map(
        (reference) => cells.get(reference)?.value,
      ),
    ).toEqual([
      roundLei(digging.total + concrete.total),
      recap.cam,
      recap.direct,
      recap.indirect,
      recap.profit,
      recap.subtotal,
      recap.vat,
      recap.total,
    ]);
    expect(cells.get("K8")?.value).toBe(recap.labor);
    // What the sheet comes to, as the person sees it before downloading.
    expect(sheetTotal(plan.sheets[0]!, data, "direct")).toBe(recap.subtotal);
    expect(formulaRows(source, plan.sheets[0]!)).toEqual([]);
  });

  test("names the Recapitulație's rows that the authority's formulas compute", () => {
    const data = tenderData();
    const withFormulas: TestSheet = {
      ...detailedC5,
      rows: {
        ...detailedC5.rows,
        // Computed by Excel when it was saved, and not computed yet.
        11: {
          C: "Cheltuieli indirecte 10%",
          N: { formula: "N10*10%", value: 0 },
        },
        14: { C: "TVA 21%", N: { formula: "N13*21%", value: "" } },
        15: { C: "TOTAL cu TVA", N: { formula: "N13+N14" } },
      },
    };
    const source = openWorkbook(makeWorkbook([withFormulas]));
    const plan = planWorkbook(source, data);
    const sheet = plan.sheets[0]!;
    expect(formulaRows(source, sheet)).toEqual([11, 14]);
    // Nothing to flag where the person writes no totals.
    expect(formulaRows(source, sheet, { total: null })).toEqual([]);
    // The formulas stay, with the values written as what they last showed.
    const filled = cellsOf(
      openWorkbook(fillWorkbook(source, plan, data)),
      "C5",
    );
    expect(filled.get("N11")?.formula).toBe(true);
    expect(filled.get("N14")?.formula).toBe(true);
    expect(filled.get("N14")?.value).toBeGreaterThan(0);
  });

  test("splits the direct costs by kind when no row totals the positions", () => {
    const data = tenderData();
    const { 8: _total, 9: _cam, ...rows } = detailedC5.rows;
    const source = openWorkbook(makeWorkbook([{ ...detailedC5, rows }]));
    const plan = planWorkbook(source, data);
    expect(plan.sheets[0]?.closing.slice(0, 2)).toEqual([
      { row: 10, line: "direct", group: 0 },
      { row: 11, line: "indirect", group: 0 },
    ]);
    const cells = cellsOf(openWorkbook(fillWorkbook(source, plan, data)), "C5");
    const kinds = ["J10", "K10", "L10", "M10"].map(
      (reference) => cells.get(reference)?.value ?? 0,
    );
    // With CAM in the labour, the direct costs are the kinds' sum.
    expect(cells.get("N10")?.value).toBe(
      roundLei(kinds.reduce((sum, value) => sum + value, 0)),
    );
    expect(kinds[1]).toBeGreaterThan(937.5);
  });

  test("adds up each chapter, then the whole list under its total general", () => {
    const data = tenderData();
    const chapters: TestSheet = {
      name: "Liste",
      rows: {
        5: header,
        6: { A: "Capitolul 1 Terasamente" },
        7: {
          A: 1,
          B: "TX01A1 Săpătură manuală în pământ cu umiditate naturală, adâncime până la 1,5 m",
          C: "mc",
          D: 12.5,
        },
        8: { B: "Total capitolul 1" },
        9: { A: "Capitolul 2 Betoane" },
        10: {
          A: 2,
          B: "CX02B1 Beton simplu C12/15 turnat în fundații",
          C: "mc",
          D: 4.2,
        },
        11: { B: "Total capitolul 2" },
        12: { B: "TOTAL GENERAL" },
        13: { B: "TVA 21%" },
        14: { B: "TOTAL GENERAL cu TVA" },
      },
    };
    const source = openWorkbook(makeWorkbook([chapters]));
    const plan = planWorkbook(source, data);
    expect(plan.sheets[0]?.closing).toEqual([
      { row: 8, line: "items", group: 0 },
      { row: 11, line: "items", group: 1 },
      { row: 12, line: "subtotal", group: undefined },
      { row: 13, line: "vat", group: undefined },
      { row: 14, line: "total", group: undefined },
    ]);
    const cells = cellsOf(
      openWorkbook(fillWorkbook(source, plan, data)),
      "Liste",
    );
    const digging = values(byPosition(data, "1", "mc"), "inclusive");
    const concrete = values(byPosition(data, "2"), "inclusive");
    const sum = roundLei(digging.total + concrete.total);
    const vat = roundLei(sum * 0.21);
    expect(
      ["F8", "F11", "F12", "F13", "F14"].map(
        (reference) => cells.get(reference)?.value,
      ),
    ).toEqual([digging.total, concrete.total, sum, vat, roundLei(sum + vat)]);
  });

  test("writes each kind on its own row a)–d)", () => {
    const data = tenderData();
    const source = openWorkbook(makeWorkbook([splitF3]));
    const cells = cellsOf(
      openWorkbook(fillWorkbook(source, planWorkbook(source, data), data)),
      "F3",
    );
    const concrete = values(byPosition(data, "2"), "direct");
    expect(cells.get("E12")?.value).toBe(concrete.unitPrice);
    expect(cells.get("E13")?.value).toBe(concrete.unitByKind.material);
    expect(cells.get("F14")?.value).toBe(concrete.totalByKind.labor);
    expect(cells.get("F25")?.value).toBeGreaterThan(0);
  });

  test("follows the person's choice of columns and prices", () => {
    const data = tenderData();
    const source = openWorkbook(makeWorkbook([yardF3]));
    const plan = planWorkbook(source, data);
    const path = plan.sheets[0]?.path ?? "";
    const cells = cellsOf(
      openWorkbook(
        fillWorkbook(source, plan, data, {
          [path]: { unitPrice: null, total: "G", basis: "direct" },
        }),
      ),
      "F3 Curte",
    );
    // A list without rows for the Cote has them in its prices either way.
    const clearing = values(byPosition(data, "1", "mp"), "inclusive");
    expect(cells.has("E7")).toBe(false);
    expect(cells.get("G7")?.value).toBe(clearing.total);
  });

  test("puts in the unit prices the Cote a Recapitulație has no row for", () => {
    const data = tenderData();
    const { 22: _cam, ...rows } = splitF3.rows;
    const source = openWorkbook(makeWorkbook([{ ...splitF3, rows }]));
    const plan = planWorkbook(source, data);
    const sheet = plan.sheets[0]!;
    expect(addedMarkups(sheet)).toEqual(["indirect", "profit"]);
    expect(sheet.basis).toBe("direct");
    const cells = cellsOf(openWorkbook(fillWorkbook(source, plan, data)), "F3");
    const digging = values(byPosition(data, "1", "mc"), "direct");
    const concrete = values(byPosition(data, "2"), "direct");
    // CAM goes in the labour, as the list has no row to add it.
    expect(cells.get("E13")?.value).toBe(concrete.unitByKind.material);
    expect(cells.get("E14")?.value).toBe(
      roundLei(concrete.unitByKind.labor * (1 + markups.cam / 100)),
    );
    // The list still comes to the offer's value, but for rounding each
    // unit price to bani.
    const offer = applyMarkups(
      {
        material: concrete.totalByKind.material,
        labor: roundLei(digging.totalByKind.labor + concrete.totalByKind.labor),
        equipment: concrete.totalByKind.equipment,
        transport: 0,
      },
      0,
      markups,
    ).subtotal;
    const listed = cells.get("F26")?.value ?? 0;
    expect(listed).toBe(sheetTotal(sheet, data, "direct"));
    expect(Math.abs(listed - offer)).toBeLessThan(0.1);
  });

  test("leaves a text the authority wrote in a price cell", () => {
    const data = tenderData();
    const noted: TestSheet = {
      ...yardF3,
      rows: {
        ...yardF3.rows,
        7: { ...yardF3.rows[7], E: "se va completa" },
      },
    };
    const source = openWorkbook(makeWorkbook([noted]));
    const cells = cellsOf(
      openWorkbook(fillWorkbook(source, planWorkbook(source, data), data)),
      "F3 Curte",
    );
    expect(cells.get("E7")?.text).toBe("se va completa");
    expect(cells.get("F7")?.formula).toBe(true);
  });
});

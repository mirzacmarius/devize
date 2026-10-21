import { strToU8, zipSync } from "fflate";
import type { ExportData, SectionInput } from "../input";
import { lineItem } from "../sample.helper";

// Made-up spreadsheets of a tender's lists, laid out as contracting
// authorities lay them out, and a made-up Deviz imported from them.
// Positions, codes, texts and prices are invented.

/**
 * A cell of a test sheet: a text (a shared string), a number, a formula
 * with the value it last computed, a styled cell, or an inline string.
 */
export type TestCell =
  | string
  | number
  // An empty value as some writers leave it: <v></v>.
  | { formula: string; value?: number | ""; style?: number }
  | { style: number; value?: string | number }
  | { inline: string };

export type TestSheet = {
  name: string;
  // Cells by row number, then by column letter.
  rows: Record<number, Record<string, TestCell>>;
  merges?: string[];
  hidden?: boolean;
  // The sheet's own <cols>, as XML.
  cols?: string;
};

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationships =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${main}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" borderId="1" applyFont="1" applyBorder="1"/><xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1"/></cellXfs></styleSheet>`;

/** An .xlsx file of the sheets, as Excel would save it. */
export function makeWorkbook(
  sheets: readonly TestSheet[],
  options: { calc?: string } = {},
): Uint8Array {
  const strings: string[] = [];
  const shared = (text: string) => {
    let index = strings.indexOf(text);
    if (index < 0) {
      index = strings.push(text) - 1;
    }
    return index;
  };
  const cellXml = (reference: string, cell: TestCell) => {
    if (typeof cell === "string") {
      return `<c r="${reference}" t="s"><v>${shared(cell)}</v></c>`;
    }
    if (typeof cell === "number") {
      return `<c r="${reference}"><v>${cell}</v></c>`;
    }
    if ("inline" in cell) {
      return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(cell.inline)}</t></is></c>`;
    }
    if ("formula" in cell) {
      const style = cell.style === undefined ? "" : ` s="${cell.style}"`;
      const value = cell.value === undefined ? "" : `<v>${cell.value}</v>`;
      return `<c r="${reference}"${style}><f>${escapeXml(cell.formula)}</f>${value}</c>`;
    }
    if (cell.value === undefined) {
      return `<c r="${reference}" s="${cell.style}"/>`;
    }
    return typeof cell.value === "string"
      ? `<c r="${reference}" s="${cell.style}" t="s"><v>${shared(cell.value)}</v></c>`
      : `<c r="${reference}" s="${cell.style}"><v>${cell.value}</v></c>`;
  };
  const columnOf = (letters: string) =>
    [...letters].reduce(
      (sum, letter) => sum * 26 + letter.charCodeAt(0) - 64,
      0,
    );
  const sheetXml = (sheet: TestSheet) => {
    const rows = Object.entries(sheet.rows)
      .map(([row, cells]) => [Number(row), cells] as const)
      .sort(([a], [b]) => a - b)
      .map(([row, cells]) => {
        const sorted = Object.entries(cells).sort(
          ([a], [b]) => columnOf(a) - columnOf(b),
        );
        const last = sorted.at(-1)?.[0] ?? "A";
        return `<row r="${row}" spans="1:${columnOf(last)}">${sorted
          .map(([column, cell]) => cellXml(`${column}${row}`, cell))
          .join("")}</row>`;
      })
      .join("");
    const merges = sheet.merges?.length
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
          .map((range) => `<mergeCell ref="${range}"/>`)
          .join("")}</mergeCells>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${main}" xmlns:r="${relationships}"><dimension ref="A1:N40"/>${sheet.cols ?? ""}<sheetData>${rows}</sheetData>${merges}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  };

  const files: Record<string, Uint8Array> = {};
  const worksheets = sheets.map((sheet) => sheetXml(sheet));
  files["[Content_Types].xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
      .map(
        (_sheet, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join(
        "",
      )}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`,
  );
  files["_rels/.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  files["xl/workbook.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${main}" xmlns:r="${relationships}"><sheets>${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}"${sheet.hidden ? ' state="hidden"' : ""} r:id="rId${index + 1}"/>`,
      )
      .join("")}</sheets>${options.calc ?? ""}</workbook>`,
  );
  files["xl/_rels/workbook.xml.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map(
        (_sheet, index) =>
          `<Relationship Id="rId${index + 1}" Type="${relationships}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
      )
      .join(
        "",
      )}<Relationship Id="rId${sheets.length + 1}" Type="${relationships}/styles" Target="styles.xml"/><Relationship Id="rId${sheets.length + 2}" Type="${relationships}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
  );
  worksheets.forEach((xml, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(xml);
  });
  files["xl/styles.xml"] = strToU8(styles);
  files["xl/sharedStrings.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="${main}" count="${strings.length}" uniqueCount="${strings.length}">${strings
      .map((text) => `<si><t xml:space="preserve">${escapeXml(text)}</t></si>`)
      .join("")}</sst>`,
  );
  return zipSync(files);
}

const sections: SectionInput[] = [
  {
    _id: "school",
    kind: "object",
    code: "1",
    name: "Corp școală",
    position: 1,
  },
  {
    _id: "construction",
    kind: "chapter",
    parentId: "school",
    code: "01",
    name: "Construcții",
    position: 2,
  },
  {
    _id: "yard",
    kind: "object",
    code: "2",
    name: "Curte",
    position: 3,
  },
  {
    _id: "yardworks",
    kind: "chapter",
    parentId: "yard",
    code: "02",
    name: "Amenajări exterioare",
    position: 4,
  },
];

/**
 * A made-up tender's Deviz, imported from the lists of the test workbooks:
 * positions with an indicator code in front of their text, one priced on a
 * "100 mp" norm, one without a code, one the lists don't have and the
 * bidder's own line.
 */
export function tenderData(): ExportData {
  const lineItems = [
    lineItem({
      sectionId: "construction",
      code: "TX01A1",
      title: "Săpătură manuală în pământ",
      unit: "mc",
      quantity: 12.5,
      tenderRef: {
        position: "1",
        code: "TX01A1",
        text: "Săpătură manuală în pământ cu umiditate naturală, adâncime până la 1,5 m",
        unit: "mc",
        quantity: 12.5,
      },
      resources: [
        {
          kind: "labor",
          name: "Muncitor necalificat",
          unit: "ora",
          quantity: 2.5,
          unitPrice: 30,
        },
      ],
    }),
    lineItem({
      sectionId: "construction",
      code: "CX02B1",
      title: "Beton simplu în fundații",
      unit: "mc",
      quantity: 4.2,
      tenderRef: {
        position: "2",
        code: "CX02B1",
        text: "Beton simplu C12/15 turnat în fundații",
        unit: "mc",
        quantity: 4.2,
      },
      resources: [
        {
          kind: "material",
          name: "Beton C12/15",
          unit: "mc",
          quantity: 1.02,
          unitPrice: 395,
        },
        {
          kind: "labor",
          name: "Betonist",
          unit: "ora",
          quantity: 1.8,
          unitPrice: 40,
        },
        {
          kind: "equipment",
          name: "Pompă de beton",
          unit: "ora",
          quantity: 0.1,
          unitPrice: 250,
        },
      ],
    }),
    lineItem({
      sectionId: "construction",
      code: "AX03C1",
      title: "Tencuieli interioare",
      unit: "100 mp",
      quantity: 2.432,
      tenderRef: {
        position: "3",
        code: "AX03C1",
        text: "Tencuieli interioare drișcuite cu mortar var-ciment, pe pereți",
        unit: "m2",
        quantity: 243.2,
      },
      resources: [
        {
          kind: "material",
          name: "Mortar var-ciment",
          unit: "kg",
          quantity: 1800,
          unitPrice: 0.9,
        },
        {
          kind: "labor",
          name: "Tencuitor",
          unit: "ora",
          quantity: 60,
          unitPrice: 42,
        },
      ],
    }),
    lineItem({
      sectionId: "construction",
      code: "—",
      title: "Transport pământ",
      unit: "t",
      quantity: 21.25,
      tenderRef: {
        position: "4",
        text: "Transport pământ cu autobasculanta la 10 km",
        unit: "t",
        quantity: 21.25,
      },
      resources: [
        {
          kind: "transport",
          name: "Autobasculantă",
          unit: "t",
          quantity: 1,
          unitPrice: 18,
        },
      ],
    }),
    lineItem({
      sectionId: "construction",
      code: "—",
      title: "Hidroizolație",
      unit: "mp",
      quantity: 40,
      tenderRef: {
        position: "5",
        text: "Hidroizolație cu membrană bituminoasă",
        unit: "mp",
        quantity: 40,
      },
      resources: [
        {
          kind: "material",
          name: "Membrană bituminoasă",
          unit: "mp",
          quantity: 1.15,
          unitPrice: 32,
        },
      ],
    }),
    lineItem({
      sectionId: "construction",
      code: "OWN1",
      title: "Curățenie de șantier, a ofertantului",
      unit: "ora",
      quantity: 8,
      resources: [
        {
          kind: "labor",
          name: "Muncitor necalificat",
          unit: "ora",
          quantity: 1,
          unitPrice: 30,
        },
      ],
    }),
    lineItem({
      sectionId: "yardworks",
      code: "—",
      title: "Curățarea terenului",
      unit: "mp",
      quantity: 150,
      tenderRef: {
        position: "1",
        text: "Curățarea terenului de iarbă și buruieni",
        unit: "mp",
        quantity: 150,
      },
      resources: [
        {
          kind: "labor",
          name: "Muncitor necalificat",
          unit: "ora",
          quantity: 0.05,
          unitPrice: 30,
        },
      ],
    }),
  ];
  return {
    estimate: {
      number: 9,
      revision: 1,
      title: "Reabilitarea școlii din Exemplu",
      kind: "tender",
      priceDate: "2026-10-20",
      markups: { cam: 2.25, indirect: 10, profit: 5, vat: 21 },
      tender: { authority: "Comuna Exemplu" },
    },
    sections,
    lineItems,
    firm: { name: "Constructor Exemplu SRL" },
    client: null,
  };
}

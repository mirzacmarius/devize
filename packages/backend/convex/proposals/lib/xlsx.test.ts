import { describe, expect, test } from "bun:test";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import {
  columnLetters,
  columnNumber,
  decodeXml,
  readWorkbook,
  SpreadsheetError,
} from "./xlsx";

const inflate = (data: Uint8Array, maxBytes: number) =>
  inflateRawSync(data, { maxOutputLength: maxBytes });

/** A zip archive of the given parts, deflated as Excel writes them. */
function zip(parts: Record<string, string>, method: 0 | 8 = 8): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(parts)) {
    const nameBytes = encoder.encode(name);
    const raw = encoder.encode(content);
    const data = method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(8, method, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, raw.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const entry = new Uint8Array(46 + nameBytes.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(10, method, true);
    entryView.setUint32(20, data.length, true);
    entryView.setUint32(24, raw.length, true);
    entryView.setUint16(28, nameBytes.length, true);
    entryView.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    chunks.push(local);
    directory.push(entry);
    offset += local.length;
  }
  const size = directory.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, directory.length, true);
  endView.setUint16(10, directory.length, true);
  endView.setUint32(12, size, true);
  endView.setUint32(16, offset, true);
  const all = [...chunks, ...directory, end];
  const result = new Uint8Array(
    all.reduce((sum, part) => sum + part.length, 0),
  );
  let at = 0;
  for (const part of all) {
    result.set(part, at);
    at += part.length;
  }
  return result;
}

// A made-up quantity list: two visible sheets and a hidden one.
const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Ob. 1 Cl&#259;dire" sheetId="1" r:id="rId1"/>
    <sheet name="Calcule" sheetId="2" state="hidden" r:id="rId2"/>
    <sheet name="Ob. 2" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`;

const relationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet3.xml"/>
</Relationships>`;

const strings = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6">
  <si><t>Nr. crt.</t></si>
  <si><t>Denumire</t></si>
  <si><t xml:space="preserve">Zid&#259;rie din blocuri ceramice </t></si>
  <si><r><rPr><b/></rPr><t>Tencuial&#259; </t></r><r><t>interioar&#259; &amp; glet</t></r><rPh sb="0" eb="1"><t>ignored</t></rPh></si>
  <si><t>mc</t></si>
  <si><t>mp</t></si>
</sst>`;

const sheet1 = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols><col min="1" max="3" width="12"/></cols>
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
    <row r="2" spans="1:4"><c r="A2" s="1"/><c r="B2" s="1"/></row>
    <row r="3"><c r="A3"><v>1</v></c><c r="B3" t="s"><v>2</v></c><c r="C3" t="s"><v>4</v></c><c r="D3"><f>2*6.25</f><v>12.5</v></c></row>
    <row r="5"><c><v>2</v></c><c t="s"><v>3</v></c><c t="s"><v>5</v></c><c><v>1.5E2</v></c></row>
    <row r="6"><c r="B6" t="inlineStr"><is><t>TOTAL</t></is></c><c r="D6" t="e"><v>#REF!</v></c><c r="E6" t="b"><v>1</v></c></row>
  </sheetData>
</worksheet>`;

const sheet3 = `<?xml version="1.0" encoding="UTF-8"?>
<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <x:sheetData>
    <x:row r="2"><x:c r="AA2" t="str"><x:v>Obiectul 02 &lt;Împrejmuire&gt;</x:v></x:c></x:row>
  </x:sheetData>
</x:worksheet>`;

const parts = {
  "[Content_Types].xml": "<Types/>",
  "xl/workbook.xml": workbook,
  "xl/_rels/workbook.xml.rels": relationships,
  "xl/sharedStrings.xml": strings,
  "xl/worksheets/sheet1.xml": sheet1,
  "xl/worksheets/sheet2.xml": sheet1,
  "xl/worksheets/sheet3.xml": sheet3,
};

describe("readWorkbook", () => {
  test("reads the visible sheets' cells as text, numbers as numbers", () => {
    const sheets = readWorkbook(zip(parts), inflate);
    expect(sheets.map((sheet) => sheet.name)).toEqual([
      "Ob. 1 Clădire",
      "Ob. 2",
    ]);
    const [first, second] = sheets;
    expect(first?.rows.map((row) => row.row)).toEqual([1, 3, 5, 6]);
    expect(first?.rows[1]?.cells).toEqual({
      A: { text: "1", value: 1 },
      B: { text: "Zidărie din blocuri ceramice" },
      C: { text: "mc" },
      D: { text: "12.5", value: 12.5 },
    });
    // Cells without a reference follow each other; rich text runs join,
    // phonetic runs are left out.
    expect(first?.rows[2]?.cells).toEqual({
      A: { text: "2", value: 2 },
      B: { text: "Tencuială interioară & glet" },
      C: { text: "mp" },
      D: { text: "150", value: 150 },
    });
    expect(first?.rows[3]?.cells).toEqual({
      B: { text: "TOTAL" },
      D: { text: "#REF!" },
      E: { text: "TRUE" },
    });
    expect(second?.rows).toEqual([
      { row: 2, cells: { AA: { text: "Obiectul 02 <Împrejmuire>" } } },
    ]);
  });

  test("reads stored parts too", () => {
    expect(readWorkbook(zip(parts, 0), inflate)).toHaveLength(2);
  });

  test("refuses what isn't an .xlsx", () => {
    expect(() =>
      readWorkbook(new TextEncoder().encode("%PDF-1.7 not a zip"), inflate),
    ).toThrow(SpreadsheetError);
    expect(() =>
      readWorkbook(zip({ "word/document.xml": "<w/>" }), inflate),
    ).toThrow(SpreadsheetError);
  });
});

describe("cells", () => {
  test("column letters and numbers", () => {
    expect(columnNumber("A")).toBe(1);
    expect(columnNumber("z")).toBe(26);
    expect(columnNumber("AA")).toBe(27);
    expect(columnLetters(28)).toBe("AB");
    expect(columnLetters(702)).toBe("ZZ");
    expect(columnLetters(703)).toBe("AAA");
  });

  test("XML entities", () => {
    expect(decodeXml("a &amp; b &lt;c&gt; &#x219;&#539; &quot;")).toBe(
      'a & b <c> șț "',
    );
  });
});

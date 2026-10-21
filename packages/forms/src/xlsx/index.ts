import { columnLetters } from "@devize/backend/convex/proposals/lib/xlsx";
import { strToU8, type Zippable, zipSync } from "fflate";
import type { FormDocument } from "../model";
import { layOut, type SheetCell, type SheetLayout } from "./layout";
import { fontXml, Styles } from "./styles";
import { cleanText, type Run, xmlText } from "./text";

// The documents as one Excel workbook (.xlsx), a sheet for each, from the
// same blocks and tables the PDF draws: numbers stay numbers, shown with
// the PDF's decimals, and each sheet prints on A4 like the PDF, fitted to
// the page's width, its table's header on every page. It loads with the
// first export, like the PDF writer.

export type XlsxOptions = {
  // The file's title, as the workbook's properties give it.
  title: string;
  // The firm that made the documents.
  author?: string;
  // When the file was made; now when left out.
  date?: Date;
};

const xmlHead = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationships =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRelationships =
  "http://schemas.openxmlformats.org/package/2006/relationships";

/** Text cut to at most `max` UTF-16 units, never inside a character. */
function truncate(text: string, max: number): string {
  let cut = "";
  for (const char of text) {
    if (cut.length + char.length > max) {
      break;
    }
    cut += char;
  }
  return cut;
}

/**
 * Each document's sheet name, as Excel takes them: at most 31 characters,
 * none of []:*?/\, and each once whatever its case. A form's name leads
 * with its code, F3 · 01 Terasamente, rather than the whole label.
 */
export function sheetNames(documents: readonly FormDocument[]): string[] {
  const used = new Set<string>();
  return documents.map((document, index) => {
    const label = document.label;
    const name =
      label && document.name.startsWith(`${label} · `)
        ? `${document.id} · ${document.name.slice(label.length + 3)}`
        : document.name;
    const base =
      cleanText(name)
        .replace(/[[\]:*?/\\\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^'+|'+$/g, "")
        .trim() || `Foaia ${index + 1}`;
    let sheet = truncate(base, 31).trim();
    for (let copy = 2; used.has(sheet.toLowerCase()); copy += 1) {
      const suffix = ` (${copy})`;
      sheet = `${truncate(base, 31 - suffix.length).trim()}${suffix}`;
    }
    used.add(sheet.toLowerCase());
    return sheet;
  });
}

/** The workbook's strings, each once, by the number cells refer to them with. */
class SharedStrings {
  private readonly items = new Map<string, number>();
  private references = 0;

  add(runs: readonly Run[]): number {
    const xml =
      runs.length === 1
        ? `<t xml:space="preserve">${xmlText(runs[0]?.text ?? "")}</t>`
        : runs
            .map(
              (run) =>
                `<r>${fontXml(run, "rPr")}<t xml:space="preserve">${xmlText(run.text)}</t></r>`,
            )
            .join("");
    this.references += 1;
    const known = this.items.get(xml);
    if (known !== undefined) {
      return known;
    }
    this.items.set(xml, this.items.size);
    return this.items.size - 1;
  }

  xml(): string {
    const items = [...this.items.keys()].map((xml) => `<si>${xml}</si>`);
    return `${xmlHead}<sst xmlns="${main}" count="${this.references}" uniqueCount="${items.length}">${items.join("")}</sst>`;
  }
}

/** A width in points as Excel measures columns: in Arial 10's digits, 7 pixels each. */
function columnWidth(points: number): number {
  return Math.round(((points * 4) / 3 / 7) * 100) / 100;
}

/** A height in points as Excel keeps rows: in whole pixels, at most 409 points. */
function rowHeight(points: number): number {
  return Math.min(Math.ceil(points / 0.75) * 0.75, 409);
}

/** Text for a header or footer, where & starts a code. */
function headerText(text: string): string {
  return truncate(cleanText(text).replace(/\s+/g, " "), 100).replaceAll(
    "&",
    "&&",
  );
}

function cellXml(
  reference: string,
  cell: SheetCell,
  styles: Styles,
  strings: SharedStrings,
): string {
  const style = styles.id(cell.look);
  const s = style ? ` s="${style}"` : "";
  if (cell.value !== undefined) {
    return `<c r="${reference}"${s}><v>${cell.value}</v></c>`;
  }
  if (cell.runs) {
    return `<c r="${reference}"${s} t="s"><v>${strings.add(cell.runs)}</v></c>`;
  }
  return `<c r="${reference}"${s}/>`;
}

function sheetXml(
  document: FormDocument,
  layout: SheetLayout,
  styles: Styles,
  strings: SharedStrings,
  selected: boolean,
): string {
  const lastColumn = columnLetters(layout.widths.length);
  const lastRow = Math.max(layout.rows.length, 1);
  const area = `A1:${lastColumn}${lastRow}`;
  const columns = layout.widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${columnWidth(width)}" customWidth="1"/>`,
    )
    .join("");
  const rows = layout.rows
    .map((row, index) => {
      const number = index + 1;
      const cells = [...row.cells.entries()]
        .sort(([a], [b]) => a - b)
        .map(([column, cell]) =>
          cellXml(
            `${columnLetters(column + 1)}${number}`,
            cell,
            styles,
            strings,
          ),
        )
        .join("");
      const height =
        row.height === undefined
          ? ""
          : ` ht="${rowHeight(row.height)}" customHeight="1"`;
      return cells || height
        ? `<row r="${number}"${height}>${cells}</row>`
        : "";
    })
    .join("");
  const merges =
    layout.merges.length > 0
      ? `<mergeCells count="${layout.merges.length}">${layout.merges
          .map(
            (range) =>
              `<mergeCell ref="${columnLetters(range.left + 1)}${range.top + 1}:${columnLetters(range.right + 1)}${range.bottom + 1}"/>`,
          )
          .join("")}</mergeCells>`
      : "";
  // The footer and page number of every page, as the PDF prints them, and
  // the form's label over every page but the first, which has it in a row.
  const footer = xmlText(
    `&L&"Arial,Regular"&9 ${headerText(document.footer)}&R&"Arial,Regular"&9 Pagina &P`,
  );
  const headerFooter = document.label
    ? `<headerFooter differentFirst="1"><oddHeader>${xmlText(`&R&"Arial,Bold"&10 ${headerText(document.label)}`)}</oddHeader><oddFooter>${footer}</oddFooter><firstHeader/><firstFooter>${footer}</firstFooter></headerFooter>`
    : `<headerFooter><oddFooter>${footer}</oddFooter></headerFooter>`;
  return [
    xmlHead,
    `<worksheet xmlns="${main}" xmlns:r="${relationships}">`,
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>',
    `<dimension ref="${area}"/>`,
    `<sheetViews><sheetView showGridLines="0"${selected ? ' tabSelected="1"' : ""} workbookViewId="0"/></sheetViews>`,
    '<sheetFormatPr defaultRowHeight="12.75"/>',
    `<cols>${columns}</cols>`,
    `<sheetData>${rows}</sheetData>`,
    merges,
    '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>',
    `<pageSetup paperSize="9" orientation="${document.orientation}" fitToWidth="1" fitToHeight="0" firstPageNumber="1" useFirstPageNumber="1"/>`,
    headerFooter,
    // Numbers in text, such as an item's 1.2, are the form's, not mistakes.
    `<ignoredErrors><ignoredError sqref="${area}" numberStoredAsText="1"/></ignoredErrors>`,
    "</worksheet>",
  ].join("");
}

/** A name for a formula: quoted, its quotes doubled. */
function quotedSheet(name: string): string {
  return `'${name.replaceAll("'", "''")}'`;
}

/** The documents as one .xlsx workbook, a sheet for each. */
export function renderXlsx(
  documents: readonly FormDocument[],
  options: XlsxOptions,
): Uint8Array {
  if (documents.length === 0) {
    throw new Error("A workbook needs at least one document");
  }
  const styles = new Styles();
  const strings = new SharedStrings();
  const names = sheetNames(documents);
  const sheets: string[] = [];
  // The rows each sheet prints at the top of every page.
  const titles: string[] = [];
  documents.forEach((document, index) => {
    const layout = layOut(document);
    sheets.push(sheetXml(document, layout, styles, strings, index === 0));
    if (layout.titleRows) {
      const { first, last } = layout.titleRows;
      titles.push(
        `<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${xmlText(
          `${quotedSheet(names[index] ?? "")}!$${first + 1}:$${last + 1}`,
        )}</definedName>`,
      );
    }
  });
  const date = (options.date ?? new Date())
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  const files: Zippable = {
    "[Content_Types].xml": strToU8(
      [
        xmlHead,
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        ...sheets.map(
          (_, index) =>
            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        ),
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>',
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
        "</Types>",
      ].join(""),
    ),
    "_rels/.rels": strToU8(
      [
        xmlHead,
        `<Relationships xmlns="${packageRelationships}">`,
        `<Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/>`,
        `<Relationship Id="rId2" Type="${packageRelationships}/metadata/core-properties" Target="docProps/core.xml"/>`,
        `<Relationship Id="rId3" Type="${relationships}/extended-properties" Target="docProps/app.xml"/>`,
        "</Relationships>",
      ].join(""),
    ),
    "docProps/core.xml": strToU8(
      [
        xmlHead,
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
        `<dc:title>${xmlText(options.title)}</dc:title>`,
        options.author
          ? `<dc:creator>${xmlText(options.author)}</dc:creator>`
          : "",
        "<dc:language>ro-RO</dc:language>",
        `<dcterms:created xsi:type="dcterms:W3CDTF">${date}</dcterms:created>`,
        `<dcterms:modified xsi:type="dcterms:W3CDTF">${date}</dcterms:modified>`,
        "</cp:coreProperties>",
      ].join(""),
    ),
    "docProps/app.xml": strToU8(
      `${xmlHead}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Devize</Application></Properties>`,
    ),
    "xl/workbook.xml": strToU8(
      [
        xmlHead,
        `<workbook xmlns="${main}" xmlns:r="${relationships}">`,
        "<bookViews><workbookView/></bookViews>",
        `<sheets>${names
          .map(
            (name, index) =>
              `<sheet name="${xmlText(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
          )
          .join("")}</sheets>`,
        titles.length > 0
          ? `<definedNames>${titles.join("")}</definedNames>`
          : "",
        "</workbook>",
      ].join(""),
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      [
        xmlHead,
        `<Relationships xmlns="${packageRelationships}">`,
        ...sheets.map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="${relationships}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        ),
        `<Relationship Id="rId${sheets.length + 1}" Type="${relationships}/styles" Target="styles.xml"/>`,
        `<Relationship Id="rId${sheets.length + 2}" Type="${relationships}/sharedStrings" Target="sharedStrings.xml"/>`,
        "</Relationships>",
      ].join(""),
    ),
  };
  sheets.forEach((xml, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(xml);
  });
  // After the sheets, which register the looks and the strings they use.
  files["xl/styles.xml"] = strToU8(styles.xml());
  files["xl/sharedStrings.xml"] = strToU8(strings.xml());
  return zipSync(files, { level: 6 });
}

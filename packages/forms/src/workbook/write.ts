import {
  columnLetters,
  columnNumber,
} from "@devize/backend/convex/proposals/lib/xlsx";
import { strFromU8, strToU8, type Zippable, zipSync } from "fflate";
import { attribute, splitReference, type Workbook } from "./read";

// Writing numbers into an authority's spreadsheet and nothing else: each
// cell keeps its style, a formula stays with the number as the value it
// last computed, and every other part of the archive goes back as it was.
// Excel computes the formulas again when the file opens, so totals that add
// up the prices show them.

/** Numbers to write into one sheet, by row number and then column letter. */
export type SheetWrites = ReadonlyMap<number, ReadonlyMap<string, number>>;

// A tag's optional namespace prefix, captured: "x:" in <x:row>.
const prefix = "([A-Za-z_][\\w.-]*:)?";
const ns = "(?:[A-Za-z_][\\w.-]*:)?";

/** A number as the sheet's XML writes it. */
function numberText(value: number): string {
  return Number.isFinite(value) && value !== 0 ? String(value) : "0";
}

/** The style of each column that sets one, from the sheet's <cols>. */
function columnStyles(xml: string): Map<number, string> {
  const styles = new Map<number, string>();
  for (const match of xml.matchAll(
    new RegExp(`<${ns}col\\b([^>]*?)\\/?>`, "g"),
  )) {
    const attributes = match[1] ?? "";
    const min = Number(attribute(attributes, "min"));
    const max = Number(attribute(attributes, "max"));
    const style = attribute(attributes, "style");
    if (!style || !Number.isInteger(min) || !Number.isInteger(max)) {
      continue;
    }
    for (let column = min; column <= Math.min(max, min + 16_384); column++) {
      styles.set(column, style);
    }
  }
  return styles;
}

function withAttribute(attributes: string, name: string, value: string) {
  const without = attributes.replace(
    new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`),
    "",
  );
  return `${without} ${name}="${value}"`;
}

/** A row's cells with the numbers written in, in column order. */
function writeRow(input: {
  p: string;
  row: number;
  attributes: string;
  body: string;
  writes: ReadonlyMap<string, number>;
  styles: ReadonlyMap<number, string>;
}): string {
  const { p, row, writes } = input;
  const cells: { column: number; xml: string }[] = [];
  let column = 0;
  for (const match of input.body.matchAll(
    new RegExp(`<${prefix}c\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/\\1c>)`, "g"),
  )) {
    const attributes = match[2] ?? "";
    const reference = splitReference(attribute(attributes, "r") ?? "");
    column = reference ? columnNumber(reference.column) : column + 1;
    cells.push({ column, xml: match[0] });
  }
  // What the row holds besides its cells, such as an <extLst>.
  const rest = input.body
    .replace(
      new RegExp(`<${prefix}c\\b[^>]*?(?:\\/>|>[\\s\\S]*?<\\/\\1c>)`, "g"),
      "",
    )
    .trim();
  const rowStyle =
    attribute(input.attributes, "customFormat") === "1"
      ? attribute(input.attributes, "s")
      : undefined;
  for (const [letters, value] of writes) {
    const number = columnNumber(letters);
    const reference = `${columnLetters(number)}${row}`;
    const found = cells.find((cell) => cell.column === number);
    let style = rowStyle ?? input.styles.get(number);
    let formula = "";
    if (found) {
      const opening =
        new RegExp(`^<${ns}c\\b([^>]*?)\\/?>`).exec(found.xml)?.[1] ?? "";
      style = attribute(opening, "s");
      formula =
        new RegExp(`<${ns}f\\b[^>]*?(?:\\/>|>[\\s\\S]*?<\\/${ns}f>)`).exec(
          found.xml,
        )?.[0] ?? "";
    }
    const xml = `<${p}c r="${reference}"${style ? ` s="${style}"` : ""}>${formula}<${p}v>${numberText(value)}</${p}v></${p}c>`;
    if (found) {
      found.xml = xml;
    } else {
      cells.push({ column: number, xml });
    }
  }
  cells.sort((a, b) => a.column - b.column);
  let attributes = input.attributes;
  if (attribute(attributes, "spans") !== undefined && cells.length > 0) {
    attributes = withAttribute(
      attributes,
      "spans",
      `${cells[0]?.column}:${cells.at(-1)?.column}`,
    );
  }
  return `<${p}row${attributes}>${cells.map((cell) => cell.xml).join("")}${rest}</${p}row>`;
}

/** The sheet's <dimension>, grown to take in a cell written past it. */
function grownDimension(xml: string, column: number, row: number): string {
  return xml.replace(
    new RegExp(`(<${ns}dimension\\b[^>]*?\\sref\\s*=\\s*")([^"]*)(")`),
    (match, start: string, ref: string, end: string) => {
      const [from, to] = ref.split(":");
      const first = from ? splitReference(from) : undefined;
      const last = to ? splitReference(to) : first;
      if (!first?.row || !last?.row) {
        return match;
      }
      const lastColumn = Math.max(columnNumber(last.column), column);
      const lastRow = Math.max(last.row, row);
      return `${start}${first.column}${first.row}:${columnLetters(lastColumn)}${lastRow}${end}`;
    },
  );
}

/** A sheet's XML with the numbers written into their cells. */
export function writeSheet(xml: string, writes: SheetWrites): string {
  if (writes.size === 0) {
    return xml;
  }
  const styles = columnStyles(xml);
  let lastColumn = 0;
  let lastRow = 0;
  for (const [row, cells] of writes) {
    lastRow = Math.max(lastRow, row);
    for (const letters of cells.keys()) {
      lastColumn = Math.max(lastColumn, columnNumber(letters));
    }
  }
  const written = xml.replace(
    new RegExp(`(<${ns}sheetData\\b[^>]*>)([\\s\\S]*?)(<\\/${ns}sheetData>)`),
    (_match, open: string, data: string, close: string) => {
      let rowNumber = 0;
      const rows = data.replace(
        new RegExp(
          `<${prefix}row\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/\\1row>)`,
          "g",
        ),
        (row, p: string | undefined, attributes: string, body?: string) => {
          const declared = Number(attribute(attributes, "r"));
          rowNumber =
            Number.isInteger(declared) && declared > 0
              ? declared
              : rowNumber + 1;
          const cells = writes.get(rowNumber);
          if (!cells || cells.size === 0) {
            return row;
          }
          return writeRow({
            p: p ?? "",
            row: rowNumber,
            attributes,
            body: body ?? "",
            writes: cells,
            styles,
          });
        },
      );
      return `${open}${rows}${close}`;
    },
  );
  return grownDimension(written, lastColumn, lastRow);
}

// The parts that come after <calcPr> in a workbook, which it must precede.
const afterCalc = [
  "oleSize",
  "customWorkbookViews",
  "pivotCaches",
  "smartTagPr",
  "smartTagTypes",
  "webPublishing",
  "fileRecoveryPr",
  "webPublishObjects",
  "extLst",
];

/** The workbook part, set to compute every formula when the file opens. */
export function recalculatedOnLoad(xml: string): string {
  const calc = new RegExp(`<(${ns})calcPr\\b([^>]*?)(\\/?)>`);
  if (calc.test(xml)) {
    return xml.replace(
      calc,
      (_match, p: string, attributes: string, closed: string) =>
        `<${p}calcPr${withAttribute(attributes, "fullCalcOnLoad", "1")}${closed}>`,
    );
  }
  const p = new RegExp(`<(${ns})workbook\\b`).exec(xml)?.[1] ?? "";
  const element = `<${p}calcPr fullCalcOnLoad="1"/>`;
  for (const name of afterCalc) {
    const at = xml.search(new RegExp(`<${ns}${name}\\b`));
    if (at >= 0) {
      return `${xml.slice(0, at)}${element}${xml.slice(at)}`;
    }
  }
  const end = xml.search(new RegExp(`<\\/${ns}workbook>`));
  return end < 0 ? xml : `${xml.slice(0, end)}${element}${xml.slice(end)}`;
}

/**
 * The workbook's bytes with the numbers written into their sheets' cells,
 * by each sheet's part path. Every other part stays as it was.
 */
export function writeWorkbook(
  workbook: Workbook,
  writes: ReadonlyMap<string, SheetWrites>,
): Uint8Array {
  const changed = new Map<string, Uint8Array>();
  for (const [path, sheet] of writes) {
    const part = workbook.parts[path];
    if (part && sheet.size > 0) {
      changed.set(path, strToU8(writeSheet(strFromU8(part), sheet)));
    }
  }
  const book = workbook.parts["xl/workbook.xml"];
  if (book && changed.size > 0) {
    changed.set(
      "xl/workbook.xml",
      strToU8(recalculatedOnLoad(strFromU8(book))),
    );
  }
  const files: Zippable = {};
  for (const [name, data] of Object.entries(workbook.parts)) {
    // Folders are implied by the paths of the files in them.
    if (!name.endsWith("/")) {
      files[name] = changed.get(name) ?? data;
    }
  }
  return zipSync(files, { level: 6 });
}

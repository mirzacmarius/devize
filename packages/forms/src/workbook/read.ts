import {
  columnLetters,
  columnNumber,
  decodeXml,
  SpreadsheetError,
} from "@devize/backend/convex/proposals/lib/xlsx";
import { strFromU8, type Unzipped, unzipSync } from "fflate";

// Opening a contracting authority's spreadsheet (.xlsx) to write prices into
// it. It reads the cells as the tender import does (ADR 0013), and keeps
// what writing needs besides: every part of the archive as it was, where
// each sheet's part is, which cells a formula computes and the merged
// ranges a header spreads over.

export { SpreadsheetError };

/** A cell as the sheet stores it: what it shows, and whether a formula computes it. */
export type WorkbookCell = { text: string; value?: number; formula: boolean };

export type WorkbookRow = {
  // The row number as the spreadsheet shows it, from 1.
  row: number;
  // Non-empty cells by column letter.
  cells: Record<string, WorkbookCell>;
};

/** A rectangle of cells, by column number and row number, both from 1. */
export type CellRange = {
  fromColumn: number;
  fromRow: number;
  toColumn: number;
  toRow: number;
};

export type WorkbookSheet = {
  name: string;
  // The sheet's part in the archive, such as xl/worksheets/sheet1.xml.
  path: string;
  rows: WorkbookRow[];
  merges: CellRange[];
};

export type Workbook = {
  // Every part of the archive, by path, as it was read.
  parts: Unzipped;
  // The visible sheets, in the workbook's order.
  sheets: WorkbookSheet[];
};

// Limits against a broken file: the archive, each part and all of them
// unpacked, and the cells kept.
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_PART_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 160 * 1024 * 1024;
const MAX_CELLS = 400_000;

// Tags may carry a namespace prefix, such as <x:row>.
const ns = "(?:[A-Za-z_][\\w.-]*:)?";

export function attribute(
  attributes: string,
  name: string,
): string | undefined {
  const found = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`,
  ).exec(attributes);
  const value = found?.[2] ?? found?.[3];
  return value === undefined ? undefined : decodeXml(value);
}

/** The text of every <t> in a piece of XML, phonetic runs left out. */
function runText(xml: string): string {
  const visible = xml.replace(
    new RegExp(`<${ns}rPh\\b[\\s\\S]*?<\\/${ns}rPh>`, "g"),
    "",
  );
  let text = "";
  for (const match of visible.matchAll(
    new RegExp(`<${ns}t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${ns}t>`, "g"),
  )) {
    text += decodeXml(match[1] ?? "");
  }
  return text;
}

function sharedStrings(xml: string | undefined): string[] {
  if (!xml) {
    return [];
  }
  return [
    ...xml.matchAll(
      new RegExp(`<${ns}si\\b[^>]*?(?:\\/>|>([\\s\\S]*?)<\\/${ns}si>)`, "g"),
    ),
  ].map((match) => runText(match[1] ?? ""));
}

/** Text with single spaces, as a cell shows it on one line. */
function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** What a cell shows, or null for an empty one. */
function cellShown(
  type: string,
  body: string,
  strings: readonly string[],
): Omit<WorkbookCell, "formula"> | null {
  if (type === "inlineStr") {
    const text = clean(runText(body));
    return text ? { text } : null;
  }
  const raw = new RegExp(`<${ns}v(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${ns}v>`).exec(
    body,
  )?.[1];
  if (raw === undefined) {
    return null;
  }
  const value = decodeXml(raw);
  if (type === "s") {
    const text = clean(strings[Number(value)] ?? "");
    return text ? { text } : null;
  }
  if (type === "n") {
    const number = Number(value);
    if (value.trim() === "" || !Number.isFinite(number)) {
      return null;
    }
    return { text: String(number), value: number };
  }
  if (type === "b") {
    return { text: value === "1" ? "TRUE" : "FALSE" };
  }
  // str (a formula's text), d (a date as text) and e (an error such as #REF!).
  const text = clean(value);
  return text ? { text } : null;
}

function readCell(
  attributes: string,
  body: string,
  strings: readonly string[],
): WorkbookCell | null {
  const formula = new RegExp(`<${ns}f\\b`).test(body);
  const shown = cellShown(attribute(attributes, "t") ?? "n", body, strings);
  // A formula not computed yet shows nothing, but is still the authority's.
  return shown ? { ...shown, formula } : formula ? { text: "", formula } : null;
}

/** A cell reference's column letters and row number: "AB12". */
export function splitReference(
  reference: string,
): { column: string; row?: number } | undefined {
  const found = /^\$?([A-Za-z]{1,3})\$?(\d*)$/.exec(reference.trim());
  if (!found?.[1]) {
    return undefined;
  }
  return {
    column: found[1].toUpperCase(),
    row: found[2] ? Number(found[2]) : undefined,
  };
}

function readMerges(xml: string): CellRange[] {
  const merges: CellRange[] = [];
  for (const match of xml.matchAll(
    new RegExp(`<${ns}mergeCell\\b([^>]*?)\\/?>`, "g"),
  )) {
    const [from, to] = (attribute(match[1] ?? "", "ref") ?? "").split(":");
    const start = from ? splitReference(from) : undefined;
    const end = to ? splitReference(to) : start;
    if (start?.row && end?.row) {
      merges.push({
        fromColumn: columnNumber(start.column),
        fromRow: start.row,
        toColumn: columnNumber(end.column),
        toRow: end.row,
      });
    }
  }
  return merges;
}

function readRows(
  xml: string,
  strings: readonly string[],
  budget: { cells: number },
): WorkbookRow[] {
  const data = new RegExp(
    `<${ns}sheetData\\b[^>]*>([\\s\\S]*?)<\\/${ns}sheetData>`,
  ).exec(xml)?.[1];
  if (!data) {
    return [];
  }
  const rows: WorkbookRow[] = [];
  let rowNumber = 0;
  for (const rowMatch of data.matchAll(
    new RegExp(`<${ns}row\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${ns}row>)`, "g"),
  )) {
    const declared = Number(attribute(rowMatch[1] ?? "", "r"));
    rowNumber =
      Number.isInteger(declared) && declared > 0 ? declared : rowNumber + 1;
    const cells: Record<string, WorkbookCell> = {};
    let column = 0;
    let filled = false;
    for (const cellMatch of (rowMatch[2] ?? "").matchAll(
      new RegExp(`<${ns}c\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${ns}c>)`, "g"),
    )) {
      const attributes = cellMatch[1] ?? "";
      const reference = splitReference(attribute(attributes, "r") ?? "");
      column = reference ? columnNumber(reference.column) : column + 1;
      const cell = readCell(attributes, cellMatch[2] ?? "", strings);
      if (cell) {
        budget.cells -= 1;
        if (budget.cells < 0) {
          throw new SpreadsheetError("too many cells");
        }
        cells[columnLetters(column)] = cell;
        filled = true;
      }
    }
    if (filled) {
      rows.push({ row: rowNumber, cells });
    }
  }
  return rows;
}

/** The archive path a workbook relationship points to. */
function partPath(target: string): string {
  const parts: string[] = [];
  const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  for (const part of path.split("/")) {
    if (part === "..") {
      parts.pop();
    } else if (part && part !== ".") {
      parts.push(part);
    }
  }
  return parts.join("/");
}

/**
 * An .xlsx file's parts and its visible sheets with their non-empty rows.
 * Throws a SpreadsheetError for anything else, such as an old .xls.
 */
export function openWorkbook(bytes: Uint8Array): Workbook {
  if (bytes.length > MAX_FILE_BYTES) {
    throw new SpreadsheetError("too large");
  }
  let parts: Unzipped;
  let unpacked = 0;
  try {
    parts = unzipSync(bytes, {
      // A part unpacks into the size its entry declares, so this bounds
      // what the file takes up.
      filter: (file) => {
        unpacked += file.originalSize;
        if (file.originalSize > MAX_PART_BYTES || unpacked > MAX_TOTAL_BYTES) {
          throw new SpreadsheetError("too large");
        }
        return true;
      },
    });
  } catch (error) {
    throw error instanceof SpreadsheetError
      ? error
      : new SpreadsheetError("not a zip archive");
  }
  const text = (name: string) => {
    const part = parts[name];
    return part ? strFromU8(part) : undefined;
  };
  const workbook = text("xl/workbook.xml");
  if (!workbook) {
    throw new SpreadsheetError("no workbook");
  }
  const targets = new Map<string, string>();
  for (const match of (text("xl/_rels/workbook.xml.rels") ?? "").matchAll(
    new RegExp(`<${ns}Relationship\\b([^>]*?)\\/?>`, "g"),
  )) {
    const id = attribute(match[1] ?? "", "Id");
    const target = attribute(match[1] ?? "", "Target");
    if (id && target) {
      targets.set(id, partPath(target));
    }
  }
  const strings = sharedStrings(text("xl/sharedStrings.xml"));
  const budget = { cells: MAX_CELLS };
  const sheets: WorkbookSheet[] = [];
  for (const match of workbook.matchAll(
    new RegExp(`<${ns}sheet\\b([^>]*?)\\/?>`, "g"),
  )) {
    const attributes = match[1] ?? "";
    const state = attribute(attributes, "state");
    // The relationship id is an attribute in the relationships namespace,
    // r:id in most files.
    const id = /(?:^|\s)[A-Za-z_][\w.-]*:id\s*=\s*"([^"]*)"/.exec(
      attributes,
    )?.[1];
    const path = id ? targets.get(id) : undefined;
    const xml = path ? text(path) : undefined;
    if (state === "hidden" || state === "veryHidden" || !path || !xml) {
      continue;
    }
    sheets.push({
      name: clean(attribute(attributes, "name") ?? ""),
      path,
      rows: readRows(xml, strings, budget),
      merges: readMerges(xml),
    });
  }
  return { parts, sheets };
}

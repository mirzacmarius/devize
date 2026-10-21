// Reading a spreadsheet (.xlsx), which is a zip of XML parts, for what a
// quantity list needs: each visible sheet's non-empty cells as text, with
// numbers as numbers. Unzipping takes the inflate function from the caller,
// so this file runs anywhere and only the action needs Node.

/** Inflates raw deflate data, giving up past `maxBytes` of output. */
export type Inflate = (data: Uint8Array, maxBytes: number) => Uint8Array;

export type Cell = { text: string; value?: number };

export type SheetRow = {
  // The row number as the spreadsheet shows it, from 1.
  row: number;
  // Non-empty cells by column letter.
  cells: Record<string, Cell>;
};

export type Sheet = { name: string; rows: SheetRow[] };

/** A file that isn't a spreadsheet this reader understands. */
export class SpreadsheetError extends Error {}

// Limits against a malicious or broken file: a part, all parts together and
// the cells kept.
const MAX_PART_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 160 * 1024 * 1024;
const MAX_CELLS = 400_000;

const decoder = new TextDecoder();

function u16(bytes: Uint8Array, at: number) {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
}

function u32(bytes: Uint8Array, at: number) {
  return (u16(bytes, at) | (u16(bytes, at + 2) << 16)) >>> 0;
}

/** The parts of a zip archive whose names `wanted` accepts, by name. */
export function unzip(
  bytes: Uint8Array,
  inflate: Inflate,
  wanted: (name: string) => boolean,
): Map<string, Uint8Array> {
  // The end of central directory record: its signature, read backwards past
  // a comment of at most 64 KB.
  let end = -1;
  for (
    let at = bytes.length - 22;
    at >= 0 && at >= bytes.length - 65_557;
    at--
  ) {
    if (u32(bytes, at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) {
    throw new SpreadsheetError("not a zip archive");
  }
  const count = u16(bytes, end + 10);
  let entry = u32(bytes, end + 16);
  const parts = new Map<string, Uint8Array>();
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (u32(bytes, entry) !== 0x02014b50) {
      throw new SpreadsheetError("broken zip directory");
    }
    const flags = u16(bytes, entry + 8);
    const method = u16(bytes, entry + 10);
    const compressedSize = u32(bytes, entry + 20);
    const size = u32(bytes, entry + 24);
    const nameLength = u16(bytes, entry + 28);
    const extraLength = u16(bytes, entry + 30);
    const commentLength = u16(bytes, entry + 32);
    const local = u32(bytes, entry + 42);
    const name = decoder.decode(
      bytes.subarray(entry + 46, entry + 46 + nameLength),
    );
    entry += 46 + nameLength + extraLength + commentLength;
    if (!wanted(name)) {
      continue;
    }
    if (flags & 1) {
      throw new SpreadsheetError("encrypted");
    }
    total += size;
    if (size > MAX_PART_BYTES || total > MAX_TOTAL_BYTES) {
      throw new SpreadsheetError("too large");
    }
    if (u32(bytes, local) !== 0x04034b50) {
      throw new SpreadsheetError("broken zip entry");
    }
    const start = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
    const data = bytes.subarray(start, start + compressedSize);
    if (method === 0) {
      parts.set(name, data);
    } else if (method === 8) {
      parts.set(name, inflate(data, MAX_PART_BYTES));
    } else {
      throw new SpreadsheetError(`compression ${method}`);
    }
  }
  return parts;
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** XML text with its entities decoded. */
export function decodeXml(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (match, name: string) => {
      if (name[0] === "#") {
        const code =
          name[1] === "x" || name[1] === "X"
            ? Number.parseInt(name.slice(2), 16)
            : Number.parseInt(name.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : "";
      }
      return entities[name.toLowerCase()] ?? match;
    },
  );
}

function attribute(attributes: string, name: string): string | undefined {
  const found = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`,
  ).exec(attributes);
  const value = found?.[2] ?? found?.[3];
  return value === undefined ? undefined : decodeXml(value);
}

// Tags may carry a namespace prefix, such as <x:row>.
const ns = "(?:[A-Za-z_][\\w.-]*:)?";

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

/** A column's letters as a number from 1: A is 1, Z is 26, AA is 27. */
export function columnNumber(letters: string): number {
  let number = 0;
  for (const letter of letters.toUpperCase()) {
    number = number * 26 + (letter.charCodeAt(0) - 64);
  }
  return number;
}

/** A column's letters from its number: 1 is A, 27 is AA. */
export function columnLetters(number: number): string {
  let letters = "";
  for (let rest = number; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    letters = String.fromCharCode(65 + ((rest - 1) % 26)) + letters;
  }
  return letters;
}

/** Text with single spaces, as a cell shows it on one line. */
function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function readCell(
  attributes: string,
  body: string,
  strings: readonly string[],
): Cell | null {
  const type = attribute(attributes, "t") ?? "n";
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

function readSheet(
  xml: string,
  strings: readonly string[],
  budget: { cells: number },
): SheetRow[] {
  const data = new RegExp(
    `<${ns}sheetData\\b[^>]*>([\\s\\S]*?)<\\/${ns}sheetData>`,
  ).exec(xml)?.[1];
  if (!data) {
    return [];
  }
  const rows: SheetRow[] = [];
  let rowNumber = 0;
  for (const rowMatch of data.matchAll(
    new RegExp(`<${ns}row\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${ns}row>)`, "g"),
  )) {
    const declared = Number(attribute(rowMatch[1] ?? "", "r"));
    rowNumber =
      Number.isInteger(declared) && declared > 0 ? declared : rowNumber + 1;
    const cells: Record<string, Cell> = {};
    let column = 0;
    let filled = false;
    for (const cellMatch of (rowMatch[2] ?? "").matchAll(
      new RegExp(`<${ns}c\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${ns}c>)`, "g"),
    )) {
      const attributes = cellMatch[1] ?? "";
      const reference = /^([A-Za-z]+)\d*$/.exec(
        attribute(attributes, "r") ?? "",
      )?.[1];
      column = reference ? columnNumber(reference) : column + 1;
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
 * The visible sheets of an .xlsx file, in the workbook's order, with their
 * non-empty rows. Throws a SpreadsheetError for anything else.
 */
export function readWorkbook(bytes: Uint8Array, inflate: Inflate): Sheet[] {
  const parts = unzip(
    bytes,
    inflate,
    (name) =>
      name === "xl/workbook.xml" ||
      name === "xl/_rels/workbook.xml.rels" ||
      name === "xl/sharedStrings.xml" ||
      /^xl\/worksheets\/[^/]+\.xml$/.test(name),
  );
  const text = (name: string) => {
    const part = parts.get(name);
    return part ? decoder.decode(part) : undefined;
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
  const sheets: Sheet[] = [];
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
    if (state === "hidden" || state === "veryHidden" || !xml) {
      continue;
    }
    sheets.push({
      name: clean(attribute(attributes, "name") ?? ""),
      rows: readSheet(xml, strings, budget),
    });
  }
  return sheets;
}

import { normalizeText } from "../../lib/text";
import type { PagesOutput, SheetOutput } from "./schemas";
import { columnNumber, type SheetRow } from "./xlsx";

// Turning what the model read from a tender's quantity lists into positions.
// From a spreadsheet the model only says which rows hold what, and every
// value is taken from the cells themselves; from a PDF or a scan it copies
// the values, which the person checks in the review.

export type TenderSection = { code?: string; name: string };

/** A position of a tender's list. Without a quantity or unit it is an issue. */
export type ReadPosition = {
  position?: string;
  code?: string;
  text: string;
  unit?: string;
  quantity?: number;
  terms: string[];
  object?: TenderSection;
  chapter?: TenderSection;
};

/** The Obiect and Capitol the next positions go in. */
export type Headings = { object?: TenderSection; chapter?: TenderSection };

export type Columns = {
  position?: string;
  code?: string;
  text?: string;
  unit?: string;
  quantity?: string;
};

const MAX_TEXT = 4000;
const MAX_NAME = 300;
const MAX_CODE = 40;
const MAX_POSITION = 20;
const MAX_UNIT = 20;
const MAX_TERMS = 3;

/** Text on one line, with single spaces, cut at `max`. */
function clean(value: string | null | undefined, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max).trim();
}

function cleanTerms(terms: readonly string[]): string[] {
  return terms
    .map((term) => clean(term, 80))
    .filter(Boolean)
    .slice(0, MAX_TERMS);
}

/**
 * A number as a list writes it: 1.234,5 or 1 234,5 or 1234.5. A single
 * separator is the decimal one, as in Romanian lists.
 */
export function parseAmount(text: string): number | undefined {
  const compact = text.replace(/[\s  ]/g, "");
  if (!/^-?\d[\d.,]*$/.test(compact)) {
    return undefined;
  }
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let plain: string;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? "." : ",";
    plain = compact.split(grouping).join("").replace(decimal, ".");
  } else {
    const separator = comma >= 0 ? "," : ".";
    const parts = compact.split(separator);
    plain = parts.length > 2 ? parts.join("") : parts.join(".");
  }
  const value = Number(plain);
  return Number.isFinite(value) ? value : undefined;
}

/** The column letters the model gave, kept only when they look like ones. */
export function columnsFrom(output: SheetOutput["columns"]): Columns {
  const letter = (value: string | null) => {
    const found = value?.trim().toUpperCase();
    return found && /^[A-Z]{1,3}$/.test(found) ? found : undefined;
  };
  return {
    position: letter(output.position),
    code: letter(output.code),
    text: letter(output.text),
    unit: letter(output.unit),
    quantity: letter(output.quantity),
  };
}

/** A position's code and text when the list writes the code first. */
function splitCode(text: string, code: string | undefined) {
  const found = clean(code, MAX_CODE);
  if (found && text.toUpperCase().startsWith(found.toUpperCase())) {
    return {
      code: found,
      text: text.slice(found.length).replace(/^[\s\-–—:.,;)]+/, ""),
    };
  }
  return { code: undefined, text };
}

function heading(
  kind: "object" | "chapter",
  section: TenderSection,
  headings: Headings,
): Headings {
  return kind === "object"
    ? { object: section }
    : { object: headings.object, chapter: section };
}

/** A spreadsheet row on one line for the model: its number and its cells. */
export function gridLine(row: SheetRow, maxCell = 300): string {
  const cells = Object.entries(row.cells)
    .sort(([a], [b]) => columnNumber(a) - columnNumber(b))
    .map(([column, cell]) => {
      const text =
        cell.text.length > maxCell
          ? `${cell.text.slice(0, maxCell)}…`
          : cell.text;
      return `${column}: ${text}`;
    });
  return `${row.row} | ${cells.join(" | ")}`;
}

/**
 * The positions of one batch of a spreadsheet's rows, from the entries the
 * model found in rows `first` to `last`. A position may run past `last`, up
 * to `shown`, the last row the model saw; `through` is the last row taken
 * so far, so rows an earlier batch already took are not read twice.
 */
export function readRows(input: {
  rows: readonly SheetRow[];
  columns: Columns;
  entries: SheetOutput["entries"];
  first: number;
  last: number;
  shown: number;
  through: number;
  headings: Headings;
}): { positions: ReadPosition[]; headings: Headings; through: number } {
  const byNumber = new Map(input.rows.map((row) => [row.row, row]));
  const entries = input.entries
    .filter(
      (entry) =>
        Number.isInteger(entry.firstRow) &&
        entry.firstRow >= input.first &&
        entry.firstRow <= input.last &&
        entry.firstRow > input.through,
    )
    .sort((a, b) => a.firstRow - b.firstRow);
  const { columns } = input;
  const cell = (row: number, column: string | undefined) =>
    (column && byNumber.get(row)?.cells[column]?.text) || "";
  let headings = input.headings;
  let through = input.through;
  const positions: ReadPosition[] = [];
  entries.forEach((entry, index) => {
    const next = entries[index + 1]?.firstRow ?? Number.POSITIVE_INFINITY;
    const end = Math.max(
      entry.firstRow,
      Math.min(
        Number.isInteger(entry.lastRow) ? entry.lastRow : entry.firstRow,
        next - 1,
        input.shown,
      ),
    );
    const rows: number[] = [];
    for (let row = entry.firstRow; row <= end; row++) {
      if (byNumber.has(row)) {
        rows.push(row);
      }
    }
    through = Math.max(through, end);
    if (entry.kind !== "position") {
      const rowText = clean(
        Object.values(byNumber.get(entry.firstRow)?.cells ?? {})
          .map((value) => value.text)
          .join(" "),
        MAX_NAME,
      );
      const name = clean(entry.name, MAX_NAME);
      const code = clean(entry.code, MAX_CODE);
      const inRow = (value: string) =>
        normalizeText(rowText).includes(normalizeText(value));
      const section = {
        code: code && inRow(code) ? code : undefined,
        name: name && inRow(name) ? name : rowText,
      };
      if (section.name) {
        headings = heading(entry.kind, section, headings);
      }
      return;
    }
    const first = (column: string | undefined) =>
      rows.map((row) => cell(row, column)).find(Boolean);
    const sameColumn = !columns.code || columns.code === columns.text;
    let text = clean(
      rows.map((row) => cell(row, columns.text)).join(" "),
      MAX_TEXT,
    );
    let code = sameColumn ? undefined : clean(first(columns.code), MAX_CODE);
    if (sameColumn) {
      ({ code, text } = splitCode(text, entry.code ?? undefined));
    }
    if (!text) {
      return;
    }
    let quantity: number | undefined;
    for (const row of rows) {
      const found = byNumber.get(row)?.cells[columns.quantity ?? ""];
      quantity = found?.value ?? (found ? parseAmount(found.text) : undefined);
      if (quantity !== undefined) {
        break;
      }
    }
    positions.push({
      position: clean(first(columns.position), MAX_POSITION) || undefined,
      code: code || undefined,
      text,
      unit: clean(first(columns.unit), MAX_UNIT) || undefined,
      quantity,
      terms: cleanTerms(entry.terms),
      ...headings,
    });
  });
  return { positions, headings, through };
}

/**
 * The positions of one batch of a document's pages, `from` to `to`, as the
 * model copied them. `previous` is the last position read before, dropped
 * if the model read it again at the top of the batch.
 */
export function readPages(input: {
  entries: PagesOutput["entries"];
  from: number;
  to: number;
  headings: Headings;
  previous?: ReadPosition;
}): { positions: ReadPosition[]; headings: Headings } {
  let headings = input.headings;
  const positions: ReadPosition[] = [];
  for (const entry of input.entries) {
    if (
      !Number.isInteger(entry.page) ||
      entry.page < input.from ||
      entry.page > input.to
    ) {
      continue;
    }
    if (entry.kind !== "position") {
      const name = clean(entry.text, MAX_NAME);
      if (name) {
        headings = heading(
          entry.kind,
          { code: clean(entry.code, MAX_CODE) || undefined, name },
          headings,
        );
      }
      continue;
    }
    const text = clean(entry.text, MAX_TEXT);
    if (!text) {
      continue;
    }
    const position = clean(entry.position, MAX_POSITION) || undefined;
    const last = positions.at(-1) ?? input.previous;
    if (
      last &&
      last.position === position &&
      normalizeText(last.text) === normalizeText(text)
    ) {
      continue;
    }
    positions.push({
      position,
      code: clean(entry.code, MAX_CODE) || undefined,
      text,
      unit: clean(entry.unit, MAX_UNIT) || undefined,
      quantity:
        entry.quantity !== null && Number.isFinite(entry.quantity)
          ? entry.quantity
          : undefined,
      terms: cleanTerms(entry.terms),
      ...headings,
    });
  }
  return { positions, headings };
}

/** Whether a position can be priced: it has a unit and a quantity above 0. */
export function isComplete(
  position: ReadPosition,
): position is ReadPosition & { unit: string; quantity: number } {
  return (
    position.unit !== undefined &&
    position.quantity !== undefined &&
    position.quantity > 0 &&
    position.quantity <= 1e9
  );
}

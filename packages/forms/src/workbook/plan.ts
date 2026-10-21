import type { ResourceKind } from "@devize/backend/convex/estimates/recap";
import { normalizeText, normalizeUnit } from "@devize/backend/convex/lib/text";
import { parseAmount } from "@devize/backend/convex/proposals/lib/tender";
import {
  columnLetters,
  columnNumber,
} from "@devize/backend/convex/proposals/lib/xlsx";
import type { LineItemInput, WorksData } from "../input";
import { buildTree } from "../tree";
import type {
  Workbook,
  WorkbookCell,
  WorkbookRow,
  WorkbookSheet,
} from "./read";

// Finding a Deviz's tender positions in the contracting authority's own
// spreadsheet, and where their prices go. Each Articol imported from the
// lists keeps the position's number, code, text, U.M. and quantity in
// `tenderRef`; the row that holds the same quantity and U.M., with the same
// number, code or text, is the position's. The header above the positions
// names the price columns, and the rows under them may split each price
// into its four kinds and close the list with its Recapitulație.

/**
 * How the unit prices are made: the direct costs, with the list's own
 * Recapitulație adding CAM, indirect costs and profit, or everything in the
 * unit price, for a list without rows for them.
 */
export type PriceBasis = "direct" | "inclusive";

/** Where a list's prices go, by column letter. */
export type PriceColumns = {
  unitPrice?: string;
  total?: string;
  unitByKind: Partial<Record<ResourceKind, string>>;
  totalByKind: Partial<Record<ResourceKind, string>>;
};

/** A row of a list's Recapitulație, by what it adds up. */
export type ClosingLine =
  | "items"
  | ResourceKind
  | "cam"
  | "direct"
  | "indirect"
  | "profit"
  | "subtotal"
  | "vat"
  | "total";

export type SheetPlan = {
  name: string;
  path: string;
  // The positions found: each one's Articol and the row of its quantity.
  positions: { lineItemId: string; row: number }[];
  quantityColumn: string;
  // The price columns the header names, or two guessed beside the
  // quantities when it names none.
  columns: PriceColumns;
  guessed: boolean;
  // The columns right of the quantities, with what the header says, to
  // choose the price columns from.
  choices: { column: string; header: string }[];
  // The rows a)–d) under a position, which split its price by kind.
  details: { row: number; kind: ResourceKind; lineItemId: string }[];
  // The Recapitulație's rows, each adding up one group of positions, or all
  // of the sheet's when it has no group, as a total general after the
  // chapters' totals.
  closing: { row: number; line: ClosingLine; group?: number }[];
  // The positions each Recapitulație adds up, by Articol.
  groups: string[][];
  basis: PriceBasis;
  // Rows that look like positions, with a quantity and a U.M., that no
  // Articol of the Deviz was found for.
  unpriced: { row: number; position?: string; text: string }[];
};

export type FillPlan = {
  sheets: SheetPlan[];
  // The Deviz's tender positions the file doesn't have.
  missing: { lineItemId: string; position: string; text: string }[];
  // The Deviz's Articole that no list has, whose prices no file takes.
  extra: { lineItemId: string; title: string }[];
};

type TenderItem = LineItemInput & {
  tenderRef: NonNullable<LineItemInput["tenderRef"]> & {
    unit: string;
    quantity: number;
  };
};

type Anchor = {
  sheet: number;
  index: number;
  column: string;
};

type Match = Anchor & {
  item: TenderItem;
  unitColumn: string;
  positionColumn?: string;
  textColumn?: string;
};

// How far above a position's quantity its number and text may start, how
// far up the header of a list may reach, and how much of it names a column
// to the person choosing one.
const TEXT_ROWS = 2;
const HEADER_ROWS = 30;
const LABEL_ROWS = 4;
// What a row needs to be a position's: its quantity and U.M., and this much
// besides from its number, code and text.
const MIN_EVIDENCE = 3;
const MAX_UNPRICED = 50;

const hasLetter = (text: string) => /\p{L}/u.test(text);

function numberOf(cell: WorkbookCell): number | undefined {
  return cell.value ?? parseAmount(cell.text);
}

/** A quantity as a key, so the same number read twice compares equal. */
function quantityKey(value: number): string {
  return String(Number(value.toPrecision(12)));
}

function commonPrefix(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let at = 0;
  while (at < length && a[at] === b[at]) {
    at++;
  }
  return at;
}

/** Whether a normalized text has the words of `part` in a row. */
function hasWords(text: string, part: string): boolean {
  return ` ${text} `.includes(` ${part} `);
}

const kindPatterns: [ResourceKind, RegExp][] = [
  ["material", /\bmateria/],
  ["labor", /\bmanoper/],
  ["equipment", /\butilaj/],
  ["transport", /\btransport/],
];

function kindOf(label: string): ResourceKind | undefined {
  return kindPatterns.find(([, pattern]) => pattern.test(label))?.[0];
}

/** A row a)–d) under a position, which says only its kind. */
function detailKind(label: string): ResourceKind | undefined {
  const found =
    /^(?:[abcd] )?(materiale?|manopera|utilaje?|transport(?:uri)?)$/.exec(
      label,
    )?.[1];
  return found ? kindOf(found) : undefined;
}

/**
 * What a row of a list's Recapitulație adds up, from its label: a short
 * one, starting with what such rows start with, so a position's text that
 * runs on below its quantity isn't taken for one.
 */
function closingLine(label: string, marked: boolean): ClosingLine | undefined {
  // Numbered rows, such as "1. Cheltuieli directe" or "IV. TVA".
  const text = label.replace(/^(?:\d+|[ivx]+) /, "");
  if (
    text.length > 90 ||
    !/^(?:total|valoare|tva|t v a|cheltuieli|profit|cam|contributia|din care|recapitulatie|[abcd] |materia|manopera|utilaj|transport)/.test(
      text,
    )
  ) {
    return undefined;
  }
  if (/\bcu tva\b/.test(text)) {
    return "total";
  }
  if (
    /\bfara tva\b|\btotal general\b|\bvaloare(a)? totala\b|\btotal oferta\b|\bvaloarea ofertei\b/.test(
      text,
    )
  ) {
    return "subtotal";
  }
  if (/\btva\b|\bt v a\b/.test(text)) {
    return "vat";
  }
  // "Profit (5% din cheltuielile directe și indirecte)" names the others.
  if (/^profit\b/.test(text)) {
    return "profit";
  }
  if (/\bindirecte\b/.test(text)) {
    return "indirect";
  }
  if (/\bcam\b|\bcontributia asiguratorie\b/.test(text)) {
    return "cam";
  }
  if (/\bcheltuieli directe\b/.test(text)) {
    return "direct";
  }
  const kind = detailKind(text.replace(/^(?:(?:total|din care) )+/, ""));
  if (kind) {
    return kind;
  }
  if (/^total\b/.test(text)) {
    // A plain total after the profit adds it in.
    return marked ? "subtotal" : "items";
  }
  return undefined;
}

/** The most frequent of a list of values. */
function mostFrequent(values: readonly (string | undefined)[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  let best: string | undefined;
  for (const [value, count] of counts) {
    if (best === undefined || count > (counts.get(best) ?? 0)) {
      best = value;
    }
  }
  return best;
}

/** The text cells of a row, in column order. */
function textCells(row: WorkbookRow): [string, string][] {
  return Object.entries(row.cells)
    .filter(([, cell]) => cell.value === undefined && hasLetter(cell.text))
    .sort(([a], [b]) => columnNumber(a) - columnNumber(b))
    .map(([column, cell]) => [column, cell.text]);
}

/**
 * How well a row matches a position, beyond its quantity: its U.M. on the
 * same row or just above, then its number, code and text.
 */
function evidence(
  item: TenderItem,
  rows: readonly WorkbookRow[],
  index: number,
  quantityColumn: string,
):
  | {
      score: number;
      unitColumn: string;
      positionColumn?: string;
      textColumn?: string;
    }
  | undefined {
  const anchor = rows[index];
  if (!anchor) {
    return undefined;
  }
  const ref = item.tenderRef;
  const window: WorkbookRow[] = [];
  for (let at = index; at >= 0 && at >= index - TEXT_ROWS; at--) {
    const row = rows[at];
    if (!row || row.row < anchor.row - TEXT_ROWS) {
      break;
    }
    window.unshift(row);
  }
  const unit = normalizeUnit(ref.unit);
  let unitColumn: string | undefined;
  for (const row of [...window].reverse()) {
    unitColumn = Object.entries(row.cells).find(
      ([column, cell]) =>
        column !== quantityColumn &&
        hasLetter(cell.text) &&
        normalizeUnit(cell.text) === unit,
    )?.[0];
    if (unitColumn) {
      break;
    }
  }
  if (!unitColumn) {
    return undefined;
  }

  let score = 0;
  let positionColumn: string | undefined;
  const position = normalizeText(ref.position);
  if (position) {
    for (const row of [...window].reverse()) {
      positionColumn = Object.entries(row.cells).find(
        ([column, cell]) =>
          column !== quantityColumn &&
          column !== unitColumn &&
          normalizeText(cell.text) === position,
      )?.[0];
      if (positionColumn) {
        score += row === anchor ? 4 : 3;
        break;
      }
    }
  }

  const code = ref.code ? normalizeText(ref.code) : "";
  const texts = window.flatMap(textCells);
  if (code && texts.some(([, text]) => hasWords(normalizeText(text), code))) {
    score += 3;
  }

  let textColumn: string | undefined;
  const text = normalizeText(ref.text ?? "");
  if (text) {
    // The text on the quantity's row, or begun up to two rows above it,
    // with or without the code in front.
    const candidates: [string | undefined, string][] = [];
    for (const [column, value] of textCells(anchor)) {
      candidates.push([column, normalizeText(value)]);
    }
    for (let from = 0; from < window.length - 1; from++) {
      candidates.push([
        undefined,
        normalizeText(
          window
            .slice(from)
            .flatMap(textCells)
            .map(([, value]) => value)
            .join(" "),
        ),
      ]);
    }
    let common = 0;
    for (const [column, candidate] of candidates) {
      const plain =
        code && candidate.startsWith(`${code} `)
          ? candidate.slice(code.length + 1)
          : candidate;
      const found = Math.max(
        commonPrefix(text, candidate),
        commonPrefix(text, plain),
      );
      if (found > common) {
        common = found;
        textColumn = column;
      }
    }
    const whole = Math.min(30, text.length);
    if (whole >= 6 && common >= whole) {
      score += 5;
    } else if (common >= 15) {
      score += 3;
    } else if (common >= 8) {
      score += 1;
    }
  }
  return { score, unitColumn, positionColumn, textColumn };
}

/** Whether an Articol is a tender's position, with the list's U.M. and quantity. */
function isTenderItem(item: LineItemInput): item is TenderItem {
  return (
    item.tenderRef?.quantity !== undefined &&
    item.tenderRef.quantity > 0 &&
    Boolean(item.tenderRef.unit?.trim())
  );
}

/**
 * Each position's row: among the rows with its quantity and U.M., the one
 * with the most of its number, code and text. Between rows that match as
 * well, the first after the last position found wins, since the lists keep
 * their order. With `quantityColumns`, a sheet's quantities are only looked
 * for in its own column.
 */
function matchPositions(
  sheets: readonly WorkbookSheet[],
  items: readonly TenderItem[],
  quantityColumns?: ReadonlyMap<number, string>,
): Match[] {
  const byQuantity = new Map<string, Anchor[]>();
  sheets.forEach((sheet, sheetIndex) => {
    const only = quantityColumns?.get(sheetIndex);
    sheet.rows.forEach((row, index) => {
      for (const [column, cell] of Object.entries(row.cells)) {
        const value = numberOf(cell);
        if (value !== undefined && value > 0 && (!only || column === only)) {
          const key = quantityKey(value);
          const list = byQuantity.get(key) ?? [];
          list.push({ sheet: sheetIndex, index, column });
          byQuantity.set(key, list);
        }
      }
    });
  });
  const order = (anchor: Anchor) =>
    anchor.sheet * 10_000_000 +
    (sheets[anchor.sheet]?.rows[anchor.index]?.row ?? 0);
  const used = new Set<string>();
  const matches: Match[] = [];
  let cursor = -1;
  for (const item of items) {
    let best: (Match & { score: number; after: boolean }) | undefined;
    for (const anchor of byQuantity.get(quantityKey(item.tenderRef.quantity)) ??
      []) {
      if (used.has(`${anchor.sheet}:${anchor.index}`)) {
        continue;
      }
      const rows = sheets[anchor.sheet]?.rows ?? [];
      const found = evidence(item, rows, anchor.index, anchor.column);
      if (!found || found.score < MIN_EVIDENCE) {
        continue;
      }
      const after = order(anchor) > cursor;
      const better =
        !best ||
        found.score > best.score ||
        (found.score === best.score &&
          ((after && !best.after) ||
            (after === best.after && order(anchor) < order(best))));
      if (better) {
        best = { ...anchor, ...found, item, after };
      }
    }
    if (best) {
      used.add(`${best.sheet}:${best.index}`);
      cursor = order(best);
      matches.push({
        sheet: best.sheet,
        index: best.index,
        column: best.column,
        item,
        unitColumn: best.unitColumn,
        positionColumn: best.positionColumn,
        textColumn: best.textColumn,
      });
    }
  }
  return matches;
}

/**
 * What the header says above each column: its rows' texts, and a merged
 * cell's text over every column it spans, such as "Prețul unitar" over the
 * four kinds.
 */
function headers(
  sheet: WorkbookSheet,
  firstRow: number,
  quantityColumn: number,
  rows = HEADER_ROWS,
): Map<number, string[]> {
  const top = Math.max(1, firstRow - rows);
  const labels = new Map<number, string[]>();
  const add = (column: number, text: string) => {
    const list = labels.get(column) ?? [];
    if (!list.includes(text)) {
      list.push(text);
    }
    labels.set(column, list);
  };
  const byRow = new Map(sheet.rows.map((row) => [row.row, row]));
  for (const row of sheet.rows) {
    if (row.row < top || row.row >= firstRow) {
      continue;
    }
    for (const [column, cell] of Object.entries(row.cells)) {
      if (hasLetter(cell.text)) {
        add(columnNumber(column), cell.text);
      }
    }
  }
  // A merged title over the whole table names no column; a group over the
  // price columns starts right of the quantities.
  for (const merge of sheet.merges) {
    if (
      merge.fromRow < top ||
      merge.fromRow >= firstRow ||
      merge.fromColumn <= quantityColumn
    ) {
      continue;
    }
    const text = byRow.get(merge.fromRow)?.cells[
      columnLetters(merge.fromColumn)
    ]?.text;
    if (text && hasLetter(text)) {
      for (
        let column = merge.fromColumn + 1;
        column <= merge.toColumn;
        column++
      ) {
        add(column, text);
      }
    }
  }
  return labels;
}

/** The price columns a header names right of the quantities. */
function priceColumns(
  labels: ReadonlyMap<number, readonly string[]>,
  quantityColumn: number,
): PriceColumns {
  const columns: PriceColumns = { unitByKind: {}, totalByKind: {} };
  const numbers = [...labels.keys()]
    .filter((column) => column > quantityColumn)
    .sort((a, b) => a - b);
  for (const column of numbers) {
    const label = normalizeText((labels.get(column) ?? []).join(" "));
    const letters = columnLetters(column);
    const kind = kindOf(label);
    const value = /\bvaloare|\bvaloarea|\btotal|\bsuma\b/.test(label);
    const unit =
      /\bunitar|\bp u\b|\bpu\b/.test(label) ||
      (!value && /\bpret(ul)?\b/.test(label));
    if (unit) {
      if (kind) {
        columns.unitByKind[kind] ??= letters;
      } else {
        columns.unitPrice ??= letters;
      }
    } else if (value) {
      if (kind) {
        columns.totalByKind[kind] ??= letters;
      } else {
        columns.total ??= letters;
      }
    } else if (kind) {
      // Kinds under no group of their own: the unit prices come first.
      if (columns.unitByKind[kind] === undefined) {
        columns.unitByKind[kind] = letters;
      } else {
        columns.totalByKind[kind] ??= letters;
      }
    }
  }
  return columns;
}

function hasPriceColumns(columns: PriceColumns): boolean {
  return (
    columns.unitPrice !== undefined ||
    columns.total !== undefined ||
    Object.keys(columns.unitByKind).length > 0 ||
    Object.keys(columns.totalByKind).length > 0
  );
}

/** Every column a list's prices may be written in. */
export function priceColumnsUsed(columns: PriceColumns): string[] {
  return [
    columns.unitPrice,
    columns.total,
    ...Object.values(columns.unitByKind),
    ...Object.values(columns.totalByKind),
  ].filter((column): column is string => column !== undefined);
}

function planSheet(sheet: WorkbookSheet, matches: readonly Match[]): SheetPlan {
  const rows = sheet.rows;
  const anchors = new Map(matches.map((match) => [match.index, match]));
  const quantityColumn =
    mostFrequent(matches.map((match) => match.column)) ?? "A";
  const unitColumn = mostFrequent(matches.map((match) => match.unitColumn));
  const positionColumn = mostFrequent(
    matches.map((match) => match.positionColumn),
  );
  const textColumn = mostFrequent(matches.map((match) => match.textColumn));
  const firstRow = Math.min(
    ...matches.map((match) => rows[match.index]?.row ?? 1),
  );
  const quantityNumber = columnNumber(quantityColumn);
  const labels = headers(sheet, firstRow, quantityNumber);
  let columns = priceColumns(labels, quantityNumber);
  const guessed = !hasPriceColumns(columns);
  if (guessed) {
    columns = {
      unitPrice: columnLetters(quantityNumber + 1),
      total: columnLetters(quantityNumber + 2),
      unitByKind: {},
      totalByKind: {},
    };
  }
  const used = priceColumnsUsed(columns);
  let lastColumn = Math.max(
    quantityNumber + 2,
    ...used.map(columnNumber),
    ...[...labels.keys()],
  );
  lastColumn = Math.min(lastColumn, quantityNumber + 26);
  // The rows just above the positions, without the titles over them.
  const shown = headers(sheet, firstRow, quantityNumber, LABEL_ROWS);
  const choices: SheetPlan["choices"] = [];
  for (let column = quantityNumber + 1; column <= lastColumn; column++) {
    choices.push({
      column: columnLetters(column),
      header: (shown.get(column) ?? []).join(" · "),
    });
  }

  const priceSet = new Set(used);
  const positionLike = (row: WorkbookRow) => {
    const quantity = row.cells[quantityColumn];
    const value = quantity && numberOf(quantity);
    const unit = unitColumn ? row.cells[unitColumn]?.text : undefined;
    return (
      value !== undefined && value > 0 && unit !== undefined && hasLetter(unit)
    );
  };
  const labelOf = (row: WorkbookRow) =>
    normalizeText(
      textCells(row)
        .filter(([column]) => !priceSet.has(column))
        .map(([, text]) => text)
        .join(" "),
    );

  const details: SheetPlan["details"] = [];
  const closing: SheetPlan["closing"] = [];
  const groups: string[][] = [[]];
  const unpriced: SheetPlan["unpriced"] = [];
  // After a position, the rows a)–d) of its kinds; after the positions, the
  // rows of their Recapitulație, until positions start again.
  let lastAnchor: Match | undefined;
  let inDetails = false;
  let inClosing = false;
  // Whether the group's Recapitulație added the profit, or a total of its
  // positions; and whether its rows now add up the whole sheet.
  let marked = false;
  let totalled = false;
  let whole = false;
  rows.forEach((row, index) => {
    const anchor = anchors.get(index);
    if (anchor) {
      if (inClosing) {
        groups.push([]);
        inClosing = false;
        marked = false;
        totalled = false;
        whole = false;
      }
      groups.at(-1)?.push(anchor.item._id);
      lastAnchor = anchor;
      inDetails = true;
      return;
    }
    if (positionLike(row)) {
      inDetails = false;
      if (unpriced.length < MAX_UNPRICED && row.row >= firstRow - HEADER_ROWS) {
        const text =
          (textColumn && row.cells[textColumn]?.text) ||
          textCells(row)
            .map(([, value]) => value)
            .sort((a, b) => b.length - a.length)[0] ||
          "";
        unpriced.push({
          row: row.row,
          position: positionColumn
            ? row.cells[positionColumn]?.text
            : undefined,
          text,
        });
      }
      return;
    }
    if (!lastAnchor) {
      return;
    }
    const label = labelOf(row);
    if (!label) {
      return;
    }
    const kind = inDetails ? detailKind(label) : undefined;
    if (kind) {
      details.push({ row: row.row, kind, lineItemId: lastAnchor.item._id });
      return;
    }
    inDetails = false;
    const line = closingLine(label, marked);
    if (line) {
      // After the chapters' own totals, a second total or a total general
      // adds up all of them.
      if (
        groups.length > 1 &&
        ((line === "items" && totalled) ||
          (!marked && /\bgeneral\b/.test(label)))
      ) {
        whole = true;
      }
      inClosing = true;
      if (line === "indirect" || line === "profit") {
        marked = true;
      }
      if (line === "items") {
        totalled = true;
      }
      closing.push({
        row: row.row,
        line,
        group: whole ? undefined : groups.length - 1,
      });
    }
  });

  return {
    name: sheet.name,
    path: sheet.path,
    positions: matches.map((match) => ({
      lineItemId: match.item._id,
      row: rows[match.index]?.row ?? 0,
    })),
    quantityColumn,
    columns,
    guessed,
    choices,
    details,
    closing,
    groups,
    // Direct costs when the Recapitulație adds any of the Cote.
    basis: closing.some(
      (row) =>
        row.line === "cam" || row.line === "indirect" || row.line === "profit",
    )
      ? "direct"
      : "inclusive",
    unpriced,
  };
}

/**
 * Where a Deviz's tender positions are in a workbook, sheet by sheet, and
 * where their prices go; and the positions it doesn't have.
 */
export function planWorkbook(workbook: Workbook, data: WorksData): FillPlan {
  // The Articole in the order the forms print them.
  const printed = buildTree(data).flatMap((object) =>
    object.categories.flatMap((category) => category.items),
  );
  const items = printed.filter(isTenderItem);
  const first = matchPositions(workbook.sheets, items);
  const quantityColumns = new Map<number, string>();
  workbook.sheets.forEach((_sheet, index) => {
    const column = mostFrequent(
      first
        .filter((match) => match.sheet === index)
        .map((match) => match.column),
    );
    if (column) {
      quantityColumns.set(index, column);
    }
  });
  const matches = matchPositions(workbook.sheets, items, quantityColumns);
  const found = new Set(matches.map((match) => match.item._id));
  const sheets: SheetPlan[] = [];
  workbook.sheets.forEach((sheet, index) => {
    const own = matches
      .filter((match) => match.sheet === index)
      .sort((a, b) => a.index - b.index);
    if (own.length > 0) {
      sheets.push(planSheet(sheet, own));
    }
  });
  return {
    sheets,
    missing: items
      .filter((item) => !found.has(item._id))
      .map((item) => ({
        lineItemId: item._id,
        position: item.tenderRef.position,
        text: (item.tenderRef.text ?? item.title).slice(0, 120),
      })),
    extra: printed
      .filter((item) => !isTenderItem(item))
      .map((item) => ({
        lineItemId: item._id,
        title: item.title.slice(0, 120),
      })),
  };
}

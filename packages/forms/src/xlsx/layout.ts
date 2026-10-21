import type {
  Align,
  Block,
  Cell,
  CellPart,
  FormDocument,
  Table,
} from "../model";
import { defaultSize, type Edge, type Look, numberFormat } from "./styles";
import { lineHeight, type Run, textHeight } from "./text";

// A document on a sheet's grid of cells, as the PDF lays it out on A4: the
// columns of its widest table, every other block across them, and each
// table on the columns under its own. Sizes are the PDF's a quarter larger,
// which reads well on a screen; the sheet prints fitted to the page's width,
// so on paper it comes out as the PDF does.

/** How much larger than in the PDF: text, widths and heights. */
const scale = 1.25;
// The PDF's page and margins, in points (pdf/writer.ts).
const pageWidths = { portrait: 595.28, landscape: 841.89 };
const margin = 36;
// The PDF's text outside tables (pdf/blocks.ts).
const bodySize = 8.5;
// A table short enough for one page, such as a Deviz's Recapitulație, which
// leaves the header printed on every page to the other table.
const shortTable = 12;

/**
 * A cell: a number, text in runs of their own look, or neither. A cell with
 * text has its first run's font.
 */
export type SheetCell = { runs?: Run[]; value?: number; look: Look };

export type SheetRow = {
  // Points; as tall as its cells when left out.
  height?: number;
  // By column, from 0.
  cells: Map<number, SheetCell>;
};

/** A rectangle of cells, by row and column from 0, both ends included. */
export type Range = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type SheetLayout = {
  // Each column's width, in points.
  widths: number[];
  rows: SheetRow[];
  merges: Range[];
  // The rows printed at the top of every page: a long table's header.
  titleRows?: { first: number; last: number };
};

/** A size in the PDF at the sheet's, to the half point. */
function sized(size: number): number {
  return Math.round(size * scale * 2) / 2;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Where each column starts, and the end of the last. */
function edgesOf(widths: readonly number[]): number[] {
  const edges = [0];
  for (const width of widths) {
    edges.push((edges.at(-1) ?? 0) + width);
  }
  return edges;
}

/** A table's column widths in the PDF, in points, as pdf/table.ts lays them out. */
function tableWidths(table: Table, content: number): number[] {
  const width = Math.min(table.width ?? content, content);
  let fixed = 0;
  let flex = 0;
  for (const column of table.columns) {
    if (column.flex) {
      flex += column.width;
    } else {
      fixed += column.width;
    }
  }
  const spare = Math.max(width - fixed, 0);
  return table.columns.map((column) =>
    column.flex ? (spare * column.width) / (flex || 1) : column.width,
  );
}

/**
 * The sheet's columns, in the PDF's points: its widest table's, with room
 * on the left when that table is narrower than the page, or two halves of
 * the page when no table has two columns.
 */
export function gridOf(document: FormDocument): number[] {
  const content = pageWidths[document.orientation] - 2 * margin;
  let widest: Table | undefined;
  for (const block of document.blocks) {
    if (
      block.type === "table" &&
      block.columns.length > (widest?.columns.length ?? 1)
    ) {
      widest = block;
    }
  }
  if (!widest) {
    return [content / 2, content / 2];
  }
  const widths = tableWidths(widest, content);
  const room = content - sum(widths);
  return room >= 1 ? [room, ...widths] : widths;
}

/**
 * The grid's edges nearest to some positions, by their index, moved as they
 * must be so each gap between them takes at least one column and the last
 * is the grid's end.
 */
function snap(positions: readonly number[], grid: readonly number[]) {
  const edges = edgesOf(grid);
  const nearest = positions.map((position) => {
    let best = 0;
    edges.forEach((edge, index) => {
      if (Math.abs(edge - position) < Math.abs((edges[best] ?? 0) - position)) {
        best = index;
      }
    });
    return best;
  });
  const last = nearest.length - 1;
  for (let index = 0; index <= last; index += 1) {
    nearest[index] = Math.max(
      nearest[index] ?? 0,
      index === 0 ? 0 : (nearest[index - 1] ?? 0) + 1,
    );
  }
  for (let index = last; index >= 0; index -= 1) {
    nearest[index] =
      index === last
        ? grid.length
        : Math.min(nearest[index] ?? 0, (nearest[index + 1] ?? 0) - 1);
  }
  return nearest;
}

/** Runs of edges as the grid columns from one to the next. */
function between(edges: readonly number[]): [number, number][] {
  return edges
    .slice(1)
    .map((edge, index) => [edges[index] ?? 0, edge - 1] as [number, number]);
}

/**
 * Which grid columns each of a table's columns covers, first and last. A
 * table across the page keeps its columns on the grid's from both ends, and
 * its flexible column takes the ones left over, so a schedule's shorter
 * last year has its months beside its total. A narrower table, against the
 * right margin, covers the columns under it.
 */
export function placeTable(
  table: Table,
  grid: readonly number[],
): [number, number][] {
  const content = sum(grid);
  const widths = tableWidths(table, content);
  if (table.width === undefined && widths.length <= grid.length) {
    const flex = table.columns.findIndex((column) => column.flex);
    const wide = flex >= 0 ? flex : widths.indexOf(Math.max(...widths));
    const extra = grid.length - widths.length;
    return widths.map((_, index) =>
      index < wide
        ? [index, index]
        : index === wide
          ? [index, index + extra]
          : [index + extra, index + extra],
    );
  }
  const start = content - sum(widths);
  return between(
    snap(
      edgesOf(widths).map((edge) => edge + start),
      grid,
    ),
  );
}

/**
 * The grid's columns in `count` runs of about the same width, from the
 * left: where blocks side by side go.
 */
export function splitColumns(
  grid: readonly number[],
  count: number,
): [number, number][] {
  const share = sum(grid) / count;
  return between(
    snap(
      Array.from({ length: count + 1 }, (_, index) => index * share),
      grid,
    ),
  );
}

/** A sheet being laid out, row by row. */
class Sheet {
  readonly rows: SheetRow[] = [];
  readonly merges: Range[] = [];
  titleRows?: { first: number; last: number };

  // Points, at the sheet's size.
  constructor(readonly widths: readonly number[]) {}

  get last(): number {
    return this.widths.length - 1;
  }

  /** A new row, `height` points tall or as tall as its cells. */
  add(height?: number): number {
    this.rows.push({ height, cells: new Map() });
    return this.rows.length - 1;
  }

  width(left: number, right: number): number {
    return sum(this.widths.slice(left, right + 1));
  }

  /**
   * A cell over a rectangle, merged when it covers more than one. The
   * cells it covers take its look, so its borders and shading show.
   */
  put(range: Range, cell: SheetCell) {
    const first = cell.runs?.[0];
    const laid: SheetCell = first
      ? {
          ...cell,
          look: {
            ...cell.look,
            size: first.size,
            bold: first.bold,
            muted: first.muted,
          },
        }
      : cell;
    for (let row = range.top; row <= range.bottom; row += 1) {
      for (let column = range.left; column <= range.right; column += 1) {
        this.rows[row]?.cells.set(
          column,
          row === range.top && column === range.left
            ? laid
            : { look: laid.look },
        );
      }
    }
    if (range.bottom > range.top || range.right > range.left) {
      this.merges.push(range);
    }
  }

  /** A border on one side of a row's cells, from `left` to `right`. */
  border(
    row: number,
    [left, right]: [number, number],
    side: "top" | "bottom",
    edge: Edge,
  ) {
    const cells = this.rows[row]?.cells;
    for (let column = left; column <= right; column += 1) {
      const cell = cells?.get(column) ?? { look: { size: defaultSize } };
      cells?.set(column, {
        ...cell,
        look: { ...cell.look, border: { ...cell.look.border, [side]: edge } },
      });
    }
  }

  /** A row holding one cell across the sheet, as tall as its text. */
  textRow(runs: Run[], align?: Align) {
    const row = this.add();
    this.put(
      { top: row, bottom: row, left: 0, right: this.last },
      {
        runs: runs.some((run) => run.text) ? runs : undefined,
        look: { size: defaultSize, align, vertical: "top", wrap: true },
      },
    );
    const laid = this.rows[row];
    if (laid) {
      laid.height = textHeight(runs, this.width(0, this.last));
    }
  }

  /** Rows of runs side by side, each column of them in its own columns. */
  sideBySide(
    columns: { runs: Run[]; align?: Align }[][],
    groups: readonly [number, number][],
  ) {
    const lines = Math.max(0, ...columns.map((lines) => lines.length));
    for (let line = 0; line < lines; line += 1) {
      const row = this.add();
      let height = 0;
      columns.forEach((column, index) => {
        const group = groups[index];
        const entry = column[line];
        if (!group || !entry) {
          return;
        }
        const [left, right] = group;
        this.put(
          { top: row, bottom: row, left, right },
          {
            runs: entry.runs.some((run) => run.text) ? entry.runs : undefined,
            look: {
              size: defaultSize,
              align: entry.align,
              vertical: "top",
              wrap: true,
            },
          },
        );
        height = Math.max(height, textHeight(entry.runs, this.width(...group)));
      });
      const laid = this.rows[row];
      if (laid) {
        laid.height = Math.max(height, lineHeight(sized(bodySize)));
      }
    }
  }

  layout(): SheetLayout {
    return {
      widths: [...this.widths],
      rows: this.rows,
      merges: this.merges,
      titleRows: this.titleRows,
    };
  }
}

/** A run of text at the sheet's size. */
function run(part: CellPart, size: number, prefix = ""): Run {
  return {
    text: `${prefix}${part.text}`,
    size: sized(part.size ?? size),
    bold: part.bold,
    muted: part.muted,
  };
}

type Of<T extends Block["type"]> = Extract<Block, { type: T }>;

function laySignatures(sheet: Sheet, block: Of<"signatures">) {
  const size = sized(bodySize);
  if (block.date) {
    sheet.textRow([{ text: block.date, size }]);
  }
  const count = Math.min(Math.max(block.items.length, 2), sheet.widths.length);
  const groups = splitColumns(sheet.widths, count);
  for (let start = 0; start < block.items.length; start += count) {
    const items = block.items.slice(start, start + count);
    sheet.sideBySide(
      items.map((item) => [{ runs: [{ text: item.role, size, bold: true }] }]),
      groups,
    );
    if (items.some((item) => item.name)) {
      sheet.sideBySide(
        items.map((item) => [{ runs: [{ text: item.name ?? "", size }] }]),
        groups,
      );
    }
    // Room to sign, over a line.
    const sign = sheet.add(26 * scale);
    items.forEach((_, index) => {
      const group = groups[index];
      if (group) {
        sheet.border(sign, group, "bottom", "rule");
      }
    });
    if (items.some((item) => item.hint)) {
      sheet.sideBySide(
        items.map((item) => [
          { runs: [{ text: item.hint ?? "", size: sized(7), muted: true }] },
        ]),
        groups,
      );
    }
  }
}

/** The border over a table's row, by its kind, as pdf/table.ts rules it. */
function rowBorder(
  table: Table,
  kind: Table["rows"][number]["kind"],
  first: boolean,
): Look["border"] {
  if (table.style === "grid") {
    return {
      left: "rule",
      right: "rule",
      top:
        kind === "detail" && !first
          ? undefined
          : kind === "total"
            ? "strong"
            : "rule",
    };
  }
  switch (kind) {
    case "subtotal":
      return { top: "rule" };
    case "total":
      return { top: "ink", bottom: "ink" };
    case "item":
      return first ? undefined : { top: "faint" };
    default:
      return undefined;
  }
}

/** The header's cells on the grid, placed as HTML places a table's. */
function layHeader(
  sheet: Sheet,
  table: Table,
  span: (column: number, count: number) => [number, number],
): { first: number; last: number } | undefined {
  if (table.header.length === 0) {
    return undefined;
  }
  const size = sized(Math.max((table.fontSize ?? 8) - 0.5, 6));
  const grid = table.style === "grid";
  const top = sheet.rows.length;
  const covered: boolean[][] = table.header.map(() => []);
  const placed: {
    row: number;
    rowSpan: number;
    range: [number, number];
    runs: Run[];
    align: Align;
  }[] = [];
  table.header.forEach((cells, row) => {
    let column = 0;
    for (const cell of cells) {
      while (covered[row]?.[column]) {
        column += 1;
      }
      if (column >= table.columns.length) {
        break;
      }
      const colSpan = cell.colSpan ?? 1;
      const rowSpan = Math.min(cell.rowSpan ?? 1, table.header.length - row);
      for (let r = row; r < row + rowSpan; r += 1) {
        for (let c = column; c < column + colSpan; c += 1) {
          const cover = covered[r];
          if (cover) {
            cover[c] = true;
          }
        }
      }
      placed.push({
        row,
        rowSpan,
        range: span(column, colSpan),
        runs: [{ text: cell.text, size, bold: true, muted: !grid }],
        align: grid ? "center" : (table.columns[column]?.align ?? "left"),
      });
      column += colSpan;
    }
  });

  // Each row as tall as its own cells, then taller where a cell spanning
  // several rows needs more room than they give it.
  const heights = table.header.map(() => lineHeight(size) + 1);
  for (const cell of placed) {
    if (cell.rowSpan === 1) {
      heights[cell.row] = Math.max(
        heights[cell.row] ?? 0,
        textHeight(cell.runs, sheet.width(...cell.range)),
      );
    }
  }
  for (const cell of placed) {
    if (cell.rowSpan > 1) {
      const last = cell.row + cell.rowSpan - 1;
      const missing =
        textHeight(cell.runs, sheet.width(...cell.range)) -
        sum(heights.slice(cell.row, last + 1));
      if (missing > 0) {
        heights[last] = (heights[last] ?? 0) + missing;
      }
    }
  }
  for (const height of heights) {
    sheet.add(height);
  }
  for (const cell of placed) {
    const [left, right] = cell.range;
    sheet.put(
      {
        top: top + cell.row,
        bottom: top + cell.row + cell.rowSpan - 1,
        left,
        right,
      },
      {
        runs: cell.runs,
        look: {
          size,
          bold: true,
          muted: !grid,
          align: cell.align,
          vertical: "center",
          wrap: true,
          ...(grid
            ? {
                fill: "shade",
                border: {
                  left: "rule",
                  right: "rule",
                  top: "rule",
                  bottom: "rule",
                },
              }
            : { border: { bottom: "rule" } }),
        },
      },
    );
  }
  return { first: top, last: top + heights.length - 1 };
}

function layTable(sheet: Sheet, table: Table, grid: readonly number[]) {
  const place = placeTable(table, grid);
  const count = table.columns.length;
  const span = (column: number, columns: number): [number, number] => [
    place[Math.min(column, count - 1)]?.[0] ?? 0,
    place[Math.min(column + columns - 1, count - 1)]?.[1] ?? 0,
  ];
  const all = span(0, count);
  const fontSize = table.fontSize ?? 8;
  const ruled = table.style === "grid";
  const header = layHeader(sheet, table, span);
  let last = header?.last;

  if (ruled && table.numbers) {
    const size = sized(Math.max(fontSize - 1.5, 5.5));
    const row = sheet.add(lineHeight(size) + 1);
    table.columns.forEach((_, index) => {
      const [left, right] = span(index, 1);
      const text = table.numbers?.[index] ?? "";
      sheet.put(
        { top: row, bottom: row, left, right },
        {
          runs: text ? [{ text, size, muted: true }] : undefined,
          look: {
            size,
            muted: true,
            align: "center",
            vertical: "center",
            border: { left: "rule", right: "rule", top: "rule" },
          },
        },
      );
    });
    last = row;
  }

  table.rows.forEach((tableRow, index) => {
    const row = sheet.add();
    const fill =
      tableRow.kind === "group" || (ruled && tableRow.kind === "total")
        ? "shade"
        : undefined;
    const border = rowBorder(table, tableRow.kind, index === 0);
    let column = 0;
    let merged = false;
    let height = 0;
    for (const cell of tableRow.cells) {
      if (column >= count) {
        break;
      }
      const colSpan = cell.colSpan ?? 1;
      const range = span(column, colSpan);
      const size = sized(cell.size ?? fontSize);
      const look: Look = {
        size,
        bold: cell.bold,
        muted: cell.muted,
        // A cell across several columns reads as a label, from the left.
        align:
          cell.align ??
          (colSpan > 1 ? "left" : (table.columns[column]?.align ?? "left")),
        vertical: "top",
        fill: cell.bar ? "bar" : fill,
        border,
      };
      sheet.put(
        { top: row, bottom: row, left: range[0], right: range[1] },
        laidCell(cell, look, fontSize),
      );
      height = Math.max(
        height,
        cell.value === undefined
          ? textHeight(cellRuns(cell, fontSize), sheet.width(...range))
          : lineHeight(size) + 1,
      );
      merged ||= range[1] > range[0];
      column += colSpan;
    }
    // The columns a short row leaves out keep the grid's rules.
    for (; column < count; column += 1) {
      const [left, right] = span(column, 1);
      sheet.put(
        { top: row, bottom: row, left, right },
        { look: { size: sized(fontSize), fill, border } },
      );
      merged ||= right > left;
    }
    const laid = sheet.rows[row];
    // Neither Excel nor LibreOffice fits a row to a merged cell's text.
    if (laid && (merged || tableRow.minHeight)) {
      laid.height = Math.max(height, (tableRow.minHeight ?? 0) * scale);
    }
    last = row;
  });

  if (ruled && last !== undefined) {
    sheet.border(last, all, "bottom", "rule");
  }
  return header;
}

/** A table cell's text, its lines under the first one each on a line of its own. */
function cellRuns(cell: Cell, fontSize: number): Run[] {
  const size = cell.size ?? fontSize;
  return [
    run(cell, size),
    ...(cell.more ?? []).map((part) => run(part, size, "\n")),
  ];
}

function laidCell(cell: Cell, look: Look, fontSize: number): SheetCell {
  if (cell.value !== undefined && Number.isFinite(cell.value)) {
    // An amount stays on one line, smaller if it has to, as in the PDF.
    return {
      value: cell.value,
      look: { ...look, format: numberFormat(cell.text), shrink: true },
    };
  }
  const runs = cellRuns(cell, fontSize);
  return {
    runs: runs.some((part) => part.text) ? runs : undefined,
    look: { ...look, wrap: true },
  };
}

/**
 * The table whose header prints at the top of every page: the longest,
 * when the others are short enough to fit on one.
 */
function mainTable(document: FormDocument): Table | undefined {
  const tables = document.blocks.filter(
    (block): block is Table => block.type === "table",
  );
  const longest = tables.reduce<Table | undefined>(
    (best, table) =>
      !best || table.rows.length > best.rows.length ? table : best,
    undefined,
  );
  return longest &&
    tables.every(
      (table) => table === longest || table.rows.length <= shortTable,
    )
    ? longest
    : undefined;
}

/** A document laid out on a sheet. */
export function layOut(document: FormDocument): SheetLayout {
  const grid = gridOf(document);
  const sheet = new Sheet(grid.map((width) => width * scale));
  const main = mainTable(document);
  if (document.label) {
    sheet.textRow(
      [{ text: document.label, size: sized(8), bold: true }],
      "right",
    );
  }
  for (const block of document.blocks) {
    switch (block.type) {
      case "table": {
        const header = layTable(sheet, block, grid);
        if (block === main && header) {
          sheet.titleRows = {
            first: header.first,
            // With the row of column numbers under it.
            last:
              block.style === "grid" && block.numbers
                ? header.last + 1
                : header.last,
          };
        }
        break;
      }
      case "fields": {
        const size = sized(bodySize);
        for (const item of block.items) {
          sheet.textRow([
            { text: `${item.label}: `, size, muted: true },
            { text: item.value, size },
          ]);
        }
        break;
      }
      case "title":
        sheet.add(6 * scale);
        block.lines.forEach((text, index) => {
          sheet.textRow(
            [
              {
                text,
                size: sized(index === 0 ? 12 : index === 1 ? 9.5 : 9),
                bold: index < 2,
              },
            ],
            "center",
          );
        });
        sheet.add(6 * scale);
        break;
      case "columns":
        sheet.sideBySide(
          block.columns.map((column) =>
            column.lines.map((line) => ({
              runs: [run(line, bodySize)],
              align: column.align,
            })),
          ),
          splitColumns(
            sheet.widths,
            Math.min(block.columns.length, grid.length),
          ),
        );
        break;
      case "heading":
        sheet.add(6 * scale);
        sheet.textRow([{ text: block.text, size: sized(10), bold: true }]);
        break;
      case "text":
        sheet.textRow([run(block, bodySize)], block.align);
        break;
      case "rule": {
        const row = sheet.add(6 * scale);
        sheet.border(row, [0, sheet.last], "bottom", "faint");
        sheet.add(8 * scale);
        break;
      }
      case "signatures":
        laySignatures(sheet, block);
        break;
      case "space":
        sheet.add(block.height * scale);
        break;
    }
  }
  return sheet.layout();
}

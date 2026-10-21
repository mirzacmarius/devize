import type { Color } from "pdf-lib";
import type { Align, Cell, Row, Table } from "../model";
import type { TextFont } from "./fonts";
import { wrapText } from "./text";
import { baselineOf, colors, type Writer } from "./writer";

// Tables: column widths, wrapped cells, headers that span like HTML's, and
// rows that break across pages, the header repeated on every page.

const padX = 3;
const padY = 2.5;
const leadingRatio = 1.22;
const smallest = 5;

type Line = {
  text: string;
  font: TextFont;
  size: number;
  leading: number;
  color: Color;
  align: Align;
};

type LaidCell = { x: number; width: number; lines: Line[] };
type LaidRow = { row: Row; height: number; cells: LaidCell[] };
type LaidHeader = {
  top: number;
  height: number;
  x: number;
  width: number;
  lines: Line[];
};

function columnLayout(table: Table, writer: Writer) {
  const width = Math.min(
    table.width ?? writer.contentWidth,
    writer.contentWidth,
  );
  const left = writer.right - width;
  const fixed = table.columns.reduce(
    (sum, column) => sum + (column.flex ? 0 : column.width),
    0,
  );
  const flexTotal = table.columns.reduce(
    (sum, column) => sum + (column.flex ? column.width : 0),
    0,
  );
  const spare = Math.max(width - fixed, 0);
  const widths = table.columns.map((column) =>
    column.flex ? (spare * column.width) / (flexTotal || 1) : column.width,
  );
  const xs: number[] = [];
  let x = left;
  for (const columnWidth of widths) {
    xs.push(x);
    x += columnWidth;
  }
  return { left, width, widths, xs };
}

type Columns = ReturnType<typeof columnLayout>;

function span(columns: Columns, start: number, count: number) {
  const end = Math.min(start + count, columns.widths.length);
  let width = 0;
  for (let index = start; index < end; index += 1) {
    width += columns.widths[index] ?? 0;
  }
  return { x: columns.xs[start] ?? columns.left, width };
}

function linesOf(
  writer: Writer,
  cell: Cell,
  width: number,
  fontSize: number,
  align: Align,
): Line[] {
  const inner = Math.max(width - 2 * padX, 1);
  const parts = [cell, ...(cell.more ?? [])];
  return parts.flatMap((part, index) => {
    const font = part.bold ? writer.fonts.bold : writer.fonts.regular;
    let size = part.size ?? (index === 0 ? undefined : cell.size) ?? fontSize;
    const style = {
      font,
      color: part.muted ? colors.muted : colors.ink,
      align: part.align ?? (index === 0 ? undefined : cell.align) ?? align,
    };
    // An amount stays on one line, smaller if it has to.
    if (index === 0 && cell.value !== undefined) {
      const textWidth = font.width(part.text, size);
      if (textWidth > inner) {
        size = Math.max(smallest, (size * inner) / textWidth);
      }
      return [
        { ...style, text: part.text, size, leading: size * leadingRatio },
      ];
    }
    return wrapText(part.text, font, size, inner).map((text) => ({
      ...style,
      text,
      size,
      leading: size * leadingRatio,
    }));
  });
}

function heightOf(lines: Line[]) {
  return lines.reduce((sum, line) => sum + line.leading, 0) + 2 * padY;
}

function layRow(
  writer: Writer,
  table: Table,
  columns: Columns,
  row: Row,
  fontSize: number,
): LaidRow {
  const cells: LaidCell[] = [];
  let column = 0;
  for (const cell of row.cells) {
    if (column >= table.columns.length) {
      break;
    }
    const { x, width } = span(columns, column, cell.colSpan ?? 1);
    // A cell across several columns reads as a label, from the left.
    const align =
      (cell.colSpan ?? 1) > 1
        ? "left"
        : (table.columns[column]?.align ?? "left");
    cells.push({
      x,
      width,
      lines: linesOf(writer, cell, width, fontSize, align),
    });
    column += cell.colSpan ?? 1;
  }
  const height = Math.max(
    fontSize * leadingRatio + 2 * padY,
    ...cells.map((cell) => heightOf(cell.lines)),
  );
  return { row, height, cells };
}

/**
 * Places header cells on a grid the way HTML does: each cell takes the next
 * column not covered by a cell spanning down from a row above.
 */
function layHeader(
  writer: Writer,
  table: Table,
  columns: Columns,
  fontSize: number,
) {
  const size = Math.max(fontSize - 0.5, 6);
  const grid = table.style === "grid";
  const covered: boolean[][] = table.header.map(() => []);
  const placed: {
    row: number;
    rowSpan: number;
    x: number;
    width: number;
    lines: Line[];
  }[] = [];
  table.header.forEach((cells, row) => {
    let column = 0;
    for (const cell of cells) {
      while (covered[row]?.[column]) {
        column += 1;
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
      const { x, width } = span(columns, column, colSpan);
      const align = grid ? "center" : (table.columns[column]?.align ?? "left");
      placed.push({
        row,
        rowSpan,
        x,
        width,
        lines: linesOf(
          writer,
          { text: cell.text, bold: true, muted: !grid },
          width,
          size,
          align,
        ),
      });
      column += colSpan;
    }
  });

  // Each row as tall as its own cells, then taller where a cell spanning
  // several rows needs more room than they give it.
  const heights = table.header.map(() => size * leadingRatio + 2 * padY);
  for (const cell of placed) {
    if (cell.rowSpan === 1) {
      heights[cell.row] = Math.max(
        heights[cell.row] ?? 0,
        heightOf(cell.lines),
      );
    }
  }
  for (const cell of placed) {
    if (cell.rowSpan > 1) {
      const last = cell.row + cell.rowSpan - 1;
      let spanned = 0;
      for (let r = cell.row; r <= last; r += 1) {
        spanned += heights[r] ?? 0;
      }
      const missing = heightOf(cell.lines) - spanned;
      if (missing > 0) {
        heights[last] = (heights[last] ?? 0) + missing;
      }
    }
  }
  const tops: number[] = [];
  let top = 0;
  for (const height of heights) {
    tops.push(top);
    top += height;
  }
  const cells: LaidHeader[] = placed.map((cell) => {
    let height = 0;
    for (let r = cell.row; r < cell.row + cell.rowSpan; r += 1) {
      height += heights[r] ?? 0;
    }
    return {
      top: tops[cell.row] ?? 0,
      height,
      x: cell.x,
      width: cell.width,
      lines: cell.lines,
    };
  });
  return { cells, height: top };
}

/** Lines of text in a box, from its top, or centred in it. */
function drawLines(
  writer: Writer,
  lines: Line[],
  x: number,
  width: number,
  top: number,
  height?: number,
) {
  let y =
    height === undefined
      ? top + padY
      : top + (height - heightOf(lines)) / 2 + padY;
  for (const line of lines) {
    const anchor =
      line.align === "right"
        ? x + width - padX
        : line.align === "center"
          ? x + width / 2
          : x + padX;
    writer.text(line.text, anchor, baselineOf(y, line.size, line.leading), {
      font: line.font,
      size: line.size,
      color: line.color,
      align: line.align,
    });
    y += line.leading;
  }
}

/**
 * Draws a table from where the page has reached. `reserve` is the height of
 * what must follow the table on its last page, such as the signatures, so
 * the closing rows never end a page without them.
 */
export function drawTable(writer: Writer, table: Table, reserve = 0) {
  const fontSize = table.fontSize ?? 8;
  const grid = table.style === "grid";
  const columns = columnLayout(table, writer);
  const header = layHeader(writer, table, columns, fontSize);
  const numbersSize = Math.max(fontSize - 1.5, 5.5);
  const numbersHeight =
    grid && table.numbers ? numbersSize * leadingRatio + 2 : 0;
  const rows = table.rows.map((row) =>
    layRow(writer, table, columns, row, fontSize),
  );
  const right = columns.left + columns.width;
  const thin = 0.5;

  const vertical = (x: number, top: number, height: number) =>
    writer.line(x, top, x, top + height, thin, colors.rule);
  const horizontal = (top: number, thickness = thin, color = colors.rule) =>
    writer.line(columns.left, top, right, top, thickness, color);

  const drawHeader = () => {
    const top = writer.y;
    if (header.height > 0) {
      if (grid) {
        writer.rect(
          columns.left,
          top,
          columns.width,
          header.height,
          colors.shade,
        );
      }
      for (const cell of header.cells) {
        drawLines(
          writer,
          cell.lines,
          cell.x,
          cell.width,
          top + cell.top,
          cell.height,
        );
        if (grid) {
          writer.line(
            cell.x,
            top + cell.top,
            cell.x + cell.width,
            top + cell.top,
            thin,
            colors.rule,
          );
          vertical(cell.x, top + cell.top, cell.height);
        }
      }
      if (grid) {
        vertical(right, top, header.height);
      }
      horizontal(top + header.height, grid ? thin : 0.8, colors.rule);
    }
    writer.y = top + header.height;
    if (numbersHeight > 0 && table.numbers) {
      const numbersTop = writer.y;
      table.columns.forEach((_, index) => {
        const { x, width } = span(columns, index, 1);
        writer.text(
          table.numbers?.[index] ?? "",
          x + width / 2,
          baselineOf(numbersTop + 1, numbersSize, numbersSize * leadingRatio),
          {
            font: writer.fonts.regular,
            size: numbersSize,
            color: colors.muted,
            align: "center",
          },
        );
        vertical(x, numbersTop, numbersHeight);
      });
      vertical(right, numbersTop, numbersHeight);
      writer.y += numbersHeight;
    }
  };

  const bodyCapacity = writer.pageCapacity - header.height - numbersHeight;
  // The room the rows starting at `index` need on one page: they and the
  // rows each keeps with the next, and what follows the table after the last.
  const needed = (index: number) => {
    let height = 0;
    let next = index;
    for (; next < rows.length; next += 1) {
      const laid = rows[next];
      if (!laid) {
        break;
      }
      height += laid.height;
      if (!laid.row.keepWithNext) {
        break;
      }
    }
    if (next >= rows.length - 1) {
      height += reserve;
    }
    return Math.min(height, bodyCapacity);
  };
  const closePage = () => {
    if (grid) {
      horizontal(writer.y);
    }
  };

  writer.fit(header.height + numbersHeight + (rows.length > 0 ? needed(0) : 0));
  drawHeader();
  let pageStart = true;
  rows.forEach((laid, index) => {
    const chainStart = index === 0 || !rows[index - 1]?.row.keepWithNext;
    const room = chainStart ? needed(index) : laid.height;
    if (writer.y + room > writer.bottom && !pageStart) {
      closePage();
      writer.newPage();
      drawHeader();
      pageStart = true;
    }
    drawRow(laid, pageStart);
    pageStart = false;
  });
  closePage();

  function drawRow(laid: LaidRow, first: boolean) {
    const top = writer.y;
    const { kind } = laid.row;
    if (kind === "group" || (grid && kind === "total")) {
      writer.rect(columns.left, top, columns.width, laid.height, colors.shade);
    }
    if (grid) {
      if (kind !== "detail" || first) {
        horizontal(top, kind === "total" ? 0.9 : thin);
      }
      for (const cell of laid.cells) {
        vertical(cell.x, top, laid.height);
      }
      vertical(right, top, laid.height);
    } else if (kind === "subtotal") {
      horizontal(top, 0.6, colors.rule);
    } else if (kind === "total") {
      horizontal(top, 0.9, colors.ink);
    } else if (kind === "item" && !first) {
      horizontal(top, thin, colors.faint);
    }
    for (const cell of laid.cells) {
      drawLines(writer, cell.lines, cell.x, cell.width, top);
    }
    writer.y = top + laid.height;
    if (!grid && kind === "total") {
      horizontal(writer.y, 0.9, colors.ink);
    }
  }
}

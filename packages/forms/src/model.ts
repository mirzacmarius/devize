// A document as the builders describe it and the renderers draw it: blocks of
// text and tables, with no idea of pages. The PDF renderer lays them out on
// A4; an Excel writer can read the same tables.

export type Align = "left" | "center" | "right";

export type TextStyle = {
  bold?: boolean;
  // Grey, for labels and notes.
  muted?: boolean;
  // Points; the block's size when left out.
  size?: number;
  align?: Align;
};

/** One line of a cell, wrapped to the column's width. */
export type CellPart = TextStyle & { text: string };

export type Cell = TextStyle & {
  text: string;
  // The number behind the text, for spreadsheets.
  value?: number;
  // Lines under the first one, each with its own style: a code over a title.
  more?: CellPart[];
  colSpan?: number;
};

export type RowKind =
  // A line item or a resource.
  | "item"
  // A line under an item, such as its labour cost, with no rule above it.
  | "detail"
  // A heading across the table, such as an object or a chapter.
  | "group"
  // A sum, ruled above.
  | "subtotal"
  // The final sum, ruled above and below.
  | "total";

export type Row = {
  kind: RowKind;
  cells: Cell[];
  // Keeps this row on the same page as the next one.
  keepWithNext?: boolean;
};

export type Column = {
  // Points, or a share of the width left over when `flex`.
  width: number;
  flex?: boolean;
  align?: Align;
};

export type HeaderCell = {
  text: string;
  colSpan?: number;
  rowSpan?: number;
};

export type Table = {
  type: "table";
  // An official form's grid, every cell ruled, or the lighter rules between
  // rows of the client's Deviz.
  style: "grid" | "lines";
  columns: Column[];
  // Header rows, repeated on every page. Cells span like HTML table cells.
  header: HeaderCell[][];
  // The row of column numbers official forms print under the header: 0, 1, 2…
  numbers?: string[];
  rows: Row[];
  fontSize?: number;
  // Points, against the right margin, for a summary narrower than the page.
  width?: number;
};

export type Block =
  | Table
  // Label–value lines at the top of a form: "Obiectivul: Școala nr. 1".
  | { type: "fields"; items: { label: string; value: string }[] }
  // The form's centred name, the first line larger.
  | { type: "title"; lines: string[] }
  // Lines side by side, such as the firm and the Deviz's number at the top.
  | { type: "columns"; columns: { lines: CellPart[]; align?: Align }[] }
  // A section's name over what follows: "Recapitulație".
  | { type: "heading"; text: string }
  | ({ type: "text"; text: string } & TextStyle)
  // A thin line across the page.
  | { type: "rule" }
  // Who signs, side by side: "Ofertant," over the firm and a hint, under
  // the date they sign on.
  | {
      type: "signatures";
      date?: string;
      items: { role: string; name?: string; hint?: string }[];
    }
  | { type: "space"; height: number };

export type FormDocument = {
  // F3, C6, DEVIZ: what the user picked.
  id: string;
  // What the top right corner says: "Formularul F3".
  label?: string;
  // What the file's outline and the footer call it.
  name: string;
  orientation: "portrait" | "landscape";
  // Left of the page number in the footer: "DVZ-0142 · Formularul F3".
  footer: string;
  blocks: Block[];
};

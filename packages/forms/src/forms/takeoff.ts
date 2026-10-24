import {
  estimateCode,
  formatDate,
  formatNumber,
  formatQuantity,
  formatUnit,
} from "../format";
import type {
  ExportData,
  ExportOptions,
  LineItemInput,
  RoomInput,
  RoomMeasure,
  SectionInput,
  TakeoffInput,
  TakeoffRowInput,
} from "../input";
import type { Block, Cell, FormDocument, Row, Table } from "../model";
import { empty, footerOf, formLabel, partyFields } from "./common";

// The Anexă · Antemăsurătoare: the rooms with their dimensions and what
// they measure, then each Articol's rows, count × length × width × height,
// with the openings taken out, adding up to the quantity the Deviz prices.
// Drawn only when the Deviz has rooms or takeoffs.

const measureNames: Record<RoomMeasure, string> = {
  floor: "Pardoseală",
  ceiling: "Tavan",
  walls: "Pereți, fără goluri",
  wallsAndCeiling: "Pereți și tavan",
  perimeter: "Perimetru",
  skirting: "Plintă: perimetrul fără uși",
  openings: "Goluri",
  doors: "Uși",
  windows: "Ferestre",
};

const openingWords = { door: "ușă", window: "fereastră", other: "gol" };

/** A length in metres: 4,20; blank when not measured. */
function metres(value: number | undefined): Cell {
  return value === undefined
    ? empty
    : { text: formatNumber(value, 2, 3), value, align: "right" };
}

/** A count of rows or pieces: 2, or 1,5 for half a thing. */
function count(value: number): Cell {
  return { text: formatNumber(value, 0, 3), value, align: "right" };
}

function area(value: number): Cell {
  return { text: formatQuantity(value), value, align: "right" };
}

/** "1 ușă 0,90 × 2,10; 2 ferestre 1,20 × 1,40", or a dash. */
function openingsText(room: RoomInput): string {
  if (room.openings.length === 0) {
    return "–";
  }
  return room.openings
    .map((opening) => {
      const what = opening.label?.trim() || openingWords[opening.kind];
      return `${formatNumber(opening.count, 0, 3)} ${what} ${formatNumber(opening.width, 2)} × ${formatNumber(opening.height, 2)}`;
    })
    .join("; ");
}

function roomsTable(rooms: readonly RoomInput[]): Table {
  const rows: Row[] = rooms.map((room, index) => ({
    kind: "item",
    cells: [
      { text: String(index + 1), align: "right" },
      {
        text: room.name,
        more: room.level ? [{ text: room.level, muted: true, size: 7 }] : [],
      },
      metres(room.length),
      metres(room.width),
      metres(room.height),
      { text: openingsText(room), size: 7 },
      area(room.measures.floor),
      area(room.measures.walls),
      metres(room.measures.perimeter),
    ],
  }));
  const sum = (measure: RoomMeasure) =>
    Math.round(
      rooms.reduce((total, room) => total + room.measures[measure], 0) * 100,
    ) / 100;
  rows.push({
    kind: "total",
    cells: [
      empty,
      { text: "Total camere", bold: true, colSpan: 5 },
      area(sum("floor")),
      area(sum("walls")),
      metres(sum("perimeter")),
    ].map((cell) => ({ ...cell, bold: true })),
  });
  return {
    type: "table",
    style: "lines",
    fontSize: 8,
    columns: [
      { width: 18, align: "right" },
      { width: 1, flex: true },
      { width: 36, align: "right" },
      { width: 36, align: "right" },
      { width: 36, align: "right" },
      { width: 1.4, flex: true },
      { width: 52, align: "right" },
      { width: 52, align: "right" },
      { width: 50, align: "right" },
    ],
    header: [
      [
        { text: "Nr." },
        { text: "Camera" },
        { text: "L (m)" },
        { text: "l (m)" },
        { text: "h (m)" },
        { text: "Goluri (m)" },
        { text: "Pardoseală / tavan (mp)" },
        { text: "Pereți (mp)" },
        { text: "Perimetru (m)" },
      ],
    ],
    rows,
  };
}

/** count × length × width × height, without the dimensions not measured. */
function rowAmount(row: TakeoffRowInput): number {
  return row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1);
}

/** The rows added up and the deductions taken out, never below zero. */
function rowsTotal(rows: readonly TakeoffRowInput[]): number {
  const total = rows.reduce(
    (sum, row) => sum + (row.deduct ? -1 : 1) * rowAmount(row),
    0,
  );
  return Math.max(0, Math.round(total * 100) / 100);
}

/** The count in front of a unit: 100 for "100 mp". */
function unitFactor(unit: string): number {
  const match = /^(\d+(?:[.,]\d+)?)\s+\S/.exec(unit.trim());
  return match?.[1] ? Number(match[1].replace(",", ".")) || 1 : 1;
}

/** The unit the rows are in: mp for an Articol per 100 mp. */
function rowsUnit(unit: string): string {
  return formatUnit(unit.trim().replace(/^\d+(?:[.,]\d+)?\s+/, ""));
}

type Numbered = { item: LineItemInput; number: number };

/**
 * The line items in the order and with the numbers the Deviz prints them:
 * items outside any section first, then each object or chapter.
 */
function printOrder(data: ExportData): Numbered[] {
  const byPosition = <T extends { position: number }>(a: T, b: T) =>
    a.position - b.position;
  const sections = [...data.sections].sort(byPosition);
  const known = new Set(sections.map((section) => section._id));
  const objects = new Set(
    sections.filter((s) => s.kind === "object").map((s) => s._id),
  );
  const bySection = new Map<string, LineItemInput[]>();
  const loose: LineItemInput[] = [];
  for (const item of [...data.lineItems].sort(byPosition)) {
    if (item.sectionId && known.has(item.sectionId)) {
      bySection.set(item.sectionId, [
        ...(bySection.get(item.sectionId) ?? []),
        item,
      ]);
    } else {
      loose.push(item);
    }
  }
  const result: Numbered[] = [];
  const add = (items: readonly LineItemInput[]) => {
    for (const item of items) {
      result.push({ item, number: result.length + 1 });
    }
  };
  add(loose);
  const nested = (section: SectionInput) =>
    section.kind === "chapter" &&
    section.parentId !== undefined &&
    objects.has(section.parentId);
  for (const section of sections) {
    if (nested(section)) {
      continue;
    }
    add(bySection.get(section._id) ?? []);
    for (const chapter of sections) {
      if (chapter.kind === "chapter" && chapter.parentId === section._id) {
        add(bySection.get(chapter._id) ?? []);
      }
    }
  }
  return result;
}

const COLUMNS = 7;

/** The rows of one takeoff, each with its amount, deductions in minus. */
function takeoffRows(takeoff: TakeoffInput, rows: Row[]) {
  for (const row of takeoff.rows) {
    const amount = rowAmount(row);
    rows.push({
      kind: "item",
      cells: [
        empty,
        { text: row.label ?? "", muted: row.label === undefined },
        count(row.count),
        metres(row.length),
        metres(row.width),
        metres(row.height),
        {
          text: `${row.deduct ? "−" : ""}${formatQuantity(amount)}`,
          value: row.deduct ? -amount : amount,
          align: "right",
        },
      ],
    });
  }
}

/** What a takeoff is called: its title, its measure, or how it was made. */
function takeoffName(takeoff: TakeoffInput): string {
  if (takeoff.title) {
    return takeoff.title;
  }
  if (takeoff.measure) {
    return `Din camere: ${measureNames[takeoff.measure].toLowerCase()}`;
  }
  switch (takeoff.method) {
    case "photo":
      return "Măsurat din fotografii";
    case "plan":
      return "Măsurat din planșe";
    case "voice":
      return "Măsurat din descriere";
    case "derived":
      return "Dedus din celelalte articole";
    default:
      return "Măsurat";
  }
}

/**
 * One Articol's takeoffs: its line as the Deviz prints it, each takeoff's
 * rows, then what they measure against the quantity the Deviz prices.
 */
function itemRows(
  numbered: Numbered | undefined,
  takeoffs: readonly TakeoffInput[],
  rows: Row[],
) {
  const item = numbered?.item;
  const unit = takeoffs[0]?.unit ?? item?.unit ?? "";
  rows.push({
    kind: "group",
    keepWithNext: true,
    cells: [
      {
        text: numbered ? String(numbered.number) : "",
        bold: true,
        align: "right",
      },
      {
        text: item?.title ?? "Măsurători fără articol în deviz",
        bold: true,
        colSpan: 4,
        more: item?.code ? [{ text: item.code, muted: true, size: 7 }] : [],
      },
      { text: item ? formatUnit(item.unit) : "", align: "center" },
      item ? area(item.quantity) : empty,
    ],
  });
  const several = takeoffs.length > 1;
  for (const takeoff of takeoffs) {
    if (several || takeoff.title || takeoff.measure) {
      rows.push({
        kind: "detail",
        keepWithNext: true,
        cells: [
          empty,
          { text: takeoffName(takeoff), muted: true, colSpan: COLUMNS - 1 },
        ],
      });
    }
    takeoffRows(takeoff, rows);
    if (several) {
      rows.push({
        kind: "subtotal",
        cells: [
          empty,
          { text: `Total ${takeoffName(takeoff).toLowerCase()}`, colSpan: 5 },
          {
            text: `${formatQuantity(rowsTotal(takeoff.rows))} ${rowsUnit(takeoff.unit)}`,
            value: rowsTotal(takeoff.rows),
            align: "right",
          },
        ],
      });
    }
  }
  const measured =
    Math.round(takeoffs.reduce((sum, t) => sum + t.total, 0) * 1000) / 1000;
  const factor = unitFactor(unit);
  const differs =
    item !== undefined && Math.abs(item.quantity - measured) > 0.0005;
  rows.push({
    kind: "subtotal",
    keepWithNext: differs,
    cells: [
      empty,
      {
        text:
          factor === 1
            ? "Total măsurat"
            : `Total măsurat, în ${formatUnit(unit)}`,
        bold: true,
        colSpan: 4,
      },
      { text: formatUnit(unit), align: "center", bold: true },
      { ...area(measured), bold: true },
    ],
  });
  if (differs && item) {
    rows.push({
      kind: "detail",
      cells: [
        empty,
        {
          text: `Devizul prețuiește ${formatQuantity(item.quantity)} ${formatUnit(item.unit)}, cantitate scrisă de mână.`,
          muted: true,
          colSpan: COLUMNS - 1,
        },
      ],
    });
  }
}

function takeoffsTable(data: ExportData, takeoffs: readonly TakeoffInput[]) {
  const byItem = new Map<string, TakeoffInput[]>();
  const orphans: TakeoffInput[] = [];
  for (const takeoff of takeoffs) {
    if (takeoff.lineItemId) {
      byItem.set(takeoff.lineItemId, [
        ...(byItem.get(takeoff.lineItemId) ?? []),
        takeoff,
      ]);
    } else {
      orphans.push(takeoff);
    }
  }
  const rows: Row[] = [];
  for (const numbered of printOrder(data)) {
    const own = byItem.get(numbered.item._id);
    if (own) {
      itemRows(numbered, own, rows);
      byItem.delete(numbered.item._id);
    }
  }
  // Takeoffs whose line item is no longer in the Deviz.
  const left = [...orphans, ...[...byItem.values()].flat()];
  if (left.length > 0) {
    itemRows(undefined, left, rows);
  }
  const table: Table = {
    type: "table",
    style: "lines",
    fontSize: 8,
    columns: [
      { width: 20, align: "right" },
      { width: 1, flex: true },
      { width: 34, align: "right" },
      { width: 40, align: "right" },
      { width: 40, align: "right" },
      { width: 40, align: "right" },
      { width: 62, align: "right" },
    ],
    header: [
      [
        { text: "Nr." },
        { text: "Articolul și rândurile măsurate" },
        { text: "Buc." },
        { text: "L (m)" },
        { text: "l (m)" },
        { text: "h (m)" },
        { text: "Cantitate" },
      ],
    ],
    rows,
  };
  return table;
}

/** The Anexă · Antemăsurătoare, one document, or none without measurements. */
export function takeoffDocuments(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const takeoff = data.takeoff;
  if (
    !takeoff ||
    (takeoff.rooms.length === 0 && takeoff.takeoffs.length === 0)
  ) {
    return [];
  }
  const label = formLabel(options, "AM");
  const code = estimateCode(data.estimate.number, data.estimate.revision);
  const blocks: Block[] = [
    {
      type: "title",
      lines: [
        "ANTEMĂSURĂTOARE",
        `Anexă la devizul ${code} · ${data.estimate.title}`,
      ],
    },
    partyFields(data, options, { objective: false }),
    {
      type: "text",
      text: "Dimensiunile sunt în metri; suprafețele în metri pătrați. Rândurile scad golurile însemnate cu minus.",
      muted: true,
      size: 7.5,
    },
    { type: "space", height: 6 },
  ];
  if (takeoff.rooms.length > 0) {
    blocks.push(
      { type: "heading", text: "Camerele" },
      roomsTable(takeoff.rooms),
      { type: "space", height: 10 },
    );
  }
  if (takeoff.takeoffs.length > 0) {
    blocks.push(
      { type: "heading", text: "Măsurătorile articolelor" },
      takeoffsTable(data, takeoff.takeoffs),
    );
  }
  blocks.push(
    { type: "space", height: 14 },
    {
      type: "signatures",
      date: `Data: ${formatDate(options.date)}`,
      items: [
        {
          role: "Întocmit,",
          name: data.firm.name,
          hint: "(numele, prenumele și semnătura)",
        },
      ],
    },
  );
  return [
    {
      id: "AM",
      label,
      name: `${label} · ${code}`,
      orientation: "portrait",
      footer: footerOf(data, label),
      blocks,
    },
  ];
}

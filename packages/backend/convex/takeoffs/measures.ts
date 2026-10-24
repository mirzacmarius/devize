import { normalizeText, normalizeUnit } from "../lib/text";

// The arithmetic of an Antemăsurătoare: a room's floor, walls, ceiling,
// perimeter and openings from its dimensions, the rows a measure of some
// rooms writes for an Articol, and what rows add up to in the Articol's
// unit. Pure, so the page and the PDF work it out the same way the server
// does.

export const roomMeasures = [
  "floor",
  "ceiling",
  "walls",
  "wallsAndCeiling",
  "perimeter",
  "skirting",
  "openings",
  "doors",
  "windows",
] as const;

export type RoomMeasure = (typeof roomMeasures)[number];

export type OpeningKind = "door" | "window" | "other";

export type RoomOpening = {
  kind: OpeningKind;
  label?: string;
  count: number;
  width: number;
  height: number;
};

export type RoomLike = {
  name: string;
  length?: number;
  width?: number;
  height?: number;
  floorArea?: number;
  perimeter?: number;
  openings: readonly RoomOpening[];
};

/** What a room measures, in mp, m and pieces, rounded to centimetres. */
export type RoomMeasures = Record<RoomMeasure, number> & {
  // The walls before the openings are taken out.
  wallsGross: number;
};

export type TakeoffRow = {
  label?: string;
  count: number;
  length?: number;
  width?: number;
  height?: number;
  deduct: boolean;
};

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const round2 = (value: number) => round(value, 2);

/** How many rooms, rows and openings a Deviz may hold. */
export const limits = {
  rooms: 500,
  openings: 50,
  rows: 200,
  takeoffsPerItem: 20,
  // Metres: a room's side, or an opening's side.
  side: 1000,
  openingSide: 100,
  count: 1e6,
  area: 1e6,
  label: 120,
};

/** A room's measures from its dimensions and openings. */
export function measuresOf(room: RoomLike): RoomMeasures {
  const sides =
    room.length !== undefined && room.width !== undefined
      ? { length: room.length, width: room.width }
      : undefined;
  const floor = room.floorArea ?? (sides ? sides.length * sides.width : 0);
  const perimeter =
    room.perimeter ?? (sides ? 2 * (sides.length + sides.width) : 0);
  const wallsGross = perimeter * (room.height ?? 0);
  let openings = 0;
  // The width of the openings that reach the floor, which the skirting skips.
  let onFloor = 0;
  let doors = 0;
  let windows = 0;
  for (const opening of room.openings) {
    openings += opening.count * opening.width * opening.height;
    if (opening.kind === "window") {
      windows += opening.count;
    } else {
      onFloor += opening.count * opening.width;
      if (opening.kind === "door") {
        doors += opening.count;
      }
    }
  }
  const walls = Math.max(0, wallsGross - openings);
  return {
    floor: round2(floor),
    ceiling: round2(floor),
    walls: round2(walls),
    wallsAndCeiling: round2(walls + floor),
    perimeter: round2(perimeter),
    skirting: round2(Math.max(0, perimeter - onFloor)),
    openings: round2(openings),
    doors,
    windows,
    wallsGross: round2(wallsGross),
  };
}

/** count × length × width × height, without the dimensions not measured. */
export function rowAmount(row: TakeoffRow): number {
  return row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1);
}

/**
 * The rows added up and the deductions taken out, in the rows' own unit,
 * never below zero.
 */
export function rowsTotal(rows: readonly TakeoffRow[]): number {
  const total = rows.reduce(
    (sum, row) => sum + (row.deduct ? -1 : 1) * rowAmount(row),
    0,
  );
  return Math.max(0, round2(total));
}

/** What the deductions take out, for a warning when they take everything. */
export function deductionsOf(rows: readonly TakeoffRow[]): number {
  return round2(
    rows.reduce((sum, row) => sum + (row.deduct ? rowAmount(row) : 0), 0),
  );
}

/**
 * The count in front of a unit and the unit itself: 100 and "mp" for
 * "100 mp", 1 and "buc" for "buc".
 */
export function unitParts(unit: string): { factor: number; base: string } {
  const normalized = normalizeUnit(unit);
  const match = /^(\d+(?:\.\d+)?) (.+)$/.exec(normalized);
  return match?.[1] && match[2]
    ? { factor: Number(match[1]), base: match[2] }
    : { factor: 1, base: normalized };
}

/**
 * A takeoff's total in its Articol's unit: the rows, in metres and pieces,
 * over the count in front of the unit, so 243,2 mp of rows measure 2,432
 * for an Articol counted per 100 mp.
 */
export function takeoffTotal(rows: readonly TakeoffRow[], unit: string) {
  return round(rowsTotal(rows) / unitParts(unit).factor, 3);
}

/** The unit a measure comes in. */
export function measureUnit(measure: RoomMeasure): "mp" | "m" | "buc" {
  switch (measure) {
    case "perimeter":
    case "skirting":
      return "m";
    case "doors":
    case "windows":
      return "buc";
    default:
      return "mp";
  }
}

/** The measures an Articol in `unit` can take from rooms; none for kg or ore. */
export function measuresFor(unit: string): RoomMeasure[] {
  const { base } = unitParts(unit);
  return roomMeasures.filter((measure) => measureUnit(measure) === base);
}

// Words in an Articol's title that say what it measures, each checked on the
// normalized title, the first that matches winning.
const hints: [RegExp, RoomMeasure][] = [
  [
    /\b(peret\w*|zugrav\w*|vopsi\w*|lavabil\w*|glet\w*|tencui\w*)\b.*\b(tavan\w*|plafon\w*)\b/,
    "wallsAndCeiling",
  ],
  [/\b(tavan\w*|plafon\w*)\b.*\b(peret\w*)\b/, "wallsAndCeiling"],
  [/\b(tavan\w*|plafon\w*)\b/, "ceiling"],
  [/\b(plint\w*|scaf\w*)\b/, "skirting"],
  [/\b(usi|usa|usile|fereastr\w*|ferestr\w*|geam\w*|tamplar\w*)\b/, "openings"],
  [
    /\b(pardoseal\w*|pardosel\w*|parchet\w*|gresi\w*|sap[a-z]*|dusume\w*|mochet\w*|laminat\w*|covor\w*|linoleum\w*)\b/,
    "floor",
  ],
  [
    /\b(peret\w*|faiant\w*|zugrav\w*|vopsi\w*|lavabil\w*|glet\w*|tencui\w*|tapet\w*|placar\w*|lambri\w*)\b/,
    "walls",
  ],
  [/\b(perimetr\w*)\b/, "perimeter"],
];

/**
 * The measure an Articol's title suggests, among those its unit allows:
 * "Zugrăveli lavabile la pereți" measures the walls, "Montaj uși" the doors.
 */
export function guessMeasure(
  title: string,
  unit: string,
): RoomMeasure | undefined {
  const allowed = measuresFor(unit);
  if (allowed.length === 0) {
    return undefined;
  }
  const text = normalizeText(title);
  const { base } = unitParts(unit);
  if (base === "buc") {
    if (/\b(usi|usa|usile)\b/.test(text)) {
      return "doors";
    }
    if (/\b(fereastr\w*|ferestr\w*|geam\w*)\b/.test(text)) {
      return "windows";
    }
    return undefined;
  }
  for (const [pattern, measure] of hints) {
    if (pattern.test(text) && allowed.includes(measure)) {
      return measure;
    }
  }
  return base === "m" ? "perimeter" : undefined;
}

/** A dimension as a row's label writes it: 0,90. */
function metres(value: number) {
  return value.toFixed(2).replace(".", ",");
}

const openingWords: Record<OpeningKind, string> = {
  door: "ușă",
  window: "fereastră",
  other: "gol",
};

function openingLabel(room: RoomLike, opening: RoomOpening) {
  const what = opening.label?.trim() || openingWords[opening.kind];
  return `${room.name}: ${what} ${metres(opening.width)} × ${metres(opening.height)}`;
}

/**
 * The rows a measure of some rooms writes, one room after another, so the
 * Antemăsurătoare reads as it was measured: a floor as length × width, walls
 * as the perimeter × height less each opening, skirting as the perimeter less
 * the doors. A room that doesn't measure (no sides, no height) writes none.
 */
export function roomRows(
  measure: RoomMeasure,
  rooms: readonly RoomLike[],
): TakeoffRow[] {
  const rows: TakeoffRow[] = [];
  for (const room of rooms) {
    const m = measuresOf(room);
    const sides =
      room.length !== undefined && room.width !== undefined
        ? { length: room.length, width: room.width }
        : undefined;
    const floorRows = () => {
      if (room.floorArea !== undefined) {
        rows.push({
          label: `${room.name}: suprafață măsurată`,
          count: 1,
          length: room.floorArea,
          deduct: false,
        });
      } else if (sides) {
        rows.push({ label: room.name, count: 1, ...sides, deduct: false });
      }
    };
    const perimeterRow = (label: string) => {
      if (m.perimeter > 0) {
        rows.push({ label, count: 1, length: m.perimeter, deduct: false });
      }
    };
    const wallRows = () => {
      if (m.wallsGross === 0) {
        return;
      }
      rows.push({
        label: `${room.name}: perimetru × înălțime`,
        count: 1,
        length: m.perimeter,
        height: room.height,
        deduct: false,
      });
      for (const opening of room.openings) {
        rows.push({
          label: openingLabel(room, opening),
          count: opening.count,
          length: opening.width,
          height: opening.height,
          deduct: true,
        });
      }
    };
    switch (measure) {
      case "floor":
      case "ceiling":
        floorRows();
        break;
      case "walls":
        wallRows();
        break;
      case "wallsAndCeiling":
        wallRows();
        floorRows();
        break;
      case "perimeter":
        perimeterRow(`${room.name}: perimetru`);
        break;
      case "skirting":
        perimeterRow(`${room.name}: perimetru`);
        for (const opening of room.openings) {
          if (opening.kind !== "window") {
            rows.push({
              label: openingLabel(room, opening),
              count: opening.count,
              length: opening.width,
              deduct: true,
            });
          }
        }
        break;
      case "openings":
        for (const opening of room.openings) {
          rows.push({
            label: openingLabel(room, opening),
            count: opening.count,
            length: opening.width,
            height: opening.height,
            deduct: false,
          });
        }
        break;
      case "doors":
      case "windows":
        for (const opening of room.openings) {
          if (opening.kind === (measure === "doors" ? "door" : "window")) {
            rows.push({
              label: openingLabel(room, opening),
              count: opening.count,
              deduct: false,
            });
          }
        }
        break;
    }
  }
  return rows;
}

function positive(value: number | undefined, max: number) {
  return value !== undefined &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= max
    ? value
    : undefined;
}

/** A label trimmed to its length, or nothing. */
export function cleanLabel(
  value: string | undefined,
  max: number,
): string | undefined {
  const result = value?.replace(/\s+/g, " ").trim().slice(0, max);
  return result ? result : undefined;
}

/**
 * Rows as typed, checked: a count above zero, dimensions above zero where
 * given, rounded to millimetres. Returns undefined when a row is wrong.
 */
export function cleanRows(
  rows: readonly TakeoffRow[],
): TakeoffRow[] | undefined {
  if (rows.length === 0 || rows.length > limits.rows) {
    return undefined;
  }
  const result: TakeoffRow[] = [];
  for (const row of rows) {
    const count = positive(row.count, limits.count);
    if (count === undefined) {
      return undefined;
    }
    const dimensions = [row.length, row.width, row.height].map((value) =>
      value === undefined ? undefined : positive(value, limits.side * 10),
    );
    if (
      [row.length, row.width, row.height].some(
        (value, index) =>
          value !== undefined && dimensions[index] === undefined,
      )
    ) {
      return undefined;
    }
    result.push({
      label: cleanLabel(row.label, limits.label),
      count: round(count, 3),
      length: dimensions[0] === undefined ? undefined : round(dimensions[0], 3),
      width: dimensions[1] === undefined ? undefined : round(dimensions[1], 3),
      height: dimensions[2] === undefined ? undefined : round(dimensions[2], 3),
      deduct: row.deduct,
    });
  }
  return result;
}

/**
 * A room as typed, checked: a name, sides and height above zero where given,
 * openings with a count and both sides. Returns undefined when it's wrong.
 */
export type RoomInput = Omit<RoomLike, "openings"> & {
  openings: RoomOpening[];
  level?: string;
  notes?: string;
};

export function cleanRoom(room: RoomInput): RoomInput | undefined {
  const name = cleanLabel(room.name, limits.label);
  if (!name) {
    return undefined;
  }
  const sides = [room.length, room.width, room.height].map((value) =>
    value === undefined ? undefined : positive(value, limits.side),
  );
  const floorArea =
    room.floorArea === undefined
      ? undefined
      : positive(room.floorArea, limits.area);
  const perimeter =
    room.perimeter === undefined
      ? undefined
      : positive(room.perimeter, limits.side * 10);
  if (
    [room.length, room.width, room.height].some(
      (value, index) => value !== undefined && sides[index] === undefined,
    ) ||
    (room.floorArea !== undefined && floorArea === undefined) ||
    (room.perimeter !== undefined && perimeter === undefined) ||
    room.openings.length > limits.openings
  ) {
    return undefined;
  }
  const openings: RoomOpening[] = [];
  for (const opening of room.openings) {
    const count = positive(opening.count, 1000);
    const width = positive(opening.width, limits.openingSide);
    const height = positive(opening.height, limits.openingSide);
    if (count === undefined || width === undefined || height === undefined) {
      return undefined;
    }
    openings.push({
      kind: opening.kind,
      label: cleanLabel(opening.label, 60),
      count: round(count, 3),
      width: round(width, 3),
      height: round(height, 3),
    });
  }
  return {
    name,
    level: cleanLabel(room.level, 60),
    length: sides[0] === undefined ? undefined : round(sides[0], 3),
    width: sides[1] === undefined ? undefined : round(sides[1], 3),
    height: sides[2] === undefined ? undefined : round(sides[2], 3),
    floorArea: floorArea === undefined ? undefined : round(floorArea, 3),
    perimeter: perimeter === undefined ? undefined : round(perimeter, 3),
    openings,
    notes: cleanLabel(room.notes, 1000),
  };
}

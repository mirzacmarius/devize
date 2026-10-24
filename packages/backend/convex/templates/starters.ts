// Devize's own library of Șabloane: the usual jobs of a private client,
// written with the Norme de bază by their codes. A starter asks for a few
// measurements and works out each quantity from them, so a bathroom of
// 2,5 × 1,8 m starts with its tiles, its waterproofing and its silicone
// already measured. The firm checks and changes them like any Deviz.
// See docs/adr/0040.

export type StarterKey =
  | "bathroom"
  | "kitchen"
  | "apartment"
  | "facade"
  | "roof";

export type StarterUnit = "m" | "mp" | "mc" | "buc" | "%" | "lună";

/** A measurement the starter asks for. */
export type StarterInput = {
  key: string;
  unit: StarterUnit;
  default: number;
  min: number;
  max: number;
};

export type StarterValues = Record<string, number>;

type StarterLine = {
  section: string;
  // A Normă de bază's code.
  code: string;
  quantity: (values: StarterValues) => number;
};

export type Starter = {
  key: StarterKey;
  inputs: readonly StarterInput[];
  lines: readonly StarterLine[];
};

// A door's opening, 0,8 × 2 m, left out of the walls it is in.
const DOOR = 1.6;

const floorOf = (values: StarterValues) =>
  (values.length ?? 0) * (values.width ?? 0);
const perimeterOf = (values: StarterValues) =>
  2 * ((values.length ?? 0) + (values.width ?? 0));

/** The tiled walls of a bathroom: its perimeter to the tiles' height. */
const bathroomWalls = (values: StarterValues) =>
  perimeterOf(values) * (values.tileHeight ?? 0) - DOOR;

/** A kitchen's walls to the ceiling, without its door and window. */
const kitchenWalls = (values: StarterValues) =>
  perimeterOf(values) * (values.height ?? 0) - DOOR - 1.5;

const backsplashOf = (values: StarterValues) => (values.backsplash ?? 0) * 0.6;

/** A façade without its windows and doors. */
const facadeOf = (values: StarterValues) =>
  (values.perimeter ?? 0) * (values.facadeHeight ?? 0) - (values.openings ?? 0);

/** The scaffolding along the façade, a metre above its top. */
const scaffoldOf = (values: StarterValues) =>
  (values.perimeter ?? 0) * ((values.facadeHeight ?? 0) + 1);

const fixed = (quantity: number) => () => quantity;

export const starters: readonly Starter[] = [
  {
    key: "bathroom",
    inputs: [
      { key: "length", unit: "m", default: 2.5, min: 0.8, max: 10 },
      { key: "width", unit: "m", default: 1.8, min: 0.8, max: 10 },
      { key: "tileHeight", unit: "m", default: 2.4, min: 0.5, max: 4 },
    ],
    lines: [
      {
        section: "Demolări",
        code: "DV-DEM-02",
        quantity: (v) => bathroomWalls(v) + floorOf(v),
      },
      { section: "Demolări", code: "DV-DEM-08", quantity: fixed(1) },
      { section: "Instalații", code: "DV-ELE-03", quantity: fixed(10) },
      { section: "Instalații", code: "DV-SAN-01", quantity: fixed(12) },
      { section: "Instalații", code: "DV-SAN-03", quantity: fixed(4) },
      { section: "Instalații", code: "DV-SAN-04", quantity: fixed(2) },
      { section: "Instalații", code: "DV-ELE-04", quantity: fixed(3) },
      { section: "Instalații", code: "DV-ELE-05", quantity: fixed(1) },
      { section: "Finisaje", code: "DV-PRD-02", quantity: floorOf },
      {
        // The floor, 20 cm up the walls and the shower's corner.
        section: "Finisaje",
        code: "DV-HDR-03",
        quantity: (v) => floorOf(v) + perimeterOf(v) * 0.2 + 3,
      },
      { section: "Finisaje", code: "DV-PRD-03", quantity: floorOf },
      { section: "Finisaje", code: "DV-PLC-01", quantity: bathroomWalls },
      {
        section: "Finisaje",
        code: "DV-PLC-02",
        quantity: (v) => perimeterOf(v) + 4,
      },
      { section: "Finisaje", code: "DV-ZUG-02", quantity: floorOf },
      { section: "Obiecte sanitare", code: "DV-SAN-05", quantity: fixed(1) },
      { section: "Obiecte sanitare", code: "DV-SAN-06", quantity: fixed(1) },
    ],
  },
  {
    key: "kitchen",
    inputs: [
      { key: "length", unit: "m", default: 3.5, min: 1.5, max: 15 },
      { key: "width", unit: "m", default: 3, min: 1.5, max: 15 },
      { key: "height", unit: "m", default: 2.6, min: 2, max: 5 },
      { key: "backsplash", unit: "m", default: 3, min: 0, max: 20 },
    ],
    lines: [
      { section: "Demolări", code: "DV-DEM-02", quantity: floorOf },
      { section: "Demolări", code: "DV-DEM-08", quantity: fixed(1) },
      { section: "Instalații", code: "DV-ELE-03", quantity: fixed(12) },
      { section: "Instalații", code: "DV-ELE-01", quantity: fixed(15) },
      { section: "Instalații", code: "DV-ELE-02", quantity: fixed(8) },
      { section: "Instalații", code: "DV-ELE-04", quantity: fixed(8) },
      { section: "Instalații", code: "DV-ELE-05", quantity: fixed(2) },
      { section: "Instalații", code: "DV-SAN-01", quantity: fixed(8) },
      { section: "Instalații", code: "DV-SAN-03", quantity: fixed(4) },
      { section: "Pardoseli", code: "DV-PRD-02", quantity: floorOf },
      { section: "Pardoseli", code: "DV-PRD-03", quantity: floorOf },
      {
        section: "Pardoseli",
        code: "DV-PRD-04",
        quantity: (v) => perimeterOf(v) - 0.9,
      },
      { section: "Pereți și tavan", code: "DV-PLC-01", quantity: backsplashOf },
      {
        section: "Pereți și tavan",
        code: "DV-TEN-04",
        quantity: (v) => kitchenWalls(v) + floorOf(v),
      },
      {
        section: "Pereți și tavan",
        code: "DV-ZUG-01",
        quantity: (v) => kitchenWalls(v) - backsplashOf(v),
      },
      { section: "Pereți și tavan", code: "DV-ZUG-02", quantity: floorOf },
    ],
  },
  {
    key: "apartment",
    inputs: [
      { key: "area", unit: "mp", default: 55, min: 10, max: 500 },
      { key: "height", unit: "m", default: 2.6, min: 2, max: 5 },
      { key: "gletShare", unit: "%", default: 30, min: 0, max: 100 },
    ],
    lines: [
      {
        // Walls are about the floor area times the height, once doors and
        // windows are left out: the Antemăsurătoare measures them exactly.
        section: "Pregătirea suprafețelor",
        code: "DV-TEN-04",
        quantity: (v) =>
          ((v.area ?? 0) * (v.height ?? 0) + (v.area ?? 0)) *
          ((v.gletShare ?? 0) / 100),
      },
      {
        section: "Zugrăveli",
        code: "DV-ZUG-01",
        quantity: (v) => (v.area ?? 0) * (v.height ?? 0),
      },
      { section: "Zugrăveli", code: "DV-ZUG-02", quantity: (v) => v.area ?? 0 },
    ],
  },
  {
    key: "facade",
    inputs: [
      { key: "perimeter", unit: "m", default: 40, min: 5, max: 500 },
      { key: "facadeHeight", unit: "m", default: 6, min: 2, max: 30 },
      { key: "openings", unit: "mp", default: 18, min: 0, max: 1000 },
      { key: "sills", unit: "m", default: 14, min: 0, max: 500 },
      { key: "months", unit: "lună", default: 1, min: 1, max: 12 },
    ],
    lines: [
      { section: "Schelă", code: "DV-SCH-01", quantity: scaffoldOf },
      {
        section: "Schelă",
        code: "DV-SCH-02",
        quantity: (v) => scaffoldOf(v) * (v.months ?? 1),
      },
      { section: "Termosistem", code: "DV-TRM-01", quantity: facadeOf },
      {
        section: "Termosistem",
        code: "DV-TAM-03",
        quantity: (v) => v.sills ?? 0,
      },
    ],
  },
  {
    key: "roof",
    inputs: [
      { key: "roofArea", unit: "mp", default: 120, min: 10, max: 2000 },
      { key: "timber", unit: "mc", default: 4, min: 0, max: 100 },
      { key: "gutters", unit: "m", default: 30, min: 0, max: 500 },
      { key: "downpipes", unit: "m", default: 20, min: 0, max: 500 },
      { key: "insulation", unit: "mp", default: 0, min: 0, max: 2000 },
    ],
    lines: [
      {
        section: "Șarpantă",
        code: "DV-ACO-01",
        quantity: (v) => v.timber ?? 0,
      },
      {
        // About 40 mp of faces to treat in each cubic metre of timber.
        section: "Șarpantă",
        code: "DV-ACO-02",
        quantity: (v) => (v.timber ?? 0) * 40,
      },
      {
        section: "Învelitoare",
        code: "DV-ACO-03",
        quantity: (v) => v.roofArea ?? 0,
      },
      {
        section: "Învelitoare",
        code: "DV-ACO-05",
        quantity: (v) => v.gutters ?? 0,
      },
      {
        section: "Învelitoare",
        code: "DV-ACO-06",
        quantity: (v) => v.downpipes ?? 0,
      },
      {
        section: "Termoizolație",
        code: "DV-TRM-03",
        quantity: (v) => v.insulation ?? 0,
      },
    ],
  },
];

export function starterOf(key: string): Starter | undefined {
  return starters.find((starter) => starter.key === key);
}

/**
 * The measurements as the starter takes them: each within its bounds, the
 * default for one left out. Returns undefined for a value out of bounds.
 */
export function starterValues(
  starter: Starter,
  given: StarterValues,
): StarterValues | undefined {
  const values: StarterValues = {};
  for (const input of starter.inputs) {
    const value = given[input.key] ?? input.default;
    if (!Number.isFinite(value) || value < input.min || value > input.max) {
      return undefined;
    }
    values[input.key] = value;
  }
  return values;
}

/** The starter's works for these measurements; a work of nothing is left out. */
export function starterLines(starter: Starter, values: StarterValues) {
  return starter.lines.flatMap((line) => {
    const quantity = Math.round(Math.max(0, line.quantity(values)) * 100) / 100;
    return quantity > 0
      ? [{ section: line.section, code: line.code, quantity }]
      : [];
  });
}

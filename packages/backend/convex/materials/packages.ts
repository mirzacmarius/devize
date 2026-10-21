import type { Infer } from "convex/values";
import { normalizeText, normalizeUnit } from "../lib/text";
import type { packageKind } from "./validators";

// What materials are sold in. When neither the firm, nor the store product it
// chose, nor the producer says, Devize assumes the package the material is
// usually sold in, from this list of its own: a 25 kg bag of tile adhesive,
// a 15 l bucket of paint. They are typical sizes, shown as such, for the
// person to correct (docs/adr/0027).

export type PackageKind = Infer<typeof packageKind>;

/** A package kind and the sizes it comes in, in the material's unit. */
export type Package = { kind: PackageKind; sizes: number[] };

type Typical = {
  // Words of the material's name, normalized.
  match: RegExp;
  // The unit the material is counted in.
  unit: string;
  kind: PackageKind;
  // Sizes in the material's unit, largest first.
  sizes?: number[];
  // Or, for boards counted in mp but packed by volume, the cubic metres in
  // one pack: 0,5 mc of 10 cm EPS is 5 mp.
  volume?: number;
};

// The first entry that matches wins, so the specific ones come first.
const typicalPackages: Typical[] = [
  // Tiles and floors.
  { match: /\bgresie\b/, unit: "mp", kind: "box", sizes: [1.44] },
  { match: /\bfaianta\b/, unit: "mp", kind: "box", sizes: [1.5] },
  {
    match: /\b(parchet|laminat)\b/,
    unit: "mp",
    kind: "pack",
    sizes: [2.22],
  },
  { match: /\b(spc|vinil[a-z]*)\b/, unit: "mp", kind: "pack", sizes: [2.2] },
  { match: /\bfolie de spuma\b/, unit: "mp", kind: "roll", sizes: [10] },
  { match: /\bplinta din gresie\b/, unit: "m", kind: "piece", sizes: [0.6] },
  { match: /\bplinta\b/, unit: "m", kind: "bar", sizes: [2.5] },
  { match: /\bsistem de nivelare\b/, unit: "buc", kind: "pack", sizes: [100] },
  { match: /\bchit\b/, unit: "kg", kind: "bag", sizes: [5, 2] },
  // Adhesives, plasters and screeds.
  {
    match: /\badeziv\b.*\bgips carton\b/,
    unit: "kg",
    kind: "bag",
    sizes: [30],
  },
  { match: /\badeziv\b/, unit: "kg", kind: "bag", sizes: [25] },
  {
    match: /\btencuiala\b.*\bdecorativ/,
    unit: "kg",
    kind: "bucket",
    sizes: [25],
  },
  { match: /\btencuiala\b.*\bipsos\b/, unit: "kg", kind: "bag", sizes: [30] },
  { match: /\btencuiala\b/, unit: "kg", kind: "bag", sizes: [40] },
  {
    match: /\b(sprit|amorsa de aderenta)\b/,
    unit: "kg",
    kind: "bag",
    sizes: [25],
  },
  { match: /\bglet\b/, unit: "kg", kind: "bag", sizes: [20, 5] },
  { match: /\bipsos\b/, unit: "kg", kind: "bag", sizes: [20, 5] },
  { match: /\bmasa de spaclu\b/, unit: "kg", kind: "bag", sizes: [25, 5] },
  { match: /\bsapa\b/, unit: "kg", kind: "bag", sizes: [25] },
  { match: /\bmortar hidroizolant\b/, unit: "kg", kind: "set", sizes: [32, 8] },
  { match: /\bfibre\b/, unit: "kg", kind: "bag", sizes: [0.6] },
  // Primers, paints and coatings.
  {
    match: /\bamorsa\b.*\bdecorativ/,
    unit: "kg",
    kind: "bucket",
    sizes: [25, 5],
  },
  {
    match: /\b(amorsa|emulsie) bituminoasa\b/,
    unit: "kg",
    kind: "bucket",
    sizes: [20, 5],
  },
  { match: /\bamorsa\b/, unit: "kg", kind: "can", sizes: [10, 5] },
  { match: /\b(amorsa|grund)\b/, unit: "l", kind: "can", sizes: [10, 5, 1] },
  { match: /\b(grund|email)\b/, unit: "kg", kind: "can", sizes: [2.5, 0.75] },
  {
    match: /\bvopsea\b.*\bfatad/,
    unit: "l",
    kind: "bucket",
    sizes: [15, 5],
  },
  {
    match: /\bvopsea\b/,
    unit: "l",
    kind: "bucket",
    sizes: [15, 8.5, 4, 2.5],
  },
  { match: /\blazura\b/, unit: "l", kind: "can", sizes: [2.5, 0.75] },
  { match: /\bdiluant\b/, unit: "l", kind: "can", sizes: [5, 1] },
  { match: /\bulei de decofrare\b/, unit: "l", kind: "can", sizes: [20, 5] },
  { match: /\bsolutie\b/, unit: "kg", kind: "can", sizes: [20, 5] },
  { match: /\bsilicon\b/, unit: "buc", kind: "cartridge", sizes: [1] },
  // Boards, insulation and membranes.
  {
    match: /\bplac[ai] de gips carton\b/,
    unit: "mp",
    kind: "sheet",
    sizes: [3.12],
  },
  { match: /\bplacaj\b/, unit: "mp", kind: "sheet", sizes: [3.125] },
  {
    match: /\b(polistiren expandat|eps)\b/,
    unit: "mp",
    kind: "pack",
    volume: 0.5,
  },
  {
    match: /\b(polistiren extrudat|xps)\b/,
    unit: "mp",
    kind: "pack",
    volume: 0.3,
  },
  {
    match: /\bvata (minerala )?de sticla\b/,
    unit: "mp",
    kind: "roll",
    volume: 0.9,
  },
  {
    match: /\bplasa\b.*\bfibra de sticla\b/,
    unit: "mp",
    kind: "roll",
    sizes: [50],
  },
  {
    match: /\b(bariera de vapori|folie anticondens)\b/,
    unit: "mp",
    kind: "roll",
    sizes: [75],
  },
  { match: /\bfolie de polietilena\b/, unit: "mp", kind: "roll", sizes: [50] },
  {
    match: /\bmembrana bituminoasa\b.*\bardezie\b/,
    unit: "mp",
    kind: "roll",
    sizes: [8],
  },
  { match: /\bmembrana bituminoasa\b/, unit: "mp", kind: "roll", sizes: [10] },
  { match: /\bmembrana cu crampoane\b/, unit: "mp", kind: "roll", sizes: [20] },
  // Profiles, tapes and pipes.
  { match: /\bprofil (cw|uw|cd|ud)\b/, unit: "m", kind: "bar", sizes: [3] },
  { match: /\bprofile de ghidaj\b/, unit: "m", kind: "bar", sizes: [3] },
  { match: /\bprofil de inchidere\b/, unit: "m", kind: "bar", sizes: [2] },
  { match: /\bprofil\b.*\bcolt\b/, unit: "m", kind: "bar", sizes: [2.5] },
  { match: /\bbanda de hartie\b/, unit: "m", kind: "roll", sizes: [75, 23] },
  {
    match: /\bbanda de etansare pentru colturi\b/,
    unit: "m",
    kind: "roll",
    sizes: [50, 10],
  },
  {
    match: /\bbanda de etansare pentru profile\b/,
    unit: "m",
    kind: "roll",
    sizes: [30],
  },
  { match: /\bbanda perimetrala\b/, unit: "m", kind: "roll", sizes: [25] },
  { match: /\bbanda adeziva\b/, unit: "m", kind: "roll", sizes: [25] },
  { match: /\btub flexibil\b/, unit: "m", kind: "roll", sizes: [50, 25] },
  { match: /\bteava ppr\b/, unit: "m", kind: "bar", sizes: [4] },
  {
    match: /\bteava de canalizare\b/,
    unit: "m",
    kind: "bar",
    sizes: [3, 2, 1, 0.5],
  },
  { match: /\bjgheab\b/, unit: "m", kind: "bar", sizes: [4] },
  { match: /\bburlan\b/, unit: "m", kind: "bar", sizes: [3, 1] },
  // Small parts.
  {
    match: /\bsurub\b.*\bgips carton\b/,
    unit: "buc",
    kind: "box",
    sizes: [1000, 200],
  },
  { match: /\bsurub\b/, unit: "buc", kind: "box", sizes: [250, 100] },
  { match: /\bdiblu\b/, unit: "buc", kind: "box", sizes: [100] },
  { match: /\bcuie\b/, unit: "kg", kind: "box", sizes: [5, 1] },
];

// Units counted in whole things: without a package, one is bought of each.
const countedUnits = new Set(["buc", "set", "pereche", "sac", "rola"]);

/** Whether a material counted in this unit is bought in whole units. */
export function isCountedUnit(unit: string): boolean {
  return countedUnits.has(normalizeUnit(unit));
}

/** A board's thickness in metres, from its name: "10 cm", "100 mm". */
export function thicknessOf(name: string): number | null {
  const text = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const match = /(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/.exec(text);
  if (!match?.[1]) {
    return null;
  }
  const value = Number(match[1].replace(",", "."));
  const metres = match[2] === "mm" ? value / 1000 : value / 100;
  return metres > 0.005 && metres < 1 ? metres : null;
}

/** Sizes as stored: positive, without repeats, largest first, at most four. */
export function cleanSizes(sizes: readonly number[]): number[] {
  return [
    ...new Set(
      sizes
        .filter((size) => Number.isFinite(size) && size > 0)
        .map((size) => Math.round(size * 10_000) / 10_000),
    ),
  ]
    .sort((a, b) => b - a)
    .slice(0, 4);
}

/**
 * The package a material is usually sold in, from its name and unit, or null
 * when Devize doesn't know one: bulk materials such as concrete are bought
 * by quantity.
 */
export function typicalPackage(name: string, unit: string): Package | null {
  const text = normalizeText(name);
  const target = normalizeUnit(unit);
  for (const entry of typicalPackages) {
    if (entry.unit !== target || !entry.match.test(text)) {
      continue;
    }
    if (entry.sizes) {
      return { kind: entry.kind, sizes: cleanSizes(entry.sizes) };
    }
    const thickness = thicknessOf(name);
    if (entry.volume && thickness) {
      const area = Math.round((entry.volume / thickness) * 100) / 100;
      return { kind: entry.kind, sizes: [area] };
    }
  }
  return null;
}

// The words stores and producers use for a package, normalized. Boards and
// bars are left to the material's own kind: "placă" and "profil" name the
// product itself.
const kindWords: [PackageKind, RegExp][] = [
  ["bag", /\b(sac|saci|punga)\b/],
  ["bucket", /\b(galeata|galeti)\b/],
  ["can", /\b(bidon|bidoane|canistra|flacon)\b/],
  ["cartridge", /\b(cartus|cartuse)\b/],
  ["roll", /\b(rola|role|colac)\b/],
  ["box", /\b(cutie|cutii|bax)\b/],
  ["pack", /\b(pachet|pachete|blister)\b/],
];

/**
 * The kind of package a store product's title or a producer's package label
 * names, else the kind Devize assumes for the material, else a piece.
 */
export function kindFromLabel(
  label: string | undefined,
  fallback: PackageKind | undefined,
): PackageKind {
  if (label) {
    const text = normalizeText(label);
    for (const [kind, words] of kindWords) {
      if (words.test(text)) {
        return kind;
      }
    }
  }
  return fallback ?? "piece";
}

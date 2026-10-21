import type { WorkContext } from "./contexts";

// Devize's own systems, made of Norme de bază: the works that complete one,
// such as the skirting of a tiled floor or the waterproofing under the tiles
// of a bathroom. The Producători's systems sit next to them in the
// database; these need nobody's documents, so a Deviz built on the base
// catalog gets them too (docs/adr/0028).

export type BaseSystemPart = {
  // The Normă de bază to add.
  code: string;
  // An Articol that already does this part, by the words of its title.
  present: RegExp;
  // Only for works in one of these contexts, or never in one of those.
  when?: readonly WorkContext[];
  unless?: readonly WorkContext[];
};

export type BaseSystem = {
  id: string;
  name: string;
  // The norms that start the system.
  core: readonly string[];
  parts: readonly BaseSystemPart[];
};

const skirting = /\bplint[a-z]*\b/;
const waterproofing = /\bhidroizola[a-z]*\b/;
const skim = /\b(glet[a-z]*|gletui[a-z]*)\b/;
const wallPaint = /\b(zugrav[a-z]*|vopsi[a-z]*|lavabil[a-z]*)\b/;
const ceilingPaint =
  /\b(zugrav[a-z]*|vopsi[a-z]*)\b.*\b(tavan[a-z]*|plafo[a-z]*)\b/;
const scaffold = /\b(montar[a-z]*|demontar[a-z]*)\b.*\bschel[a-z]*\b/;
const scaffoldRent = /\bchiri[a-z]*\b.*\bschel[a-z]*\b/;
const outsideSill = /\bglaf[a-z]*\b/;

export const baseSystems: readonly BaseSystem[] = [
  {
    id: "tile_floor",
    name: "Pardoseală din gresie",
    core: ["DV-PRD-03"],
    parts: [
      // A bathroom's walls are tiled down to the floor.
      { code: "DV-PRD-04", present: skirting, unless: ["wet"] },
      { code: "DV-HDR-03", present: waterproofing, when: ["wet", "outdoor"] },
    ],
  },
  {
    id: "tile_wall_wet",
    name: "Placaj din faianță în baie",
    core: ["DV-PLC-01"],
    parts: [
      { code: "DV-HDR-03", present: waterproofing, when: ["wet"] },
      { code: "DV-PLC-02", present: /\bsilicon[a-z]*\b/, when: ["wet"] },
    ],
  },
  {
    id: "floating_floor",
    name: "Pardoseală flotantă",
    core: ["DV-PRD-05", "DV-PRD-06"],
    parts: [{ code: "DV-PRD-07", present: skirting }],
  },
  {
    id: "drywall",
    name: "Pereți din gips-carton, finisați",
    core: ["DV-GIP-01", "DV-GIP-02", "DV-GIP-04"],
    parts: [
      // A bathroom's boards are tiled.
      { code: "DV-TEN-04", present: skim, unless: ["wet"] },
      { code: "DV-ZUG-01", present: wallPaint, unless: ["wet"] },
    ],
  },
  {
    id: "drywall_ceiling",
    name: "Plafon din gips-carton, finisat",
    core: ["DV-GIP-03"],
    parts: [
      { code: "DV-TEN-04", present: skim },
      { code: "DV-ZUG-02", present: ceilingPaint },
    ],
  },
  {
    id: "lime_plaster",
    name: "Tencuială pe bază de ciment și var, finisată",
    core: ["DV-TEN-02"],
    parts: [
      { code: "DV-TEN-04", present: skim, unless: ["wet"] },
      { code: "DV-ZUG-01", present: wallPaint, unless: ["wet"] },
    ],
  },
  {
    id: "gypsum_plaster",
    name: "Tencuială pe bază de ipsos, finisată",
    core: ["DV-TEN-01"],
    parts: [{ code: "DV-ZUG-01", present: wallPaint, unless: ["wet"] }],
  },
  {
    id: "skim_coat",
    name: "Glet zugrăvit",
    core: ["DV-TEN-04"],
    parts: [{ code: "DV-ZUG-01", present: wallPaint }],
  },
  {
    id: "etics",
    name: "Termosistem",
    core: ["DV-TRM-01"],
    parts: [
      { code: "DV-SCH-01", present: scaffold },
      { code: "DV-SCH-02", present: scaffoldRent },
      { code: "DV-TAM-03", present: outsideSill },
    ],
  },
  {
    id: "exterior_plaster",
    name: "Tencuială exterioară, finisată",
    core: ["DV-TEN-03"],
    parts: [
      {
        code: "DV-ZUG-03",
        present:
          /\b(vopsi[a-z]*|zugrav[a-z]*|tencuial[a-z]* decorativ[a-z]*)\b/,
      },
      { code: "DV-SCH-01", present: scaffold },
      { code: "DV-SCH-02", present: scaffoldRent },
    ],
  },
  {
    id: "window",
    name: "Fereastră, cu pervaz și glaf",
    core: ["DV-TAM-01"],
    parts: [
      { code: "DV-TAM-02", present: /\bpervaz[a-z]*\b/ },
      { code: "DV-TAM-03", present: outsideSill },
    ],
  },
  {
    id: "roof",
    name: "Învelitoare, cu jgheaburi și burlane",
    core: ["DV-ACO-03", "DV-ACO-04"],
    parts: [
      { code: "DV-ACO-05", present: /\bjgheab[a-z]*\b/ },
      { code: "DV-ACO-06", present: /\bburlan[a-z]*\b/ },
    ],
  },
  {
    id: "roof_timber",
    name: "Șarpantă din lemn, protejată",
    core: ["DV-ACO-01"],
    parts: [
      {
        code: "DV-ACO-02",
        present: /\b(ignifug[a-z]*|insecto[a-z]*|tratar[a-z]*)\b/,
      },
    ],
  },
  {
    id: "foundation_waterproofing",
    name: "Hidroizolația fundațiilor, protejată",
    core: ["DV-HDR-04"],
    parts: [{ code: "DV-HDR-05", present: /\bcrampoan[a-z]*\b/ }],
  },
];

/** Every Normă de bază the systems name, to look them up at once. */
export const baseSystemCodes: readonly string[] = [
  ...new Set(
    baseSystems.flatMap((system) => [
      ...system.core,
      ...system.parts.map((part) => part.code),
    ]),
  ),
];

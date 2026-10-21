import type { Infer } from "convex/values";
import { isHourUnit, normalizeText, normalizeUnit } from "../lib/text";
import type { layoutMethod, lineItemLayout } from "./validators";

// Mod de montaj: a norm's covering (the tiles, the boards, the planks) comes
// with the losses of laying it the usual way, such as 1,06 mp of gresie for
// each mp. Laid diagonally or in a herringbone, more of it goes to cuts and
// the work takes longer. These functions find an Articol's covering, and
// give its consumptions for a method. No database here (docs/adr/0027).

export type LayoutMethod = Infer<typeof layoutMethod>;
export type Layout = Infer<typeof lineItemLayout>;

/** Ceramic or stone tiles, floor planks, or boards cut to fit. */
export type LayoutFamily = "tiles" | "planks" | "boards";

// Words of a covering's name, by family, in the order families are tried.
const families: [LayoutFamily, RegExp][] = [
  [
    "tiles",
    /\b(gresie|faianta|ceramic[a-z]*|mozaic|piatra|travertin|marmura|granit|clinker|teracota|pavele)\b/,
  ],
  ["planks", /\b(parchet|laminat|spc|vinil[a-z]*|lvt|dusumea|deck)\b/],
  [
    "boards",
    /\b(gips carton|gipscarton|osb|placaj|fibrociment|polistiren|eps|xps|vata)\b/,
  ],
];

export type LayoutPreset = {
  method: LayoutMethod;
  // The covering's losses, in percent; for "straight", the norm's own.
  waste: number;
  // Extra labour, in percent of the norm's hours.
  labor: number;
};

// What each method usually costs: the losses of the cuts and the extra time.
// They are starting points the person can change before applying them.
export const layoutPresets: Record<LayoutFamily, LayoutPreset[]> = {
  tiles: [
    { method: "straight", waste: 0, labor: 0 },
    { method: "offset", waste: 10, labor: 10 },
    { method: "diagonal", waste: 15, labor: 25 },
    { method: "herringbone", waste: 20, labor: 50 },
  ],
  planks: [
    { method: "straight", waste: 0, labor: 0 },
    { method: "diagonal", waste: 15, labor: 25 },
    { method: "herringbone", waste: 20, labor: 60 },
  ],
  boards: [
    { method: "straight", waste: 0, labor: 0 },
    { method: "complex", waste: 12, labor: 15 },
  ],
};

// What a method can be called in an Articol's title or notes.
const methodWords: [LayoutMethod, RegExp][] = [
  ["herringbone", /\b(in spic|spic|herringbone|chevron|os de peste)\b/],
  ["diagonal", /\b(diagonal[a-z]*|la 45 de grade|45 grade)\b/],
  ["offset", /\b(decalat[a-z]*|decalaj|in tesatura)\b/],
  [
    "complex",
    /\b(mansard[a-z]*|tavan inclinat|pereti inclinati|multe taieturi|multe goluri)\b/,
  ],
];

// Losses are percentages from 0 to 50, extra labour from 0 to 200.
export const MAX_WASTE = 50;
export const MAX_LABOR = 200;

type Resource = {
  key: string;
  kind: string;
  name: string;
  unit: string;
  quantity: number;
};

/** A covering of an Articol: how many layers it lays and their losses. */
export type Covering = {
  key: string;
  name: string;
  // Two for a partition with boards on both faces.
  layers: number;
  // The losses one unit of the norm includes, as a fraction: 0,06.
  loss: number;
};

/** Consumptions rounded the way norms write them: four decimals. */
function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function familyOf(name: string): LayoutFamily | null {
  const text = normalizeText(name);
  for (const [family, words] of families) {
    if (words.test(text)) {
      return family;
    }
  }
  return null;
}

/**
 * An Articol's resources as they were before its Mod de montaj changed
 * them: the method's `base` puts the earlier consumptions back.
 */
export function baseResources<T extends Resource>(
  resources: readonly T[],
  layout: Layout | undefined,
): T[] {
  if (!layout || layout.base.length === 0) {
    return [...resources];
  }
  const base = new Map(layout.base.map((row) => [row.key, row.quantity]));
  return resources.map((resource) => {
    const quantity = base.get(resource.key);
    return quantity === undefined ? resource : { ...resource, quantity };
  });
}

/**
 * The coverings of an Articol counted in mp: materials measured like the work
 * itself, whose consumption is a whole number of layers plus the losses of
 * the cuts (1,06 mp of gresie per mp; 2,1 mp of boards for a partition with
 * two faces). Null when the work has none, such as a paint job.
 */
export function coveringsOf(item: {
  unit: string;
  resources: readonly Resource[];
}): { family: LayoutFamily; coverings: Covering[] } | null {
  if (normalizeUnit(item.unit) !== "mp") {
    return null;
  }
  const found: (Covering & { family: LayoutFamily })[] = [];
  for (const resource of item.resources) {
    if (
      resource.kind !== "material" ||
      normalizeUnit(resource.unit) !== "mp" ||
      !(resource.quantity >= 0.95)
    ) {
      continue;
    }
    const family = familyOf(resource.name);
    if (!family) {
      continue;
    }
    const layers = Math.max(1, Math.round(resource.quantity));
    const loss = resource.quantity / layers - 1;
    if (loss < -0.05 || loss >= MAX_WASTE / 100) {
      continue;
    }
    found.push({
      key: resource.key,
      name: resource.name,
      layers,
      loss: round4(Math.max(0, loss)),
      family,
    });
  }
  const first = families.find(([family]) =>
    found.some((covering) => covering.family === family),
  );
  if (!first) {
    return null;
  }
  return {
    family: first[0],
    coverings: found
      .filter((covering) => covering.family === first[0])
      .map(({ family, ...covering }) => covering),
  };
}

/** The norm's own losses, in percent: the largest of its coverings'. */
export function normWaste(coverings: readonly Covering[]): number {
  return round4(Math.max(0, ...coverings.map((c) => c.loss)) * 100);
}

/** The method an Articol's own words ask for, if its family has it. */
export function hintedMethod(
  text: string,
  family: LayoutFamily,
): LayoutMethod | null {
  const normalized = normalizeText(text);
  const methods = new Set(layoutPresets[family].map((p) => p.method));
  for (const [method, words] of methodWords) {
    if (methods.has(method) && words.test(normalized)) {
      return method;
    }
  }
  return null;
}

/** Whether a method is one of the family's. */
export function isMethodOf(
  method: LayoutMethod,
  family: LayoutFamily,
): boolean {
  return layoutPresets[family].some((preset) => preset.method === method);
}

/**
 * What a method starts from: its usual losses, but never less than the
 * norm already has, and its usual extra labour.
 */
export function presetFor(
  method: LayoutMethod,
  family: LayoutFamily,
  coverings: readonly Covering[],
): LayoutPreset {
  const preset = layoutPresets[family].find((p) => p.method === method);
  const own = normWaste(coverings);
  if (!preset || method === "straight") {
    return { method, waste: own, labor: 0 };
  }
  return { method, waste: Math.max(preset.waste, own), labor: preset.labor };
}

/**
 * An Articol's resources laid by a method: each covering consumes its layers
 * plus the method's losses, and the labour counted in hours grows by the
 * method's extra labour, both from the consumptions before any method. The
 * norm's own way, "straight", gives those back. Also returns the `base` to
 * keep with the method: the earlier consumptions of what it changed.
 */
export function layResources<T extends Resource>(
  base: readonly T[],
  coverings: readonly Covering[],
  layout: { method: LayoutMethod; waste: number; labor: number },
): { resources: T[]; base: Layout["base"] } {
  if (layout.method === "straight") {
    return { resources: [...base], base: [] };
  }
  const covered = new Map(coverings.map((c) => [c.key, c]));
  const changed: Layout["base"] = [];
  const resources = base.map((resource) => {
    const covering = covered.get(resource.key);
    if (covering) {
      changed.push({ key: resource.key, quantity: resource.quantity });
      return {
        ...resource,
        quantity: round4(covering.layers * (1 + layout.waste / 100)),
      };
    }
    if (
      layout.labor > 0 &&
      resource.kind === "labor" &&
      isHourUnit(resource.unit)
    ) {
      changed.push({ key: resource.key, quantity: resource.quantity });
      return {
        ...resource,
        quantity: round4(resource.quantity * (1 + layout.labor / 100)),
      };
    }
    return resource;
  });
  return { resources, base: changed };
}

/** The consumptions an Articol's method set, in the order of its resources. */
function expectedResources<T extends Resource>(
  resources: readonly T[],
  layout: Layout,
  unit: string,
): { base: T[]; expected: T[] } | null {
  const base = baseResources(resources, layout);
  const found = coveringsOf({ unit, resources: base });
  if (!found) {
    return null;
  }
  return {
    base,
    expected: layResources(base, found.coverings, layout).resources,
  };
}

function same(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6;
}

/**
 * Whether an Articol's consumptions are still the ones its method set. A
 * consumption changed by hand, or a newer version of the norm, makes the
 * method stale: it shows as no longer applied, to apply again.
 */
export function isStale(
  resources: readonly Resource[],
  layout: Layout | undefined,
  item: { unit: string },
): boolean {
  if (!layout || layout.method === "straight") {
    return false;
  }
  const found = expectedResources(resources, layout, item.unit);
  return (
    !found ||
    found.expected.some(
      (resource, index) =>
        !same(resources[index]?.quantity ?? Number.NaN, resource.quantity),
    )
  );
}

/**
 * What applying a method again starts from: the consumptions from before the
 * current method where it still holds them, and the ones now in the Articol
 * where someone, or a newer norm, changed them since.
 */
export function startingResources<T extends Resource>(
  resources: readonly T[],
  layout: Layout | undefined,
  item: { unit: string },
): T[] {
  if (!layout || layout.base.length === 0) {
    return [...resources];
  }
  const found = expectedResources(resources, layout, item.unit);
  if (!found) {
    return [...resources];
  }
  return resources.map((resource, index) => {
    const expected = found.expected[index];
    const base = found.base[index];
    return expected && base && same(expected.quantity, resource.quantity)
      ? base
      : resource;
  });
}

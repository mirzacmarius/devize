import { roundLei } from "@devize/backend/convex/estimates/recap";
import { normalizeText } from "@devize/backend/convex/lib/text";
import {
  type ExportOptions,
  type Subchapter,
  subchapters,
  type WorksData,
} from "./input";
import { buildTree, type Category, type WorkObject } from "./tree";

// Where each category of works falls in the Deviz general and its object's
// Deviz. Devize guesses it from the names of the category and its object,
// and the person can choose another in the export sheet: authorities place
// the same works differently, and the forms must match their documentation.

/** The subchapters' names, as the Deviz general and the objects' Devize print them. */
export const subchapterNames: Record<Subchapter, string> = {
  "1.2": "Amenajarea terenului",
  "1.3":
    "Amenajări pentru protecția mediului și aducerea terenului la starea inițială",
  "1.4": "Cheltuieli pentru relocarea/protecția utilităților",
  "2": "Cheltuieli pentru asigurarea utilităților necesare obiectivului de investiții",
  "4.1.1": "Terasamente, sistematizare pe verticală și amenajări exterioare",
  "4.1.2": "Rezistență",
  "4.1.3": "Arhitectură",
  "4.1.4": "Instalații",
  "4.2": "Montaj utilaje, echipamente tehnologice și funcționale",
  "4.3": "Utilaje, echipamente tehnologice și funcționale care necesită montaj",
  "4.4":
    "Utilaje, echipamente tehnologice și funcționale care nu necesită montaj și echipamente de transport",
  "4.5": "Dotări",
  "4.6": "Active necorporale",
  "5.1.1":
    "Lucrări de construcții și instalații aferente organizării de șantier",
};

/** The base investment's subchapters, which the objects' Devize add up. */
export const baseInvestment: readonly Subchapter[] = [
  "4.1.1",
  "4.1.2",
  "4.1.3",
  "4.1.4",
  "4.2",
  "4.3",
  "4.4",
  "4.5",
  "4.6",
];

/** The equipment, furnishings and intangible assets that F4 lists. */
export const procurement: readonly Subchapter[] = ["4.3", "4.4", "4.5", "4.6"];

/** C+M, the construction and installation works: 1.2 + 1.3 + 1.4 + 2 + 4.1 + 4.2 + 5.1.1. */
export const constructionWorks: readonly Subchapter[] = [
  "1.2",
  "1.3",
  "1.4",
  "2",
  "4.1.1",
  "4.1.2",
  "4.1.3",
  "4.1.4",
  "4.2",
  "5.1.1",
];

const known = new Set<string>(subchapters);

export function isSubchapter(value: string): value is Subchapter {
  return known.has(value);
}

// Words that place works, tried in order, the first match winning, on names
// written without diacritics and in lower case. The works outside the base
// investment also place a whole object: everything in "Organizare de
// șantier" is site organisation, whatever its chapters are called.
const outside: [Subchapter, RegExp][] = [
  ["5.1.1", /\borganizar\w* (a )?(de )?santier|\bos\b/],
  [
    "1.2",
    /\bamenajarea terenului|\bdefrisar|\bcuratarea terenului|\bpregatirea terenului/,
  ],
  ["1.3", /\bprotectia mediului|\bstarea initiala|\becologizar/],
  ["1.4", /\brelocar|\bprotectia utilitatilor|\bdevier/],
  ["2", /\basigurarea utilitatilor|\butilitati\b|\bbransament|\bracordar/],
];

const rules: [Subchapter, RegExp][] = [
  ...outside,
  ["4.2", /\bmontaj\w* (al |a |de )?(utilaj|echipament)/],
  ["4.6", /\bactive necorporale|\blicent|\bsoftware/],
  ["4.5", /\bdotari\b|\bmobilier/],
  ["4.4", /\bfara montaj|\b(echipamente|mijloace) de transport/],
  ["4.3", /\butilaje\b|\bechipamente (tehnologice|functionale)/],
  ["4.1.4", /^instalat/],
  [
    "4.1.1",
    /\bterasament|\bsapatur|\bumplutur|\bsistematizar|\bamenajari exterioare|\bdrum|\balei\b|\bparcar|\btrotuar|\bimprejmuir|\bspatii verzi|\bgazon|\bplantar|\bpavaj|\brigol/,
  ],
  [
    "4.1.3",
    /\barhitectur|\bfinisaj|\btencuiel|\bzugrav|\bvopsitor|\bpardosel|\btamplari|\binvelitor|\bacoperis|\bhidroizol|\btermoizol|\bizolati|\banvelop|\breabilitare termica|\bfatad|\bplacaj|\bgresie|\bfaiant|\bglet|\bgips|\bcompartiment|\bdemolar|\bdesfacer/,
  ],
  [
    "4.1.4",
    /\binstalat|\belectric|\bsanitar|\btermic|\bincalzir|\bventilat|\bclimatiz|\bhvac\b|\bgaze?\b|\bcanalizar|\balimentar\w* cu apa|\bcurenti slabi|\biluminat|\bparatrasnet|\bfotovolt|\bautomatiz|\bdetecti|\bstingere/,
  ],
  [
    "4.1.2",
    /\brezistent|\bstructur|\bfundati|\bbeton|\barmat|\bcofraj|\bconsolidar|\bzidari|\bsarpant|\bplanse|\bmetalic/,
  ],
];

function match(
  list: readonly [Subchapter, RegExp][],
  name: string,
): Subchapter | undefined {
  const text = normalizeText(name);
  return list.find(([, pattern]) => pattern.test(text))?.[0];
}

/**
 * Where a category of works most likely falls: its own code when it is a
 * subchapter's, its object's when the object is wholly outside the base
 * investment, else the first subchapter its name or its object's suggests,
 * and Arhitectură, the commonest, when nothing does.
 */
export function guessSubchapter(
  object: WorkObject,
  category: Category,
): Subchapter {
  const code = category.code?.trim();
  if (code && isSubchapter(code)) {
    return code;
  }
  const named = !object.implicit;
  return (
    (named ? match(outside, object.name) : undefined) ??
    match(rules, category.name) ??
    (named ? match(rules, object.name) : undefined) ??
    "4.1.3"
  );
}

/** Where a category of works falls: where the person placed it, or our guess. */
export function subchapterOf(
  object: WorkObject,
  category: Category,
  options: Pick<ExportOptions, "subchapters">,
): Subchapter {
  const chosen = options.subchapters?.[category.key];
  return chosen && isSubchapter(chosen)
    ? chosen
    : guessSubchapter(object, category);
}

export type PlacedCategory = {
  object: WorkObject;
  category: Category;
  subchapter: Subchapter;
};

/** Every category of works with its subchapter, in print order. */
export function placeCategories(
  tree: readonly WorkObject[],
  options: Pick<ExportOptions, "subchapters">,
): PlacedCategory[] {
  return tree.flatMap((object) =>
    object.categories.map((category) => ({
      object,
      category,
      subchapter: subchapterOf(object, category, options),
    })),
  );
}

/** What the categories in some subchapters are worth, without VAT. */
export function worthOf(
  placed: readonly PlacedCategory[],
  among: readonly Subchapter[],
): number {
  let bani = 0;
  for (const entry of placed) {
    if (among.includes(entry.subchapter)) {
      bani += Math.round(entry.category.recap.subtotal * 100);
    }
  }
  return bani / 100;
}

/**
 * The VAT on the categories in some subchapters, worked out on each object's
 * subchapter, as the object's Deviz prices it, and summed: the Deviz general
 * and F1 then add up to the objects' Devize to the ban.
 */
export function vatOf(
  placed: readonly PlacedCategory[],
  among: readonly Subchapter[],
  rate: number,
): number {
  const bani = new Map<string, number>();
  for (const entry of placed) {
    if (among.includes(entry.subchapter)) {
      const key = `${entry.object.key}|${entry.subchapter}`;
      bani.set(
        key,
        (bani.get(key) ?? 0) + Math.round(entry.category.recap.subtotal * 100),
      );
    }
  }
  let vat = 0;
  for (const value of bani.values()) {
    vat += Math.round(roundLei((value * rate) / 10000) * 100);
  }
  return vat / 100;
}

/** A category of works as the export sheet offers to place it. */
export type SheetCategory = {
  key: string;
  name: string;
  object: { key: string; name: string; implicit: boolean };
  guess: Subchapter;
};

/** The Deviz's categories of works with our guess for each, in print order. */
export function sheetCategories(data: WorksData): SheetCategory[] {
  return buildTree(data).flatMap((object) =>
    object.categories.map((category) => ({
      key: category.key,
      name: category.code ? `${category.code} ${category.name}` : category.name,
      object: {
        key: object.key,
        name: object.code ? `${object.code} ${object.name}` : object.name,
        implicit: object.implicit,
      },
      guess: guessSubchapter(object, category),
    })),
  );
}

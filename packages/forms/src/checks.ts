import { computeRecap, roundLei } from "@devize/backend/convex/estimates/recap";
import { convertQuantity } from "@devize/backend/convex/proposals/lib/match";
import {
  type DocumentKind,
  type ExportOptions,
  type LineItemInput,
  subchapters,
  type WorksData,
} from "./input";
import { type ListedLine, listedLine } from "./listed";
import { suggestedMonths } from "./schedule";
import {
  hintedSubchapter,
  isSubchapter,
  type PlacedCategory,
  placeCategories,
  procurement,
  vatOf,
  worthOf,
} from "./subchapters";
import { buildTree } from "./tree";

// What the export sheet checks before the forms are drawn: the offer's value
// as the forms total it, and what would leave them wrong or incomplete in a
// tender's dossier, each with the lines or positions to look at.

/** The offer's value as F1 totals it, which the offer form repeats. */
export type OfferValue = {
  // Lei without VAT, the VAT rate and the VAT on it, and the total with it.
  subtotal: number;
  rate: number;
  vat: number;
  total: number;
  // The forms' value without VAT less the Deviz's Recapitulație: each
  // category of works closes on its own, so the two can differ by bani.
  difference: number;
};

/**
 * A line item as a check names it: its number as its list of quantities
 * prints it, and its title as the Deviz shows it.
 */
export type CheckedLine = {
  id: string;
  number: string;
  title: string;
  category: string;
};

/** A line whose quantity is no longer the one in the authority's list. */
export type ChangedQuantity = CheckedLine & {
  // The Deviz's quantity and the list's, in the list's unit.
  quantity: number;
  tendered: number;
  unit: string;
};

export type FormCheck =
  | { id: "unpriced"; state: "passed" | "failed"; lines: CheckedLine[] }
  | {
      id: "repeated";
      state: "passed" | "failed";
      positions: { number: string; category: string; count: number }[];
    }
  | {
      id: "missing";
      state: "passed" | "warning";
      positions: { number: string; category: string }[];
    }
  | { id: "added"; state: "passed" | "warning"; lines: CheckedLine[] }
  | { id: "quantities"; state: "passed" | "warning"; lines: ChangedQuantity[] }
  | {
      id: "placement";
      state: "passed" | "warning";
      categories: { key: string; name: string }[];
    }
  | {
      id: "procurement";
      state: "passed" | "warning";
      // The line items under subchapters 4.3 to 4.6, and whether F4 lists them.
      count: number;
      listed: boolean;
    }
  | {
      id: "duration";
      state: "passed" | "warning";
      months: number;
      hours: number;
    }
  | { id: "beneficiary"; state: "passed" | "warning"; name: string };

export type FormCheckState = FormCheck["state"];

export type CheckOptions = Pick<ExportOptions, "withValues" | "subchapters"> & {
  kinds: readonly DocumentKind[];
  // Who the forms name as the beneficiary.
  beneficiary: string;
  // F6's duration, and whether the person chose it rather than took ours.
  months: number;
  monthsChosen: boolean;
};

// The forms that total the works by the Deviz general's subchapters.
const placedForms: readonly DocumentKind[] = [
  "DG",
  "DO",
  "F1",
  "F2",
  "F4",
  "F5",
  "F6",
];

// More missing numbers in a row than this is a list numbered with a jump.
const LONGEST_GAP = 20;

/** What the offer is worth as the forms total it, with VAT as F1 adds it. */
export function offerValue(
  data: WorksData,
  options: Pick<ExportOptions, "subchapters">,
): OfferValue {
  const placed = placeCategories(buildTree(data), options);
  const subtotal = worthOf(placed, subchapters);
  const rate = data.estimate.markups.vat;
  const vat = vatOf(placed, subchapters, rate);
  const own = computeRecap(data.lineItems, data.estimate.markups);
  return {
    subtotal,
    rate,
    vat,
    total: roundLei(subtotal + vat),
    difference: roundLei(subtotal - own.subtotal),
  };
}

type Line = { item: LineItemInput; listed: ListedLine; category: string };

/** A category of works as a check names it, after its object when there are several. */
function categoryLabel(entry: PlacedCategory, several: boolean): string {
  const { object, category } = entry;
  const name = category.code
    ? `${category.code} ${category.name}`
    : category.name;
  if (!several || object.implicit || object.key === category.key) {
    return name;
  }
  return `${object.code ? `${object.code} ${object.name}` : object.name} · ${name}`;
}

function checked(line: Line): CheckedLine {
  return {
    id: line.item._id,
    number: line.listed.number,
    title: line.item.title,
    category: line.category,
  };
}

/** A position's number as two lists would write it alike: "12." is "12". */
function positionKey(number: string): string {
  return number.trim().replace(/\.+$/, "").toLowerCase();
}

/** The numbers printed more than once in one list of quantities. */
function repeatedIn(lines: readonly Line[]) {
  const counts = new Map<string, { number: string; count: number }>();
  for (const line of lines) {
    const key = positionKey(line.listed.number);
    const entry = counts.get(key) ?? { number: line.listed.number, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  const category = lines[0]?.category ?? "";
  return [...counts.values()]
    .filter((entry) => entry.count > 1)
    .map((entry) => ({ ...entry, category }));
}

/**
 * The positions a list of the authority's seems to skip: "4" between "3" and
 * "5", or "2.3" between "2.2" and "2.4". A number whose own positions follow,
 * such as "3" before "3.1", is a heading, and one a line of the bidder's
 * prints, as a position added by hand after the import does, is there.
 */
function missingIn(lines: readonly Line[]) {
  const positions = lines.flatMap((line) =>
    line.item.tenderRef ? [positionKey(line.item.tenderRef.position)] : [],
  );
  const known = new Set(lines.map((line) => positionKey(line.listed.number)));
  const byPrefix = new Map<string, Map<number, string>>();
  for (const position of positions) {
    const match = /^(?:(\d+(?:\.\d+)*)\.)?(\d+)$/.exec(position);
    if (!match?.[2]) {
      continue;
    }
    const prefix = match[1] ?? "";
    const numbers = byPrefix.get(prefix) ?? new Map<number, string>();
    numbers.set(Number(match[2]), match[2]);
    byPrefix.set(prefix, numbers);
  }
  const category = lines[0]?.category ?? "";
  const missing: { number: string; category: string }[] = [];
  for (const [prefix, numbers] of byPrefix) {
    const sorted = [...numbers.keys()].sort((a, b) => a - b);
    for (let index = 1; index < sorted.length; index++) {
      const from = sorted[index - 1] ?? 0;
      const to = sorted[index] ?? 0;
      if (to - from < 2 || to - from - 1 > LONGEST_GAP) {
        continue;
      }
      // Written like the number before it: "03" after "02".
      const digits = numbers.get(from) ?? "";
      const width = digits.startsWith("0") ? digits.length : 0;
      for (let number = from + 1; number < to; number++) {
        const written = String(number).padStart(width, "0");
        const position = prefix ? `${prefix}.${written}` : written;
        const heading = positions.some((other) =>
          other.startsWith(`${position}.`),
        );
        if (!heading && !known.has(position)) {
          missing.push({ number: position, category });
        }
      }
    }
  }
  return missing;
}

/**
 * A tender line whose quantity, in the authority's unit, is not the list's:
 * the forms print the list's, so its unit price takes the difference.
 * Quantities in units that do not convert, such as a window counted in
 * pieces and priced by area, are the bidder's own and are left alone.
 */
function changedQuantity(line: Line): ChangedQuantity[] {
  const ref = line.item.tenderRef;
  if (ref?.quantity === undefined) {
    return [];
  }
  const unit = ref.unit?.trim() || line.item.unit;
  const expected = convertQuantity(ref.quantity, unit, line.item.unit);
  // The import rounds to four decimals in the line's own unit.
  if (
    expected === null ||
    Math.abs(expected - line.item.quantity) <= 0.00005 + 1e-9
  ) {
    return [];
  }
  return [
    {
      ...checked(line),
      quantity:
        convertQuantity(line.item.quantity, line.item.unit, unit) ??
        line.item.quantity,
      tendered: ref.quantity,
      unit,
    },
  ];
}

/** The checks for the forms chosen, in the order the sheet lists them. */
export function checkForms(
  data: WorksData,
  options: CheckOptions,
): FormCheck[] {
  const kinds = new Set(options.kinds);
  const tree = buildTree(data);
  const placed = placeCategories(tree, options);
  const several = tree.filter((object) => !object.implicit).length > 1;
  const lists = placed.map((entry) => {
    const category = categoryLabel(entry, several);
    return entry.category.items.map(
      (item, index): Line => ({
        item,
        listed: listedLine(item, index + 1),
        category,
      }),
    );
  });
  const lines = lists.flat();
  const checks: FormCheck[] = [];

  if (options.withValues) {
    const unpriced = lines
      .filter((line) => line.listed.totals.total === 0)
      .map(checked);
    checks.push({
      id: "unpriced",
      state: unpriced.length > 0 ? "failed" : "passed",
      lines: unpriced,
    });
  }

  // Lines imported from the authority's lists keep its positions.
  if (lines.some((line) => line.item.tenderRef)) {
    const repeated = lists.flatMap(repeatedIn);
    const missing = lists.flatMap(missingIn);
    const added = lines.filter((line) => !line.item.tenderRef).map(checked);
    const quantities = lines.flatMap(changedQuantity);
    checks.push(
      {
        id: "repeated",
        state: repeated.length > 0 ? "failed" : "passed",
        positions: repeated,
      },
      {
        id: "missing",
        state: missing.length > 0 ? "warning" : "passed",
        positions: missing,
      },
      {
        id: "added",
        state: added.length > 0 ? "warning" : "passed",
        lines: added,
      },
      {
        id: "quantities",
        state: quantities.length > 0 ? "warning" : "passed",
        lines: quantities,
      },
    );
  }

  if (placedForms.some((kind) => kinds.has(kind))) {
    const unplaced = placed
      .filter((entry) => {
        const chosen = options.subchapters?.[entry.category.key];
        return (
          !(chosen && isSubchapter(chosen)) &&
          hintedSubchapter(entry.object, entry.category) === undefined
        );
      })
      .map((entry) => ({
        key: entry.category.key,
        name: categoryLabel(entry, several),
      }));
    checks.push({
      id: "placement",
      state: unplaced.length > 0 ? "warning" : "passed",
      categories: unplaced,
    });
  }

  const count = placed
    .filter((entry) => procurement.includes(entry.subchapter))
    .reduce((sum, entry) => sum + entry.category.items.length, 0);
  const listed = kinds.has("F4");
  if (listed || (count > 0 && (kinds.has("F1") || kinds.has("F2")))) {
    checks.push({
      id: "procurement",
      state: count > 0 && !listed ? "warning" : "passed",
      count,
      listed,
    });
  }

  if (kinds.has("F6")) {
    checks.push({
      id: "duration",
      state: options.monthsChosen ? "passed" : "warning",
      months: options.months,
      hours: suggestedMonths(data).hours,
    });
  }

  const name = options.beneficiary.trim();
  checks.push({
    id: "beneficiary",
    state: name ? "passed" : "warning",
    name,
  });
  return checks;
}

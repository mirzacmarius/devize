import type { Id } from "../_generated/dataModel";
import { normalizeText } from "../lib/text";
import { type Amounts, lineTotals, roundLei } from "./recap";

// What changed between two revisions of a Deviz, article by article, with no
// database access. Amounts are the Deviz's own, before CAM, indirect costs,
// profit and VAT, as the client's Deviz prints them.

export type DiffLine = {
  _id: Id<"lineItems">;
  originId?: Id<"lineItems">;
  code: string;
  title: string;
  unit: string;
  quantity: number;
  unitCost: Amounts;
  laborHours: number;
  section?: string;
};

/** What an article was in one revision. */
export type LineState = {
  code: string;
  title: string;
  unit: string;
  quantity: number;
  // Lei per unit, all kinds of resources together.
  unitPrice: number;
  total: number;
  section?: string;
};

export type LineField = "code" | "title" | "unit" | "quantity" | "price";

export type LineChange = {
  // The article's id in the revision it is shown from: the later one, or the
  // earlier one for an article removed.
  _id: Id<"lineItems">;
  before: LineState | null;
  after: LineState | null;
  // What differs, for an article in both; empty for one added or removed.
  fields: LineField[];
  // Lei, the later revision's total less the earlier one's.
  difference: number;
};

export type LinesDiff = {
  added: LineChange[];
  removed: LineChange[];
  changed: LineChange[];
  unchanged: number;
};

function stateOf(line: DiffLine): LineState {
  const unitPrice = roundLei(
    line.unitCost.material +
      line.unitCost.labor +
      line.unitCost.equipment +
      line.unitCost.transport,
  );
  return {
    code: line.code,
    title: line.title,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice,
    total: lineTotals(line).total,
    section: line.section,
  };
}

// Quantities are compared to the thousandth, as the forms print them.
function sameQuantity(a: number, b: number): boolean {
  return Math.round(a * 1000) === Math.round(b * 1000);
}

function fieldsChanged(before: LineState, after: LineState): LineField[] {
  const fields: LineField[] = [];
  if (before.code !== after.code) {
    fields.push("code");
  }
  if (before.title.trim() !== after.title.trim()) {
    fields.push("title");
  }
  if (before.unit !== after.unit) {
    fields.push("unit");
  }
  if (!sameQuantity(before.quantity, after.quantity)) {
    fields.push("quantity");
  }
  if (
    Math.round(before.unitPrice * 100) !== Math.round(after.unitPrice * 100)
  ) {
    fields.push("price");
  }
  return fields;
}

// The ways to recognise an article in the other revision, most certain
// first: the article it was copied from; then, for revisions that share no
// recorded lineage, its code, unit and words in the same Capitol, the same
// anywhere, its code and unit, and its words and unit. A custom article's
// code is "—", so a code alone never pairs it.
const keys: ((line: DiffLine) => string | null)[] = [
  (line) => line.originId ?? line._id,
  (line) =>
    `${line.code.trim()}|${line.unit}|${normalizeText(line.title)}|${line.section ?? ""}`,
  (line) => `${line.code.trim()}|${line.unit}|${normalizeText(line.title)}`,
  (line) => (/\w/.test(line.code) ? `${line.code.trim()}|${line.unit}` : null),
  (line) => {
    const words = normalizeText(line.title);
    return words ? `${words}|${line.unit}` : null;
  },
];

/**
 * Pairs the articles of an earlier and a later revision and says what was
 * added, removed and changed, in the order the Deviz lists them. Each article
 * pairs at most once.
 */
export function diffLines(
  before: readonly DiffLine[],
  after: readonly DiffLine[],
): LinesDiff {
  const pairOf = new Map<number, number>();
  const taken = new Set<number>();
  for (const [pass, key] of keys.entries()) {
    // Revisions that share recorded lineage need no guessing: whatever the
    // first pass left unpaired was added or removed.
    if (pass === 1 && pairOf.size > 0) {
      break;
    }
    const waiting = new Map<string, number[]>();
    before.forEach((line, index) => {
      const value = taken.has(index) ? null : key(line);
      if (value !== null) {
        waiting.set(value, [...(waiting.get(value) ?? []), index]);
      }
    });
    after.forEach((line, index) => {
      if (pairOf.has(index)) {
        return;
      }
      const value = key(line);
      const match = value === null ? undefined : waiting.get(value)?.shift();
      if (match !== undefined) {
        pairOf.set(index, match);
        taken.add(match);
      }
    });
  }

  const added: LineChange[] = [];
  const changed: LineChange[] = [];
  let unchanged = 0;
  after.forEach((line, index) => {
    const now = stateOf(line);
    const match = pairOf.get(index);
    const earlier = match === undefined ? undefined : before[match];
    if (!earlier) {
      added.push({
        _id: line._id,
        before: null,
        after: now,
        fields: [],
        difference: now.total,
      });
      return;
    }
    const then = stateOf(earlier);
    const fields = fieldsChanged(then, now);
    if (fields.length === 0) {
      unchanged++;
      return;
    }
    changed.push({
      _id: line._id,
      before: then,
      after: now,
      fields,
      difference: roundLei(now.total - then.total),
    });
  });
  const removed = before.flatMap((line, index) => {
    if (taken.has(index)) {
      return [];
    }
    const then = stateOf(line);
    return [
      {
        _id: line._id,
        before: then,
        after: null,
        fields: [],
        difference: roundLei(-then.total),
      },
    ];
  });
  return { added, removed, changed, unchanged };
}

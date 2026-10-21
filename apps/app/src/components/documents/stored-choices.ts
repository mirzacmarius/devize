import {
  type DocumentKind,
  documentKinds,
  maxMonths,
  type ResourceScope,
  type ScheduleWindow,
  type Subchapter,
  subchapters,
} from "@devize/forms/sheet";

// What the person chose in the forms sheet for a Deviz, kept in this
// browser so the next export starts from it. Keeping it with the Deviz, for
// every device, needs a field in the schema.

export type StoredChoices = {
  kinds?: DocumentKind[];
  labels?: Partial<Record<DocumentKind, string>>;
  withValues?: boolean;
  scope?: ResourceScope;
  subchapters?: Record<string, Subchapter>;
  beneficiary?: string;
  designer?: string;
  months?: number;
  windows?: Record<string, ScheduleWindow>;
};

const scopes: readonly ResourceScope[] = ["estimate", "object", "category"];

const keyOf = (estimateId: string) => `devize.forms.${estimateId}`;

function isOneOf<T extends string>(
  list: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (list as readonly string[]).includes(value)
  );
}

function isMonth(value: unknown): value is number {
  return (
    Number.isInteger(value) && Number(value) >= 1 && Number(value) <= maxMonths
  );
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Keeps only what this version of the sheet still knows. */
export function parseChoices(value: unknown): StoredChoices {
  const stored = record(value);
  const choices: StoredChoices = {};
  if (Array.isArray(stored.kinds)) {
    choices.kinds = stored.kinds.filter((kind): kind is DocumentKind =>
      isOneOf(documentKinds, kind),
    );
  }
  const labels = Object.entries(record(stored.labels)).filter(
    (entry): entry is [DocumentKind, string] =>
      isOneOf(documentKinds, entry[0]) && typeof entry[1] === "string",
  );
  if (labels.length > 0) {
    choices.labels = Object.fromEntries(labels);
  }
  if (typeof stored.withValues === "boolean") {
    choices.withValues = stored.withValues;
  }
  if (isOneOf(scopes, stored.scope)) {
    choices.scope = stored.scope;
  }
  const placed = Object.entries(record(stored.subchapters)).filter(
    (entry): entry is [string, Subchapter] => isOneOf(subchapters, entry[1]),
  );
  if (placed.length > 0) {
    choices.subchapters = Object.fromEntries(placed);
  }
  if (isMonth(stored.months)) {
    choices.months = stored.months;
  }
  const windows = Object.entries(record(stored.windows)).flatMap(
    ([key, value]): [string, ScheduleWindow][] => {
      const { start, end } = record(value);
      return isMonth(start) && isMonth(end) && start <= end
        ? [[key, { start, end }]]
        : [];
    },
  );
  if (windows.length > 0) {
    choices.windows = Object.fromEntries(windows);
  }
  for (const key of ["beneficiary", "designer"] as const) {
    const text = stored[key];
    if (typeof text === "string") {
      choices[key] = text;
    }
  }
  return choices;
}

/** The choices made for a Deviz on this device, or none. */
export function readChoices(estimateId: string): StoredChoices {
  try {
    const raw = window.localStorage.getItem(keyOf(estimateId));
    return raw ? parseChoices(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function writeChoices(estimateId: string, choices: StoredChoices) {
  try {
    window.localStorage.setItem(keyOf(estimateId), JSON.stringify(choices));
  } catch {
    // A private window or full storage: the next export starts afresh.
  }
}

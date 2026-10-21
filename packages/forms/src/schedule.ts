import { isHourUnit, normalizeText } from "@devize/backend/convex/lib/text";
import type {
  ExportOptions,
  ScheduleWindow,
  Subchapter,
  WorksData,
} from "./input";
import { resourceList } from "./resources";
import type { PlacedCategory } from "./subchapters";
import { buildTree } from "./tree";

// When the works run, for the general schedule (F6): how many months they
// take, and the months of each category of works. Devize plans both from the
// Deviz, and the person changes either in the export sheet: the tender sets
// the duration, and the bidder knows its own works.

/** The longest schedule the forms print: three years. */
export const maxMonths = 36;

// A crew of ten, working 21 days of 8 hours a month.
const crew = 10;
const monthHours = 21 * 8;

/** The labour hours of a Deviz's works, and the months a crew of ten needs for them. */
export function suggestedMonths(data: WorksData): {
  hours: number;
  months: number;
} {
  const items = buildTree(data).flatMap((object) =>
    object.categories.flatMap((category) => category.items),
  );
  const hours = resourceList(items, "labor").lines.reduce(
    (sum, line) =>
      sum +
      (line.quantity !== undefined && isHourUnit(line.unit)
        ? line.quantity
        : 0),
    0,
  );
  return {
    hours: Math.round(hours),
    months: clampMonths(Math.ceil(hours / (crew * monthHours))),
  };
}

export function clampMonths(months: number): number {
  return Math.min(maxMonths, Math.max(1, Math.round(months) || 1));
}

// When each subchapter's works usually run, as shares of the duration: the
// site first, then the earthworks and the structure, the building services
// and the finishes, and last the equipment, the connections and the cleanup.
const phases: Record<Subchapter, [number, number]> = {
  "5.1.1": [0, 0.1],
  "1.2": [0, 0.15],
  "1.4": [0, 0.2],
  "4.1.1": [0, 0.25],
  "4.1.2": [0.1, 0.6],
  "4.1.3": [0.4, 1],
  "4.1.4": [0.3, 0.95],
  "4.2": [0.75, 1],
  "4.3": [0.7, 1],
  "4.4": [0.8, 1],
  "4.5": [0.8, 1],
  "4.6": [0.8, 1],
  "2": [0.6, 1],
  "1.3": [0.85, 1],
};

// Works that run earlier or later than their subchapter's: demolitions open
// the site, and the outdoor works close it.
const early = /\bdemolar|\bdesfacer|\bdezafect/;
const late =
  /\bamenajari exterioare|\balei\b|\bdrum|\bparcar|\btrotuar|\bimprejmuir|\bspatii verzi|\bgazon|\bplantar|\bpavaj/;

/** The months a category of works most likely runs in, within the duration. */
export function plannedWindow(
  subchapter: Subchapter,
  name: string,
  months: number,
): ScheduleWindow {
  const text = normalizeText(name);
  const [from, to] = early.test(text)
    ? [0, 0.2]
    : late.test(text)
      ? [0.75, 1]
      : phases[subchapter];
  // Shares of whole months land on them, whatever the floating point says.
  const start = Math.min(months, Math.floor(from * months + 1e-9) + 1);
  return { start, end: Math.max(start, Math.ceil(to * months - 1e-9)) };
}

/** A window kept within the duration, its end not before its start. */
export function clampWindow(
  window: ScheduleWindow,
  months: number,
): ScheduleWindow {
  const start = Math.min(months, Math.max(1, Math.round(window.start) || 1));
  const end = Math.min(months, Math.max(start, Math.round(window.end) || 1));
  return { start, end };
}

export type ScheduledCategory = PlacedCategory & {
  window: ScheduleWindow;
  // What the category's works are worth in each month of the schedule, in
  // lei, adding up to its F3's total to the ban.
  values: number[];
};

/** The duration and every category of works with its months and their values. */
export function scheduleOf(
  data: WorksData,
  placed: readonly PlacedCategory[],
  options: Pick<ExportOptions, "schedule">,
): { months: number; categories: ScheduledCategory[] } {
  const months = clampMonths(
    options.schedule?.months ?? suggestedMonths(data).months,
  );
  const categories = placed.map((entry) => {
    const chosen = options.schedule?.windows?.[entry.category.key];
    const window = chosen
      ? clampWindow(chosen, months)
      : plannedWindow(entry.subchapter, entry.category.name, months);
    return { ...entry, window, values: spread(entry, window, months) };
  });
  return { months, categories };
}

/** A category's value shared evenly among its months, the odd bani first. */
function spread(
  entry: PlacedCategory,
  window: ScheduleWindow,
  months: number,
): number[] {
  const bani = Math.round(entry.category.recap.subtotal * 100);
  const count = window.end - window.start + 1;
  const share = Math.trunc(bani / count);
  let odd = bani - share * count;
  const values: number[] = [];
  for (let month = 1; month <= months; month += 1) {
    if (month < window.start || month > window.end) {
      values.push(0);
      continue;
    }
    const extra = Math.sign(odd);
    odd -= extra;
    values.push((share + extra) / 100);
  }
  return values;
}

import { normalizeUnit } from "../../lib/text";
import type { DraftOutput, ModelTakeoffRow } from "./schemas";

// What the model wrote, checked and trimmed before it is saved: lengths and
// counts are capped, units spelled the way Devize stores them, and each
// quantity is the total of its Antemăsurătoare, added up here rather than
// trusted to the model.

const MAX_CHAPTERS = 20;
const MAX_ARTICLES = 80;
const MAX_ROWS = 30;
const MAX_RESOURCES = 20;

export type TakeoffRow = {
  label?: string;
  count: number;
  length?: number;
  width?: number;
  height?: number;
  deduct: boolean;
};

export type DraftResource = {
  kind: "material" | "labor" | "equipment" | "transport";
  name: string;
  unit: string;
  quantity: number;
};

export type DraftArticle = {
  chapter: string;
  title: string;
  unit: string;
  measured: number;
  takeoff: TakeoffRow[];
  note?: string;
  confidence: "high" | "medium" | "low";
  searchTerms: string[];
  resources: DraftResource[];
};

export type Draft = {
  summary?: string;
  assumptions: string[];
  questions: string[];
  articles: DraftArticle[];
};

export function text(value: string | null | undefined, max: number) {
  const result = value?.replace(/\s+/g, " ").trim().slice(0, max);
  return result ? result : undefined;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function positive(value: number | null | undefined, max: number) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= max
    ? value
    : undefined;
}

/** count × length × width × height, without the dimensions not measured. */
function rowAmount(row: TakeoffRow) {
  return row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1);
}

/** An Antemăsurătoare's total: its rows added up, deductions subtracted. */
export function takeoffTotal(rows: readonly TakeoffRow[]): number {
  const total = rows.reduce(
    (sum, row) => sum + (row.deduct ? -1 : 1) * rowAmount(row),
    0,
  );
  return round(total, 2);
}

export function cleanRows(rows: readonly ModelTakeoffRow[]): TakeoffRow[] {
  const result: TakeoffRow[] = [];
  for (const row of rows.slice(0, MAX_ROWS)) {
    const count = positive(row.count, 1e6);
    if (count === undefined) {
      continue;
    }
    result.push({
      label: text(row.label, 120),
      count: round(count, 3),
      length: dimension(row.length),
      width: dimension(row.width),
      height: dimension(row.height),
      deduct: row.deduct,
    });
  }
  return result;
}

function dimension(value: number | null) {
  const result = positive(value, 10_000);
  return result === undefined ? undefined : round(result, 3);
}

/** A recipe the model wrote, with units spelled as Devize stores them. */
export function cleanResources(
  resources: readonly DraftResource[],
): DraftResource[] {
  const result: DraftResource[] = [];
  for (const resource of resources) {
    const name = text(resource.name, 200);
    const unit = normalizeUnit(resource.unit);
    const quantity = positive(resource.quantity, 1e6);
    if (name && unit && quantity !== undefined) {
      result.push({
        kind: resource.kind,
        name,
        unit,
        quantity: round(quantity, 4),
      });
    }
    if (result.length === MAX_RESOURCES) {
      break;
    }
  }
  return result;
}

export function unique(values: readonly string[], max: number, length: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = text(value, length);
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      result.push(item);
    }
    if (result.length === max) {
      break;
    }
  }
  return result;
}

export function cleanDraft(output: DraftOutput): Draft {
  const articles: DraftArticle[] = [];
  for (const chapter of output.chapters.slice(0, MAX_CHAPTERS)) {
    const chapterName = text(chapter.name, 120) ?? "Diverse";
    for (const article of chapter.articles) {
      if (articles.length === MAX_ARTICLES) {
        break;
      }
      const title = text(article.title, 300);
      const unit = normalizeUnit(article.unit);
      const takeoff = cleanRows(article.takeoff);
      const measured = takeoffTotal(takeoff);
      if (!title || !unit || unit === "%" || !(measured > 0)) {
        continue;
      }
      articles.push({
        chapter: chapterName,
        title,
        unit,
        measured,
        takeoff,
        note: text(article.note, 500),
        confidence: article.confidence,
        searchTerms: unique(article.searchTerms, 3, 80),
        resources: cleanResources(article.resources),
      });
    }
  }
  return {
    summary: text(output.summary, 1000),
    assumptions: unique(output.assumptions, 10, 300),
    questions: unique(output.questions, 5, 300),
    articles,
  };
}

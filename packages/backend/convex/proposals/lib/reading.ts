import type { Infer } from "convex/values";
import type { tenderIssue, tenderProgress } from "../validators";
import { MAX_TENDER_ITEMS } from "./input";
import { isComplete, type ReadPosition } from "./tender";
import type { SheetRow } from "./xlsx";

// How a tender import moves through its files: which rows or pages the next
// requests read, and what a step's positions leave to save.

export type Progress = Infer<typeof tenderProgress>;
export type Issue = Infer<typeof tenderIssue>;

/** What one step of reading found, and where reading goes on from. */
export type Step = { positions: ReadPosition[]; progress: Progress };

/** A position ready to save: numbered, with its unit and quantity. */
export type SettledPosition = ReadPosition & {
  position: string;
  unit: string;
  quantity: number;
};

// Spreadsheet rows per request, and PDF pages.
export const ROWS_PER_BATCH = 120;
export const PAGES_PER_BATCH = 3;
// Issue positions kept per file.
const MAX_ISSUE_POSITIONS = 50;

export function nextFile(progress: Progress): Progress {
  return {
    ...progress,
    file: progress.file + 1,
    sheet: 0,
    next: 0,
    columns: undefined,
    pages: undefined,
    object: undefined,
    chapter: undefined,
  };
}

/** The next sheet starts afresh: its own columns, object and chapters. */
export function nextSheet(progress: Progress): Progress {
  return {
    ...progress,
    sheet: progress.sheet + 1,
    next: 0,
    columns: undefined,
    object: undefined,
    chapter: undefined,
  };
}

/** Adds an issue, or its positions to the same kind of issue of the file. */
export function withIssue(progress: Progress, issue: Issue): Progress {
  const issues = [...progress.issues];
  const same = issues.findIndex(
    (found) => found.kind === issue.kind && found.file === issue.file,
  );
  if (same < 0) {
    issues.push({
      ...issue,
      positions: issue.positions?.slice(0, MAX_ISSUE_POSITIONS),
    });
  } else if (issue.positions) {
    issues[same] = {
      ...issue,
      positions: [...(issues[same]?.positions ?? []), ...issue.positions].slice(
        0,
        MAX_ISSUE_POSITIONS,
      ),
    };
  }
  return { ...progress, issues };
}

/**
 * The batches of a sheet's rows the next requests read, by index in `rows`:
 * from the first row numbered `next` or more, `count` batches at most.
 */
export function sheetBatches(
  rows: readonly SheetRow[],
  next: number,
  count: number,
): { from: number; to: number }[] {
  const start = rows.findIndex((row) => row.row >= next);
  const batches = [];
  for (let index = 0; start >= 0 && index < count; index++) {
    const from = start + index * ROWS_PER_BATCH;
    if (from >= rows.length) {
      break;
    }
    batches.push({
      from,
      to: Math.min(from + ROWS_PER_BATCH, rows.length) - 1,
    });
  }
  return batches;
}

/**
 * The page ranges the next requests read, from page `next` (0 before the
 * first), `count` ranges at most, within `pages` when the count is known.
 */
export function pageRanges(
  next: number,
  pages: number | undefined,
  count: number,
): { from: number; to: number }[] {
  const first = Math.max(next, 1);
  const ranges = [];
  for (let index = 0; index < count; index++) {
    const from = first + index * PAGES_PER_BATCH;
    if (pages !== undefined && from > pages) {
      break;
    }
    const to = from + PAGES_PER_BATCH - 1;
    ranges.push({ from, to: pages === undefined ? to : Math.min(to, pages) });
  }
  return ranges;
}

/**
 * What a step leaves to save: its complete positions, numbered when the list
 * has no numbers, up to the import's limit; the ones without a quantity or
 * unit, and the ones past the limit, become issues.
 */
export function settle(
  step: Step,
  fileName: string,
  read: number,
): { progress: Progress; positions: SettledPosition[] } {
  let progress = step.progress;
  const missing = step.positions.filter((position) => !isComplete(position));
  if (missing.length > 0) {
    progress = withIssue(progress, {
      kind: "no_quantity",
      file: fileName,
      positions: missing.map(
        (position) => position.position ?? position.text.slice(0, 40),
      ),
    });
  }
  let complete = step.positions.filter(isComplete);
  const room = MAX_TENDER_ITEMS - read;
  if (complete.length > room) {
    complete = complete.slice(0, Math.max(room, 0));
    progress = withIssue(
      { ...progress, stage: "matching" },
      { kind: "too_many", file: fileName },
    );
  }
  return {
    progress,
    positions: complete.map((position, index) => ({
      position: position.position ?? String(read + index + 1),
      code: position.code,
      text: position.text,
      unit: position.unit,
      quantity: position.quantity,
      object: position.object,
      chapter: position.chapter,
      terms: position.terms,
    })),
  };
}

/**
 * The catalog search terms for a position: its code, then the model's
 * phrasings, or the start of its text when it gave none.
 */
export function searchTerms(item: {
  tenderCode?: string;
  terms: readonly string[];
  text: string;
}): string[] {
  return [
    ...(item.tenderCode ? [item.tenderCode] : []),
    ...(item.terms.length > 0
      ? item.terms
      : [item.text.split(/\s+/).slice(0, 12).join(" ")]),
  ];
}

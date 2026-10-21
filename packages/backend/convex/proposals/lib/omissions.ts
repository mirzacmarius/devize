import { normalizeUnit } from "../../lib/text";
import {
  cleanResources,
  cleanRows,
  type DraftArticle,
  takeoffTotal,
  text,
  unique,
} from "./draft";
import type { OmissionsOutput } from "./schemas";

// What the omissions check found, checked and trimmed before it is saved,
// like a draft: the works missing, each with the Deviz's articles that call
// for it, the remarks on the articles already there and the questions.

// Articles the request lists; a longer Deviz is cut, and the model is told.
export const MAX_LINES = 600;
const MAX_MISSING = 20;
const MAX_REMARKS = 8;
const MAX_QUESTIONS = 5;
// A tender's clarifications, one for each work its lists miss.
const MAX_CLARIFICATIONS = 10;

export type OmissionArticle<Line extends string> = DraftArticle & {
  // The Deviz's articles that call for it.
  basis: Line[];
};

export type Omissions<Line extends string> = {
  summary?: string;
  remarks: string[];
  questions: string[];
  articles: OmissionArticle<Line>[];
};

/**
 * Keeps the works the model found missing that have a name, a unit and a
 * quantity, each linked to the articles it named by key (an unknown key is
 * dropped). A tender's lists can't take new positions, so a work missing
 * from them becomes a clarification to request instead.
 */
export function cleanOmissions<Line extends string>(
  output: OmissionsOutput,
  lines: ReadonlyMap<string, Line>,
  tender: boolean,
): Omissions<Line> {
  const articles: OmissionArticle<Line>[] = [];
  const clarifications: string[] = [];
  for (const work of output.missing) {
    const title = text(work.title, 300);
    const reason = text(work.reason, 500);
    if (tender) {
      if (title) {
        clarifications.push(reason ? `${title}: ${reason}` : title);
      }
      continue;
    }
    if (articles.length === MAX_MISSING) {
      break;
    }
    const unit = normalizeUnit(work.unit);
    const takeoff = cleanRows(work.takeoff);
    const measured = takeoffTotal(takeoff);
    if (!title || !unit || unit === "%" || !(measured > 0)) {
      continue;
    }
    const basis: Line[] = [];
    for (const key of work.basis) {
      const line = lines.get(key.trim().toUpperCase());
      if (line && !basis.includes(line)) {
        basis.push(line);
      }
    }
    articles.push({
      chapter: text(work.chapter, 120) ?? "Diverse",
      title,
      unit,
      measured,
      takeoff,
      note: reason,
      confidence: work.confidence,
      searchTerms: unique(work.searchTerms, 3, 80),
      resources: cleanResources(work.resources),
      basis,
    });
  }
  return {
    summary: text(output.summary, 1000),
    remarks: unique(output.remarks, MAX_REMARKS, 400),
    questions: unique(
      [...output.questions, ...clarifications],
      tender ? MAX_CLARIFICATIONS : MAX_QUESTIONS,
      600,
    ),
    articles,
  };
}

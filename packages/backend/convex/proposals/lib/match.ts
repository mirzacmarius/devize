import type { Id } from "../../_generated/dataModel";
import { normalizeUnit } from "../../lib/text";
import type { MatchOutput } from "./schemas";

// Matching proposed articles with catalog norms: the model picks among the
// norms the search found for each article, by short keys (A1, N1) rather
// than ids, and the choice is checked here before it is kept.

/** A published norm the firm can use, as the model and the review see it. */
export type NormCandidate = {
  _id: Id<"norms">;
  code: string;
  title: string;
  unit: string;
  // Whose catalog it is in: the firm's own, a Producător's or Devize's base.
  scope: "firm" | "producer" | "base";
  manufacturerName?: string;
  category?: string;
  includes?: string;
  excludes?: string;
};

export type MatchArticle = {
  position: number;
  chapter: string;
  title: string;
  unit: string;
  measured: number;
  note?: string;
  candidates: NormCandidate[];
};

export type KeyedArticle = MatchArticle & {
  key: string;
  keyedCandidates: { key: string; norm: NormCandidate }[];
};

export type MatchResult = {
  position: number;
  normId?: Id<"norms">;
  // In the norm's unit when it has one, else in the article's.
  quantity: number;
  matchNote?: string;
};

// Units that are a multiple of another: a tonne is 1000 kg.
const multiples: Record<string, [string, number]> = {
  t: ["kg", 1000],
  g: ["kg", 0.001],
  km: ["m", 1000],
};

function parseUnit(unit: string) {
  const normalized = normalizeUnit(unit);
  const counted = /^([\d.]+) (.+)$/.exec(normalized);
  let count = counted?.[1] ? Number(counted[1]) : 1;
  let base = counted?.[2] ?? normalized;
  const multiple = multiples[base];
  if (multiple) {
    base = multiple[0];
    count *= multiple[1];
  }
  return { base, count };
}

/**
 * A quantity in another unit of the same measure, such as 24 mp in "100 mp"
 * (0.24) or 2 t in kg; null when the units measure different things.
 */
export function convertQuantity(
  quantity: number,
  from: string,
  to: string,
): number | null {
  const source = parseUnit(from);
  const target = parseUnit(to);
  if (
    source.base !== target.base ||
    !(source.count > 0) ||
    !(target.count > 0)
  ) {
    return null;
  }
  return Math.round(((quantity * source.count) / target.count) * 1e4) / 1e4;
}

/** Gives the articles that have candidates, and their candidates, keys. */
export function keyArticles(articles: readonly MatchArticle[]): KeyedArticle[] {
  let normCount = 0;
  return articles
    .filter((article) => article.candidates.length > 0)
    .map((article, index) => ({
      ...article,
      key: `A${index + 1}`,
      keyedCandidates: article.candidates.map((norm) => ({
        key: `N${++normCount}`,
        norm,
      })),
    }));
}

/**
 * What the model chose for each article, checked: a norm only from the
 * article's own candidates, with its quantity in the norm's unit. Articles
 * it skipped, or matched with a norm in a unit that doesn't convert, keep
 * their own recipe.
 */
export function resolveMatches(
  articles: readonly KeyedArticle[],
  output: MatchOutput,
): MatchResult[] {
  const answers = new Map(
    output.matches.map((match) => [match.article.trim(), match]),
  );
  return articles.map((article) => {
    const answer = answers.get(article.key);
    const own = { position: article.position, quantity: article.measured };
    if (!answer) {
      return own;
    }
    const matchNote = answer.reason.trim().slice(0, 500) || undefined;
    const chosen = article.keyedCandidates.find(
      (candidate) => candidate.key === answer.norm?.trim(),
    )?.norm;
    if (!chosen) {
      return { ...own, matchNote };
    }
    const converted = convertQuantity(
      article.measured,
      article.unit,
      chosen.unit,
    );
    const quantity =
      converted ??
      (answer.quantity !== null &&
      Number.isFinite(answer.quantity) &&
      answer.quantity > 0
        ? Math.round(answer.quantity * 1e4) / 1e4
        : null);
    if (quantity === null) {
      return { ...own, matchNote };
    }
    return {
      position: article.position,
      normId: chosen._id,
      quantity,
      matchNote,
    };
  });
}

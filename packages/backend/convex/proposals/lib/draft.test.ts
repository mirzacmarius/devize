import { describe, expect, test } from "bun:test";
import { cleanDraft, takeoffTotal } from "./draft";
import { draftRequest } from "./prompts";
import type { DraftOutput } from "./schemas";

const row = (
  count: number,
  dimensions: { length?: number; width?: number; height?: number } = {},
  deduct = false,
) => ({
  label: "",
  count,
  length: dimensions.length ?? null,
  width: dimensions.width ?? null,
  height: dimensions.height ?? null,
  deduct,
});

function article(
  fields: Partial<DraftOutput["chapters"][number]["articles"][number]> = {},
): DraftOutput["chapters"][number]["articles"][number] {
  return {
    title: "Placare pereți cu faianță",
    unit: "mp",
    takeoff: [row(2, { length: 3, height: 2.6 })],
    confidence: "high",
    note: null,
    searchTerms: ["placare faianta pereti"],
    resources: [
      { kind: "material", name: "Adeziv flexibil", unit: "kg", quantity: 4.5 },
      { kind: "labor", name: "Faianțar", unit: "ore", quantity: 0.9 },
    ],
    ...fields,
  };
}

function draft(
  articles: DraftOutput["chapters"][number]["articles"],
): DraftOutput {
  return {
    summary: "  Baie de 6 mp  ",
    assumptions: ["Înălțimea 2,60 m", "înălțimea 2,60 m", " "],
    questions: [],
    chapters: [{ name: "Placări ceramice", articles }],
  };
}

describe("takeoffTotal", () => {
  test("adds the rows and subtracts the openings", () => {
    expect(
      takeoffTotal([
        { count: 2, length: 3, height: 2.6, deduct: false },
        { count: 2, length: 2, height: 2.6, deduct: false },
        { count: 1, length: 0.8, height: 2.1, deduct: true },
      ]),
    ).toBe(24.32);
  });

  test("counts a row without dimensions as its count", () => {
    expect(takeoffTotal([{ count: 1.5, deduct: false }])).toBe(1.5);
  });
});

describe("cleanDraft", () => {
  test("measures each article from its rows, not from the model's arithmetic", () => {
    const result = cleanDraft(
      draft([
        article({
          takeoff: [
            row(2, { length: 3, height: 2.6 }),
            row(2, { length: 2, height: 2.6 }),
            row(1, { length: 0.8, height: 2.1 }, true),
          ],
        }),
      ]),
    );
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.measured).toBe(24.32);
    expect(result.articles[0]?.chapter).toBe("Placări ceramice");
    expect(result.summary).toBe("Baie de 6 mp");
    expect(result.assumptions).toEqual(["Înălțimea 2,60 m"]);
  });

  test("spells units the way Devize stores them", () => {
    const [cleaned] = cleanDraft(draft([article({ unit: "m2" })])).articles;
    expect(cleaned?.unit).toBe("mp");
    expect(cleaned?.resources.map((resource) => resource.unit)).toEqual([
      "kg",
      "ora",
    ]);
  });

  test("leaves out articles without a quantity, a unit or a title", () => {
    const result = cleanDraft(
      draft([
        article({ takeoff: [] }),
        article({
          takeoff: [row(1, { length: 1 }), row(1, { length: 2 }, true)],
        }),
        article({ unit: "%" }),
        article({ unit: " " }),
        article({ title: "  " }),
        article({ takeoff: [row(-2), row(Number.NaN), row(3)] }),
      ]),
    );
    expect(result.articles.map((item) => item.measured)).toEqual([3]);
  });

  test("drops resources it can't use and keeps three search terms", () => {
    const [cleaned] = cleanDraft(
      draft([
        article({
          searchTerms: ["a", "b", "A", "c", "d"],
          resources: [
            { kind: "material", name: "Adeziv", unit: "kg", quantity: 0 },
            { kind: "material", name: " ", unit: "kg", quantity: 1 },
            { kind: "labor", name: "Faianțar", unit: "h", quantity: 0.9 },
          ],
        }),
      ]),
    ).articles;
    expect(cleaned?.searchTerms).toEqual(["a", "b", "c"]);
    expect(cleaned?.resources).toEqual([
      { kind: "labor", name: "Faianțar", unit: "ora", quantity: 0.9 },
    ]);
  });

  test("keeps at most 80 articles", () => {
    const many = Array.from({ length: 100 }, () => article());
    expect(cleanDraft(draft(many)).articles).toHaveLength(80);
  });
});

describe("draftRequest", () => {
  test("says what the Deviz is and what the contractor asked for", () => {
    expect(
      draftRequest({
        title: "Baie Popescu",
        kind: "private",
        county: "Cluj",
        text: "baie 6 mp, faianță până la tavan",
        photoCount: 2,
      }),
    ).toBe(
      [
        "Devizul: Baie Popescu",
        "Județul: Cluj",
        "Pozele de mai sus (2) sunt de la lucrare, în ordinea în care le-a făcut constructorul.",
        "",
        "Ce spune constructorul:",
        "baie 6 mp, faianță până la tavan",
      ].join("\n"),
    );
  });
});

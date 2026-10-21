import { describe, expect, test } from "bun:test";
import type { Id } from "../../_generated/dataModel";
import {
  convertQuantity,
  keyArticles,
  type MatchArticle,
  type NormCandidate,
  resolveMatches,
  resolveTenderMatches,
} from "./match";
import { matchRequest, tenderMatchRequest } from "./prompts";

const norm = (id: string, unit: string, code = id): NormCandidate => ({
  _id: id as Id<"norms">,
  code,
  title: `Normă ${code}`,
  unit,
  scope: "base",
});

const article = (
  position: number,
  candidates: NormCandidate[],
  fields: Partial<MatchArticle> = {},
): MatchArticle => ({
  position,
  chapter: "Placări ceramice",
  title: `Articol ${position}`,
  unit: "mp",
  measured: 24.32,
  candidates,
  ...fields,
});

const answer = (
  articleKey: string,
  normKey: string | null,
  quantity: number | null = null,
) => ({ article: articleKey, norm: normKey, quantity, reason: "Motiv" });

describe("convertQuantity", () => {
  test("converts between multiples of the same unit", () => {
    expect(convertQuantity(24.32, "mp", "mp")).toBe(24.32);
    expect(convertQuantity(24.32, "mp", "100 m2")).toBe(0.2432);
    expect(convertQuantity(2.5, "t", "kg")).toBe(2500);
    expect(convertQuantity(120, "m", "km")).toBe(0.12);
  });

  test("refuses units that measure different things", () => {
    expect(convertQuantity(24, "mp", "mc")).toBeNull();
    expect(convertQuantity(3, "buc", "set")).toBeNull();
  });
});

describe("resolveMatches", () => {
  test("keeps a candidate the model chose, with the quantity in its unit", () => {
    const keyed = keyArticles([
      article(0, [norm("n1", "mp"), norm("n2", "100 mp")]),
      article(1, []),
      article(2, [norm("n3", "100 mp")]),
    ]);
    expect(keyed.map((item) => item.key)).toEqual(["A1", "A2"]);
    expect(keyed[1]?.keyedCandidates.map((item) => item.key)).toEqual(["N3"]);
    expect(
      resolveMatches(keyed, {
        matches: [answer("A1", "N1"), answer("A2", "N3")],
      }),
    ).toEqual([
      {
        position: 0,
        normId: "n1" as Id<"norms">,
        quantity: 24.32,
        matchNote: "Motiv",
      },
      {
        position: 2,
        normId: "n3" as Id<"norms">,
        quantity: 0.2432,
        matchNote: "Motiv",
      },
    ]);
  });

  test("never takes a norm found for another article", () => {
    const keyed = keyArticles([
      article(0, [norm("n1", "mp")]),
      article(1, [norm("n2", "mp")]),
    ]);
    const [first] = resolveMatches(keyed, { matches: [answer("A1", "N2")] });
    expect(first?.normId).toBeUndefined();
    expect(first?.quantity).toBe(24.32);
  });

  test("uses the model's quantity only for units that don't convert", () => {
    const keyed = keyArticles([
      article(0, [norm("n1", "mc")]),
      article(1, [norm("n2", "mc")]),
    ]);
    expect(
      resolveMatches(keyed, {
        matches: [answer("A1", "N1", 2.43), answer("A2", "N2")],
      }),
    ).toEqual([
      {
        position: 0,
        normId: "n1" as Id<"norms">,
        quantity: 2.43,
        matchNote: "Motiv",
      },
      { position: 1, quantity: 24.32, matchNote: "Motiv" },
    ]);
  });

  test("leaves an article the model skipped with its own recipe", () => {
    const keyed = keyArticles([article(0, [norm("n1", "mp")])]);
    expect(resolveMatches(keyed, { matches: [] })).toEqual([
      { position: 0, quantity: 24.32 },
    ]);
  });
});

describe("matchRequest", () => {
  test("lists each article with its candidates, after the request", () => {
    const keyed = keyArticles([
      article(0, [
        { ...norm("n1", "mp", "DV-FAI-01"), category: "Finisaje" },
        {
          ...norm("n2", "mp", "X-1"),
          scope: "producer",
          manufacturerName: "Producător Test",
        },
      ]),
    ]);
    expect(matchRequest(keyed, "baie cu faianță")).toBe(
      [
        "Ce a cerut constructorul:",
        "baie cu faianță",
        "",
        "Articolele propuse, fiecare cu normele găsite pentru el:",
        "",
        "A1. Articol 0: 24,32 mp (capitolul Placări ceramice)",
        "   N1. DV-FAI-01 Normă DV-FAI-01; U.M. mp; norma de bază Devize; categoria Finisaje",
        "   N2. X-1 Normă X-1; U.M. mp; norma producătorului Producător Test",
      ].join("\n"),
    );
  });
});

describe("resolveTenderMatches", () => {
  test("keeps how sure the model is, and its recipe where no norm fits", () => {
    const keyed = keyArticles(
      [
        article(0, [norm("n1", "mp")]),
        article(1, []),
        article(2, [norm("n2", "mp")]),
      ],
      { all: true },
    );
    expect(keyed.map((item) => item.key)).toEqual(["A1", "A2", "A3"]);
    const recipe = [
      { kind: "labor" as const, name: "Zidar", unit: "ore", quantity: 1.25 },
      { kind: "material" as const, name: "  ", unit: "kg", quantity: 2 },
    ];
    expect(
      resolveTenderMatches(keyed, {
        matches: [
          { ...answer("A1", "N1"), confidence: "high", resources: recipe },
          { ...answer("A2", null), confidence: "low", resources: recipe },
        ],
      }),
    ).toEqual([
      {
        position: 0,
        normId: "n1" as Id<"norms">,
        quantity: 24.32,
        matchNote: "Motiv",
        confidence: "high",
        resources: [],
      },
      {
        position: 1,
        quantity: 24.32,
        matchNote: "Motiv",
        confidence: "low",
        resources: [
          { kind: "labor", name: "Zidar", unit: "ora", quantity: 1.25 },
        ],
      },
      // Skipped by the model: nothing to go on.
      { position: 2, quantity: 24.32, confidence: "low", resources: [] },
    ]);
  });
});

describe("tenderMatchRequest", () => {
  test("lists each position with the list's number and code", () => {
    const keyed = keyArticles(
      [
        {
          ...article(0, [norm("n1", "mc", "DV-ZID-01")]),
          title: "Zidărie din blocuri ceramice",
          unit: "mc",
          measured: 12.5,
          chapter: "Zidării",
          tenderPosition: "1",
          tenderCode: "CZ0101A1",
          object: "Clădire atelier",
        },
        {
          ...article(1, []),
          title: "Glet de ipsos",
          measured: 1234.5,
          chapter: "",
          tenderPosition: "2",
        },
      ],
      { all: true },
    );
    expect(tenderMatchRequest(keyed)).toBe(
      [
        "Pozițiile listei, fiecare cu normele găsite pentru ea:",
        "",
        "A1. Poz. 1, cod CZ0101A1: Zidărie din blocuri ceramice — 12,5 mc (Clădire atelier / Zidării)",
        "   N1. DV-ZID-01 Normă DV-ZID-01; U.M. mc; norma de bază Devize",
        "",
        "A2. Poz. 2: Glet de ipsos — 1234,5 mp",
        "   (nicio normă găsită: scrii rețeta)",
      ].join("\n"),
    );
  });
});

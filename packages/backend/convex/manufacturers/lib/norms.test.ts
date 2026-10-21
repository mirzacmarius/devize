import { describe, expect, test } from "bun:test";
import {
  batchArticles,
  checkNorm,
  type ExtractedArticle,
  normsFromArticle,
} from "./norms";

// A made-up article shaped like a manufacturer's norms table.
const article: ExtractedArticle = {
  baseCode: "TST 10",
  title: "Placare de test cu plăci minerale:",
  unit: "mp",
  pages: [3, 4],
  includes: "Montajul plăcilor și al plasei.",
  excludes: null,
  variants: [
    {
      code: "A01",
      description: "plăci de 50 mm;",
      resources: [
        {
          kind: "material",
          name: "Placă minerală  50 mm",
          unit: "mp",
          quantity: 1.05,
          unitPrice: 40,
        },
        {
          kind: "material",
          name: "Dibluri",
          unit: "buc",
          quantity: 6,
          unitPrice: 1,
        },
        {
          kind: "labor",
          name: "Muncitor",
          unit: "ore",
          quantity: 0.25,
          unitPrice: 20,
        },
        {
          kind: "labor",
          name: "Zidar",
          unit: "ora",
          quantity: 0.75,
          unitPrice: 20,
        },
      ],
      totalLaborHours: 1,
      totalPrice: 68,
    },
    {
      code: "TST10B01",
      description: "plăci de 100 mm",
      resources: [
        {
          kind: "material",
          name: "Placă minerală 100 mm",
          unit: "mp",
          quantity: 1.05,
          unitPrice: null,
        },
        {
          kind: "labor",
          name: "Zidar",
          unit: "ore",
          quantity: 1.3,
          unitPrice: null,
        },
      ],
      totalLaborHours: 1.2,
      totalPrice: null,
    },
  ],
};

describe("normsFromArticle", () => {
  const [first, second] = normsFromArticle(article, { laborRate: 20 });

  test("makes one Normă per variant, with the article's code and title", () => {
    expect(first.code).toBe("TST10A01");
    expect(second.code).toBe("TST10B01");
    expect(first.baseCode).toBe("TST10");
    expect(first.title).toBe(
      "Placare de test cu plăci minerale, plăci de 50 mm",
    );
    expect(first.unit).toBe("mp");
    expect(first.unitRaw).toBe("mp");
    expect(first.pages).toEqual([3, 4]);
    expect(first.includes).toBe("Montajul plăcilor și al plasei.");
    expect(first.excludes).toBeUndefined();
  });

  test("normalizes the resources and keeps the printed totals", () => {
    expect(first.resources[0]).toEqual({
      kind: "material",
      name: "Placă minerală 50 mm",
      unit: "mp",
      unitRaw: "mp",
      quantity: 1.05,
      unitPrice: 40,
    });
    expect(first.resources[2]).toMatchObject({ unit: "ora", unitRaw: "ore" });
    expect(second.resources[1].unitPrice).toBeUndefined();
    expect(first.totalLaborHours).toBe(1);
    expect(second.totalPrice).toBeUndefined();
  });

  test("passes a variant whose trades add up to the total", () => {
    expect(first.checks).toEqual([]);
  });

  test("flags trades that don't add up to the total", () => {
    expect(second.checks).toEqual([
      { code: "labor_sum", level: "error", detail: "1.3 h / 1.2 h" },
    ]);
  });

  test("skips a variant code it has already seen", () => {
    const twice = normsFromArticle({
      ...article,
      variants: [article.variants[0], article.variants[0]],
    });
    expect(twice.map((norm) => norm.code)).toEqual(["TST10A01"]);
  });
});

describe("checkNorm", () => {
  const resources = normsFromArticle(article)[0].resources;

  test("treats a rounding-sized labour difference as a warning", () => {
    expect(checkNorm({ resources, totalLaborHours: 1.015 })).toEqual([
      { code: "labor_sum", level: "warning", detail: "1 h / 1.015 h" },
    ]);
  });

  test("only reports a printed price that differs from the unit prices", () => {
    expect(checkNorm({ resources, totalPrice: 75 })).toEqual([
      { code: "price_total", level: "info", detail: "68 / 75 (-9.3%)" },
    ]);
  });

  test("rejects a missing or non-positive quantity", () => {
    expect(checkNorm({ resources: [] })).toEqual([
      { code: "no_resources", level: "error" },
    ]);
    const zero = [{ ...resources[0], quantity: 0 }, ...resources.slice(1)];
    expect(checkNorm({ resources: zero })).toEqual([
      {
        code: "quantity_invalid",
        level: "error",
        detail: "Placă minerală 50 mm",
      },
    ]);
  });

  test("warns about units it doesn't know and norms without labour", () => {
    const odd = [{ ...resources[0], unit: "pachet", unitRaw: "pachet" }];
    expect(checkNorm({ resources: odd })).toEqual([
      { code: "unit_unknown", level: "warning", detail: "pachet" },
      { code: "no_labor", level: "info" },
    ]);
  });
});

describe("batchArticles", () => {
  const article = (baseCode: string, variants: number) => ({
    baseCode,
    variantCodes: Array.from({ length: variants }, (_, i) => `A0${i + 1}`),
  });

  test("fills each batch up to the variant limit, keeping document order", () => {
    const batches = batchArticles(
      [
        article("TST1", 3),
        article("TST2", 4),
        article("TST3", 2),
        article("TST4", 0),
      ],
      8,
    );
    expect(batches.map((batch) => batch.map((a) => a.baseCode))).toEqual([
      ["TST1", "TST2"],
      ["TST3", "TST4"],
    ]);
  });

  test("puts an article bigger than the limit alone", () => {
    const batches = batchArticles([article("TST1", 2), article("TST2", 12)], 8);
    expect(batches.map((batch) => batch.length)).toEqual([1, 1]);
  });
});

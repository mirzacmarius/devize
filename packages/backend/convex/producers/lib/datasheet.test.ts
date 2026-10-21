import { describe, expect, test } from "bun:test";
import { cleanDatasheetNorm, type DatasheetNormOutput } from "./datasheet";

// A made-up data sheet's reading. Never use a real producer's documents in
// tests: they are copyrighted and the repository is public.
function output(
  fields: Partial<DatasheetNormOutput> = {},
): DatasheetNormOutput {
  return {
    isDatasheet: true,
    product: { name: "Adeziv Test Flex", packaging: "sac 25 kg", page: 1 },
    norm: {
      code: "adz test/01 ",
      title: "  Lipirea plăcilor termoizolante cu Adeziv Test Flex ",
      unit: "m²",
      category: "Termoizolații",
      includes: "Amorsarea suportului și lipirea plăcilor.",
      excludes: null,
      measurement: null,
    },
    resources: [
      {
        kind: "material",
        name: "Adeziv Test Flex",
        unit: "kg",
        quantity: 4.5,
        page: 2,
        quote: "Consum: 4–5 kg/m²",
        basis: "media intervalului 4–5 kg/mp",
      },
      {
        kind: "labor",
        name: "Montator termosisteme",
        unit: "ore",
        quantity: 0.35,
        page: null,
        quote: "nu apare",
        basis: "estimare uzuală, fișa nu dă manopera",
      },
      {
        kind: "material",
        name: "Plasă din fibră de sticlă",
        unit: "m2",
        quantity: 1.1,
        page: 9,
        quote: "Plasă 1,1 m²/m²",
        basis: null,
      },
      {
        kind: "material",
        name: "   ",
        unit: "kg",
        quantity: 1,
        page: 2,
        quote: null,
        basis: null,
      },
      {
        kind: "equipment",
        name: "Malaxor",
        unit: "ora",
        quantity: -1,
        page: 2,
        quote: null,
        basis: null,
      },
    ],
    conditions: [
      { text: "Temperatura aerului între +5 °C și +30 °C.", page: 2 },
      { text: "  ", page: 3 },
    ],
    checks: ["Manopera e estimată."],
    ...fields,
  };
}

describe("reading a data sheet into a norm", () => {
  test("keeps the figures with their pages and labels the estimates", () => {
    const result = cleanDatasheetNorm(output(), 4);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const { value } = result;
    expect(value.norm).toMatchObject({
      code: "ADZ-TEST-01",
      title: "Lipirea plăcilor termoizolante cu Adeziv Test Flex",
      unit: "mp",
      category: "Termoizolații",
    });
    expect(value.norm.excludes).toBeUndefined();
    expect(value.product).toEqual({
      name: "Adeziv Test Flex",
      packaging: "sac 25 kg",
    });
    // The blank name and the negative quantity are dropped.
    expect(value.resources.map((row) => [row.name, row.unit])).toEqual([
      ["Adeziv Test Flex", "kg"],
      ["Montator termosisteme", "ora"],
      ["Plasă din fibră de sticlă", "mp"],
    ]);
    expect(value.resources.map((row) => row.note)).toEqual([
      "Fișa tehnică, p. 2: „Consum: 4–5 kg/m²”. media intervalului 4–5 kg/mp",
      "Estimare Devize AI: estimare uzuală, fișa nu dă manopera",
      // Page 9 isn't in a 4-page document, so the figure is an estimate.
      "Estimare Devize AI: cifra nu apare în fișa tehnică",
    ]);
    expect(value.sourcePages).toEqual([1, 2]);
    expect(value.conditions).toEqual([
      { text: "Temperatura aerului între +5 °C și +30 °C.", page: 2 },
    ]);
    expect(value.checks).toEqual(["Manopera e estimată."]);
  });

  test("refuses a document that isn't a data sheet, or a norm it can't use", () => {
    expect(cleanDatasheetNorm(output({ isDatasheet: false }))).toEqual({
      ok: false,
      error: "not_datasheet",
    });
    expect(cleanDatasheetNorm(output({ resources: [] }))).toEqual({
      ok: false,
      error: "invalid_output",
    });
    const base = output();
    expect(
      cleanDatasheetNorm(output({ norm: { ...base.norm, unit: "%" } })),
    ).toEqual({ ok: false, error: "invalid_output" });
  });

  test("gives a norm a code even when the model gave none it can use", () => {
    const base = output();
    const result = cleanDatasheetNorm(
      output({ norm: { ...base.norm, code: " ** " } }),
    );
    expect(result.ok && result.value.norm.code).toBe("FT-01");
  });
});

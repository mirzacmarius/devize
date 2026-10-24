import { describe, expect, test } from "bun:test";
import {
  type AiNormOutput,
  aiNormRequest,
  aiNormSchema,
  cleanAiNorm,
} from "./aiNorm";

// What the model might answer for a made-up waterproofing work.
const output: AiNormOutput = {
  isWork: true,
  norm: {
    code: "hid ter 01",
    title:
      "  Hidroizolație la terase cu membrană bituminoasă,\n în două straturi ",
    unit: "m²",
    category: "Hidroizolații",
    includes: "Amorsarea suportului și lipirea celor două straturi.",
    excludes: null,
    measurement: "Suprafața reală.",
  },
  resources: [
    {
      kind: "material",
      name: "Membrană bituminoasă 4 mm",
      unit: "mp",
      quantity: 2.3,
      basis: "două straturi cu 15% suprapuneri și pierderi",
      referencePrice: 24.456,
    },
    {
      kind: "material",
      name: "Amorsă bituminoasă",
      unit: "l",
      quantity: 0.3,
      basis: "consum uzual",
      referencePrice: null,
    },
    {
      kind: "material",
      name: "Material mărunt",
      unit: "%",
      quantity: 2,
      basis: "ca în normele de bază",
      referencePrice: 10,
    },
    {
      kind: "labor",
      name: "Izolator",
      unit: "ore",
      quantity: 0.6,
      basis: "consum uzual",
      referencePrice: 45,
    },
    {
      kind: "labor",
      name: "Muncitor necalificat",
      unit: "mp",
      quantity: 0.1,
      basis: "pe mp",
      referencePrice: null,
    },
    {
      kind: "equipment",
      name: "Arzător cu propan",
      unit: "cutii",
      quantity: 0.2,
      basis: "unitate necunoscută",
      referencePrice: 12,
    },
    {
      kind: "equipment",
      name: "Arzător cu propan",
      unit: "h",
      quantity: 0,
      basis: "zero",
      referencePrice: 12,
    },
    {
      kind: "transport",
      name: "Transport materiale",
      unit: "%",
      quantity: 3,
      basis: "procent din materiale",
      referencePrice: null,
    },
  ],
  assumptions: ["Suportul e o șapă existentă, curată.", ""],
  checks: ["Prețul membranei e orientativ."],
};

describe("cleanAiNorm", () => {
  test("keeps the norm the catalog takes, with where each figure comes from", () => {
    const result = cleanAiNorm(output);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.norm).toEqual({
      code: "HID-TER-01",
      title:
        "Hidroizolație la terase cu membrană bituminoasă, în două straturi",
      unit: "mp",
      category: "Hidroizolații",
      includes: "Amorsarea suportului și lipirea celor două straturi.",
      excludes: undefined,
      measurement: "Suprafața reală.",
    });
    expect(result.value.resources).toEqual([
      {
        kind: "material",
        name: "Membrană bituminoasă 4 mm",
        unit: "mp",
        quantity: 2.3,
        // Rounded to bani, and said to be orientative.
        referencePrice: 24.46,
        note: "Devize AI: două straturi cu 15% suprapuneri și pierderi. Prețul e orientativ, de verificat.",
      },
      {
        kind: "material",
        name: "Amorsă bituminoasă",
        unit: "l",
        quantity: 0.3,
        referencePrice: undefined,
        note: "Devize AI: consum uzual",
      },
      // A percentage of the materials carries no price of its own.
      {
        kind: "material",
        name: "Material mărunt",
        unit: "%",
        quantity: 2,
        referencePrice: undefined,
        note: "Devize AI: ca în normele de bază",
      },
      // Labour is priced by the firm's Tarife, never by the model.
      {
        kind: "labor",
        name: "Izolator",
        unit: "ora",
        quantity: 0.6,
        referencePrice: undefined,
        note: "Devize AI: consum uzual",
      },
      {
        kind: "labor",
        name: "Muncitor necalificat",
        unit: "mp",
        quantity: 0.1,
        referencePrice: undefined,
        note: "Devize AI: pe mp",
      },
      {
        kind: "transport",
        name: "Transport materiale",
        unit: "%",
        quantity: 3,
        referencePrice: undefined,
        note: "Devize AI: procent din materiale",
      },
    ]);
    expect(result.value.assumptions).toEqual([
      "Suportul e o șapă existentă, curată.",
    ]);
    expect(result.value.checks).toEqual(["Prețul membranei e orientativ."]);
  });

  test("refuses what isn't a work, or a norm without usable resources", () => {
    expect(cleanAiNorm({ ...output, isWork: false })).toEqual({
      ok: false,
      error: "not_work",
    });
    expect(
      cleanAiNorm({ ...output, norm: { ...output.norm, unit: "%" } }),
    ).toEqual({ ok: false, error: "invalid_output" });
    expect(
      cleanAiNorm({ ...output, norm: { ...output.norm, unit: "palete" } }),
    ).toEqual({ ok: false, error: "invalid_output" });
    expect(
      cleanAiNorm({
        ...output,
        resources: output.resources.filter((row) => row.quantity === 0),
      }),
    ).toEqual({ ok: false, error: "invalid_output" });
  });

  test("falls back to a code when the model's has nothing usable", () => {
    const result = cleanAiNorm({
      ...output,
      norm: { ...output.norm, code: "?!" },
    });
    expect(result.ok && result.value.norm.code).toBe("AI-01");
  });
});

describe("aiNormRequest", () => {
  test("tells the model about the firm, the Deviz and the firm's rates", () => {
    const request = aiNormRequest({
      firm: "Ana Construct SRL",
      description: "Hidroizolație terasă cu membrană, două straturi",
      estimate: { title: "Bloc A", county: "Cluj" },
      rates: [
        { kind: "labor", name: "Izolator", unit: "ora" },
        { kind: "equipment", name: "Arzător", unit: "ora" },
      ],
    });
    expect(request).toContain("Firma: Ana Construct SRL");
    expect(request).toContain(
      "Devizul în care intră norma: Bloc A, județul Cluj",
    );
    expect(request).toContain("Meseriile din tarifele firmei: Izolator (ora)");
    expect(request).toContain("Utilajele din tarifele firmei: Arzător (ora)");
    expect(request).toContain(
      "Lucrarea descrisă de firmă:\nHidroizolație terasă cu membrană, două straturi",
    );
    expect(request).not.toContain("\n\n\n");
  });

  test("says when the firm has no rates yet", () => {
    const request = aiNormRequest({
      firm: "Ana Construct SRL",
      description: "Zugrăveli",
      rates: [],
    });
    expect(request).toContain("Firma nu are încă tarife pe meserii");
    expect(request).not.toContain("Devizul în care intră norma");
  });

  test("names the catalog's categories, for the model and in the schema", () => {
    const request = aiNormRequest({
      firm: "Ana Construct SRL",
      description: "Zidărie din BCA",
      rates: [],
    });
    const schema = aiNormSchema.shape.norm.shape.category.description ?? "";
    for (const text of [request, schema]) {
      expect(text).toContain("Zidărie, Confecții metalice, Acoperișuri");
      expect(text).toContain("Organizare de șantier și diverse");
      expect(text).not.toContain("[object Object]");
    }
  });
});

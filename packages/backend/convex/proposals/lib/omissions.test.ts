import { describe, expect, test } from "bun:test";
import { cleanOmissions } from "./omissions";
import { omissionsRequest } from "./prompts";
import type { OmissionsOutput } from "./schemas";

const lines = new Map([
  ["L1", "line-demolition"],
  ["L2", "line-tiling"],
]);

const waterproofing: OmissionsOutput["missing"][number] = {
  chapter: "Hidroizolații",
  title: "Hidroizolație sub placări ceramice, cu bandă la colțuri",
  unit: "m2",
  basis: ["L2", "l2", "L9"],
  reason: "Faianța din duș se pune peste hidroizolație.",
  takeoff: [
    {
      label: "Din placarea cu faianță, zona dușului",
      count: 6.5,
      length: null,
      width: null,
      height: null,
      deduct: false,
    },
  ],
  confidence: "high",
  searchTerms: ["hidroizolatie sub faianta", "hidroizolatie dus"],
  resources: [
    {
      kind: "material",
      name: "Hidroizolație bicomponentă",
      unit: "kg",
      quantity: 1.5,
    },
    { kind: "labor", name: "Faianțar", unit: "ore", quantity: 0.25 },
  ],
};

const output: OmissionsOutput = {
  summary:
    "  Devizul reface placajul băii; lipsesc lucrările din zona dușului.  ",
  missing: [
    waterproofing,
    // No quantity: dropped.
    { ...waterproofing, title: "Evacuare moloz", takeoff: [] },
    // A percentage isn't a work: dropped.
    { ...waterproofing, title: "Cheltuieli diverse", unit: "%" },
    {
      ...waterproofing,
      chapter: "  ",
      title: "Protejarea pardoselii",
      basis: [],
      confidence: "low",
    },
  ],
  remarks: ["Gresia are 4 mp, dar demontarea pardoselii 6 mp.", ""],
  questions: ["Dușul are cădiță sau e la nivelul pardoselii?"],
};

describe("omissions", () => {
  test("keeps the works with a quantity, linked to the articles named", () => {
    const found = cleanOmissions(output, lines, false);
    expect(found.summary).toBe(
      "Devizul reface placajul băii; lipsesc lucrările din zona dușului.",
    );
    expect(found.articles.map((article) => article.title)).toEqual([
      "Hidroizolație sub placări ceramice, cu bandă la colțuri",
      "Protejarea pardoselii",
    ]);
    const [first, second] = found.articles;
    // Keys are read without case, once each; an unknown one is dropped.
    expect(first?.basis).toEqual(["line-tiling"]);
    expect(first?.unit).toBe("mp");
    expect(first?.measured).toBe(6.5);
    expect(first?.note).toBe("Faianța din duș se pune peste hidroizolație.");
    expect(first?.resources[1]).toEqual({
      kind: "labor",
      name: "Faianțar",
      unit: "ora",
      quantity: 0.25,
    });
    expect(second?.chapter).toBe("Diverse");
    expect(second?.basis).toEqual([]);
    expect(found.remarks).toEqual([
      "Gresia are 4 mp, dar demontarea pardoselii 6 mp.",
    ]);
    expect(found.questions).toEqual([
      "Dușul are cădiță sau e la nivelul pardoselii?",
    ]);
  });

  test("turns a tender's missing works into clarifications", () => {
    const found = cleanOmissions(
      {
        ...output,
        missing: [waterproofing],
        questions: ["Lista nu cuprinde evacuarea molozului (poz. 3)."],
      },
      lines,
      true,
    );
    expect(found.articles).toEqual([]);
    expect(found.questions).toEqual([
      "Lista nu cuprinde evacuarea molozului (poz. 3).",
      "Hidroizolație sub placări ceramice, cu bandă la colțuri: Faianța din duș se pune peste hidroizolație.",
    ]);
  });

  test("lists the Deviz by section, with what each norm includes", () => {
    const request = omissionsRequest({
      title: "Baie apartament Popescu",
      kind: "private",
      description: "Refacere baie, duș la nivelul pardoselii",
      county: "Cluj",
      lines: [
        {
          key: "L1",
          code: "—",
          title: "Demontare faianță existentă",
          unit: "mp",
          quantity: 24.32,
          materials: [],
        },
        {
          key: "L2",
          section: "Placări ceramice",
          code: "DV-FAI-01",
          title: "Placare cu faianță pe pereți",
          unit: "mp",
          quantity: 24.32,
          includes: "adezivul și chitul de rosturi",
          materials: ["Adeziv flexibil C2TE", "Faianță"],
        },
      ],
      more: 3,
    });
    expect(request).toBe(
      [
        "Devizul: Baie apartament Popescu (lucrare privată)",
        "Descrierea devizului: Refacere baie, duș la nivelul pardoselii",
        "Județul: Cluj",
        "",
        "Articolele devizului, pe capitole, fiecare cu cheia lui:",
        "",
        "Fără capitol",
        "L1. Demontare faianță existentă — 24,32 mp",
        "",
        "Placări ceramice",
        "L2. DV-FAI-01 Placare cu faianță pe pereți — 24,32 mp",
        "   Include: adezivul și chitul de rosturi",
        "   Materiale: Adeziv flexibil C2TE, Faianță",
        "",
        "Devizul mai are 3 articole, care nu încap aici.",
      ].join("\n"),
    );
  });

  test("names a tender's positions as the lists do", () => {
    const request = omissionsRequest({
      title: "Reabilitare școală",
      kind: "tender",
      lines: [
        {
          key: "L1",
          section: "Obiectul 1 Corp A / Cap. 2 Finisaje",
          code: "CZ0101A1",
          position: "3",
          title: "Desfacere pardoseală din parchet",
          unit: "mp",
          quantity: 120,
          materials: [],
        },
      ],
      more: 0,
    });
    expect(request).toContain(
      "Devizul: Reabilitare școală (licitație publică: articolele sunt pozițiile din listele autorității contractante)",
    );
    expect(request).toContain(
      "Obiectul 1 Corp A / Cap. 2 Finisaje\nL1. Poz. 3, cod CZ0101A1: Desfacere pardoseală din parchet — 120 mp",
    );
    expect(request).not.toContain("mai are");
  });

  test("lists what the compatibility check already flagged", () => {
    const input = {
      title: "Renovare baie",
      kind: "private" as const,
      lines: [
        {
          key: "L1",
          code: "DV-PRD-03",
          title: "Pardoseală din gresie",
          unit: "mp",
          quantity: 6,
          materials: [],
        },
      ],
      more: 0,
    };
    expect(
      omissionsRequest({
        ...input,
        flagged: [
          {
            keys: ["L1"],
            sentence:
              "Sistemul „Pardoseală din gresie” cere și „Hidroizolație sub placaje”.",
          },
        ],
      }),
    ).toContain(
      [
        "L1. DV-PRD-03 Pardoseală din gresie — 6 mp",
        "",
        "Semnalate deja de verificarea de compatibilitate (constructorul le vede acolo, cu remedierea):",
        "- L1: Sistemul „Pardoseală din gresie” cere și „Hidroizolație sub placaje”.",
      ].join("\n"),
    );
    expect(omissionsRequest({ ...input, flagged: [] })).not.toContain(
      "Semnalate",
    );
  });
});

import { describe, expect, test } from "bun:test";
import { amountsOf, fields, rowLabelled, tablesOf } from "./documents.helper";
import { buildDocuments } from "./index";
import type { ExportOptions } from "./input";
import type { FormDocument } from "./model";
import { sampleData, schoolData } from "./sample.helper";

// The Deviz general, the objects' Devize and the forms of a financial offer
// (F1, F2, F4, F5) for a made-up school: they must agree with each other and
// with the lists of quantities, to the ban.

const options: ExportOptions = { withValues: true, date: "2026-10-21" };

const bani = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;

function only(documents: FormDocument[], id: string) {
  return documents.filter((document) => document.id === id);
}

/** What each F3 of the school closes on, by category name. */
function f3Totals(documents: FormDocument[]) {
  return new Map(
    only(documents, "F3").map((document) => [
      document.name.replace("Formularul F3 · ", ""),
      amountsOf(rowLabelled(tablesOf(document)[0], "TOTAL fără TVA"))[0] ?? 0,
    ]),
  );
}

describe("the forms of a financial offer", () => {
  const documents = buildDocuments(
    schoolData(),
    ["DG", "DO", "F1", "F2", "F3", "F4", "F5"],
    options,
  );
  const f3 = f3Totals(documents);
  const f3Of = (...names: string[]) =>
    bani(names.map((name) => f3.get(name) ?? Number.NaN));

  test("makes F2 and the object's Deviz from the categories' F3", () => {
    // Only the school has works in the base investment.
    expect(only(documents, "F2").map((document) => document.name)).toEqual([
      "Formularul F2 · 01 Corp școală",
    ]);
    const f2 = tablesOf(only(documents, "F2")[0])[0];
    const constructions = f3Of(
      "Terasamente",
      "Structură de rezistență",
      "Arhitectură",
      "Instalații electrice",
    );
    const purchases = f3Of("Utilaje și echipamente tehnologice", "Dotări");
    expect(amountsOf(rowLabelled(f2, "TOTAL I – subcapitolul 4.1"))).toEqual([
      constructions,
    ]);
    expect(
      amountsOf(
        rowLabelled(f2, "TOTAL III – subcapitolele 4.3 + 4.4 + 4.5 + 4.6"),
      ),
    ).toEqual([purchases]);
    const total = bani([constructions, purchases]);
    expect(
      amountsOf(rowLabelled(f2, "TOTAL (TOTAL I + TOTAL II + TOTAL III)")),
    ).toEqual([total]);

    const objectDeviz = tablesOf(only(documents, "DO")[0])[0];
    const [value, vat, withVat] = amountsOf(
      rowLabelled(
        objectDeviz,
        "TOTAL DEVIZ PE OBIECT (TOTAL I + TOTAL II + TOTAL III)",
      ),
    );
    expect(value).toBe(total);
    // VAT on each subchapter, the column adding up.
    const subchapterVats = (objectDeviz?.rows ?? [])
      .filter((row) => /^4\.\d(\.\d)?$/.test(row.cells[0]?.text ?? ""))
      .map((row) => amountsOf(row)[1] ?? 0);
    expect(vat).toBe(bani(subchapterVats));
    expect(withVat).toBe(bani([value ?? 0, vat ?? 0]));
  });

  test("makes the Deviz general and F1 add up to the objects", () => {
    const general = tablesOf(only(documents, "DG")[0])[0];
    const objectDeviz = tablesOf(only(documents, "DO")[0])[0];
    const objectTotal = amountsOf(
      rowLabelled(
        objectDeviz,
        "TOTAL DEVIZ PE OBIECT (TOTAL I + TOTAL II + TOTAL III)",
      ),
    );
    expect(amountsOf(rowLabelled(general, "Total capitol 4"))).toEqual(
      objectTotal,
    );
    const utilities = f3Of("Branșamente utilități");
    const site = f3Of("Construcții provizorii");
    expect(amountsOf(rowLabelled(general, "Total capitol 2"))[0]).toBe(
      utilities,
    );
    expect(amountsOf(rowLabelled(general, "Total capitol 5"))[0]).toBe(site);
    const [total, vat] = amountsOf(rowLabelled(general, "TOTAL GENERAL"));
    expect(total).toBe(bani([...f3.values()]));
    // Rows with no works stay empty, totals included.
    expect(amountsOf(rowLabelled(general, "Total capitol 3"))).toEqual([]);
    expect(
      amountsOf(rowLabelled(general, "Cheltuieli aferente marjei de buget")),
    ).toEqual([]);

    const f1 = tablesOf(only(documents, "F1")[0])[0];
    const [f1Total, constructionWorks] = amountsOf(
      rowLabelled(f1, "TOTAL fără TVA"),
    );
    expect(f1Total).toBe(total);
    // C+M leaves out the equipment and furnishings bought for the school.
    expect(constructionWorks).toBe(
      bani([total ?? 0, -f3Of("Utilaje și echipamente tehnologice", "Dotări")]),
    );
    expect(
      amountsOf(
        rowLabelled(
          general,
          "din care: C + M (1.2 + 1.3 + 1.4 + 2 + 4.1 + 4.2 + 5.1.1)",
        ),
      )[0],
    ).toBe(constructionWorks);
    expect(amountsOf(rowLabelled(f1, "TVA (21%)"))).toEqual([vat ?? 0]);
    expect(
      amountsOf(
        rowLabelled(f1, "Cheltuieli pentru investiția de bază, din care:"),
      ),
    ).toEqual([
      objectTotal[0] ?? 0,
      f3Of(
        "Terasamente",
        "Structură de rezistență",
        "Arhitectură",
        "Instalații electrice",
      ),
    ]);
    expect(rowLabelled(f1, "– 01 Corp școală")?.kind).toBe("detail");
  });

  test("lists the equipment in F4 at prices that add up to subchapters 4.3–4.6", () => {
    const [f4] = only(documents, "F4");
    expect(fields(f4).Obiectul).toBe("01 Corp școală");
    const table = tablesOf(f4)[0];
    const items = (table?.rows ?? []).filter((row) => row.kind === "item");
    expect(items.map((row) => row.cells.map((cell) => cell.text))).toEqual([
      [
        "1",
        "Centrală termică în condensare 35 kW",
        "buc",
        "1,00",
        "8.131,20",
        "8.131,20",
        "Hornbach",
        "nr. 1",
      ],
      [
        "2",
        "Bancă școlară pentru doi elevi",
        "buc",
        "15,00",
        "485,09",
        "7.276,35",
        "Leroy Merlin",
        "nr. 2",
      ],
    ]);
    const rounding = amountsOf(
      rowLabelled(table, "Diferențe din rotunjirea prețurilor unitare"),
    );
    expect(rounding).toEqual([-0.02]);
    expect(amountsOf(rowLabelled(table, "TOTAL"))).toEqual([
      f3Of("Utilaje și echipamente tehnologice", "Dotări"),
    ]);

    const sheets = only(documents, "F5");
    expect(sheets.map((sheet) => sheet.blocks[1])).toEqual([
      { type: "title", lines: ["FIȘA TEHNICĂ nr. 1"] },
      { type: "title", lines: ["FIȘA TEHNICĂ nr. 2"] },
    ]);
    expect(sheets[1]?.blocks[2]).toEqual({
      type: "fields",
      items: [
        {
          label: "Utilajul, echipamentul tehnologic",
          value: "Bancă școlară pentru doi elevi",
        },
      ],
    });
  });

  test("names each object with its code on every form", () => {
    const terrace = only(documents, "F3").find((document) =>
      document.name.endsWith("Terasamente"),
    );
    expect(fields(terrace).Obiectul).toBe("01 Corp școală");
    const lists = buildDocuments(schoolData(), ["C6"], options);
    expect(lists.map((document) => document.name)).toEqual([
      "Formularul C6 · Lucrări generale",
      "Formularul C6 · 01 Corp școală",
      "Formularul C6 · 02 Organizare de șantier",
    ]);
  });

  test("moves works where the person placed them", () => {
    const moved = buildDocuments(schoolData(), ["F2", "F4", "F5"], {
      ...options,
      subchapters: { boiler: "4.1.4" },
    });
    const f2 = tablesOf(only(moved, "F2")[0])[0];
    expect(
      amountsOf(
        rowLabelled(f2, "TOTAL III – subcapitolele 4.3 + 4.4 + 4.5 + 4.6"),
      ),
    ).toEqual([f3Of("Dotări")]);
    const items = (tablesOf(only(moved, "F4")[0])[0]?.rows ?? []).filter(
      (row) => row.kind === "item",
    );
    expect(items.map((row) => row.cells[1]?.text)).toEqual([
      "Bancă școlară pentru doi elevi",
    ]);
    // Without F5 in the export, F4 refers to no sheets.
    const alone = buildDocuments(schoolData(), ["F4"], options);
    const first = tablesOf(alone[0])[0]?.rows.find(
      (row) => row.kind === "item",
    );
    expect(first?.cells.at(-1)?.text).toBe("");
    expect(only(moved, "F5")).toHaveLength(1);
  });
});

describe("forms with nothing to list", () => {
  test("says F4 has no equipment and leaves one blank F5", () => {
    const [f4, f5] = buildDocuments(sampleData(), ["F4", "F5"], options);
    const rows = tablesOf(f4)[0]?.rows ?? [];
    expect(rows[0]?.cells[1]?.text).toBe("Nu este cazul.");
    expect(amountsOf(rows.at(-1))).toEqual([0]);
    expect(f5?.blocks[1]).toEqual({ type: "title", lines: ["FIȘA TEHNICĂ"] });
  });

  test("prints the Deviz general's frame without values for a designer", () => {
    const [general, f1] = buildDocuments(schoolData(), ["DG", "F1"], {
      ...options,
      withValues: false,
    });
    for (const document of [general, f1]) {
      for (const row of tablesOf(document)[0]?.rows ?? []) {
        expect(amountsOf(row)).toEqual([]);
      }
    }
    expect(general?.label).toBe("Devizul general");
    expect(fields(general).Obiectivul).toBeUndefined();
  });
});

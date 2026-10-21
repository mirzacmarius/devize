import { describe, expect, test } from "bun:test";
import { computeRecap } from "@devize/backend/convex/estimates/recap";
import { formatMoney } from "./format";
import { buildDocuments, documentKinds } from "./index";
import type { ExportOptions } from "./input";
import type { Block, FormDocument, Row, Table } from "./model";
import { lineItem, sampleData } from "./sample.helper";

const options: ExportOptions = { withValues: true, date: "2026-10-21" };

function tablesOf(document: FormDocument | undefined): Table[] {
  return (document?.blocks ?? []).filter(
    (block): block is Table => block.type === "table",
  );
}

/** The last row with a cell saying `label`: the closing, not a line item's. */
function rowLabelled(table: Table | undefined, label: string): Row | undefined {
  return [...(table?.rows ?? [])]
    .reverse()
    .find((row) => row.cells.some((cell) => cell.text === label));
}

function fields(document: FormDocument | undefined) {
  const block = document?.blocks.find(
    (item): item is Extract<Block, { type: "fields" }> =>
      item.type === "fields",
  );
  return Object.fromEntries(
    (block?.items ?? []).map((item) => [item.label, item.value]),
  );
}

describe("buildDocuments", () => {
  test("prints every form of a kind before the next kind", () => {
    const documents = buildDocuments(sampleData(), documentKinds, options);
    expect(documents.map((document) => document.id)).toEqual([
      "DEVIZ",
      ...Array(4).fill("F3"),
      ...Array(4).fill("C5"),
      // By object: the general works, the apartment and the terrace.
      ...Array(3).fill("C6"),
      ...Array(3).fill("C7"),
      ...Array(3).fill("C8"),
      ...Array(3).fill("C9"),
    ]);
    expect(documents[2]?.name).toBe("Formularul F3 · 01 Demolări");
  });

  test("closes each F3 on its category's own Recapitulație", () => {
    const data = sampleData();
    const [f3] = buildDocuments(
      { ...data, sections: data.sections.filter((s) => s._id !== "apartment") },
      ["F3"],
      options,
    ).filter((document) => document.name.endsWith("Finisaje"));
    const items = data.lineItems.filter(
      (item) => item.sectionId === "finishes",
    );
    const recap = computeRecap(items, data.estimate.markups);
    const total = rowLabelled(tablesOf(f3)[0], "TOTAL fără TVA");
    expect(total?.cells.at(-1)?.text).toBe(formatMoney(recap.subtotal));
    expect(fields(f3)).toEqual({
      Beneficiar: "Ana Popescu",
      Ofertant: "Constructor Exemplu SRL",
      Obiectivul: "Renovare apartament",
      Obiectul: "Lucrări generale",
    });
  });

  test("leaves prices out of the lists a designer publishes", () => {
    const documents = buildDocuments(sampleData(), ["F3", "C5", "C6"], {
      ...options,
      withValues: false,
      designer: "Proiect Exemplu SRL",
    });
    for (const document of documents) {
      const [table] = tablesOf(document);
      // No closing, and of the numbers only the quantities are left.
      for (const row of table?.rows ?? []) {
        expect(row.kind).toBe("item");
        expect(
          row.cells.filter((cell) => cell.value !== undefined).length,
        ).toBeLessThanOrEqual(1);
      }
      expect(fields(document).Ofertant).toBeUndefined();
      expect(fields(document).Proiectant).toBe("Proiect Exemplu SRL");
      const signatures = document.blocks.find(
        (block) => block.type === "signatures",
      );
      expect(signatures).toMatchObject({
        items: [{ role: "Întocmit,", name: "Proiect Exemplu SRL" }],
      });
    }
    const [f3] = documents;
    const [first] = tablesOf(f3)[0]?.rows ?? [];
    expect(first?.cells.map((cell) => cell.text)).toEqual([
      "1",
      "Curățenie finală",
      "mp",
      "60,00",
      "",
      "",
    ]);
  });

  test("lists a tender's own positions, units and quantities", () => {
    const data = sampleData();
    data.estimate.kind = "tender";
    data.estimate.tender = { authority: "Primăria Comunei Exemplu" };
    data.sections = [];
    data.lineItems = [
      lineItem({
        code: "FX10",
        title: "Placare cu gresie",
        unit: "mp",
        quantity: 20,
        tenderRef: {
          position: "3.1",
          code: "CA02D1",
          text: "Placaj cu plăci ceramice",
          unit: "100 mp",
          quantity: 0.2,
        },
        resources: [
          {
            kind: "material",
            name: "Gresie",
            unit: "mp",
            quantity: 1.05,
            unitPrice: 60,
          },
          {
            kind: "labor",
            name: "Faianțar",
            unit: "ora",
            quantity: 0.9,
            unitPrice: 45,
          },
        ],
      }),
    ];
    const [f3] = buildDocuments(data, ["F3"], options);
    expect(fields(f3).Beneficiar).toBe("Primăria Comunei Exemplu");
    const [item] = tablesOf(f3)[0]?.rows ?? [];
    // 20 mp at 63 + 40,50 lei is 2.070 lei, so 0,2 × 100 mp at 10.350 lei.
    expect(item?.cells.map((cell) => cell.text)).toEqual([
      "3.1",
      "CA02D1",
      "100 mp",
      "0,20",
      "10.350,00",
      "2.070,00",
    ]);
    expect(item?.cells[1]?.more).toEqual([
      { text: "Placaj cu plăci ceramice" },
    ]);
  });

  test("prices a line the tender counts differently so its row multiplies out", () => {
    const data = sampleData();
    data.estimate.kind = "tender";
    data.sections = [];
    data.lineItems = [
      lineItem({
        code: "X1",
        title: "Montaj",
        unit: "mp",
        quantity: 3,
        tenderRef: {
          position: "1.2",
          text: "Montaj",
          unit: "buc",
          quantity: 7,
        },
        resources: [
          {
            kind: "labor",
            name: "Montator",
            unit: "ora",
            quantity: 1,
            unitPrice: 33.3333,
          },
        ],
      }),
    ];
    const [f3, c7] = buildDocuments(data, ["F3", "C7"], {
      ...options,
      resourceScope: "estimate",
    });
    const table = tablesOf(f3)[0];
    // 3 mp at 33,33 lei make 99,99 lei: 14,28 lei for each of 7 pieces.
    expect(table?.rows[0]?.cells.map((cell) => cell.text)).toEqual([
      "1.2",
      "Montaj",
      "buc",
      "7,00",
      "14,28",
      "99,96",
    ]);
    expect(
      rowLabelled(table, "Total articole, din care:")?.cells.at(-1)?.text,
    ).toBe("99,96");
    const c7Table = tablesOf(c7)[0];
    expect(
      rowLabelled(c7Table, "Diferențe din rotunjirea prețurilor unitare")
        ?.cells[2]?.text,
    ).toBe("-0,04");
    expect(rowLabelled(c7Table, "TOTAL")?.cells[2]?.text).toBe("99,96");
  });

  test("makes the resource lists agree with the lists of quantities", () => {
    const data = sampleData();
    const documents = buildDocuments(data, ["F3", "C6", "C7"], {
      ...options,
      resourceScope: "estimate",
    });
    const sumOf = (label: string) =>
      documents
        .filter((document) => document.id === "F3")
        .map((document) => rowLabelled(tablesOf(document)[0], label))
        .reduce(
          (bani, row) =>
            bani + Math.round((row?.cells.at(-1)?.value ?? 0) * 100),
          0,
        ) / 100;
    const totalOf = (id: string) =>
      rowLabelled(
        tablesOf(documents.find((document) => document.id === id))[0],
        "TOTAL",
      )?.cells.find((cell) => cell.value !== undefined)?.value;
    expect(totalOf("C6")).toBe(sumOf("a) materiale"));
    expect(totalOf("C7")).toBe(sumOf("b) manoperă"));
  });

  test("says when a list has nothing to list", () => {
    const data = sampleData();
    data.lineItems = data.lineItems.filter((item) =>
      item.resources.every((resource) => resource.kind !== "equipment"),
    );
    const [c8] = buildDocuments(data, ["C8"], {
      ...options,
      resourceScope: "estimate",
    });
    const rows = tablesOf(c8)[0]?.rows ?? [];
    expect(rows[0]?.cells[1]?.text).toBe("Nu este cazul.");
    expect(rows.at(-1)?.cells.at(-1)?.text).toBe("0,00");
  });

  test("uses the tender documentation's names for the forms", () => {
    const [f3] = buildDocuments(sampleData(), ["F3"], {
      ...options,
      labels: { F3: "Formularul nr. 5" },
    });
    expect(f3?.label).toBe("Formularul nr. 5");
    expect(f3?.footer).toBe("DVZ-0142 · Formularul nr. 5 · Lucrări diverse");
  });
});

describe("the client's Deviz", () => {
  test("numbers items as the Deviz's page does and adds VAT", () => {
    const data = sampleData();
    const [deviz] = buildDocuments(data, ["DEVIZ"], options);
    const [items, recap] = tablesOf(deviz);
    const numbered = (items?.rows ?? [])
      .filter((row) => row.kind === "item" && row.cells.length === 6)
      .map((row) => [row.cells[0]?.text, row.cells[1]?.text]);
    expect(numbered).toEqual([
      ["1", "Curățenie finală"],
      ["2", "Desfacerea pardoselii din parchet, cu evacuarea molozului"],
      [
        "3",
        "Placare cu gresie porțelanată 60x60 cm, lipită cu adeziv flexibil",
      ],
      ["4", "Zugrăveli lavabile interioare în două straturi, pe glet existent"],
      ["5", "Hidroizolație cu membrană bituminoasă lipită cu flacără"],
    ]);
    const expected = computeRecap(data.lineItems, data.estimate.markups);
    expect(rowLabelled(recap, "TOTAL cu TVA")?.cells[1]?.text).toBe(
      formatMoney(expected.total),
    );
    expect(rowLabelled(recap, "TVA (21%)")?.cells[1]?.value).toBe(expected.vat);
  });

  test("ends on the total when the firm charges no VAT", () => {
    const data = sampleData();
    data.estimate.markups = { cam: 0, indirect: 0, profit: 0, vat: 0 };
    const [deviz] = buildDocuments(data, ["DEVIZ"], options);
    const recap = tablesOf(deviz)[1];
    expect(recap?.rows.map((row) => row.cells[0]?.text)).toEqual([
      "Materiale",
      "Manoperă",
      "Utilaj",
      "Transport",
      "TOTAL",
    ]);
  });
});

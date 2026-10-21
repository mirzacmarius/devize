import { describe, expect, test } from "bun:test";
import { amountsOf, rowLabelled, tablesOf } from "./documents.helper";
import { buildDocuments } from "./index";
import type { ExportData, ExportOptions } from "./input";
import type { FormDocument } from "./model";
import { sampleData, schoolData } from "./sample.helper";
import { leiInFiguresAndWords } from "./words";

// The offer form of a made-up school's tender: its blanks filled from F1,
// F6 and the sheet, or left for the bidder without prices.

const options: ExportOptions = {
  withValues: true,
  date: "2026-10-21",
  offer: { validity: 90, signer: "Ion Popescu", role: "administrator" },
  schedule: { months: 6 },
};

function tender(deadline?: string): ExportData {
  const data = schoolData();
  return {
    ...data,
    estimate: {
      ...data.estimate,
      tender: { ...data.estimate.tender, deadline },
    },
  };
}

/** What a document says, its paragraphs one after the other. */
function textOf(document: FormDocument | undefined): string {
  return (document?.blocks ?? [])
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n");
}

function offerForm(data: ExportData, chosen: Partial<ExportOptions> = {}) {
  return buildDocuments(data, ["OF"], { ...options, ...chosen })[0];
}

describe("the offer form", () => {
  test("writes F1's value and F6's duration in figures and in words", () => {
    const documents = buildDocuments(
      tender("2026-11-10"),
      ["OF", "F1", "F6"],
      options,
    );
    const [form, f1, f6] = documents;
    const table = tablesOf(f1)[0];
    const subtotal = amountsOf(rowLabelled(table, "TOTAL fără TVA"))[0] ?? 0;
    const total = amountsOf(rowLabelled(table, "TOTAL cu TVA"))[0] ?? 0;
    const vat = Math.round((total - subtotal) * 100) / 100;
    const text = textOf(form);

    expect(form?.id).toBe("OF");
    expect(text).toContain("Către Comuna Exemplu");
    expect(text).toContain(
      `să executăm Reabilitarea școlii gimnaziale din Exemplu pentru suma de ${leiInFiguresAndWords(subtotal)}, plătibilă după recepția lucrărilor, la care se adaugă taxa pe valoarea adăugată în valoare de ${leiInFiguresAndWords(vat)}.`,
    );
    expect(textOf(f6)).toContain("Durata de execuție: 6 luni");
    expect(text).toContain(
      "graficul de execuție anexat în 6 (șase) luni calendaristice.",
    );
    expect(text).toContain(
      "pentru o durată de 90 (nouăzeci) de zile, respectiv până la data de 08.02.2027,",
    );
    expect(text).toContain("[ ] depunem ofertă alternativă");
    expect(text).toContain("[x] nu depunem ofertă alternativă.");
    expect(text).toContain("Data: 21.10.2026");
    expect(text).toContain(
      "Ion Popescu, în calitate de administrator, legal autorizat să semnez oferta pentru și în numele Constructor Exemplu SRL.",
    );
  });

  test("takes the duration F6 plans when none is chosen", () => {
    // 108 labour hours: a month for a crew of ten.
    expect(textOf(offerForm(tender(), { schedule: undefined }))).toContain(
      "în 1 (una) lună calendaristică.",
    );
  });

  test("leaves blank what the Deviz and the sheet don't say", () => {
    const text = textOf(offerForm(tender(), { offer: { validity: 90 } }));
    expect(text).toMatch(
      /90 \(nouăzeci\) de zile, respectiv până la data de \.+ \(ziua\/luna\/anul\),/,
    );
    expect(text).toMatch(
      /\.+ \(numele și prenumele\), în calitate de \.+ \(funcția\), legal autorizat/,
    );
  });

  test("offers the price alone when the firm charges no VAT", () => {
    const data = tender();
    const text = textOf(
      offerForm({
        ...data,
        estimate: {
          ...data.estimate,
          markups: { ...data.estimate.markups, vat: 0 },
        },
      }),
    );
    expect(text).toContain("lei și");
    expect(text).toContain(", plătibilă după recepția lucrărilor.");
    expect(text).not.toContain("taxa pe valoarea adăugată");
  });

  test("is the blank form a tender publishes without prices", () => {
    const form = offerForm(tender("2026-11-10"), { withValues: false });
    const text = textOf(form);
    expect(text).toContain("Către Comuna Exemplu");
    expect(text).toContain("Reabilitarea școlii gimnaziale din Exemplu");
    expect(text).not.toContain("Constructor Exemplu SRL");
    expect(text).not.toContain(" lei");
    expect(text).toMatch(/pentru suma de \.+ \(suma în litere și în cifre\)/);
    expect(text).toContain("[ ] nu depunem ofertă alternativă.");
    expect(text).toContain("(se bifează opțiunea corespunzătoare)");
    expect(text).toMatch(/Data: \.+\/\.+\/\.+/);
  });

  test("writes to the client at its address, under the tender's own name", () => {
    const form = offerForm(sampleData(), {
      labels: { OF: "Formularul nr. 1" },
    });
    expect(textOf(form)).toContain(
      "Către Ana Popescu, Str. Exemplu 1, Cluj-Napoca",
    );
    expect(form?.label).toBe("Formularul nr. 1");
    expect(form?.footer).toBe("DVZ-0142 · Formularul nr. 1");
  });
});

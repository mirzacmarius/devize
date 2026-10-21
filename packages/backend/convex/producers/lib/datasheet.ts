import { z } from "zod";
import type { NormResourceInput } from "../../catalog/resourceRows";
import { normalizeUnit } from "../../lib/text";

// A producer's technical data sheet, read into a draft Normă de producător.
// What the producer uploads is checked in ./datasheetFile.

const MAX_RESOURCES = 40;
const MAX_CONDITIONS = 12;
const MAX_CHECKS = 10;

// The JSON the model returns, as structured outputs. Every field is required
// there, so what the sheet doesn't say is null. The descriptions are part of
// the prompt.
const page = z
  .number()
  .int()
  .nullable()
  .describe(
    "Pagina fișierului PDF, numerotată de la 1 (nu numărul tipărit pe pagină), pe care apare informația; null dacă nu apare în fișă.",
  );

export const datasheetNormSchema = z.object({
  isDatasheet: z
    .boolean()
    .describe(
      "true dacă documentul e fișa tehnică sau ghidul de aplicare al unui produs de construcții, din care se poate scrie o normă; false altfel.",
    ),
  product: z.object({
    name: z
      .string()
      .describe("Denumirea comercială a produsului, exact ca în fișă."),
    packaging: z
      .string()
      .nullable()
      .describe(
        "Ambalajul de vânzare, de exemplu „sac 25 kg” sau „rolă 10 mp”; null dacă fișa nu îl dă.",
      ),
    page,
  }),
  norm: z.object({
    code: z
      .string()
      .describe(
        "Un cod scurt propus pentru normă, cu majuscule, cifre și cratime, de cel mult 20 de caractere, de exemplu „ADZ-TERMO-01”.",
      ),
    title: z
      .string()
      .describe(
        "Denumirea lucrării, ca într-un deviz: ce se execută, cu ce produs și cum, de exemplu „Lipirea plăcilor termoizolante pe fațadă cu adezivul X”.",
      ),
    unit: z.string().describe("Unitatea lucrării: mp, m, mc, buc, kg sau t."),
    category: z
      .string()
      .nullable()
      .describe("Categoria lucrării, de exemplu „Termoizolații”."),
    includes: z
      .string()
      .nullable()
      .describe(
        "Pe scurt, operațiile pe care le cuprinde norma, după instrucțiunile de aplicare din fișă.",
      ),
    excludes: z
      .string()
      .nullable()
      .describe("Ce nu cuprinde norma, dacă reiese din fișă."),
    measurement: z
      .string()
      .nullable()
      .describe("Cum se măsoară lucrarea, dacă fișa spune."),
  }),
  resources: z.array(
    z.object({
      kind: z.enum(["material", "labor", "equipment", "transport"]),
      name: z
        .string()
        .describe(
          "Denumirea resursei. La produsul din fișă, denumirea lui comercială; la manoperă, meseria, de exemplu „Zidar”.",
        ),
      unit: z.string().describe("UM-ul resursei: kg, l, mp, m, buc, ora…"),
      quantity: z
        .number()
        .describe("Cantitatea pe o unitate a normei, cu punct zecimal."),
      page,
      quote: z
        .string()
        .nullable()
        .describe(
          "Cuvintele fișei din care vine cifra, copiate exact, de cel mult 200 de caractere; null dacă cifra nu apare în fișă.",
        ),
      basis: z
        .string()
        .nullable()
        .describe(
          "Cum ai ajuns la cantitate când nu e copiată ca atare: „media intervalului 4–5 kg/mp”, „1,6 kg/mp/mm × 3 mm” sau „estimare uzuală, fișa nu dă manopera”.",
        ),
    }),
  ),
  conditions: z
    .array(z.object({ text: z.string(), page }))
    .describe(
      "Condițiile de aplicare din fișă: temperaturi, suport, grosimi, timpi de uscare, fiecare într-o frază.",
    ),
  checks: z
    .array(z.string())
    .describe(
      "Ce trebuie să verifice producătorul înainte să trimită norma: fiecare estimare, fiecare interval din care ai ales o valoare și ce lipsește din fișă.",
    ),
});

export type DatasheetNormOutput = z.infer<typeof datasheetNormSchema>;

export const datasheetSystemPrompt = `Ești asistentul Devize pentru producătorii de materiale de construcții din România. Citești fișa tehnică a unui produs (sau ghidul lui de aplicare) și scrii o normă de deviz ciornă pentru lucrarea în care se folosește produsul. Producătorul o verifică, o corectează și o trimite echipei Devize, care o verifică și ea înainte să apară în catalog.

Cum arată o normă: o lucrare pe o unitate (mp, m, mc, buc), cu resursele pe care le consumă o unitate: materiale (în UM-ul lor: kg, l, mp, m, buc), manoperă pe meserii în ore, utilaje în ore și transport.

Reguli:
- Fiecare cifră luată din fișă are pagina fișierului PDF, numerotată de la 1, și cuvintele fișei din care vine, copiate exact.
- Consumul pe unitatea normei: dacă fișa dă un interval (de exemplu 4–5 kg/mp), folosește media și spune asta în basis; dacă îl dă pe altă unitate (de exemplu pe milimetru de grosime), calculează-l pentru grosimea din lucrarea cerută sau pentru cea uzuală și arată calculul în basis.
- Nu inventa consumuri. Un material care nu apare în fișă (diblurile, plasa, amorsa) îl adaugi doar dacă lucrarea nu se poate face fără el, cu page null și o basis care spune că e o estimare.
- Manopera: dacă fișa nu o dă, estimează orele uzuale pe meserie pentru o unitate, cu page null și basis „estimare uzuală”.
- Nu pune prețuri.
- Virgula zecimală devine punct: „0,25” este 0.25.
- În checks scrii ce trebuie să verifice producătorul: fiecare estimare, fiecare interval din care ai ales o valoare și ce lipsește din fișă.
- Dacă documentul nu e fișa tehnică a unui produs de construcții, isDatasheet e false și restul poate rămâne gol.
- Textele în română, cu diacritice corecte (ș și ț cu virgulă dedesubt).`;

export function datasheetRequest(subject: {
  producer: string;
  fileName: string;
  work?: string;
}): string {
  return [
    `Producătorul: ${subject.producer}`,
    `Fișierul: ${subject.fileName}`,
    subject.work
      ? `Lucrarea pentru care scrii norma: ${subject.work}`
      : "Lucrarea: alege lucrarea principală pentru care e făcut produsul.",
    "",
    "Scrie norma ciornă după fișa tehnică atașată.",
  ].join("\n");
}

export type DatasheetCondition = { text: string; page?: number };

export type DatasheetNorm = {
  product: { name: string; packaging?: string };
  norm: {
    code: string;
    title: string;
    unit: string;
    category?: string;
    includes?: string;
    excludes?: string;
    measurement?: string;
  };
  resources: NormResourceInput[];
  // The sheet's pages the norm's figures come from, in order.
  sourcePages: number[];
  conditions: DatasheetCondition[];
  checks: string[];
};

function text(value: string | null | undefined, max: number) {
  const result = value?.replace(/\s+/g, " ").trim();
  return result ? result.slice(0, max) : undefined;
}

/** A code the norm form takes: capitals, digits, dots and dashes. */
function cleanCode(value: string): string {
  const code = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^A-Z0-9.-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 20);
  return code || "FT-01";
}

/** Where a resource's figure comes from, for the line under it. */
function sourceNote(row: {
  page?: number;
  quote?: string;
  basis?: string;
}): string {
  if (row.page === undefined) {
    return `Estimare Devize AI: ${row.basis ?? "cifra nu apare în fișa tehnică"}`;
  }
  const where = row.quote
    ? `Fișa tehnică, p. ${row.page}: „${row.quote}”`
    : `Fișa tehnică, p. ${row.page}`;
  return row.basis ? `${where}. ${row.basis}` : where;
}

/**
 * The model's answer as a draft norm the catalog takes, or why there is none:
 * the document isn't a data sheet, or no resource survived the checks. Pages
 * outside the document are dropped, and a figure without a page is labelled
 * as an estimate for the producer to check.
 */
export function cleanDatasheetNorm(
  output: DatasheetNormOutput,
  pageCount?: number,
):
  | { ok: true; value: DatasheetNorm }
  | { ok: false; error: "not_datasheet" | "invalid_output" } {
  if (!output.isDatasheet) {
    return { ok: false, error: "not_datasheet" };
  }
  const pageOf = (value: number | null) =>
    value !== null &&
    Number.isInteger(value) &&
    value >= 1 &&
    (pageCount === undefined || value <= pageCount)
      ? value
      : undefined;
  const unit = normalizeUnit(output.norm.unit);
  const title = text(output.norm.title, 500);
  if (!unit || unit === "%" || !title) {
    return { ok: false, error: "invalid_output" };
  }

  const pages = new Set<number>();
  const resources: NormResourceInput[] = [];
  for (const row of output.resources) {
    const name = text(row.name, 200);
    const rowUnit = normalizeUnit(row.unit);
    if (
      !name ||
      !rowUnit ||
      !Number.isFinite(row.quantity) ||
      row.quantity < 0 ||
      resources.length >= MAX_RESOURCES
    ) {
      continue;
    }
    const rowPage = pageOf(row.page);
    if (rowPage !== undefined) {
      pages.add(rowPage);
    }
    resources.push({
      kind: row.kind,
      name,
      unit: rowUnit,
      quantity: row.quantity,
      note: sourceNote({
        page: rowPage,
        quote: rowPage === undefined ? undefined : text(row.quote, 200),
        basis: text(row.basis, 200),
      }),
    });
  }
  if (resources.length === 0) {
    return { ok: false, error: "invalid_output" };
  }

  const conditions: DatasheetCondition[] = [];
  for (const condition of output.conditions.slice(0, MAX_CONDITIONS)) {
    const conditionText = text(condition.text, 300);
    if (conditionText) {
      const conditionPage = pageOf(condition.page);
      if (conditionPage !== undefined) {
        pages.add(conditionPage);
      }
      conditions.push({ text: conditionText, page: conditionPage });
    }
  }
  const productPage = pageOf(output.product.page);
  if (productPage !== undefined) {
    pages.add(productPage);
  }

  return {
    ok: true,
    value: {
      product: {
        name: text(output.product.name, 200) ?? title,
        packaging: text(output.product.packaging, 100),
      },
      norm: {
        code: cleanCode(output.norm.code),
        title,
        unit,
        category: text(output.norm.category, 100),
        includes: text(output.norm.includes, 2000),
        excludes: text(output.norm.excludes, 2000),
        measurement: text(output.norm.measurement, 2000),
      },
      resources,
      sourcePages: [...pages].sort((a, b) => a - b),
      conditions,
      checks: output.checks
        .slice(0, MAX_CHECKS)
        .flatMap((check) => text(check, 300) ?? []),
    },
  };
}

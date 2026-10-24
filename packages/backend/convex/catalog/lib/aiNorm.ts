import { z } from "zod";
import { cleanNormCode, isKnownUnit, normalizeUnit } from "../../lib/text";
import { baseCategories } from "../baseCategories";
import type { NormResourceInput } from "../resourceRows";

// A Normă proprie Devize AI writes from a firm's description of a work the
// catalog lacks. The firm reads the draft, with what the model assumed and
// what to check, before the norm goes into a Deviz.

// The names a norm's category takes, as the base catalog writes them.
const categoryNames = baseCategories
  .map((category) => category.name)
  .join(", ");

/** Characters a description may have: a few sentences about the work. */
export const MAX_DESCRIPTION = 600;

const MAX_RESOURCES = 40;
const MAX_NOTES = 10;

// The JSON the model returns, as structured outputs. Every field is required
// there, so what the model can't say is null. The descriptions are part of
// the prompt.
export const aiNormSchema = z.object({
  isWork: z
    .boolean()
    .describe(
      "true dacă descrierea e o lucrare de construcții sau de instalații pentru care se poate scrie o normă de deviz; false dacă nu e o lucrare sau e prea vagă.",
    ),
  norm: z.object({
    code: z
      .string()
      .describe(
        "Un cod scurt propus pentru normă, cu majuscule, cifre și cratime, de cel mult 20 de caractere, din categoria și lucrarea, de exemplu „HID-TER-01”.",
      ),
    title: z
      .string()
      .describe(
        "Denumirea lucrării, ca într-un deviz românesc de azi: ce se execută, cu ce material și cum, de exemplu „Hidroizolație la terase cu membrană bituminoasă autoadezivă, în două straturi”.",
      ),
    unit: z
      .string()
      .describe(
        "Unitatea de măsură a lucrării: mp, m, mc, buc, kg, t sau set.",
      ),
    category: z
      .string()
      .nullable()
      .describe(
        `Categoria lucrării, una dintre: ${categoryNames}; null dacă niciuna nu se potrivește.`,
      ),
    includes: z
      .string()
      .nullable()
      .describe(
        "Operațiile pe care le cuprinde norma, pe scurt: pregătirea suportului, montajul, finisarea, curățarea.",
      ),
    excludes: z
      .string()
      .nullable()
      .describe(
        "Ce nu cuprinde norma și rămâne în alte articole, de exemplu demontările sau schela; null dacă nu e cazul.",
      ),
    measurement: z
      .string()
      .nullable()
      .describe(
        "Cum se măsoară lucrarea, de exemplu „suprafața reală, cu scăderea golurilor peste 0,5 mp”; null dacă e evident.",
      ),
  }),
  resources: z.array(
    z.object({
      kind: z
        .enum(["material", "labor", "equipment", "transport"])
        .describe(
          "material = materiale; labor = manoperă pe meserii; equipment = utilaje; transport = transportul materialelor.",
        ),
      name: z
        .string()
        .describe(
          "Denumirea resursei. La materiale, denumirea generică cu caracteristica care contează (clasa, grosimea, formatul), fără mărci dacă firma nu a numit una; la manoperă, meseria, de exemplu „Zidar”.",
        ),
      unit: z
        .string()
        .describe(
          "UM-ul resursei: kg, l, mp, m, mc, buc, set, sac, rolă; ora la manoperă și utilaje; % pentru materialul mărunt și transportul socotite ca procent din materiale.",
        ),
      quantity: z
        .number()
        .describe(
          "Cantitatea pe o unitate a normei, cu punct decimal; la unitatea % e procentul, de exemplu 2 pentru 2%.",
        ),
      basis: z
        .string()
        .describe(
          "De unde vine cifra, în cel mult 200 de caractere: „consum uzual, cu 5% pierderi”, „1,6 kg/mp/mm × 3 mm”, „media intervalului 4–5 kg/mp”.",
        ),
      referencePrice: z
        .number()
        .nullable()
        .describe(
          "La materiale, utilaje și transport: prețul orientativ de piață din România în lei fără TVA, pe unitatea resursei; null dacă nu îl știi. La manoperă întotdeauna null: firma are tarifele ei.",
        ),
    }),
  ),
  assumptions: z
    .array(z.string())
    .describe(
      "Ce ai presupus pentru că descrierea nu spunea: grosimi, formate, straturi, condiții de lucru; fiecare într-o frază.",
    ),
  checks: z
    .array(z.string())
    .describe(
      "Ce trebuie să verifice firma înainte să folosească norma: consumurile estimate, prețurile orientative, ce depinde de o presupunere.",
    ),
});

export type AiNormOutput = z.infer<typeof aiNormSchema>;

export const aiNormSystemPrompt = `Ești devizierul aplicației Devize: un inginer constructor din România cu mulți ani de devize pentru renovări și construcții. O firmă de construcții îți descrie o lucrare pe care nu o găsește în catalogul de norme, iar tu scrii norma de deviz pentru ea: rețeta pentru o unitate de lucrare. Firma o verifică și o corectează înainte s-o folosească; norma rămâne a firmei, nu intră în catalogul public.

CUM ARATĂ O NORMĂ
- O lucrare pe o unitate de măsură (mp, m, mc, buc, kg, t sau set), cu resursele pe care le consumă o unitate: materiale în UM-ul lor (kg, l, mp, m, mc, buc, set, sac, rolă), manopera pe meserii în ore, utilajele în ore și transportul.
- Denumirea e cea din devizele românești de azi, clară și completă: ce se execută, cu ce material și cum.
- „Include” spune operațiile cuprinse, „Nu include” ce rămâne în alte articole, „Cum se măsoară” regula de măsurare.

CONSUMURI
- Folosești consumurile uzuale din practica românească de azi, cu pierderile tehnologice obișnuite (de exemplu adeziv 4,5 kg/mp, gresie 1,05–1,10 mp/mp după format, vopsea lavabilă 0,25 l/mp pe strat), și spui în basis de unde vine fiecare cifră.
- Manopera pe meserii, în ore pe unitatea normei. Folosești denumirile meseriilor din tarifele firmei când se potrivesc, altfel meseriile uzuale: Zidar, Faianțar, Zugrav, Instalator, Electrician, Dulgher, Fierar betonist, Izolator, Montator, Muncitor necalificat. Nu uiți muncitorul necalificat la transportul manual și la pregătire.
- Materialul mărunt (șuruburi, dibluri mici, bandă, consumabile) îl poți pune ca „Material mărunt” cu unitatea % din materiale (de exemplu 2 pentru 2%), iar transportul materialelor ca „Transport materiale” cu unitatea % (2–3%), cum fac normele de bază Devize.
- Utilaje doar când lucrarea le cere (mașină de tăiat, betonieră, schelă, excavator), în ore pe unitate, cu denumirile din tarifele firmei când se potrivesc.
- Nu inventezi lucrări: norma e doar pentru ce a descris firma. Nu dublezi o lucrare pe mai multe norme.

PREȚURI ORIENTATIVE
- La materiale, utilaje și transport dai prețul orientativ de piață din România, în lei fără TVA, pe unitatea resursei, cum e la magazinele de bricolaj și la furnizori; null când nu îl știi. Firma îl vede ca preț de referință și îl schimbă cu al ei sau cu prețul din magazin.
- La manoperă nu pui niciun preț: firma are tarifele ei pe meserii.

PRESUPUNERI ȘI VERIFICĂRI
- Când descrierea nu spune o grosime, un format, un strat sau o condiție de lucru, alegi valoarea uzuală și o scrii în assumptions.
- În checks scrii ce trebuie să verifice firma înainte să folosească norma: consumurile estimate, prețurile orientative și ce depinde de o presupunere.

DACĂ NU E O LUCRARE
Dacă descrierea nu e o lucrare de construcții sau de instalații, sau e prea vagă pentru o normă, isWork e false și restul poate rămâne gol.

Codul normei e scurt, cu majuscule, cifre și cratime, din categoria și lucrarea. Textele sunt în română, cu diacritice corecte (ș și ț cu virgulă dedesubt). Virgula decimală devine punct: „0,25” este 0.25.`;

export type AiNormSubject = {
  firm: string;
  description: string;
  estimate?: { title: string; description?: string; county?: string };
  // The trades and machines the firm has rates for, with their units.
  rates: {
    kind: "labor" | "equipment" | "transport";
    name: string;
    unit: string;
  }[];
};

function rateList(
  rates: AiNormSubject["rates"],
  kind: AiNormSubject["rates"][number]["kind"],
): string | undefined {
  const names = rates
    .filter((rate) => rate.kind === kind)
    .map((rate) => `${rate.name} (${rate.unit})`);
  return names.length > 0 ? names.join(", ") : undefined;
}

/** The request that follows the system prompt. */
export function aiNormRequest(subject: AiNormSubject): string {
  const trades = rateList(subject.rates, "labor");
  const machines = rateList(subject.rates, "equipment");
  const transport = rateList(subject.rates, "transport");
  const estimate = subject.estimate;
  return [
    `Firma: ${subject.firm}`,
    estimate
      ? `Devizul în care intră norma: ${estimate.title}${estimate.description ? ` (${estimate.description})` : ""}${estimate.county ? `, județul ${estimate.county}` : ""}`
      : "",
    trades
      ? `Meseriile din tarifele firmei: ${trades}`
      : "Firma nu are încă tarife pe meserii: folosești meseriile uzuale.",
    machines ? `Utilajele din tarifele firmei: ${machines}` : "",
    transport ? `Transportul din tarifele firmei: ${transport}` : "",
    `Categoriile catalogului Devize: ${categoryNames}`,
    "",
    "Lucrarea descrisă de firmă:",
    subject.description,
    "",
    "Scrie norma.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

export type AiNorm = {
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
  assumptions: string[];
  checks: string[];
};

function text(value: string | null | undefined, max: number) {
  const result = value?.replace(/\s+/g, " ").trim();
  return result ? result.slice(0, max) : undefined;
}

function sentences(values: readonly string[], max: number): string[] {
  return values.slice(0, max).flatMap((value) => text(value, 300) ?? []);
}

/** The line under a resource: where its figure comes from. */
function sourceNote(row: { basis?: string; priced: boolean }): string {
  const basis = row.basis
    ? `Devize AI: ${row.basis}`
    : "Devize AI: consum estimat";
  return row.priced ? `${basis}. Prețul e orientativ, de verificat.` : basis;
}

/**
 * The model's answer as a draft norm the catalog takes, or why there is none:
 * the description isn't a work, or no resource survived the checks. A unit
 * Devize doesn't know drops its resource; labour never carries a price, so
 * the firm's Tarife apply.
 */
export function cleanAiNorm(
  output: AiNormOutput,
):
  | { ok: true; value: AiNorm }
  | { ok: false; error: "not_work" | "invalid_output" } {
  if (!output.isWork) {
    return { ok: false, error: "not_work" };
  }
  const unit = normalizeUnit(output.norm.unit);
  const title = text(output.norm.title, 500);
  if (!unit || unit === "%" || !isKnownUnit(unit) || !title) {
    return { ok: false, error: "invalid_output" };
  }

  const resources: NormResourceInput[] = [];
  for (const row of output.resources) {
    const name = text(row.name, 200);
    const rowUnit = normalizeUnit(row.unit);
    if (
      !name ||
      !rowUnit ||
      !isKnownUnit(rowUnit) ||
      (rowUnit === "%" &&
        row.kind !== "material" &&
        row.kind !== "transport") ||
      !Number.isFinite(row.quantity) ||
      row.quantity <= 0 ||
      resources.length >= MAX_RESOURCES
    ) {
      continue;
    }
    const referencePrice =
      row.kind !== "labor" &&
      rowUnit !== "%" &&
      row.referencePrice !== null &&
      Number.isFinite(row.referencePrice) &&
      row.referencePrice > 0
        ? Math.round(row.referencePrice * 100) / 100
        : undefined;
    resources.push({
      kind: row.kind,
      name,
      unit: rowUnit,
      quantity: row.quantity,
      referencePrice,
      note: sourceNote({
        basis: text(row.basis, 200),
        priced: referencePrice !== undefined,
      }),
    });
  }
  if (resources.length === 0) {
    return { ok: false, error: "invalid_output" };
  }

  return {
    ok: true,
    value: {
      norm: {
        code: cleanNormCode(output.norm.code, "AI-01"),
        title,
        unit,
        category: text(output.norm.category, 100),
        includes: text(output.norm.includes, 2000),
        excludes: text(output.norm.excludes, 2000),
        measurement: text(output.norm.measurement, 2000),
      },
      resources,
      assumptions: sentences(output.assumptions, MAX_NOTES),
      checks: sentences(output.checks, MAX_NOTES),
    },
  };
}

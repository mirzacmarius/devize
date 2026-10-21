import { z } from "zod";

// The JSON the model returns, as structured outputs. Every field is required
// there, so a fact it doesn't have is null rather than missing. The
// descriptions are part of the prompt.

const confidence = z
  .enum(["high", "medium", "low"])
  .describe(
    "high: cantitatea reiese din cotele date; medium: dintr-o presupunere obișnuită, scrisă în presupuneri; low: estimată din poze sau ghicită.",
  );

const resource = z.object({
  kind: z.enum(["material", "labor", "equipment", "transport"]),
  name: z
    .string()
    .describe(
      "Denumirea generică, fără marcă, de exemplu „Adeziv flexibil C2TE” sau „Faianțar”.",
    ),
  unit: z
    .string()
    .describe("U.M. a resursei: kg, mp, m, buc, l, ora pentru manoperă."),
  quantity: z
    .number()
    .describe("Consumul pe o unitate de articol, cu pierderile obișnuite."),
});

const takeoffRow = z.object({
  label: z
    .string()
    .describe("Ce măsori, de exemplu „Perete cu ușa” sau „Gol ușă”."),
  count: z
    .number()
    .describe(
      "Numărul de bucăți; la un rând fără dimensiuni, chiar cantitatea, de exemplu 1,5 t de moloz.",
    ),
  length: z.number().nullable().describe("Lungimea în m, dacă se măsoară."),
  width: z.number().nullable().describe("Lățimea în m, dacă se măsoară."),
  height: z
    .number()
    .nullable()
    .describe("Înălțimea sau grosimea în m, dacă se măsoară."),
  deduct: z
    .boolean()
    .describe("true pentru un gol sau o parte care se scade din total."),
});

export const draftSchema = z.object({
  summary: z
    .string()
    .describe(
      "Ce lucrare e și ce ai înțeles din descriere și din poze, în una sau două propoziții.",
    ),
  assumptions: z
    .array(z.string())
    .describe(
      "Ce ai presupus pentru că nu reiese din descriere sau din poze, cu valoarea folosită, de exemplu „Înălțimea camerei 2,60 m”.",
    ),
  questions: z
    .array(z.string())
    .describe(
      "Cel mult 5 întrebări pentru client, ale căror răspunsuri ar schimba devizul.",
    ),
  chapters: z.array(
    z.object({
      name: z
        .string()
        .describe("Capitolul, de exemplu „Demontări” sau „Placări ceramice”."),
      articles: z.array(
        z.object({
          title: z
            .string()
            .describe("Denumirea articolului, cum apare într-un deviz."),
          unit: z
            .string()
            .describe("U.M. a articolului: mp, m, mc, buc, kg, t sau set."),
          takeoff: z
            .array(takeoffRow)
            .describe(
              "Antemăsurătoarea articolului. Cantitatea lui e suma rândurilor, iar rândurile cu deduct se scad; o calculează aplicația.",
            ),
          confidence,
          note: z
            .string()
            .nullable()
            .describe(
              "Ce trebuie să verifice constructorul la acest articol, dacă e ceva.",
            ),
          searchTerms: z
            .array(z.string())
            .describe(
              "2–3 formulări scurte ale lucrării pentru căutarea în catalogul de norme, de exemplu „placare faianta pereti”.",
            ),
          resources: z
            .array(resource)
            .describe(
              "Rețeta articolului pe unitate: materialele, manopera pe meserii și utilajele, fără prețuri.",
            ),
        }),
      ),
    }),
  ),
});

export type DraftOutput = z.infer<typeof draftSchema>;

export const matchSchema = z.object({
  matches: z.array(
    z.object({
      article: z.string().describe("Cheia articolului, de exemplu A3."),
      norm: z
        .string()
        .nullable()
        .describe(
          "Cheia normei alese, de exemplu N12, sau null dacă nicio normă nu descrie aceeași lucrare.",
        ),
      quantity: z
        .number()
        .nullable()
        .describe(
          "Cantitatea în U.M. a normei, doar când U.M. diferă și nu se transformă direct, de exemplu din mp în mc la o grosime dată; altfel null.",
        ),
      reason: z
        .string()
        .describe("Pe scurt, de ce se potrivește norma sau de ce nu."),
    }),
  ),
});

export type MatchOutput = z.infer<typeof matchSchema>;

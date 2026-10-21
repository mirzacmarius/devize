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

/** An Antemăsurătoare row as the model writes it. */
export type ModelTakeoffRow = z.infer<typeof takeoffRow>;

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

const entryKind = z
  .enum(["object", "chapter", "position"])
  .describe(
    "object: un obiect al investiției (o clădire, o rețea); chapter: un capitol sau o categorie de lucrări; position: o poziție a listei, cu cantitate.",
  );

const searchTerms = z
  .array(z.string())
  .describe(
    "Doar la poziții: 2–3 formulări scurte ale lucrării pentru căutarea în catalogul de norme, fără diacritice, de exemplu „zidarie blocuri ceramice 25 cm”; la obiecte și capitole, o listă goală.",
  );

/** A batch of a spreadsheet's rows, read by reference to its cells. */
export const sheetSchema = z.object({
  columns: z
    .object({
      position: z
        .string()
        .nullable()
        .describe("Litera coloanei cu numărul curent (Nr. crt.), sau null."),
      code: z
        .string()
        .nullable()
        .describe(
          "Litera coloanei cu codul articolului, de exemplu CZ0101A1, sau null când codul nu are coloana lui.",
        ),
      text: z
        .string()
        .nullable()
        .describe("Litera coloanei cu denumirea lucrării."),
      unit: z.string().nullable().describe("Litera coloanei cu U.M."),
      quantity: z
        .string()
        .nullable()
        .describe("Litera coloanei cu cantitatea autorității."),
    })
    .describe("Coloanele listei, după capul de tabel."),
  entries: z
    .array(
      z.object({
        kind: entryKind,
        firstRow: z.number().describe("Rândul pe care începe."),
        lastRow: z
          .number()
          .describe(
            "Rândul pe care se termină: la o poziție cu denumirea pe mai multe rânduri, ultimul dintre ele.",
          ),
        code: z
          .string()
          .nullable()
          .describe(
            "La obiect sau capitol, codul sau numărul lui, dacă are; la o poziție, codul articolului doar când e scris în aceeași celulă cu denumirea; altfel null.",
          ),
        name: z
          .string()
          .nullable()
          .describe(
            "La obiect sau capitol, numele lui fără cod, copiat exact; la o poziție null.",
          ),
        terms: searchTerms,
      }),
    )
    .describe(
      "Obiectele, capitolele și pozițiile care încep în rândurile de citit, în ordine.",
    ),
});

export type SheetOutput = z.infer<typeof sheetSchema>;

/** A batch of a document's pages, read and copied. */
export const pagesSchema = z.object({
  pageCount: z.number().describe("Câte pagini are documentul."),
  entries: z
    .array(
      z.object({
        kind: entryKind,
        page: z.number().describe("Pagina pe care începe."),
        position: z
          .string()
          .nullable()
          .describe(
            "Numărul curent al poziției, cum e tipărit; null la obiecte și capitole.",
          ),
        code: z
          .string()
          .nullable()
          .describe(
            "Codul articolului, sau codul ori numărul obiectului sau capitolului, dacă are.",
          ),
        text: z
          .string()
          .describe(
            "La o poziție, denumirea lucrării întreagă și copiată exact, inclusiv rândurile de pe pagina următoare; la obiecte și capitole, numele lor fără cod.",
          ),
        unit: z
          .string()
          .nullable()
          .describe("U.M., cum e scrisă; null la obiecte și capitole."),
        quantity: z
          .number()
          .nullable()
          .describe(
            "Cantitatea, ca număr cu punct zecimal (1.234,50 din listă se scrie 1234.5); null la obiecte și capitole sau când lipsește.",
          ),
        terms: searchTerms,
      }),
    )
    .describe(
      "Obiectele, capitolele și pozițiile care încep pe paginile de citit, în ordine.",
    ),
});

export type PagesOutput = z.infer<typeof pagesSchema>;

export const tenderMatchSchema = z.object({
  matches: z.array(
    z.object({
      article: z.string().describe("Cheia poziției, de exemplu A3."),
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
      confidence: z
        .enum(["high", "medium", "low"])
        .describe(
          "high: norma sau rețeta descrie exact lucrarea; medium: aproape, cu o diferență de verificat; low: lucrarea e neclară sau rețeta e estimată.",
        ),
      reason: z
        .string()
        .describe("Pe scurt, de ce se potrivește norma sau de ce nu."),
      resources: z
        .array(resource)
        .describe(
          "Doar când norm e null: rețeta pe unitatea poziției, cu materialele, manopera pe meserii și utilajele, fără prețuri; altfel o listă goală.",
        ),
    }),
  ),
});

export type TenderMatchOutput = z.infer<typeof tenderMatchSchema>;

// Reading a Deviz for the works it misses: the Detector de omisiuni.
export const omissionsSchema = z.object({
  summary: z
    .string()
    .describe(
      "Ce lucrare acoperă devizul și ce îi lipsește în mare, în una sau două propoziții.",
    ),
  missing: z
    .array(
      z.object({
        chapter: z
          .string()
          .describe(
            "Capitolul în care intră: unul al devizului, scris la fel, când lucrarea îi aparține; altfel unul nou, de exemplu „Hidroizolații”.",
          ),
        title: z
          .string()
          .describe("Denumirea lucrării, cum apare într-un deviz."),
        unit: z
          .string()
          .describe("U.M. a lucrării: mp, m, mc, buc, kg, t sau set."),
        basis: z
          .array(z.string())
          .describe(
            "Cheile articolelor din deviz care cer lucrarea, de exemplu L3 și L7.",
          ),
        reason: z
          .string()
          .describe(
            "De ce trebuie, într-o propoziție pentru constructor, de exemplu „Faianța din duș se pune peste hidroizolație, cu bandă la colțuri și manșoane la țevi.”",
          ),
        takeoff: z
          .array(takeoffRow)
          .describe(
            "Cum reiese cantitatea: din cantitățile articolelor pe care se bazează, câte un rând fără dimensiuni cu count egal cu cantitatea luată și cu eticheta articolului, sau din cote. Cantitatea e suma rândurilor; o calculează aplicația.",
          ),
        confidence: z
          .enum(["high", "medium", "low"])
          .describe(
            "high: articolele devizului o cer sigur, de exemplu faianță în duș fără hidroizolație sau demolări fără evacuarea molozului; medium: e necesară de obicei la o astfel de lucrare, dar depinde de șantier; low: de verificat la fața locului.",
          ),
        searchTerms: z
          .array(z.string())
          .describe(
            "2–3 formulări scurte ale lucrării pentru căutarea în catalogul de norme, fără diacritice, de exemplu „hidroizolatie sub placari ceramice”.",
          ),
        resources: z
          .array(resource)
          .describe(
            "Rețeta lucrării pe unitate: materialele, manopera pe meserii și utilajele, fără prețuri.",
          ),
      }),
    )
    .describe(
      "Lucrările care lipsesc, în ordinea execuției. La un deviz de licitație, o listă goală.",
    ),
  remarks: z
    .array(z.string())
    .describe(
      "Cel mult 8 observații despre articolele care sunt deja în deviz: cantități care nu se potrivesc între ele, U.M. nepotrivite, lucrări puse de două ori. Numești articolele după denumire, nu după cheie.",
    ),
  questions: z
    .array(z.string())
    .describe(
      "La un deviz privat, cel mult 5 întrebări pentru client, ale căror răspunsuri ar schimba devizul. La un deviz de licitație, cel mult 10 clarificări de cerut autorității contractante pentru lucrările care lipsesc din liste, fiecare cu pozițiile pe care le privește.",
    ),
});

export type OmissionsOutput = z.infer<typeof omissionsSchema>;

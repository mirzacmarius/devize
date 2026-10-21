import { z } from "zod";

// The JSON the model returns, as structured outputs. Every field is required
// there, so a fact that wasn't found is null rather than missing. The
// descriptions are part of the prompt.

const openedUrl = z
  .string()
  .describe("URL complet, copiat exact din raport sau din lista de surse.");

export const researchFindingsSchema = z.object({
  displayName: z
    .string()
    .describe(
      "Numele scurt al firmei, fără SRL, SA sau „România”, potrivit în subiectul „Normele de deviz {Firma} în Devize”.",
    ),
  website: z.string().nullable().describe("Site-ul oficial din România."),
  legalName: z.string().nullable(),
  cui: z.string().nullable(),
  brands: z.array(z.string()),
  categories: z
    .array(z.string())
    .describe(
      "Categoriile de produse, în română, de exemplu „blocuri ceramice”.",
    ),
  mainProducts: z
    .array(z.string())
    .describe("Cel mult 5 produse sau game principale."),
  retailers: z
    .array(z.string())
    .describe(
      "Magazinele dintre Dedeman, Leroy Merlin, Hornbach și Brico Depot.",
    ),
  contacts: z.array(
    z.object({
      kind: z
        .enum(["generic", "department", "person", "form"])
        .describe(
          "generic: office@, info@; department: tehnic@, marketing@, vanzari@; person: adresă cu nume de persoană; form: formularul de contact.",
        ),
      email: z.string().nullable(),
      url: z
        .string()
        .nullable()
        .describe("Doar pentru form: adresa formularului."),
      role: z.string().nullable(),
      sourceUrl: z
        .string()
        .nullable()
        .describe("Pagina de pe site-ul firmei pe care apare adresa."),
    }),
  ),
  existingNorms: z.array(
    z.object({
      title: z.string(),
      edition: z.string().nullable(),
      author: z.string().nullable(),
      url: openedUrl,
      kind: z.enum(["public_pdf", "deviz_software", "article"]),
    }),
  ),
  technicalDocs: z.array(z.object({ title: z.string(), url: openedUrl })),
  declaredConsumption: z.array(
    z.object({
      product: z.string(),
      value: z.string(),
      unit: z.string(),
      sourceUrl: openedUrl,
    }),
  ),
  personalization: z
    .object({ sentence: z.string(), sourceUrl: openedUrl })
    .nullable()
    .describe(
      "Fraza personalizată propusă în raport și sursa faptului din ea.",
    ),
  mainProductsPhrase: z
    .string()
    .nullable()
    .describe(
      "Produsele principale cum ar sta în „Nu am găsit norme de deviz publice pentru …”, de exemplu „adezivii și tencuielile pentru termosisteme”.",
    ),
  recommendedEmail: z
    .string()
    .nullable()
    .describe(
      "Adresa recomandată pentru primul email, una dintre cele din contacts.",
    ),
  confidence: z.enum(["high", "medium", "low"]),
  needsReview: z
    .string()
    .nullable()
    .describe("Ce trebuie să verifice omul înainte de trimitere, în română."),
});

export type ResearchFindingsOutput = z.infer<typeof researchFindingsSchema>;

export const normsIndexSchema = z.object({
  edition: z
    .string()
    .nullable()
    .describe(
      "Ediția sau anul documentului, de exemplu „2020” sau „Rev. 6, 2018”.",
    ),
  laborRate: z
    .number()
    .nullable()
    .describe("Tariful de manoperă în lei pe oră, dacă documentul îl declară."),
  articles: z.array(
    z.object({
      baseCode: z.string().describe("Codul articolului, de exemplu IZF100."),
      title: z.string(),
      unit: z.string().describe("UM articolului exact cum e tipărită."),
      variantCodes: z
        .array(z.string())
        .describe(
          "Codurile variantelor, de exemplu A01, B01; gol dacă nu are.",
        ),
      pages: z
        .array(z.number())
        .describe("Paginile din fișierul PDF, numerotate de la 1."),
    }),
  ),
});

export type NormsIndexOutput = z.infer<typeof normsIndexSchema>;

const extractedResource = z.object({
  kind: z.enum(["material", "labor", "equipment", "transport"]),
  name: z.string(),
  unit: z.string().describe("UM exact cum e tipărită."),
  quantity: z.number(),
  unitPrice: z.number().nullable(),
});

export const normsExtractionSchema = z.object({
  articles: z.array(
    z.object({
      baseCode: z.string(),
      title: z.string(),
      unit: z.string(),
      pages: z.array(z.number()),
      includes: z.string().nullable(),
      excludes: z.string().nullable(),
      variants: z.array(
        z.object({
          code: z
            .string()
            .describe("Codul variantei, de exemplu A01; gol dacă nu are."),
          description: z.string(),
          resources: z.array(extractedResource),
          totalLaborHours: z.number().nullable(),
          totalPrice: z.number().nullable(),
        }),
      ),
    }),
  ),
});

export type NormsExtractionOutput = z.infer<typeof normsExtractionSchema>;

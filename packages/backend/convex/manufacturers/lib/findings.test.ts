import { describe, expect, test } from "bun:test";
import { cleanFindings, emailsInPage } from "./findings";
import type { ResearchFindingsOutput } from "./schemas";
import { urlKey } from "./text";

// A made-up manufacturer; no real company or address.
const output: ResearchFindingsOutput = {
  displayName: " Exemplu  Materiale ",
  website: "https://exemplu-materiale.test",
  legalName: "Exemplu Materiale SRL",
  cui: null,
  brands: ["Exemplu", "exemplu", "Termo X"],
  categories: ["blocuri ceramice"],
  mainProducts: [
    "Bloc 25",
    "Bloc 30",
    "Bloc 38",
    "Bloc 44",
    "Bloc 50",
    "Bloc 60",
  ],
  retailers: [],
  contacts: [
    {
      kind: "generic",
      email: "Office@Exemplu-Materiale.test",
      url: null,
      role: null,
      sourceUrl: "https://exemplu-materiale.test/contact",
    },
    {
      kind: "department",
      email: "tehnic@exemplu-materiale.test",
      url: null,
      role: "Departament tehnic",
      sourceUrl: "https://exemplu-materiale.test/contact",
    },
    {
      kind: "form",
      email: null,
      url: "https://exemplu-materiale.test/contact#form",
      role: null,
      sourceUrl: null,
    },
    {
      kind: "person",
      email: "not an email",
      url: null,
      role: null,
      sourceUrl: null,
    },
    {
      kind: "generic",
      email: "office@exemplu-materiale.test",
      url: null,
      role: null,
      sourceUrl: null,
    },
  ],
  existingNorms: [
    {
      title: "Norme de deviz Bloc 25",
      edition: "2019",
      author: null,
      url: "https://www.exemplu-materiale.test/norme.pdf",
      kind: "public_pdf",
    },
    {
      title: "Norme inventate",
      edition: null,
      author: null,
      url: "https://nicaieri.test/norme",
      kind: "deviz_software",
    },
  ],
  technicalDocs: [],
  declaredConsumption: [],
  personalization: {
    sentence:
      "Am văzut că normele pentru Bloc 25 sunt publice, în ediția din 2019.",
    sourceUrl: "https://exemplu-materiale.test/norme.pdf",
  },
  mainProductsPhrase: null,
  recommendedEmail: "TEHNIC@exemplu-materiale.test",
  confidence: "medium",
  needsReview: null,
};

const evidence = {
  urls: new Set(
    [
      "https://exemplu-materiale.test/contact",
      "https://exemplu-materiale.test/norme.pdf",
    ].map(urlKey),
  ),
  emails: new Set(["office@exemplu-materiale.test"]),
};

describe("cleanFindings", () => {
  const findings = cleanFindings(output, evidence);

  test("tidies names and lists", () => {
    expect(findings.displayName).toBe("Exemplu Materiale");
    expect(findings.brands).toEqual(["Exemplu", "Termo X"]);
    expect(findings.mainProducts).toHaveLength(5);
    expect(findings.cui).toBeUndefined();
  });

  test("keeps valid contacts once and verifies only addresses read on a page", () => {
    expect(findings.contacts).toEqual([
      {
        kind: "generic",
        email: "office@exemplu-materiale.test",
        url: undefined,
        role: undefined,
        sourceUrl: "https://exemplu-materiale.test/contact",
        sourceVerified: true,
      },
      {
        kind: "department",
        email: "tehnic@exemplu-materiale.test",
        url: undefined,
        role: "Departament tehnic",
        sourceUrl: "https://exemplu-materiale.test/contact",
        sourceVerified: false,
      },
      {
        kind: "form",
        email: undefined,
        url: "https://exemplu-materiale.test/contact#form",
        role: undefined,
        sourceUrl: undefined,
        sourceVerified: true,
      },
    ]);
    expect(findings.recommendedEmail).toBe("tehnic@exemplu-materiale.test");
  });

  test("drops facts whose link research never opened, and says so", () => {
    expect(findings.existingNorms.map((norm) => norm.title)).toEqual([
      "Norme de deviz Bloc 25",
    ]);
    expect(findings.personalization?.sourceUrl).toBe(
      "https://exemplu-materiale.test/norme.pdf",
    );
    expect(findings.needsReview).toContain("Am eliminat 1 fapt");
  });

  test("drops a personalization without a source and an unknown recommendation", () => {
    const cleaned = cleanFindings(
      {
        ...output,
        personalization: { sentence: "Fapt.", sourceUrl: "https://alt.test/x" },
        recommendedEmail: "vanzari@exemplu-materiale.test",
        existingNorms: [],
        needsReview: "Verifică adresa.",
      },
      evidence,
    );
    expect(cleaned.personalization).toBeUndefined();
    expect(cleaned.recommendedEmail).toBeUndefined();
    expect(cleaned.needsReview).toBe(
      "Verifică adresa. Am eliminat 1 fapt cu linkuri pe care cercetarea nu le-a deschis.",
    );
  });
});

describe("emailsInPage", () => {
  test("finds plain, entity-encoded and spelled-out addresses", () => {
    const html = `
      <a href="mailto:Office@Exemplu.test">Scrieți-ne</a>
      <p>tehnic&#64;exemplu.test</p>
      <p>marketing [at] exemplu [dot] test</p>
      <p>vanzari%40exemplu.test</p>`;
    expect(emailsInPage(html).sort()).toEqual([
      "marketing@exemplu.test",
      "office@exemplu.test",
      "tehnic@exemplu.test",
      "vanzari@exemplu.test",
    ]);
  });

  test("decodes Cloudflare email protection", () => {
    const key = 0x42;
    const hex = [
      key,
      ...[..."info@exemplu.test"].map((c) => c.charCodeAt(0) ^ key),
    ]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    expect(
      emailsInPage(
        `<span class="__cf_email__" data-cfemail="${hex}">[email&#160;protected]</span>`,
      ),
    ).toEqual(["info@exemplu.test"]);
  });
});

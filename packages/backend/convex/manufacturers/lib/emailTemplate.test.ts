import { describe, expect, test } from "bun:test";
import {
  countOf,
  hasBlockingIssue,
  letterDate,
  lintEmail,
  renderInitialEmail,
  renderThanksEmail,
} from "./emailTemplate";

const sender = {
  firstName: "Ana",
  lastName: "Pop",
  phone: "0700 000 000",
  privacyUrl: "https://devize.example/confidentialitate",
};

const vars = {
  firm: "Exemplu",
  personalization:
    "Am văzut că normele de deviz pentru blocurile ceramice Exemplu sunt publice pe site-ul firmei, în ediția din 2018.",
  mainProducts: "blocurile ceramice Exemplu",
  address: "office@exemplu.example",
  addressSourceUrl: "https://exemplu.example/contact",
};

describe("renderInitialEmail", () => {
  test("fills variant A and passes every rule", () => {
    const email = renderInitialEmail("A", vars, sender);
    expect(email.subject).toBe("Normele de deviz Exemplu în Devize");
    expect(email.body).toContain("Sunt Ana, fondatorul Devize");
    expect(email.body).toContain("cu Exemplu menționată ca sursă");
    expect(email.body).toContain("Ana Pop\nFondator, Devize · 0700 000 000");
    expect(email.body).toContain(
      "Am găsit adresa office@exemplu.example pe https://exemplu.example/contact.",
    );
    expect(lintEmail({ ...email, to: vars.address })).toEqual([]);
  });

  test("asks variant B for norms they may not have yet", () => {
    const email = renderInitialEmail("B", vars, sender);
    expect(email.body).toContain(
      "Nu am găsit norme de deviz publice pentru blocurile ceramice Exemplu",
    );
    expect(email.body).not.toContain("Ne puteți trimite normele");
    expect(lintEmail({ ...email, to: vars.address })).toEqual([]);
  });

  test("leaves what it doesn't know in braces, which blocks approval", () => {
    const email = renderInitialEmail(
      "A",
      { firm: "Norgips", address: "office@norgips.example" },
      {},
    );
    const issues = lintEmail({ ...email, to: "office@norgips.example" });
    expect(issues).toContainEqual({
      code: "placeholder",
      level: "error",
      detail:
        "{Prenume}, {Fraza personalizată}, {Nume}, {telefon}, {pagina sursă}, {link politica de confidențialitate}",
    });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  test("words the note for a contact form", () => {
    const email = renderInitialEmail(
      "A",
      { ...vars, address: undefined },
      sender,
    );
    expect(email.body).toContain(
      "Vă scriu prin formularul de contact de pe https://exemplu.example/contact.",
    );
  });
});

describe("lintEmail", () => {
  const good = renderInitialEmail("A", vars, sender);

  test("requires the opt-out line and the signature", () => {
    const body = good.body
      .replace(/răspundeți „stop”/, "scrieți-ne")
      .replace("Fondator, Devize", "Devize");
    const issues = lintEmail({ ...good, body, to: vars.address });
    expect(issues).toContainEqual({ code: "missing_optout", level: "error" });
    expect(issues).toContainEqual({
      code: "missing_signature",
      level: "error",
    });
  });

  test("rejects a claimed partnership and named deviz software", () => {
    const body = `${good.body}\nSuntem partener oficial WinDoc.`;
    const issues = lintEmail({ ...good, body, to: vars.address });
    expect(issues.map((issue) => issue.detail)).toEqual([
      "partener oficial",
      "WinDoc",
    ]);
  });

  test("warns above 160 words, not counting the closing note", () => {
    expect(lintEmail({ ...good, to: vars.address })).toEqual([]);
    const long = good.body.replace(
      "Bună ziua,",
      `Bună ziua,\n\n${"cuvânt ".repeat(60)}`,
    );
    expect(lintEmail({ ...good, body: long, to: vars.address })).toEqual([
      { code: "word_limit", level: "warning", detail: expect.any(String) },
    ]);
  });

  test("checks the recipient and the diacritics", () => {
    expect(lintEmail({ ...good, to: "" }).map((i) => i.code)).toEqual([
      "missing_recipient",
    ]);
    expect(lintEmail({ ...good, to: "office" }).map((i) => i.code)).toEqual([
      "invalid_recipient",
    ]);
    const cedilla = good.body.replace("fără costuri", "fără costuri, ştiţi");
    expect(
      lintEmail({ ...good, body: `${cedilla} ş`, to: vars.address }).map(
        (i) => i.code,
      ),
    ).toEqual(["cedilla"]);
  });
});

describe("renderThanksEmail", () => {
  const thanks = {
    firm: "Exemplu",
    address: "tehnic@exemplu.example",
    thanks: {
      claimEmail: "tehnic@exemplu.example",
      claimUrl: "https://devize.example/claim/abc123",
      claimExpiresAt: Date.UTC(2026, 10, 20, 12),
      articles: 12,
      variants: 51,
      consentRecorded: false,
    },
  };

  test("says what we extracted, asks for consent and passes every rule", () => {
    const email = renderThanksEmail(thanks, sender);
    expect(email.subject).toBe("Mulțumesc pentru normele de deviz Exemplu");
    expect(email.body).toContain(
      "Vă mulțumesc pentru normele de deviz Exemplu. Le-am digitizat deja în Devize: 12 articole și 51 de variante.",
    );
    expect(email.body).toContain("vă rog să-mi confirmați printr-un răspuns");
    expect(email.body).toContain(
      "până pe 20 noiembrie 2026, pentru cine intră în Devize cu adresa tehnic@exemplu.example:\nhttps://devize.example/claim/abc123",
    );
    expect(lintEmail({ ...email, to: thanks.address })).toEqual([]);
  });

  test("leaves out the consent request once it is recorded", () => {
    const email = renderThanksEmail(
      {
        ...thanks,
        thanks: {
          ...thanks.thanks,
          articles: undefined,
          variants: undefined,
          consentRecorded: true,
        },
      },
      sender,
    );
    expect(email.body).toContain("Le digitizăm acum în Devize.");
    expect(email.body).not.toContain("să-mi confirmați");
    expect(email.body).toContain(
      "Le digitizăm acum în Devize.\n\nVă invit și să revendicați profilul Exemplu",
    );
    expect(lintEmail({ ...email, to: thanks.address })).toEqual([]);
  });

  test("blocks approval without the link", () => {
    const email = renderThanksEmail(
      { ...thanks, thanks: { ...thanks.thanks, claimUrl: undefined } },
      sender,
    );
    expect(lintEmail({ ...email, to: thanks.address })).toEqual([
      { code: "placeholder", level: "error", detail: "{link de revendicare}" },
    ]);
  });
});

describe("countOf", () => {
  test("puts “de” after 20 or more, unless the number ends in 01–19", () => {
    expect(countOf(0, "articol", "articole")).toBe("0 articole");
    expect(countOf(1, "articol", "articole")).toBe("1 articol");
    expect(countOf(19, "articol", "articole")).toBe("19 articole");
    expect(countOf(20, "articol", "articole")).toBe("20 de articole");
    expect(countOf(51, "variantă", "variante")).toBe("51 de variante");
    expect(countOf(100, "articol", "articole")).toBe("100 de articole");
    expect(countOf(112, "articol", "articole")).toBe("112 articole");
  });
});

describe("letterDate", () => {
  test("writes the day by Romania's calendar", () => {
    expect(letterDate(Date.UTC(2026, 10, 20, 12))).toBe("20 noiembrie 2026");
    // 23:30 UTC on New Year's Eve is already 1 January in Bucharest.
    expect(letterDate(Date.UTC(2026, 11, 31, 23, 30))).toBe("1 ianuarie 2027");
  });
});

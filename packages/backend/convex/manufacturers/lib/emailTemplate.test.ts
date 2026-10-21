import { describe, expect, test } from "bun:test";
import {
  hasBlockingIssue,
  lintEmail,
  renderInitialEmail,
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

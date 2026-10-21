import { describe, expect, test } from "bun:test";
import {
  emailDomain,
  isEmail,
  nameKey,
  onCompanyDomain,
  parseManufacturerLines,
  urlKey,
} from "./text";

describe("nameKey", () => {
  test("ignores case, diacritics, the legal form and România", () => {
    expect(nameKey("EXEMPLU România S.R.L.")).toBe("exemplu");
    expect(nameKey("Exemplu Romania")).toBe("exemplu");
    expect(nameKey("Beton S.A.")).toBe("beton");
    expect(nameKey("Prefabricate SA")).toBe("prefabricate");
  });

  test("keeps the words that tell companies apart", () => {
    expect(nameKey("Demo Izolații")).not.toBe(nameKey("Demo Gips"));
    expect(nameKey("Grup-Demo Construction Products")).toBe(
      "grup demo construction products",
    );
    expect(nameKey("A.B.C.D")).toBe("a b c d");
  });
});

describe("parseManufacturerLines", () => {
  test("reads the numbered outreach list", () => {
    const lines = parseManufacturerLines(`Valul 1, au deja norme:
1. Exemplu Ceramică România (Bloc X, Țiglă Y): norme publice pe exemplu.ro, Rev.2, 2018
2. Demo Gips și Demo Plafoane: aplicație de deviz proprie

16. Firma Mică
(16–29: toate cu norme publicate)
- Adezivi Test România (Marca Z)`);
    expect(lines).toEqual([
      {
        name: "Exemplu Ceramică România (Bloc X, Țiglă Y)",
        hints: "norme publice pe exemplu.ro, Rev.2, 2018",
      },
      {
        name: "Demo Gips și Demo Plafoane",
        hints: "aplicație de deviz proprie",
      },
      { name: "Firma Mică" },
      { name: "Adezivi Test România (Marca Z)" },
    ]);
  });

  test("keeps the first of two spellings of one company", () => {
    expect(
      parseManufacturerLines("Exemplu România\nEXEMPLU Romania S.R.L."),
    ).toEqual([{ name: "Exemplu România" }]);
  });
});

describe("emails and URLs", () => {
  test("recognises an address and its domain", () => {
    expect(isEmail("office@exemplu.ro")).toBe(true);
    expect(isEmail("office@exemplu")).toBe(false);
    expect(emailDomain("Tehnic@Exemplu.RO")).toBe("exemplu.ro");
  });

  test("compares URLs without scheme, www, hash or trailing slash", () => {
    expect(urlKey("https://www.exemplu.com/ro/contact/#form")).toBe(
      urlKey("http://exemplu.com/ro/contact"),
    );
    expect(urlKey("https://a.ro/p?id=1")).not.toBe(urlKey("https://a.ro/p"));
  });
});

describe("onCompanyDomain", () => {
  test("accepts the company's domain under another top-level domain", () => {
    expect(onCompanyDomain("office@exemplu.ro", "https://www.exemplu.ro")).toBe(
      true,
    );
    expect(onCompanyDomain("tehnic@exemplu.com", "exemplu.ro")).toBe(true);
    expect(
      onCompanyDomain("info@ro.exemplu.com", "https://exemplu.com/ro"),
    ).toBe(true);
  });

  test("rejects other companies and free mail", () => {
    expect(
      onCompanyDomain("office@distribuitor.ro", "https://exemplu.ro"),
    ).toBe(false);
    expect(onCompanyDomain("exemplu@gmail.com", "https://exemplu.ro")).toBe(
      false,
    );
  });
});

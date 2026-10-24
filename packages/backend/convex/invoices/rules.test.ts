import { describe, expect, test } from "bun:test";
import { buyer, line, ruleInvoice, seller } from "./fixtures.helper";
import { checkInvoice, type Finding, hasErrors } from "./rules";

const ids = (findings: Finding[], severity?: Finding["severity"]) =>
  findings
    .filter((finding) => !severity || finding.severity === severity)
    .map((finding) => finding.id);

describe("the e-Factura checks", () => {
  test("a complete invoice passes", () => {
    const findings = checkInvoice(ruleInvoice());
    expect(findings).toEqual([]);
    expect(hasErrors(findings)).toBe(false);
  });

  test("the seller must be named in full, with its county and street", () => {
    const findings = checkInvoice(
      ruleInvoice({
        seller: {
          ...seller,
          cui: undefined,
          address: " ",
          county: "Paris",
          iban: undefined,
        },
      }),
    );
    expect(ids(findings, "error")).toEqual([
      "sellerStreet",
      "sellerCounty",
      "sellerCui",
    ]);
    expect(ids(findings, "warning")).toEqual(["ibanMissing"]);
  });

  test("in București the city is the sector", () => {
    const findings = checkInvoice(
      ruleInvoice({
        seller: { ...seller, city: "București", county: "București" },
        buyer: { ...buyer, city: "Sector 3" },
      }),
    );
    expect(ids(findings)).toEqual(["sellerSector"]);
    expect(
      ids(
        checkInvoice(ruleInvoice({ buyer: { ...buyer, city: "București" } })),
      ),
    ).toEqual(["buyerSector"]);
  });

  test("a buyer's address is advice; its identifier depends on what it is", () => {
    const person = checkInvoice(
      ruleInvoice({
        buyer: { ...buyer, cui: undefined, address: undefined },
      }),
    );
    expect(ids(person, "error")).toEqual([]);
    expect(ids(person, "warning")).toEqual(["buyerStreet", "buyerCnp"]);
    const company = checkInvoice(
      ruleInvoice({
        buyer: { ...buyer, kind: "company", cui: undefined },
      }),
    );
    expect(ids(company, "error")).toEqual(["buyerCui"]);
    const nowhere = checkInvoice(
      ruleInvoice({
        buyer: { ...buyer, city: undefined, county: undefined },
      }),
    );
    expect(ids(nowhere, "error")).toEqual(["buyerCounty", "buyerCity"]);
  });

  test("VAT categories agree with the seller's standing and with each other", () => {
    const outside = { ...seller, vatRegistered: false };
    // A firm outside VAT charging VAT.
    expect(ids(checkInvoice(ruleInvoice({ seller: outside })))).toEqual([
      "sellerVat",
    ]);
    // A registered firm billing as not subject to VAT.
    const notSubject = line({ vatRate: 0, vatCategory: "O" });
    expect(ids(checkInvoice(ruleInvoice({ lines: [notSubject] })))).toEqual([
      "sellerVat",
    ]);
    // Both on one invoice.
    expect(
      ids(
        checkInvoice(
          ruleInvoice({ seller: outside, lines: [line(), notSubject] }),
        ),
      ),
    ).toEqual(["vatMixed", "sellerVat"]);
    // The right pairing passes.
    expect(
      checkInvoice(ruleInvoice({ seller: outside, lines: [notSubject] })),
    ).toEqual([]);
    // A standard-rated line at 0%.
    expect(
      checkInvoice(ruleInvoice({ lines: [line({ vatRate: 0 })] })),
    ).toEqual([{ id: "lineVat", severity: "error", line: 1 }]);
  });

  test("lines, dates and notes", () => {
    expect(ids(checkInvoice(ruleInvoice({ lines: [] })))).toEqual(["noLines"]);
    const bad = checkInvoice(
      ruleInvoice({
        lines: [line(), line({ description: " ", quantity: 0, unitPrice: -1 })],
        dueDate: "2026-10-01",
      }),
    );
    expect(bad).toEqual([
      { id: "dueBeforeIssue", severity: "error" },
      { id: "lineDescription", severity: "error", line: 2 },
      { id: "lineQuantity", severity: "error", line: 2 },
      { id: "linePrice", severity: "error", line: 2 },
    ]);
    // The row's own note is what BT-22 limits.
    expect(ids(checkInvoice(ruleInvoice({ note: "x".repeat(301) })))).toEqual([
      "notesLong",
    ]);
    expect(
      ids(
        checkInvoice(ruleInvoice({ lines: [line(), line({ quantity: -1 })] })),
      ),
    ).toEqual(["totalZero"]);
  });
});

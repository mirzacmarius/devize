import { countyCode, isSectorName, xmlCityName } from "./counties";
import type { InvoiceParty } from "./helpers";
import {
  MAX_CITY,
  MAX_DESCRIPTION,
  MAX_NAME,
  MAX_NOTES,
  MAX_POSTAL,
  MAX_STREET,
} from "./helpers";
import type { InvoiceLine } from "./money";

// What the e-Factura XML needs from an invoice before ANAF accepts it, checked
// here so the firm fixes it on the page instead of reading ANAF's rejection
// five days later: the rules of EN 16931 and CIUS-RO 1.0.1 that our invoices
// can break. An error stops the invoice from being issued; a warning is
// something to know. Pure, so the page and the server check the same way.

export type Severity = "error" | "warning";

export type FindingId =
  | "sellerName"
  | "sellerCui"
  | "sellerStreet"
  | "sellerCity"
  | "sellerCounty"
  | "sellerSector"
  | "sellerVat"
  | "buyerName"
  | "buyerStreet"
  | "buyerCity"
  | "buyerCounty"
  | "buyerSector"
  | "buyerCui"
  | "buyerCnp"
  | "textLong"
  | "noLines"
  | "lineDescription"
  | "lineQuantity"
  | "linePrice"
  | "lineVat"
  | "vatMixed"
  | "notesLong"
  | "dueBeforeIssue"
  | "ibanMissing"
  | "totalZero";

export type Finding = {
  id: FindingId;
  severity: Severity;
  // The line the finding is about, from 1.
  line?: number;
};

export type InvoiceLike = {
  kind: "advance" | "statement" | "final" | "storno";
  issueDate: string;
  dueDate: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  lines: readonly InvoiceLine[];
  totals: { total: number };
  notes?: string;
};

/** A party's address as the XML will carry it, and what it lacks. */
function checkParty(
  party: InvoiceParty,
  who: "seller" | "buyer",
  findings: Finding[],
) {
  const error = (id: FindingId) => findings.push({ id, severity: "error" });
  const warning = (id: FindingId) => findings.push({ id, severity: "warning" });
  const tooLong = (value: string | undefined, max: number) =>
    (value?.trim().length ?? 0) > max;

  if (!party.name.trim()) {
    error(who === "seller" ? "sellerName" : "buyerName");
  }
  if (
    tooLong(party.name, MAX_NAME) ||
    tooLong(party.address, MAX_STREET) ||
    tooLong(party.city, MAX_CITY) ||
    tooLong(party.postalCode, MAX_POSTAL)
  ) {
    error("textLong");
  }
  if (!party.address?.trim()) {
    if (who === "seller") {
      error("sellerStreet");
    } else {
      warning("buyerStreet");
    }
  }
  const code = countyCode(party.county);
  if (!code) {
    error(who === "seller" ? "sellerCounty" : "buyerCounty");
  }
  const city = xmlCityName(party.city, party.county);
  if (!city) {
    error(who === "seller" ? "sellerCity" : "buyerCity");
  } else if (code === "RO-B" && !isSectorName(city)) {
    error(who === "seller" ? "sellerSector" : "buyerSector");
  }
  if (who === "seller") {
    if (!party.cui?.trim()) {
      error("sellerCui");
    }
  } else if (party.kind === "company") {
    if (!party.cui?.trim()) {
      error("buyerCui");
    }
  } else if (!party.cui?.trim()) {
    // A person who gave no CNP is identified by thirteen zeros.
    warning("buyerCnp");
  }
}

/** Whether a line's VAT category agrees with its rate. */
function categoryFits(line: InvoiceLine): boolean {
  return line.vatCategory === "S" ? line.vatRate > 0 : line.vatRate === 0;
}

export function checkInvoice(invoice: InvoiceLike): Finding[] {
  const findings: Finding[] = [];
  checkParty(invoice.seller, "seller", findings);
  checkParty(invoice.buyer, "buyer", findings);

  if ((invoice.notes?.length ?? 0) > MAX_NOTES) {
    findings.push({ id: "notesLong", severity: "error" });
  }
  if (invoice.dueDate < invoice.issueDate) {
    findings.push({ id: "dueBeforeIssue", severity: "error" });
  }
  if (!invoice.seller.iban) {
    findings.push({ id: "ibanMissing", severity: "warning" });
  }

  if (invoice.lines.length === 0) {
    findings.push({ id: "noLines", severity: "error" });
  }
  invoice.lines.forEach((line, index) => {
    const at = index + 1;
    const description = line.description.trim();
    if (!description || description.length > MAX_DESCRIPTION) {
      findings.push({ id: "lineDescription", severity: "error", line: at });
    }
    if (!Number.isFinite(line.quantity) || line.quantity === 0) {
      findings.push({ id: "lineQuantity", severity: "error", line: at });
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      findings.push({ id: "linePrice", severity: "error", line: at });
    }
    if (
      !Number.isFinite(line.vatRate) ||
      line.vatRate < 0 ||
      line.vatRate > 100 ||
      !categoryFits(line)
    ) {
      findings.push({ id: "lineVat", severity: "error", line: at });
    }
  });

  // A firm outside VAT bills everything as not subject to VAT, and nothing
  // else goes with that category (EN 16931 BR-O-11); a firm registered for
  // VAT never uses it, and a firm that isn't never charges VAT (BR-O-02).
  const categories = new Set(invoice.lines.map((line) => line.vatCategory));
  if (categories.has("O") && categories.size > 1) {
    findings.push({ id: "vatMixed", severity: "error" });
  }
  if (
    (invoice.seller.vatRegistered && categories.has("O")) ||
    (!invoice.seller.vatRegistered &&
      invoice.lines.some((line) => line.vatCategory !== "O"))
  ) {
    findings.push({ id: "sellerVat", severity: "error" });
  }

  if (
    invoice.kind !== "storno" &&
    invoice.lines.length > 0 &&
    invoice.totals.total <= 0
  ) {
    findings.push({ id: "totalZero", severity: "warning" });
  }
  return findings;
}

export function hasErrors(findings: readonly Finding[]): boolean {
  return findings.some((finding) => finding.severity === "error");
}

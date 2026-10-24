import { normalizeUnit } from "../lib/text";
import { countyCode, xmlCityName } from "./counties";
import type { InvoiceParty } from "./helpers";
import { amount, type InvoiceLine, type InvoiceTotals } from "./money";

// The invoice as the e-Factura XML: UBL 2.1 in the EN 16931 profile with the
// Romanian CIUS-RO 1.0.1 rules, written element by element in the order the
// schema wants them. No library: the document is small and the order fixed.

export const CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1";

// A person who gave no CNP, as ANAF identifies them (OUG 138/2024).
export const ANONYMOUS_CNP = "0000000000000";

export type UblInvoice = {
  // The invoice's number, DVZ-0017, or a stand-in for a draft.
  code: string;
  kind: "advance" | "statement" | "final" | "storno";
  issueDate: string;
  dueDate: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  lines: readonly InvoiceLine[];
  totals: InvoiceTotals;
  // The notes, each one cbc:Note: the firm's note, then the mentions.
  notes: readonly string[];
  // The invoices this one refers to: the one it reverses, the advances it
  // deducts.
  preceding: readonly { code: string; issueDate: string }[];
  // What the works are: the Deviz's code, as the contract reference.
  contract?: string;
  // A Situație de lucrări's period.
  period?: { start: string; end: string };
  // What the payment terms say: the due date and any retention.
  paymentTerms?: string;
};

/** Text as it goes between tags: escaped, without control characters. */
export function xmlText(value: string): string {
  return value
    .replace(/\p{Cc}/gu, (char) =>
      char === "\t" || char === "\n" || char === "\r" ? char : "",
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tag(name: string, value: string | undefined, attributes = ""): string {
  return value === undefined || value === ""
    ? ""
    : `<${name}${attributes}>${xmlText(value)}</${name}>`;
}

function money(name: string, value: number): string {
  return `<${name} currencyID="RON">${amount(value)}</${name}>`;
}

// UN/ECE Recommendation 20 codes for the units norms count in.
const unitCodes: Record<string, string> = {
  mp: "MTK",
  mc: "MTQ",
  m: "MTR",
  km: "KMT",
  kg: "KGM",
  g: "GRM",
  t: "TNE",
  tkm: "TKM",
  l: "LTR",
  buc: "H87",
  set: "SET",
  sac: "BG",
  rola: "RO",
  pereche: "PR",
  ora: "HUR",
  zi: "DAY",
};

/** A unit as the XML codes it; C62 (one) for units it has no code for. */
export function unitCode(unit: string): string {
  const canonical = normalizeUnit(unit).replace(/^[\d.]+ /, "");
  return unitCodes[canonical] ?? "C62";
}

/** The VAT identifier of a registered party: RO plus the CUI. */
function vatId(party: InvoiceParty): string | undefined {
  return party.vatRegistered && party.cui ? `RO${party.cui}` : undefined;
}

function postalAddress(party: InvoiceParty): string {
  return `<cac:PostalAddress>${tag("cbc:StreetName", party.address?.trim())}${tag(
    "cbc:CityName",
    xmlCityName(party.city, party.county),
  )}${tag("cbc:PostalZone", party.postalCode?.trim())}${tag(
    "cbc:CountrySubentity",
    countyCode(party.county),
  )}<cac:Country><cbc:IdentificationCode>RO</cbc:IdentificationCode></cac:Country></cac:PostalAddress>`;
}

/**
 * A party. A registered party carries its VAT identifier (BT-31/BT-48) and
 * its legal identifier (BT-30/BT-47); one outside VAT only the legal one, so
 * the "not subject to VAT" rules hold (BR-O-02). A person without a CNP gets
 * the thirteen zeros ANAF asks for.
 */
function party(
  party: InvoiceParty,
  who: "seller" | "buyer",
  legalForm?: string,
): string {
  const vat = vatId(party);
  const legalId =
    party.cui?.trim() ||
    (who === "buyer" && party.kind === "person" ? ANONYMOUS_CNP : undefined);
  const contact = [
    tag("cbc:Telephone", party.phone?.trim()),
    tag("cbc:ElectronicMail", party.email?.trim()),
  ].join("");
  return `<cac:Party>${postalAddress(party)}${
    vat
      ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlText(vat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
      : ""
  }<cac:PartyLegalEntity>${tag("cbc:RegistrationName", party.name.trim())}${tag(
    "cbc:CompanyID",
    legalId,
  )}${tag("cbc:CompanyLegalForm", legalForm)}</cac:PartyLegalEntity>${
    contact ? `<cac:Contact>${contact}</cac:Contact>` : ""
  }</cac:Party>`;
}

/** What Legea 31/1990 wants said of the seller: its register number and capital. */
function legalFormOf(seller: InvoiceParty): string | undefined {
  const parts = [
    seller.tradeRegister?.trim(),
    seller.shareCapital !== undefined
      ? `Capital social: ${amount(seller.shareCapital).replace(".", ",")} lei`
      : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : undefined;
}

// Why a category charges no VAT, as EN 16931 codes it (VATEX).
function exemption(category: InvoiceLine["vatCategory"]): string {
  switch (category) {
    case "O":
      return "<cbc:TaxExemptionReasonCode>VATEX-EU-O</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>Neplătitor de TVA</cbc:TaxExemptionReason>";
    case "AE":
      return "<cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>Taxare inversă</cbc:TaxExemptionReason>";
    case "E":
      return "<cbc:TaxExemptionReason>Scutit de TVA</cbc:TaxExemptionReason>";
    default:
      return "";
  }
}

function taxCategory(
  element: string,
  group: { vatCategory: InvoiceLine["vatCategory"]; vatRate: number },
  withReason: boolean,
): string {
  // A category outside VAT states no rate.
  const percent =
    group.vatCategory === "O" ? "" : tag("cbc:Percent", amount(group.vatRate));
  return `<${element}><cbc:ID>${group.vatCategory}</cbc:ID>${percent}${
    withReason ? exemption(group.vatCategory) : ""
  }<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></${element}>`;
}

function invoiceLine(line: InvoiceLine, index: number): string {
  return `<cac:InvoiceLine><cbc:ID>${index + 1}</cbc:ID><cbc:InvoicedQuantity unitCode="${unitCode(
    line.unit,
  )}">${trimNumber(line.quantity)}</cbc:InvoicedQuantity>${money(
    "cbc:LineExtensionAmount",
    line.net,
  )}<cac:Item>${tag("cbc:Name", line.description.trim())}${taxCategory(
    "cac:ClassifiedTaxCategory",
    line,
    false,
  )}</cac:Item><cac:Price>${money("cbc:PriceAmount", line.unitPrice)}</cac:Price></cac:InvoiceLine>`;
}

/** A quantity with up to four decimals and no trailing zeros. */
function trimNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

/** The invoice as one XML document. */
export function buildUbl(invoice: UblInvoice): string {
  const notes = invoice.notes
    .map((note) => note.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((note) => tag("cbc:Note", note.slice(0, 300)))
    .join("");
  const period = invoice.period
    ? `<cac:InvoicePeriod>${tag("cbc:StartDate", invoice.period.start)}${tag(
        "cbc:EndDate",
        invoice.period.end,
      )}</cac:InvoicePeriod>`
    : "";
  const preceding = invoice.preceding
    .map(
      (ref) =>
        `<cac:BillingReference><cac:InvoiceDocumentReference>${tag(
          "cbc:ID",
          ref.code,
        )}${tag("cbc:IssueDate", ref.issueDate)}</cac:InvoiceDocumentReference></cac:BillingReference>`,
    )
    .join("");
  const contract = invoice.contract
    ? `<cac:ContractDocumentReference>${tag("cbc:ID", invoice.contract)}</cac:ContractDocumentReference>`
    : "";
  const iban = invoice.seller.iban?.replace(/\s+/g, "");
  const paymentMeans = iban
    ? `<cac:PaymentMeans><cbc:PaymentMeansCode>42</cbc:PaymentMeansCode><cac:PayeeFinancialAccount>${tag(
        "cbc:ID",
        iban,
      )}${tag("cbc:Name", invoice.seller.bank?.trim())}</cac:PayeeFinancialAccount></cac:PaymentMeans>`
    : "<cac:PaymentMeans><cbc:PaymentMeansCode>1</cbc:PaymentMeansCode></cac:PaymentMeans>";
  const paymentTerms = invoice.paymentTerms
    ? `<cac:PaymentTerms>${tag("cbc:Note", invoice.paymentTerms.slice(0, 300))}</cac:PaymentTerms>`
    : "";
  const subtotals = invoice.totals.byRate
    .map(
      (group) =>
        `<cac:TaxSubtotal>${money("cbc:TaxableAmount", group.net)}${money(
          "cbc:TaxAmount",
          group.vat,
        )}${taxCategory("cac:TaxCategory", group, true)}</cac:TaxSubtotal>`,
    )
    .join("");
  const totals = invoice.totals;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>${CUSTOMIZATION_ID}</cbc:CustomizationID>${tag(
    "cbc:ID",
    invoice.code,
  )}${tag("cbc:IssueDate", invoice.issueDate)}${tag(
    "cbc:DueDate",
    invoice.dueDate,
  )}<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>${notes}<cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>${period}${preceding}${contract}<cac:AccountingSupplierParty>${party(
    invoice.seller,
    "seller",
    legalFormOf(invoice.seller),
  )}</cac:AccountingSupplierParty><cac:AccountingCustomerParty>${party(
    invoice.buyer,
    "buyer",
  )}</cac:AccountingCustomerParty>${paymentMeans}${paymentTerms}<cac:TaxTotal>${money(
    "cbc:TaxAmount",
    totals.vat,
  )}${subtotals}</cac:TaxTotal><cac:LegalMonetaryTotal>${money(
    "cbc:LineExtensionAmount",
    totals.net,
  )}${money("cbc:TaxExclusiveAmount", totals.net)}${money(
    "cbc:TaxInclusiveAmount",
    totals.total,
  )}${money("cbc:PayableAmount", totals.total)}</cac:LegalMonetaryTotal>${invoice.lines
    .map(invoiceLine)
    .join("")}</Invoice>`;
}

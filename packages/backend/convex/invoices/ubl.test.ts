import { describe, expect, test } from "bun:test";
import { buyer, completeInvoice, line, seller } from "./fixtures.helper";
import { buildUbl, CUSTOMIZATION_ID, unitCode, xmlText } from "./ubl";

/** Fails when an element is opened and not closed, or closed out of order. */
function assertBalanced(xml: string) {
  const stack: string[] = [];
  for (const match of xml.matchAll(/<(\/?)([\w:.-]+)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = match;
    if (name.startsWith("?")) {
      continue;
    }
    if (selfClosing) {
      continue;
    }
    if (closing) {
      expect(stack.pop()).toBe(name);
    } else {
      stack.push(name);
    }
  }
  expect(stack).toEqual([]);
}

/** The text between an element's tags, the first time it appears. */
function textOf(xml: string, element: string): string | undefined {
  return new RegExp(`<${element}[^>]*>([^<]*)</${element}>`).exec(xml)?.[1];
}

describe("the UBL document", () => {
  test("carries the CIUS-RO profile, the parties and the totals", () => {
    const xml = buildUbl(
      completeInvoice({
        notes: ["TVA la încasare", "Mulțumim!"],
        contract: "Deviz DVZ-0001",
        paymentTerms: "Scadență 07.11.2026",
      }),
    );
    assertBalanced(xml);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(textOf(xml, "cbc:CustomizationID")).toBe(CUSTOMIZATION_ID);
    expect(CUSTOMIZATION_ID).toBe(
      "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1",
    );
    expect(textOf(xml, "cbc:UBLVersionID")).toBe("2.1");
    expect(textOf(xml, "cbc:ID")).toBe("DVZ-0001");
    expect(textOf(xml, "cbc:IssueDate")).toBe("2026-10-23");
    expect(textOf(xml, "cbc:DueDate")).toBe("2026-11-07");
    expect(textOf(xml, "cbc:InvoiceTypeCode")).toBe("380");
    expect(textOf(xml, "cbc:DocumentCurrencyCode")).toBe("RON");
    expect(xml).toContain("<cbc:Note>TVA la încasare</cbc:Note>");
    expect(xml).toContain("<cbc:Note>Mulțumim!</cbc:Note>");
    expect(xml).toContain(
      "<cac:ContractDocumentReference><cbc:ID>Deviz DVZ-0001</cbc:ID></cac:ContractDocumentReference>",
    );

    // The seller: VAT identifier, legal identifier, register and capital.
    const supplier = xml.slice(
      xml.indexOf("<cac:AccountingSupplierParty>"),
      xml.indexOf("</cac:AccountingSupplierParty>"),
    );
    expect(textOf(supplier, "cbc:StreetName")).toBe("Str. Fabricii 10");
    expect(textOf(supplier, "cbc:CityName")).toBe("Cluj-Napoca");
    expect(textOf(supplier, "cbc:PostalZone")).toBe("400001");
    expect(textOf(supplier, "cbc:CountrySubentity")).toBe("RO-CJ");
    expect(supplier).toContain(
      "<cac:PartyTaxScheme><cbc:CompanyID>RO2816464</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>",
    );
    expect(textOf(supplier, "cbc:RegistrationName")).toBe("Ana Construct SRL");
    expect(supplier).toContain(
      "<cbc:CompanyID>2816464</cbc:CompanyID><cbc:CompanyLegalForm>J12/1234/2020; Capital social: 200,00 lei</cbc:CompanyLegalForm>",
    );
    expect(textOf(supplier, "cbc:ElectronicMail")).toBe(
      "office@anaconstruct.ro",
    );

    // The buyer: a person in București, with no VAT identifier.
    const customer = xml.slice(
      xml.indexOf("<cac:AccountingCustomerParty>"),
      xml.indexOf("</cac:AccountingCustomerParty>"),
    );
    expect(textOf(customer, "cbc:CityName")).toBe("SECTOR3");
    expect(textOf(customer, "cbc:CountrySubentity")).toBe("RO-B");
    expect(customer).not.toContain("PartyTaxScheme");
    expect(textOf(customer, "cbc:CompanyID")).toBe("1900101123456");

    // Payment by transfer to the IBAN, and the terms.
    expect(xml).toContain(
      "<cac:PaymentMeans><cbc:PaymentMeansCode>42</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>RO49AAAA1B31007593840000</cbc:ID><cbc:Name>Banca Exemplu</cbc:Name></cac:PayeeFinancialAccount></cac:PaymentMeans>",
    );
    expect(xml).toContain(
      "<cac:PaymentTerms><cbc:Note>Scadență 07.11.2026</cbc:Note></cac:PaymentTerms>",
    );

    // Totals: 1000 at 21%.
    expect(xml).toContain(
      '<cac:TaxTotal><cbc:TaxAmount currencyID="RON">210.00</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="RON">1000.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="RON">210.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>21.00</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>',
    );
    expect(xml).toContain(
      '<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="RON">1000.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="RON">1210.00</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="RON">1210.00</cbc:PayableAmount></cac:LegalMonetaryTotal>',
    );
    expect(xml).toContain(
      '<cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="H87">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount><cac:Item><cbc:Name>Lucrări de construcții „Baie apartament”</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>21.00</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="RON">1000.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>',
    );
  });

  test("a firm outside VAT bills as not subject to VAT, without a rate", () => {
    const xml = buildUbl(
      completeInvoice({
        seller: { ...seller, vatRegistered: false },
        lines: [line({ vatRate: 0, vatCategory: "O", unitPrice: 500 })],
      }),
    );
    assertBalanced(xml);
    const supplier = xml.slice(
      xml.indexOf("<cac:AccountingSupplierParty>"),
      xml.indexOf("</cac:AccountingSupplierParty>"),
    );
    expect(supplier).not.toContain("PartyTaxScheme");
    expect(supplier).toContain("<cbc:CompanyID>2816464</cbc:CompanyID>");
    expect(xml).toContain(
      "<cac:TaxCategory><cbc:ID>O</cbc:ID><cbc:TaxExemptionReasonCode>VATEX-EU-O</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>Neplătitor de TVA</cbc:TaxExemptionReason><cac:TaxScheme>",
    );
    expect(xml).toContain(
      "<cac:ClassifiedTaxCategory><cbc:ID>O</cbc:ID><cac:TaxScheme>",
    );
    expect(xml).toContain(
      '<cbc:TaxAmount currencyID="RON">0.00</cbc:TaxAmount>',
    );
  });

  test("a person without a CNP gets thirteen zeros; the advance deducted is referenced", () => {
    const xml = buildUbl(
      completeInvoice({
        code: "DVZ-0002",
        buyer: { ...buyer, cui: undefined, email: "ion@example.com" },
        lines: [
          line(),
          line({
            description: "Storno avans factura DVZ-0001 din 20.10.2026",
            quantity: -1,
            unitPrice: 300,
          }),
        ],
        preceding: [{ code: "DVZ-0001", issueDate: "2026-10-20" }],
        period: { start: "2026-10-01", end: "2026-10-31" },
      }),
    );
    assertBalanced(xml);
    expect(xml).toContain(
      "<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>DVZ-0001</cbc:ID><cbc:IssueDate>2026-10-20</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>",
    );
    expect(xml).toContain(
      "<cac:InvoicePeriod><cbc:StartDate>2026-10-01</cbc:StartDate><cbc:EndDate>2026-10-31</cbc:EndDate></cac:InvoicePeriod>",
    );
    const customer = xml.slice(
      xml.indexOf("<cac:AccountingCustomerParty>"),
      xml.indexOf("</cac:AccountingCustomerParty>"),
    );
    expect(textOf(customer, "cbc:CompanyID")).toBe("0000000000000");
    expect(textOf(customer, "cbc:ElectronicMail")).toBe("ion@example.com");
    expect(xml).toContain(
      '<cbc:InvoicedQuantity unitCode="H87">-1</cbc:InvoicedQuantity>',
    );
    expect(xml).toContain(
      '<cbc:LineExtensionAmount currencyID="RON">-300.00</cbc:LineExtensionAmount>',
    );
    expect(xml).toContain(
      '<cbc:PayableAmount currencyID="RON">847.00</cbc:PayableAmount>',
    );
    // No payment means without an IBAN.
    expect(
      buildUbl(completeInvoice({ seller: { ...seller, iban: undefined } })),
    ).toContain(
      "<cac:PaymentMeans><cbc:PaymentMeansCode>1</cbc:PaymentMeansCode></cac:PaymentMeans>",
    );
  });

  test("codes units and escapes text", () => {
    expect(unitCode("mp")).toBe("MTK");
    expect(unitCode("m²")).toBe("MTK");
    expect(unitCode("mc")).toBe("MTQ");
    expect(unitCode("ore")).toBe("HUR");
    expect(unitCode("buc")).toBe("H87");
    expect(unitCode("100 buc")).toBe("H87");
    expect(unitCode("palet")).toBe("C62");
    expect(xmlText('Țiglă & <acoperiș> "roșie"')).toBe(
      "Țiglă &amp; &lt;acoperiș&gt; &quot;roșie&quot;",
    );
    expect(xmlText("a\u0007b\tc")).toBe("ab\tc");
  });
});

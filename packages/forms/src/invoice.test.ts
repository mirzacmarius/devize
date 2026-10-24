import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { amountsOf, rowLabelled, tablesOf } from "./documents.helper";
import {
  type InvoiceInput,
  invoiceCodeOf,
  invoiceDocument,
  invoiceRegister,
  type RegisterInvoice,
} from "./invoice";
import type { Block, FormDocument } from "./model";
import { renderPdf } from "./pdf";
import { renderXlsx } from "./xlsx";
import { zipFiles } from "./zip";

// A made-up invoice: Ana's firm bills Ion for his bathroom.

const fontDir = join(
  dirname(Bun.resolveSync("geist/font", import.meta.dir)),
  "fonts/geist-sans",
);
const fonts = {
  regular: readFileSync(join(fontDir, "Geist-Regular.ttf")),
  bold: readFileSync(join(fontDir, "Geist-SemiBold.ttf")),
};

function invoice(fields: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    kind: "final",
    status: "issued",
    series: "DVZ",
    number: 2,
    issueDate: "2026-10-23",
    dueDate: "2026-11-22",
    seller: {
      name: "Ana Construct SRL",
      kind: "company",
      cui: "2816464",
      vatRegistered: true,
      tradeRegister: "J12/1234/2020",
      address: "Str. Fabricii 10",
      city: "Cluj-Napoca",
      county: "Cluj",
      postalCode: "400001",
      email: "office@anaconstruct.ro",
      phone: "0722 123 456",
      iban: "RO49AAAA1B31007593840000",
      bank: "Banca Exemplu",
      shareCapital: 200,
    },
    buyer: {
      name: "Ion Popescu",
      kind: "person",
      cui: "1900101123456",
      vatRegistered: false,
      address: "Bd. Unirii 5",
      city: "Sector 3",
      county: "București",
    },
    lines: [
      {
        description: "Lucrări de construcții „Baie apartament”",
        unit: "buc",
        quantity: 1,
        unitPrice: 3097.5,
        vatRate: 21,
        vatCategory: "S",
        net: 3097.5,
      },
      {
        description: "Storno avans factura DVZ-0001 din 23.10.2026",
        unit: "buc",
        quantity: -1,
        unitPrice: 929.25,
        vatRate: 21,
        vatCategory: "S",
        net: -929.25,
      },
    ],
    totals: {
      net: 2168.25,
      vat: 455.33,
      total: 2623.58,
      byRate: [{ vatRate: 21, vatCategory: "S", net: 2168.25, vat: 455.33 }],
    },
    payments: [],
    paidAmount: 0,
    mentions: ["TVA la încasare", "Mulțumim!"],
    estimate: { code: "DVZ-0001", title: "Baie apartament" },
    ...fields,
  };
}

/** Every line of text the document prints, blocks and cells alike. */
function textOf(document: FormDocument): string {
  const parts: string[] = [];
  const walk = (block: Block) => {
    switch (block.type) {
      case "text":
        parts.push(block.text);
        break;
      case "columns":
        for (const column of block.columns) {
          parts.push(...column.lines.map((line) => line.text));
        }
        break;
      case "table":
        for (const row of block.rows) {
          parts.push(...row.cells.map((cell) => cell.text));
        }
        break;
      default:
        break;
    }
  };
  document.blocks.forEach(walk);
  return parts.join("\n");
}

describe("the invoice document", () => {
  test("prints the parties, the lines with their VAT and the totals", async () => {
    const document = invoiceDocument(invoice({ issuer: "Ana Pop" }));
    expect(document.id).toBe("FACTURA");
    expect(document.name).toBe("Factura DVZ-0002");
    expect(document.footer).toBe("DVZ-0002 · Ana Construct SRL");
    const text = textOf(document);
    expect(text).toContain("FACTURĂ");
    expect(text).toContain("Seria DVZ nr. 0002");
    expect(text).toContain("Data emiterii: 23.10.2026");
    expect(text).toContain("Scadență: 22.11.2026");
    expect(text).toContain("CIF RO2816464 · J12/1234/2020");
    expect(text).toContain("Str. Fabricii 10, 400001 Cluj-Napoca, Cluj");
    expect(text).toContain("Capital social: 200,00 lei");
    expect(text).toContain("IBAN RO49AAAA1B31007593840000 · Banca Exemplu");
    expect(text).toContain("Ion Popescu");
    expect(text).toContain("CNP 1900101123456");
    expect(text).toContain("Bd. Unirii 5, Sector 3, București");
    expect(text).toContain("Factură finală");
    expect(text).toContain("Lucrarea: Baie apartament");
    expect(text).toContain("Deviz: DVZ-0001");
    expect(text).toContain("TVA la încasare");
    expect(text).toContain("Mulțumim!");
    expect(text).toContain("Întocmit de: Ana Pop");
    expect(text).toContain("fără semnătură și ștampilă");
    expect(text).not.toContain("Neplătitor");

    const [lines, totals] = tablesOf(document);
    expect(lines?.rows).toHaveLength(2);
    expect(lines?.rows[1]?.cells.map((cell) => cell.text)).toEqual([
      "2",
      "Storno avans factura DVZ-0001 din 23.10.2026",
      "buc",
      "-1,00",
      "929,25",
      "-929,25",
      "21%",
      "-195,14",
    ]);
    expect(amountsOf(rowLabelled(totals, "Total fără TVA"))).toEqual([2168.25]);
    expect(amountsOf(rowLabelled(totals, "TVA 21%"))).toEqual([455.33]);
    expect(amountsOf(rowLabelled(totals, "TOTAL DE PLATĂ"))).toEqual([2623.58]);
    expect(rowLabelled(totals, "Rest de plată")).toBeUndefined();

    // It draws.
    const bytes = await renderPdf([document], {
      fonts,
      title: "Factura DVZ-0002",
      author: "Ana Construct SRL",
    });
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(pdf.getPageCount()).toBe(1);
  });

  test("a draft has no number; retention and payments show under the total", () => {
    const draft = invoiceDocument(
      invoice({
        status: "draft",
        series: undefined,
        number: undefined,
        kind: "statement",
        retention: { percent: 5, amount: 131.18 },
      }),
    );
    expect(invoiceCodeOf({ series: undefined, number: undefined })).toBeNull();
    expect(draft.name).toBe("Factură (ciornă)");
    expect(draft.footer).toBe("Ciornă · Ana Construct SRL");
    const text = textOf(draft);
    expect(text).toContain("CIORNĂ – fără număr");
    expect(text).toContain("Factură pentru situație de lucrări");
    const totals = tablesOf(draft)[1];
    expect(
      amountsOf(rowLabelled(totals, "Garanție de bună execuție reținută 5%")),
    ).toEqual([-131.18]);
    expect(amountsOf(rowLabelled(totals, "Rest de plată"))).toEqual([2492.4]);
    // Nothing is paid on a draft, so nothing says so.
    expect(rowLabelled(totals, "Achitat")).toBeUndefined();

    const paid = invoiceDocument(
      invoice({
        payments: [{ date: "2026-10-24", amount: 1000, method: "transfer" }],
        paidAmount: 1000,
        efactura: { uploadIndex: "5012345678" },
      }),
    );
    const paidTotals = tablesOf(paid)[1];
    expect(amountsOf(rowLabelled(paidTotals, "Achitat"))).toEqual([-1000]);
    expect(amountsOf(rowLabelled(paidTotals, "Rest de achitat"))).toEqual([
      1623.58,
    ]);
    expect(textOf(paid)).toContain("index de încărcare ANAF 5012345678");
  });

  test("a firm outside VAT says so, and an advance names its share", () => {
    const document = invoiceDocument(
      invoice({
        kind: "advance",
        advancePercent: 30,
        number: 1,
        seller: {
          ...invoice().seller,
          vatRegistered: false,
          shareCapital: undefined,
          iban: undefined,
          bank: undefined,
        },
        buyer: {
          name: "Beta Imobiliare SRL",
          kind: "company",
          cui: "12345674",
          vatRegistered: true,
          tradeRegister: "J12/1/2000",
          address: "Str. Fabricii, Nr. 10",
          city: "Cluj-Napoca",
          county: "Cluj",
        },
        lines: [
          {
            description: "Avans 30% pentru lucrarea „Baie apartament”",
            unit: "buc",
            quantity: 1,
            unitPrice: 929.25,
            vatRate: 0,
            vatCategory: "O",
            net: 929.25,
          },
        ],
        totals: {
          net: 929.25,
          vat: 0,
          total: 929.25,
          byRate: [{ vatRate: 0, vatCategory: "O", net: 929.25, vat: 0 }],
        },
        mentions: [],
        stornoOf: null,
      }),
    );
    const text = textOf(document);
    expect(text).toContain("CUI 2816464 · J12/1234/2020");
    expect(text).toContain("Factură de avans 30%");
    expect(text).toContain("CIF RO12345674 · J12/1/2000");
    expect(text).toContain("Neplătitor de TVA.");
    expect(text).not.toContain("Capital social");
    const [lines, totals] = tablesOf(document);
    expect(lines?.rows[0]?.cells[6]?.text).toBe("neimpozabil");
    expect(amountsOf(rowLabelled(totals, "TVA"))).toEqual([0]);
    expect(amountsOf(rowLabelled(totals, "TOTAL DE PLATĂ"))).toEqual([929.25]);

    const storno = invoiceDocument(
      invoice({
        kind: "storno",
        number: 3,
        stornoOf: { code: "DVZ-0002", issueDate: "2026-10-23" },
        notes: "Stornare factura DVZ-0002 din 23.10.2026: sumă greșită",
      }),
    );
    expect(textOf(storno)).toContain(
      "Stornează factura DVZ-0002 din 23.10.2026",
    );
    expect(textOf(storno)).toContain("sumă greșită");
  });
});

describe("the register of a firm's invoices", () => {
  const registered = (
    fields: Partial<RegisterInvoice> = {},
  ): RegisterInvoice => ({
    ...invoice(),
    efactura: { status: "accepted" },
    ...fields,
  });

  test("lists each invoice and sums those that weren't cancelled", () => {
    const document = invoiceRegister(
      [
        registered({ kind: "advance", number: 1, paidAmount: 1124.39 }),
        registered(),
        registered({
          number: 3,
          status: "cancelled",
          efactura: { status: "not_sent" },
        }),
      ],
      "Ana Construct SRL",
      "2026-10-24",
    );
    const [table] = tablesOf(document);
    expect(
      table?.rows.map((row) => row.cells.map((cell) => cell.text)),
    ).toEqual([
      [
        "1",
        "DVZ-0001",
        "23.10.2026",
        "Avans",
        "Ion Popescu",
        "CNP 1900101123456",
        "2.168,25",
        "455,33",
        "2.623,58",
        "1.124,39",
        "Emisă",
        "Acceptată",
      ],
      [
        "2",
        "DVZ-0002",
        "23.10.2026",
        "Finală",
        "Ion Popescu",
        "CNP 1900101123456",
        "2.168,25",
        "455,33",
        "2.623,58",
        "0,00",
        "Emisă",
        "Acceptată",
      ],
      [
        "3",
        "DVZ-0003",
        "23.10.2026",
        "Finală",
        "Ion Popescu",
        "CNP 1900101123456",
        "2.168,25",
        "455,33",
        "2.623,58",
        "0,00",
        "Anulată",
        "Netrimisă",
      ],
      [
        "Total, fără facturile anulate",
        "4.336,50",
        "910,66",
        "5.247,16",
        "1.124,39",
        "",
        "",
      ],
    ]);
  });

  test("packs into an archive with the invoices and the workbook", async () => {
    const register = invoiceRegister(
      [registered()],
      "Ana Construct SRL",
      "2026-10-24",
    );
    const pdf = await renderPdf([invoiceDocument(invoice())], {
      fonts,
      title: "Factura DVZ-0002",
    });
    const files = unzipSync(
      zipFiles({
        "2026/Factura-DVZ-0002.pdf": pdf,
        "2026/Factura-DVZ-0002.xml": new TextEncoder().encode("<Invoice/>"),
        "Registrul facturilor.xlsx": renderXlsx([register], {
          title: "Registrul facturilor",
        }),
      }),
    );
    expect(Object.keys(files).sort()).toEqual([
      "2026/Factura-DVZ-0002.pdf",
      "2026/Factura-DVZ-0002.xml",
      "Registrul facturilor.xlsx",
    ]);
    expect(files["2026/Factura-DVZ-0002.pdf"]?.length).toBe(pdf.length);
    expect(
      strFromU8(files["2026/Factura-DVZ-0002.xml"] ?? new Uint8Array()),
    ).toBe("<Invoice/>");
  });
});

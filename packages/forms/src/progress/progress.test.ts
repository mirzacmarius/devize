import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { amountsOf, fields, rowLabelled, tablesOf } from "../documents.helper";
import type { FormDocument } from "../model";
import { renderPdf } from "../pdf";
import { openWorkbook } from "../workbook/read";
import { renderXlsx } from "../xlsx";
import {
  attachmentDocument,
  receptionDocument,
  statementDocument,
  statementDocuments,
} from "./index";
import { sampleReception, sampleStatement } from "./sample.helper";

// The documents of a Deviz under execution, from a made-up second statement
// and the two receptions of the same works.

function textOf(document: FormDocument | undefined): string {
  return (document?.blocks ?? [])
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n");
}

function rowTexts(document: FormDocument, table = 0): string[][] {
  return (tablesOf(document)[table]?.rows ?? []).map((row) =>
    row.cells.map((cell) => cell.text),
  );
}

describe("statementDocument", () => {
  const document = statementDocument(sampleStatement());
  const [table, recap] = tablesOf(document);

  test("names the works, the period and who they are for", () => {
    expect(document.id).toBe("SL");
    expect(document.name).toBe("Situația de lucrări nr. 2 · DVZ-0142-R2");
    expect(document.orientation).toBe("landscape");
    expect(fields(document)).toEqual({
      Beneficiar: "Ana Popescu",
      Lucrarea: "Renovare apartament (deviz DVZ-0142-R2)",
      Adresa: "Str. Exemplu 1, ap. 4, Cluj",
    });
  });

  test("lists each Articol under its group, with every quantity and value", () => {
    expect(table?.columns).toHaveLength(12);
    expect(table?.header[0]?.map((cell) => cell.text)).toEqual([
      "Nr.",
      "Denumirea lucrării",
      "U.M.",
      "Preț unitar (lei)",
      "Cantități",
      "Valoare (lei)",
    ]);
    const rows = rowTexts(document);
    expect(rows[0]).toEqual(["1 Apartament · 01 Demolări"]);
    // 42,5 mp at 17 lei, all in this period.
    expect(rows[1]).toEqual([
      "1",
      "Desfacerea pardoselii din parchet, cu evacuarea molozului",
      "mp",
      "17,00",
      "42,50",
      "0,00",
      "42,50",
      "42,50",
      "100%",
      "0,00",
      "722,50",
      "722,50",
    ]);
    // 10 mp before and 5 now, of 18,25: 82,2 % and 3,25 to go.
    expect(rows[3]).toEqual([
      "2",
      "Placare cu gresie porțelanată 60x60 cm",
      "mp",
      "107,00",
      "18,25",
      "10,00",
      "5,00",
      "15,00",
      "82,2%",
      "3,25",
      "535,00",
      "1.605,00",
    ]);
    // 2 mp over the contract: 110 %, nothing left, flagged in bold.
    expect(rows[5]?.slice(4)).toEqual([
      "20,00",
      "20,00",
      "2,00",
      "22,00",
      "110%",
      "0,00",
      "84,00",
      "924,00",
    ]);
    expect(table?.rows[5]?.cells[8]?.bold).toBe(true);
    expect(table?.rows[3]?.cells[8]?.bold).toBeFalsy();
    expect(amountsOf(table?.rows.at(-1))).toEqual([1341.5, 3251.5]);
  });

  test("closes on the period's Recapitulație and the guarantee kept back", () => {
    const subtotal = amountsOf(rowLabelled(recap, "TOTAL fără TVA"))[0];
    const total = amountsOf(rowLabelled(recap, "TOTAL cu TVA"))[0];
    // 1.341,50 direct, CAM 2,25 % of 595,25 labour, then 10 % and 5 %.
    expect(amountsOf(rowLabelled(recap, "b) manoperă"))).toEqual([595.25]);
    expect(subtotal).toBe(1564.9);
    expect(total).toBe(1893.53);
    expect(
      amountsOf(
        rowLabelled(
          recap,
          "Garanție de bună execuție reținută (5% din valoarea fără TVA)",
        ),
      ),
    ).toEqual([78.25]);
    const text = textOf(document);
    expect(text).toContain(
      "Confirmat de beneficiar: Ana Popescu, la 03.12.2026.",
    );
    expect(text).toContain("Gresia din baie se montează");
  });

  test("says where the works stand after it", () => {
    const progress = document.blocks.filter(
      (block) => block.type === "fields",
    )[1];
    expect(progress).toMatchObject({
      items: [
        { label: "Valoarea contractului", value: "4.089,81 lei fără TVA" },
        {
          label: "Executat cumulat",
          value: "3.783,69 lei fără TVA (92,5%)",
        },
        { label: "Rest de executat", value: "306,12 lei fără TVA" },
      ],
    });
  });

  test("leaves the guarantee line out of a statement that keeps nothing back", () => {
    const data = sampleStatement();
    const document = statementDocument({
      ...data,
      guarantee: { percent: 5, method: "instrument" },
      statement: { ...data.statement, retention: 0, status: "sent" },
    });
    const [, recap] = tablesOf(document);
    expect(
      recap?.rows.some((row) =>
        row.cells[0]?.text.startsWith("Garanție de bună execuție"),
      ),
    ).toBe(false);
    expect(textOf(document)).not.toContain("Confirmat de beneficiar");
  });
});

describe("attachmentDocument", () => {
  const document = attachmentDocument(sampleStatement());

  test("lists each Articol's measurements and what they add up to", () => {
    expect(document.id).toBe("AT");
    expect(document.orientation).toBe("portrait");
    const rows = rowTexts(document);
    expect(rows[0]?.[0]).toBe(
      "1. Desfacerea pardoselii din parchet, cu evacuarea molozului",
    );
    expect(rows[1]).toEqual([
      "1",
      "Living",
      "1,00",
      "5,00",
      "4,50",
      "",
      "22,50",
    ]);
    expect(rows[2]).toEqual(["2", "Hol", "1,00", "4,00", "5,00", "", "20,00"]);
    expect(rows[3]?.slice(1)).toEqual(["Total executat în perioadă", "42,50"]);
    // A deducted opening, and a total that differs from what was executed.
    expect(rows[5]).toEqual([
      "1",
      "Bucătărie",
      "1,00",
      "3,00",
      "2,20",
      "",
      "6,60",
    ]);
    expect(rows[6]).toEqual([
      "2",
      "– Gol ușă",
      "1,00",
      "1,00",
      "1,00",
      "",
      "-1,00",
    ]);
    expect(rows[7]?.slice(1)).toEqual([
      "Total măsurat 5,60 mp; executat în perioadă",
      "5,00",
    ]);
  });

  test("keeps a quantity without measurements, as taken on site", () => {
    const rows = rowTexts(document);
    expect(rows[8]?.[0]).toBe(
      "3. Hidroizolație cu membrană bituminoasă, două straturi",
    );
    expect(rows[9]?.slice(1)).toEqual([
      "Cantitate executată în perioadă, conform măsurătorilor de pe șantier",
      "2,00",
    ]);
    expect(rows).toHaveLength(10);
  });

  test("comes after the statement only when asked for", () => {
    expect(
      statementDocuments(sampleStatement(), {
        attachment: true,
        date: "2026-12-01",
      }).map((document) => document.id),
    ).toEqual(["SL", "AT"]);
    expect(
      statementDocuments(sampleStatement(), {
        attachment: false,
        date: "2026-12-01",
      }).map((document) => document.id),
    ).toEqual(["SL"]);
  });
});

describe("receptionDocument", () => {
  test("writes the PV at the end of the works as the regulation's model", () => {
    const document = receptionDocument(sampleReception());
    const text = textOf(document);
    expect(document.id).toBe("PVRT");
    expect(document.blocks).toContainEqual({
      type: "title",
      lines: [
        "PROCES-VERBAL DE RECEPȚIE LA TERMINAREA LUCRĂRILOR",
        "Nr. 12 din 15.12.2026",
      ],
    });
    expect(text).toContain(
      "privind execuția lucrărilor de construcții aferente investiției „Renovare apartament” (deviz DVZ-0142-R2), lucrări executate în cadrul contractului nr. 45 din 01.10.2026, încheiat între Ana Popescu și Constructor Exemplu SRL.",
    );
    expect(text).toContain(
      "adresa administrativă Str. Exemplu 1, ap. 4, Cluj;",
    );
    expect(text).toContain(
      "2. Lucrările au fost executate în baza autorizației de construire nr. 120, eliberată de Primăria Cluj-Napoca, la data de 10.09.2026, cu valabilitate până la data de 10.09.2027.",
    );
    expect(text).toContain(
      "3. Comisia de recepție și-a desfășurat activitatea în perioada 14.12.2026 – 15.12.2026, fiind formată din:",
    );
    expect(text).toContain("Președinte: Ana Popescu – beneficiar");
    expect(text).toContain("Membri: Ion Ionescu – proiectant");
    expect(text).toContain("Secretar: Maria Pop");
    expect(text).toContain(
      "5.1. Lucrările pentru care s-a solicitat recepția au fost executate de Constructor Exemplu SRL în perioada 05.10.2026 – 30.11.2026 și au o valoare de 3.873,50 lei fără TVA (4.686,94 lei cu TVA), conform situațiilor de lucrări confirmate. Lucrările au fost supravegheate de dirigintele de șantier Dan Mureșan – DS 1234.",
    );
    expect(text).toContain("la terasă lipsește o gură de scurgere.");
    expect(text).toContain(
      "5.3. Obiecțiuni: 1 obiecțiune, cu termenul de remediere din anexă.",
    );
    expect(text).toContain("[X] ADMITEREA RECEPȚIEI");
    expect(text).toContain("[ ] AMÂNAREA RECEPȚIEI");
    expect(text).toContain("[ ] RESPINGEREA RECEPȚIEI");
    expect(text).toContain(
      "9. Prezentul proces-verbal, conținând ...... file și 1 anexă, a fost încheiat astăzi, 15.12.2026, la Cluj-Napoca, în 3 exemplare.",
    );
    expect(text).toContain("perioada de garanție a lucrărilor este de 24 luni");
    const [objections] = tablesOf(document);
    expect(rowTexts(document)[0]).toEqual([
      "1",
      "Montarea gurii de scurgere la terasă",
      "15.01.2027",
    ]);
    expect(objections?.header[0]?.[2]?.text).toBe("Termen de remediere");
    const signatures = document.blocks.filter(
      (block) => block.type === "signatures",
    );
    expect(
      signatures.map((block) => block.items.map((item) => item.role)),
    ).toEqual([
      ["Președinte,", "Membru,", "Secretar,"],
      ["Executant,", "Diriginte de șantier,"],
      ["Investitor/Beneficiar,"],
    ]);
    expect(signatures[1]?.items[0]?.name).toBe(
      "Constructor Exemplu SRL – Vasile Georgescu",
    );
  });

  test("leaves blanks for what the firm has not said, and no permit", () => {
    const data = sampleReception();
    const document = receptionDocument({
      ...data,
      client: null,
      reception: {
        ...data.reception,
        number: undefined,
        contract: undefined,
        permit: undefined,
        committeeStart: undefined,
        committeeEnd: undefined,
        people: [],
        objections: [],
        decision: "postponed",
        reasons: undefined,
        findings: undefined,
        copies: undefined,
        place: undefined,
        warrantyMonths: undefined,
      },
    });
    const text = textOf(document);
    expect(document.blocks).toContainEqual({
      type: "title",
      lines: [
        "PROCES-VERBAL DE RECEPȚIE LA TERMINAREA LUCRĂRILOR",
        "Nr. ...... din 15.12.2026",
      ],
    });
    expect(text).toContain(
      "2. Lucrările nu au necesitat autorizație de construire.",
    );
    expect(text).toMatch(
      /încheiat între \.+ \(investitor\/beneficiar\) și Constructor Exemplu SRL\./,
    );
    expect(text).toMatch(
      /în perioada \.+ \(ziua\/luna\/anul\), fiind formată din:/,
    );
    expect(text).toMatch(/Președinte: \.+ \(numele și prenumele\)/);
    expect(text).toContain("5.3. Obiecțiuni: nu s-au consemnat obiecțiuni.");
    expect(text).toContain("[X] AMÂNAREA RECEPȚIEI");
    expect(text).toMatch(
      /motivează propunerea făcută prin: \.+ \(motivele amânării sau respingerii\)/,
    );
    expect(text).toMatch(
      /file și 0 anexe, a fost încheiat astăzi, 15\.12\.2026, la \.+ \(locul\), în \.+ exemplare\./,
    );
    expect(tablesOf(document)).toHaveLength(0);
    const signatures = document.blocks.filter(
      (block) => block.type === "signatures",
    );
    expect(
      signatures.map((block) => block.items.map((item) => item.role)),
    ).toEqual([
      ["Președinte,", "Membru,", "Secretar,"],
      ["Executant,"],
      ["Investitor/Beneficiar,"],
    ]);
  });

  test("writes the final PV after the first one, over the warranty", () => {
    const document = receptionDocument(sampleReception("final"));
    const text = textOf(document);
    expect(document.id).toBe("PVRF");
    expect(document.name).toBe("PV de recepție finală · DVZ-0142-R2");
    expect(document.footer).toBe(
      "DVZ-0142-R2 · Proces-verbal de recepție finală",
    );
    expect(document.blocks).toContainEqual({
      type: "title",
      lines: ["PROCES-VERBAL DE RECEPȚIE FINALĂ", "Nr. 7 din 20.12.2028"],
    });
    expect(text).toContain(
      "3. Comisia de recepție finală și-a desfășurat activitatea",
    );
    expect(text).toContain(
      "au fost recepționate prin procesul-verbal de recepție la terminarea lucrărilor nr. 12 din 15.12.2026.",
    );
    expect(text).toContain(
      "5.2. Perioada de garanție a fost de 24 luni de la data admiterii recepției la terminarea lucrărilor, respectiv de la 15.12.2026.",
    );
    expect(text).toContain("[X] ADMITEREA RECEPȚIEI FINALE");
    expect(text).toContain("[ ] RESPINGEREA RECEPȚIEI FINALE");
    expect(text).toContain("Comisia de recepție finală:");
    expect(text).toContain("garanția de bună execuție rămasă se restituie");
  });
});

describe("rendering", () => {
  const fontDir = join(
    dirname(Bun.resolveSync("geist/font", import.meta.dir)),
    "fonts/geist-sans",
  );
  const fonts = {
    regular: readFileSync(join(fontDir, "Geist-Regular.ttf")),
    bold: readFileSync(join(fontDir, "Geist-SemiBold.ttf")),
  };
  const documents = [
    ...statementDocuments(sampleStatement(), {
      attachment: true,
      date: "2026-12-01",
    }),
    receptionDocument(sampleReception()),
    receptionDocument(sampleReception("final")),
  ];

  test("draws the statement, the Atașament and both PVs as PDF", async () => {
    const bytes = await renderPdf(documents, {
      fonts,
      title: "DVZ-0142-R2 Situația de lucrări nr. 2",
      author: "Constructor Exemplu SRL",
      date: new Date("2026-12-01T10:00:00Z"),
    });
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(documents.length);
    const sizes = pdf
      .getPages()
      .map((page) => page.getSize())
      .map(({ width, height }) => [Math.round(width), Math.round(height)]);
    // The statement lies down for its twelve columns; the rest stand.
    expect(sizes[0]).toEqual([842, 595]);
    expect(sizes.at(-1)).toEqual([595, 842]);
  });

  test("writes them as sheets of one workbook, the amounts as numbers", () => {
    const workbook = openWorkbook(
      renderXlsx(documents, { title: "DVZ-0142-R2 Situația de lucrări nr. 2" }),
    );
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual([
      "SL · DVZ-0142-R2",
      "AT · Situația de lucrări nr. 2",
      "PVRT · DVZ-0142-R2",
      "PVRF · DVZ-0142-R2",
    ]);
    const statement = workbook.sheets[0];
    const total = statement?.rows.find((row) =>
      Object.values(row.cells).some(
        (cell) => cell.text === "Total articole, la costul direct",
      ),
    );
    expect(
      Object.values(total?.cells ?? {}).map((cell) => cell.value),
    ).toContain(1341.5);
  });
});

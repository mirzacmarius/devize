import { describe, expect, test } from "bun:test";
import { pdfPageCount, SPREADSHEET_TYPE, sniff, tenderFileKind } from "./input";

const encode = (text: string) => new TextEncoder().encode(text);

describe("tender files", () => {
  test("are known by type, or by name when the browser gave none", () => {
    expect(tenderFileKind("Lista F3.XLSX", "")).toBe("spreadsheet");
    expect(tenderFileKind("lista", SPREADSHEET_TYPE)).toBe("spreadsheet");
    expect(tenderFileKind("lista.pdf", "application/octet-stream")).toBe("pdf");
    expect(tenderFileKind("pagina 1.jpg", "image/jpeg")).toBe("image");
    expect(tenderFileKind("lista.xls", undefined)).toBe("xls");
    expect(tenderFileKind("lista", "application/vnd.ms-excel")).toBe("xls");
    expect(tenderFileKind("caiet de sarcini.docx", undefined)).toBeNull();
  });

  test("are what their first bytes say", () => {
    const bytes = (...values: number[]) =>
      new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniff(encode("%PDF-1.7\n"))).toBe("pdf");
    expect(sniff(bytes(0x50, 0x4b, 0x03, 0x04))).toBe("zip");
    expect(sniff(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe(
      "ole",
    );
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
    expect(sniff(encode("GIF89a"))).toBe("image/gif");
    expect(sniff(encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniff(encode("Nr. crt.;Denumire"))).toBeNull();
  });

  test("a PDF's pages are counted from its page tree", () => {
    const pdf = (body: string) => encode(`%PDF-1.7\n${body}\n%%EOF`);
    expect(
      pdfPageCount(
        pdf(
          [
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
            "2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 12 >> endobj",
            "3 0 obj << /Type /Pages /Parent 2 0 R /Kids [5 0 R] /Count 3 >> endobj",
            "5 0 obj << /Type /Page /Parent 3 0 R >> endobj",
          ].join("\n"),
        ),
      ),
    ).toBe(12);
    // A tree packed in a compressed object stream isn't seen.
    expect(
      pdfPageCount(
        pdf("1 0 obj << /Type /ObjStm /N 4 /Filter /FlateDecode >> stream"),
      ),
    ).toBeUndefined();
  });
});

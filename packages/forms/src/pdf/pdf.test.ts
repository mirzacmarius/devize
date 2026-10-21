import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDocuments, documentKinds } from "../index";
import { lineItem, sampleData } from "../sample.helper";
import { embedFonts } from "./fonts";
import { renderPdf } from "./index";
import { truncateText, wrapText } from "./text";

// The Geist files the app serves, from the package it ships them in.
const fontDir = join(
  dirname(Bun.resolveSync("geist/font", import.meta.dir)),
  "fonts/geist-sans",
);
const fonts = {
  regular: readFileSync(join(fontDir, "Geist-Regular.ttf")),
  bold: readFileSync(join(fontDir, "Geist-SemiBold.ttf")),
};
const options = { withValues: true, date: "2026-10-21" };

describe("renderPdf", () => {
  test("draws every document on A4 with a bookmark each", async () => {
    const documents = buildDocuments(sampleData(), documentKinds, options);
    const bytes = await renderPdf(documents, {
      fonts,
      title: "DVZ-0142 Renovare apartament",
      author: "Constructor Exemplu SRL",
      date: new Date("2026-10-21T10:00:00Z"),
    });
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(pdf.getTitle()).toBe("DVZ-0142 Renovare apartament");
    expect(pdf.getAuthor()).toBe("Constructor Exemplu SRL");
    expect(pdf.getProducer()).toBe("Devize");
    expect(pdf.getPageCount()).toBe(documents.length);
    const sizes = pdf
      .getPages()
      .map((page) => page.getSize())
      .map(({ width, height }) => [Math.round(width), Math.round(height)]);
    // The Deviz and F3 stand; C5's fourteen columns lie down.
    expect(sizes[0]).toEqual([595, 842]);
    expect(sizes[documents.findIndex((d) => d.id === "C5")]).toEqual([
      842, 595,
    ]);
    expect(pdf.catalog.get(PDFName.of("Outlines"))).toBeDefined();
  });

  test("breaks a long Deviz across pages", async () => {
    const data = sampleData();
    data.lineItems = Array.from({ length: 120 }, (_, index) =>
      lineItem({
        code: `X${index}`,
        title: `Lucrarea ${index + 1}`,
        unit: "mp",
        quantity: 10,
        resources: [
          {
            kind: "labor",
            name: "Muncitor",
            unit: "ora",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
    );
    const documents = buildDocuments(data, ["DEVIZ", "F3"], options);
    const pdf = await PDFDocument.load(
      await renderPdf(documents, { fonts, title: "Deviz" }),
    );
    // Over a hundred items, and every F3 item has its four kinds under it.
    expect(pdf.getPageCount()).toBeGreaterThan(10);
  });
});

describe("text", () => {
  test("wraps at spaces and breaks only words too long for a line", async () => {
    const { regular } = await embedFonts(await PDFDocument.create(), fonts);
    const width = regular.width("Placare cu gresie", 8);
    expect(
      wrapText("Placare cu   gresie porțelanată", regular, 8, width),
    ).toEqual(["Placare cu gresie", "porțelanată"]);
    expect(wrapText("Rândul 1\nRândul 2", regular, 8, 500)).toEqual([
      "Rândul 1",
      "Rândul 2",
    ]);
    const long = wrapText("ABCDEFGHIJKLMNOPQRSTUVWXYZ", regular, 8, 40);
    expect(long.length).toBeGreaterThan(1);
    expect(long.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    for (const line of long) {
      expect(regular.width(line, 8)).toBeLessThanOrEqual(40);
    }
    expect(
      truncateText("Formularul F3 · 01 Demolări", regular, 8, 50),
    ).toEndWith("…");
  });
});

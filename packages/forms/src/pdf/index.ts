import {
  PDFArray,
  type PDFContext,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  type PDFRef,
} from "pdf-lib";
import type { FormDocument } from "../model";
import { drawBlock } from "./blocks";
import { embedFonts, type FontFiles } from "./fonts";
import { Writer } from "./writer";

// Draws documents into one PDF, on A4: each document starts on a new page,
// numbers its own pages and has a bookmark, so a tender's thirty forms are
// easy to find in the file.

export type { FontFiles } from "./fonts";

export type RenderOptions = {
  fonts: FontFiles;
  // The file's title, as a PDF reader's window shows it.
  title: string;
  // The firm that made the documents.
  author?: string;
  // When the file was made; now when left out.
  date?: Date;
};

/** A bookmark for each document, on its first page. */
function addOutline(
  pdf: PDFDocument,
  entries: { title: string; page: PDFRef }[],
) {
  if (entries.length === 0) {
    return;
  }
  const { context } = pdf;
  const outline = context.nextRef();
  const refs = entries.map(() => context.nextRef());
  entries.forEach((entry, index) => {
    const destination = PDFArray.withContext(context);
    destination.push(entry.page);
    destination.push(PDFName.of("XYZ"));
    destination.push(PDFNull);
    destination.push(PDFNull);
    destination.push(PDFNull);
    const item = new Map<string, unknown>([
      ["Title", PDFHexString.fromText(entry.title)],
      ["Parent", outline],
      ["Dest", destination],
    ]);
    const previous = refs[index - 1];
    const next = refs[index + 1];
    if (previous) {
      item.set("Prev", previous);
    }
    if (next) {
      item.set("Next", next);
    }
    assign(context, refs[index], item);
  });
  assign(
    context,
    outline,
    new Map<string, unknown>([
      ["Type", PDFName.of("Outlines")],
      ["First", refs[0]],
      ["Last", refs[refs.length - 1]],
      ["Count", PDFNumber.of(refs.length)],
    ]),
  );
  pdf.catalog.set(PDFName.of("Outlines"), outline);
  pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

function assign(
  context: PDFContext,
  ref: PDFRef | undefined,
  entries: Map<string, unknown>,
) {
  if (!ref) {
    return;
  }
  const dict = context.obj({});
  for (const [key, value] of entries) {
    dict.set(PDFName.of(key), value as never);
  }
  context.assign(ref, dict);
}

/** The documents as one PDF file. */
export async function renderPdf(
  documents: readonly FormDocument[],
  options: RenderOptions,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const date = options.date ?? new Date();
  pdf.setTitle(options.title, { showInWindowTitleBar: true });
  if (options.author) {
    pdf.setAuthor(options.author);
  }
  pdf.setCreator("Devize");
  pdf.setProducer("Devize");
  pdf.setLanguage("ro-RO");
  pdf.setCreationDate(date);
  pdf.setModificationDate(date);

  const fonts = await embedFonts(pdf, options.fonts);
  const outline: { title: string; page: PDFRef }[] = [];
  for (const document of documents) {
    const writer = new Writer(pdf, fonts, document);
    document.blocks.forEach((block, index) => {
      drawBlock(writer, block, document.blocks.slice(index + 1));
    });
    writer.finish();
    const first = writer.pages[0];
    if (first) {
      outline.push({ title: document.name, page: first.ref });
    }
  }
  if (documents.length > 1) {
    addOutline(pdf, outline);
  }
  return pdf.save();
}

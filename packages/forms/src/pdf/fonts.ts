import fontkit from "@pdf-lib/fontkit";
import { type PDFDocument, type PDFFont, PDFHexString } from "pdf-lib";

/** The TrueType files the documents are set in: Geist, regular and bold. */
export type FontFiles = {
  regular: ArrayBuffer | Uint8Array;
  bold: ArrayBuffer | Uint8Array;
};

/**
 * An embedded font that remembers each character's width and glyph code.
 * pdf-lib lays every string out anew, which takes most of the time on forms
 * with thousands of cells, and characters set one by one never form
 * ligatures, so a width measured is the width drawn.
 */
export class TextFont {
  private readonly widths = new Map<string, number>();
  private readonly codes = new Map<string, string>();

  constructor(readonly font: PDFFont) {}

  width(text: string, size: number): number {
    let width = 0;
    for (const char of text) {
      let advance = this.widths.get(char);
      if (advance === undefined) {
        advance = this.font.widthOfTextAtSize(char, 1);
        this.widths.set(char, advance);
      }
      width += advance;
    }
    return width * size;
  }

  encode(text: string): PDFHexString {
    let hex = "";
    for (const char of text) {
      let code = this.codes.get(char);
      if (code === undefined) {
        code = this.font.encodeText(char).toString().slice(1, -1);
        this.codes.set(char, code);
      }
      hex += code;
    }
    return PDFHexString.of(hex);
  }
}

export type Fonts = { regular: TextFont; bold: TextFont };

/**
 * Embeds only the glyphs the documents use, with tabular figures so the
 * digits of a column of amounts line up.
 */
export async function embedFonts(
  pdf: PDFDocument,
  files: FontFiles,
): Promise<Fonts> {
  pdf.registerFontkit(fontkit);
  const options = { subset: true, features: { tnum: true } };
  const [regular, bold] = await Promise.all([
    pdf.embedFont(files.regular, options),
    pdf.embedFont(files.bold, options),
  ]);
  return { regular: new TextFont(regular), bold: new TextFont(bold) };
}

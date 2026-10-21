import {
  type Color,
  degrees,
  drawText,
  type PDFDocument,
  type PDFName,
  type PDFPage,
  rgb,
} from "pdf-lib";
import type { Align, FormDocument } from "../model";
import type { Fonts, TextFont } from "./fonts";
import { truncateText } from "./text";

// Pages and what is drawn on them. Positions are measured down from the top
// of the page, as the layout reads, and turned around only when drawing.

export const colors = {
  ink: rgb(0.08, 0.08, 0.08),
  muted: rgb(0.4, 0.4, 0.4),
  // The rules of an official form's grid.
  rule: rgb(0.25, 0.25, 0.25),
  // The rules between the rows of the client's Deviz.
  faint: rgb(0.82, 0.82, 0.82),
  shade: rgb(0.94, 0.94, 0.94),
  // A schedule's bars.
  bar: rgb(0.8, 0.8, 0.8),
};

// A4, in points.
const sheet = { short: 595.28, long: 841.89 };
const margin = 36;
const labelHeight = 14;
const footerHeight = 30;

/** Cap height over font size, for Geist: what centres a line of text. */
const capHeight = 0.71;

export type TextStyle = {
  font: TextFont;
  size: number;
  color?: Color;
  align?: Align;
};

/** Where a line of text sits in a box `leading` tall whose top is at `top`. */
export function baselineOf(top: number, size: number, leading: number) {
  return top + (leading + capHeight * size) / 2;
}

/** Lays one document out page by page. */
export class Writer {
  readonly width: number;
  readonly height: number;
  readonly left = margin;
  readonly right: number;
  readonly bottom: number;
  // Where content starts on every page, under the form's label.
  readonly top: number;
  readonly pages: PDFPage[] = [];
  // How far down the current page the content has reached.
  y = 0;
  private page: PDFPage | undefined;
  private readonly fontKeys = new Map<PDFPage, Map<TextFont, PDFName>>();

  constructor(
    private readonly pdf: PDFDocument,
    readonly fonts: Fonts,
    private readonly document: FormDocument,
  ) {
    const portrait = document.orientation === "portrait";
    this.width = portrait ? sheet.short : sheet.long;
    this.height = portrait ? sheet.long : sheet.short;
    this.right = this.width - margin;
    this.bottom = this.height - margin - footerHeight / 2;
    this.top = margin + (document.label ? labelHeight : 0);
    this.newPage();
  }

  get contentWidth() {
    return this.right - this.left;
  }

  /** How much a fresh page holds. */
  get pageCapacity() {
    return this.bottom - this.top;
  }

  /** Whether nothing has been drawn on this page yet. */
  get atPageTop() {
    return this.y <= this.top;
  }

  newPage() {
    this.page = this.pdf.addPage([this.width, this.height]);
    this.pages.push(this.page);
    this.y = this.top;
    if (this.document.label) {
      this.text(this.document.label, this.right, margin + 7, {
        font: this.fonts.bold,
        size: 8,
        align: "right",
      });
    }
  }

  /** Moves to a new page unless `height` more points fit on this one. */
  fit(height: number): boolean {
    if (this.y + height > this.bottom && !this.atPageTop) {
      this.newPage();
      return true;
    }
    return false;
  }

  private current(): PDFPage {
    if (!this.page) {
      throw new Error("No page to draw on");
    }
    return this.page;
  }

  /** The name the page's resources give the font, added the first time. */
  private fontKey(font: TextFont): PDFName {
    const page = this.current();
    let keys = this.fontKeys.get(page);
    if (!keys) {
      keys = new Map();
      this.fontKeys.set(page, keys);
    }
    let key = keys.get(font);
    if (!key) {
      key = page.node.newFontDictionary(font.font.name, font.font.ref);
      keys.set(font, key);
    }
    return key;
  }

  /**
   * One line of text on its baseline. `x` is the line's left edge, centre or
   * right edge, by its alignment.
   */
  text(text: string, x: number, baseline: number, style: TextStyle) {
    if (!text) {
      return;
    }
    const width = style.font.width(text, style.size);
    const left =
      style.align === "right"
        ? x - width
        : style.align === "center"
          ? x - width / 2
          : x;
    this.current().pushOperators(
      ...drawText(style.font.encode(text), {
        color: style.color ?? colors.ink,
        font: this.fontKey(style.font),
        size: style.size,
        rotate: degrees(0),
        xSkew: degrees(0),
        ySkew: degrees(0),
        x: left,
        y: this.height - baseline,
      }),
    );
  }

  rect(x: number, top: number, width: number, height: number, color: Color) {
    this.current().drawRectangle({
      x,
      y: this.height - top - height,
      width,
      height,
      color,
    });
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: Color,
  ) {
    this.current().drawLine({
      start: { x: x1, y: this.height - y1 },
      end: { x: x2, y: this.height - y2 },
      thickness,
      color,
    });
  }

  /** Numbers every page of the document: its footer, then "Pagina 1 din 3". */
  finish() {
    const size = 7;
    const baseline = this.height - margin + 4;
    const count = this.pages.length;
    this.pages.forEach((page, index) => {
      this.page = page;
      const number = `Pagina ${index + 1} din ${count}`;
      const numberWidth = this.fonts.regular.width(number, size);
      this.line(
        this.left,
        baseline - 11,
        this.right,
        baseline - 11,
        0.5,
        colors.faint,
      );
      this.text(
        truncateText(
          this.document.footer,
          this.fonts.regular,
          size,
          this.contentWidth - numberWidth - 24,
        ),
        this.left,
        baseline,
        { font: this.fonts.regular, size, color: colors.muted },
      );
      this.text(number, this.right, baseline, {
        font: this.fonts.regular,
        size,
        color: colors.muted,
        align: "right",
      });
    });
  }
}

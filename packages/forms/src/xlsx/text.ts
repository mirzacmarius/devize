// Text as a spreadsheet's XML holds it, and the room it takes. Neither Excel
// nor LibreOffice fits a row to a merged cell's text, so the rows holding
// one get a height worked out here, from Arial's widths, with a little room
// to spare so that no line is cut off.

/** Text without the characters XML refuses: control codes and lone surrogates. */
export function cleanText(text: string): string {
  let clean = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const control = code < 0x20 && code !== 0x09 && code !== 0x0a;
    const lone = code >= 0xd800 && code <= 0xdfff;
    if (!control && !lone && code !== 0xfffe && code !== 0xffff) {
      clean += char;
    }
  }
  return clean;
}

/** Text in an XML element or attribute. */
export function xmlText(text: string): string {
  return cleanText(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Arial's widths, in thousandths of an em, as Liberation Sans has them too:
// regular and bold, for the characters the forms use. Any other letter
// takes its base letter's, or a capital's or a small letter's.
const measured =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ăâîșțĂÂÎȘȚşţŞŢ–—„”“’‘·×€°²³…«»±";
const regularWidths = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584, 556, 556, 278, 500, 278, 667, 667, 278, 667, 611,
  500, 278, 667, 611, 556, 1000, 333, 333, 333, 222, 222, 333, 584, 556, 400,
  333, 333, 1000, 556, 556, 549,
];
const boldWidths = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584, 556, 556, 278, 556, 333, 722, 722, 278, 667, 611,
  556, 333, 667, 611, 556, 1000, 500, 500, 500, 278, 278, 333, 584, 556, 400,
  333, 333, 1000, 556, 556, 549,
];
const widths = new Map(
  [...measured].map((char, index) => [
    char,
    [regularWidths[index] ?? 556, boldWidths[index] ?? 611] as const,
  ]),
);
const capital = /\p{Lu}/u;

function charWidth(char: string, bold: boolean): number {
  const known = widths.get(char) ?? widths.get(char.normalize("NFD")[0] ?? "");
  if (known) {
    return known[bold ? 1 : 0];
  }
  return capital.test(char) ? 722 : bold ? 611 : 556;
}

/** How wide a piece of text is in Arial, in points. */
export function textWidth(text: string, size: number, bold = false): number {
  let width = 0;
  for (const char of text) {
    width += charWidth(char, bold);
  }
  return (width / 1000) * size;
}

// What a cell keeps clear on each side of its text, in points.
const cellPadding = 2.5;

/**
 * How many lines a paragraph wraps to in a cell `width` points wide: at the
 * spaces, and inside a word too long for a line.
 */
export function lineCount(
  text: string,
  size: number,
  bold: boolean,
  width: number,
): number {
  const room = Math.max((width - 2 * cellPadding) * 0.95, size);
  const space = textWidth(" ", size, bold);
  let lines = 1;
  let used = 0;
  for (const word of text.split(" ")) {
    const wide = textWidth(word, size, bold);
    if (used > 0 && used + space + wide <= room) {
      used += space + wide;
      continue;
    }
    if (used > 0) {
      lines += 1;
    }
    const broken = Math.max(Math.ceil(wide / room), 1);
    lines += broken - 1;
    used = wide - (broken - 1) * room;
  }
  return lines;
}

/** A line's height, as Excel gives Arial: 12,75 points at 10. */
export function lineHeight(size: number): number {
  return size * 1.28;
}

/** A piece of a cell's text with its own look. */
export type Run = {
  text: string;
  size: number;
  bold?: boolean;
  muted?: boolean;
};

/**
 * How tall a cell `width` points wide must be for its text: each line
 * between line breaks wrapped on its own, as tall as its largest letters.
 */
export function textHeight(runs: readonly Run[], width: number): number {
  const paragraphs: { text: string; size: number; bold: boolean }[] = [];
  let current = { text: "", size: 0, bold: false };
  for (const run of runs) {
    run.text.split("\n").forEach((piece, index) => {
      if (index > 0) {
        paragraphs.push(current);
        current = { text: "", size: 0, bold: false };
      }
      current.text += piece;
      current.size = Math.max(current.size, run.size);
      current.bold ||= Boolean(run.bold) && piece !== "";
    });
  }
  paragraphs.push(current);
  return (
    paragraphs.reduce(
      (height, paragraph) =>
        height +
        lineCount(paragraph.text, paragraph.size, paragraph.bold, width) *
          lineHeight(paragraph.size),
      0,
    ) + 1
  );
}

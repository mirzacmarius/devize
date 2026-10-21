import type { TextFont } from "./fonts";

/**
 * Breaks text into lines no wider than `width`: at spaces, and inside a word
 * only when the word alone is too long for a line. Line breaks in the text
 * are kept; every other run of white space becomes one space.
 */
export function wrapText(
  text: string,
  font: TextFont,
  size: number,
  width: number,
): string[] {
  const lines: string[] = [];
  const space = font.width(" ", size);
  // Widths summed word by word differ from the whole line's in the last
  // digits; a line that fits exactly still fits.
  const room = width + 0.01;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    let lineWidth = 0;
    for (const word of words) {
      const wordWidth = font.width(word, size);
      if (line && lineWidth + space + wordWidth <= room) {
        line += ` ${word}`;
        lineWidth += space + wordWidth;
        continue;
      }
      if (line) {
        lines.push(line);
      }
      if (wordWidth <= room) {
        line = word;
        lineWidth = wordWidth;
        continue;
      }
      line = "";
      lineWidth = 0;
      for (const char of word) {
        const charWidth = font.width(char, size);
        if (line && lineWidth + charWidth > room) {
          lines.push(line);
          line = "";
          lineWidth = 0;
        }
        line += char;
        lineWidth += charWidth;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Cuts text to fit `width`, ending it with an ellipsis. */
export function truncateText(
  text: string,
  font: TextFont,
  size: number,
  width: number,
): string {
  if (font.width(text, size) <= width) {
    return text;
  }
  const ellipsis = "…";
  let kept = "";
  let keptWidth = font.width(ellipsis, size);
  for (const char of text) {
    const charWidth = font.width(char, size);
    if (keptWidth + charWidth > width) {
      break;
    }
    kept += char;
    keptWidth += charWidth;
  }
  return `${kept.trimEnd()}${ellipsis}`;
}

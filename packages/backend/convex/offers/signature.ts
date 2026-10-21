import { invalid } from "../lib/errors";

// A client signs an Ofertă by drawing on the page. The drawing arrives as SVG
// path data, absolute moves and lines between whole-pixel points in a fixed
// box, so it can be shown and printed again but can carry nothing else.

export const SIGNATURE_WIDTH = 600;
export const SIGNATURE_HEIGHT = 200;
// About 3000 points, more than any signature needs.
export const SIGNATURE_MAX_LENGTH = 30_000;
const PATTERN = /^M\d{1,3} \d{1,3}(?: [ML]\d{1,3} \d{1,3})*$/;

/**
 * Checks a drawn signature: only moves and lines inside the box, and enough
 * ink to be a signature rather than a dot. Throws `invalid("signature")`.
 */
export function checkSignaturePath(path: string): string {
  const clean = path.trim();
  if (clean.length > SIGNATURE_MAX_LENGTH || !PATTERN.test(clean)) {
    throw invalid("signature");
  }
  const numbers = (clean.match(/\d+/g) ?? []).map(Number);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i] ?? 0;
    const y = numbers[i + 1] ?? 0;
    if (x > SIGNATURE_WIDTH || y > SIGNATURE_HEIGHT) {
      throw invalid("signature");
    }
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const points = numbers.length / 2;
  if (points < 5 || Math.max(maxX - minX, maxY - minY) < 20) {
    throw invalid("signature");
  }
  return clean;
}

/** The name a client signs with: their own words, trimmed. */
export function checkSignerName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 120) {
    throw invalid("name");
  }
  return clean;
}

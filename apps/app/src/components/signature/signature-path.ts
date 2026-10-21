import {
  SIGNATURE_HEIGHT,
  SIGNATURE_MAX_LENGTH,
  SIGNATURE_WIDTH,
} from "@devize/backend/convex/offers/signature";

// A drawn signature travels as SVG path data in a fixed 600 × 200 box, which
// the server checks (convex/offers/signature.ts) and the pages draw again.

export { SIGNATURE_HEIGHT, SIGNATURE_WIDTH };

export type Point = { x: number; y: number };
export type Stroke = readonly Point[];

const inBox = (value: number, max: number) =>
  Math.min(max, Math.max(0, Math.round(value)));

function toPath(strokes: readonly Stroke[], step: number): string {
  const parts: string[] = [];
  for (const stroke of strokes) {
    let last: Point | undefined;
    for (const point of stroke) {
      const x = inBox(point.x, SIGNATURE_WIDTH);
      const y = inBox(point.y, SIGNATURE_HEIGHT);
      if (last && Math.hypot(x - last.x, y - last.y) < step) {
        continue;
      }
      parts.push(`${last ? "L" : "M"}${x} ${y}`);
      last = { x, y };
    }
  }
  return parts.join(" ");
}

/**
 * Strokes drawn on the pad as the path the server keeps: whole pixels inside
 * the box, a move to start each stroke and lines between its points. Points
 * a pixel or two apart are dropped, and more of them for a long signature.
 */
export function signaturePath(strokes: readonly Stroke[]): string {
  let path = toPath(strokes, 2);
  for (
    let step = 4;
    path.length > SIGNATURE_MAX_LENGTH && step <= SIGNATURE_WIDTH;
    step *= 2
  ) {
    path = toPath(strokes, step);
  }
  return path;
}

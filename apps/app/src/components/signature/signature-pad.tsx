"use client";

import { cn } from "@devize/ui/utils";
import { type PointerEvent, useRef } from "react";
import {
  type Point,
  SIGNATURE_HEIGHT,
  SIGNATURE_WIDTH,
  type Stroke,
  signaturePath,
} from "./signature-path";

/**
 * A box to sign in with a finger, a pen or the mouse. The strokes belong to
 * the form, which turns them into a path with signaturePath() and clears
 * them by passing an empty list.
 */
export function SignaturePad({
  id,
  label,
  strokes,
  onChange,
  placeholder,
  invalid = false,
  describedBy,
}: {
  id?: string;
  // What a screen reader calls the box: "Chenarul pentru semnătură".
  label: string;
  strokes: readonly Stroke[];
  onChange: (strokes: Stroke[]) => void;
  // Shown on the empty box: "Semnează aici, cu degetul sau cu mouse-ul".
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const drawing = useRef(false);

  const pointAt = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * SIGNATURE_WIDTH,
      y: ((event.clientY - box.top) / box.height) * SIGNATURE_HEIGHT,
    };
  };

  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    onChange([...strokes, [pointAt(event)]]);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const last = strokes.at(-1);
    if (!drawing.current || !last) {
      return;
    }
    onChange([...strokes.slice(0, -1), [...last, pointAt(event)]]);
  };

  const end = () => {
    drawing.current = false;
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-input bg-field",
        invalid && "border-danger",
      )}
    >
      <svg
        id={id}
        viewBox={`0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`}
        role="img"
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="block aspect-[3/1] w-full cursor-crosshair touch-none select-none text-ink"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {/* The line to sign on. */}
        <path
          d={`M40 140 L52 152 M52 140 L40 152 M70 150 L${SIGNATURE_WIDTH - 40} 150`}
          className="stroke-ink-3 opacity-50"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d={signaturePath(strokes)}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {placeholder && strokes.length === 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-1/3 -translate-y-1/2 text-center text-meta text-ink-3"
        >
          {placeholder}
        </span>
      )}
    </div>
  );
}

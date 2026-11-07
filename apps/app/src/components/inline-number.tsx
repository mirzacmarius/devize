"use client";

import { cn } from "@devize/ui/utils";
import { useState } from "react";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale } from "@/locales/client";

/**
 * A number inside a table that reads as text and edits in place: click,
 * type "42,5", then Enter or click away. Escape puts the old value back.
 */
export function InlineNumber({
  value,
  format,
  onCommit,
  label,
  disabled,
  min = 0,
  fixed = false,
  placeholder,
  className,
}: {
  value: number;
  format: (value: number) => string;
  onCommit: (value: number) => void;
  // What the field is, for screen readers: "Cantitate, Gresie porțelanată".
  label: string;
  disabled?: boolean;
  min?: number;
  // Its width comes from `className`, so a column of them lines up.
  fixed?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const locale = useCurrentLocale();
  const [draft, setDraft] = useState<string | null>(null);

  if (disabled) {
    return (
      <span className={cn("tabular-nums", className)}>{format(value)}</span>
    );
  }

  const shown = draft ?? format(value);

  const commit = () => {
    if (draft === null) {
      return;
    }
    const parsed = parseDecimal(draft);
    setDraft(null);
    if (parsed !== undefined && parsed >= min && parsed !== value) {
      onCommit(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={shown}
      placeholder={placeholder}
      // As wide as the number, so its column is no wider than its numbers.
      style={
        fixed
          ? undefined
          : { width: `calc(${Math.max(shown.length, 4)}ch + 18px)` }
      }
      onFocus={(event) => {
        setDraft(formatInputNumber(value, locale));
        // Select after React puts the raw number in.
        const input = event.currentTarget;
        requestAnimationFrame(() => input.select());
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          // Blur once React has dropped the draft, so nothing is saved.
          const input = event.currentTarget;
          setDraft(null);
          requestAnimationFrame(() => input.blur());
        }
      }}
      className={cn(
        // The field's own edge and padding hang past the column, so the number
        // lines up with the head and the plain numbers around it.
        "-mr-[9px] h-8 rounded-sm border border-transparent bg-transparent px-2 text-right text-body tabular-nums text-ink transition-colors placeholder:text-ink-3 hover:border-edge focus:border-ink/60 focus:bg-field focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/10",
        className,
      )}
    />
  );
}

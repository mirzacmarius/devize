import { Card } from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import type { ReactNode } from "react";
import { Amount } from "@/components/amount";

/** The figures a page is about, side by side in one card, with a note under it. */
export function FigureStrip({
  hint,
  className,
  children,
}: {
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2 sm:-mt-1">
      <Card
        className={cn(
          "grid grid-cols-2 xl:auto-cols-[minmax(0,1fr)] xl:grid-flow-col xl:grid-cols-[minmax(0,1.25fr)]",
          className,
        )}
      >
        {children}
      </Card>
      {hint && <p className="m-0 text-meta text-ink-3">{hint}</p>}
    </section>
  );
}

/**
 * One figure of a FigureStrip: what it is, how much, and in what. The rows are
 * the strip's, so the figures share a baseline whatever their size; `lead` is
 * the one the page comes down to, and the only one with its bani a step back:
 * the rest are one tone, so a strip doesn't read as five two-tone objects.
 */
export function Figure({
  label,
  value,
  unit,
  note,
  lead = false,
  beside,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  note?: ReactNode;
  lead?: boolean;
  /** Beside the figure, to the column's end: what shows it as a share. */
  beside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-0.5 border-border px-4 py-3.5 max-xl:last:odd:col-span-2 sm:max-xl:py-3 max-xl:[&:nth-child(even)]:border-l max-xl:[&:nth-child(n+3)]:border-t sm:px-6 sm:py-1 sm:first:pl-0 sm:max-xl:[&:nth-child(odd)]:pl-0 xl:[&:not(:first-child)]:border-l">
      <p className="m-0 text-meta text-ink-2">{label}</p>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 self-baseline">
        <span
          className={cn(
            "text-stat tabular-nums",
            lead ? "text-ink sm:text-hero" : "text-ink-2",
          )}
        >
          {lead && typeof value === "string" ? <Amount value={value} /> : value}
        </span>
        {unit && <span className="text-meta text-ink-3">{unit}</span>}
        {beside}
      </div>
      <div className="min-w-0 text-meta tabular-nums text-ink-3">
        {note}
        {children}
      </div>
    </div>
  );
}

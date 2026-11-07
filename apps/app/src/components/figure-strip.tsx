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
    <section className="grid min-w-0 gap-2">
      <Card
        className={cn(
          "grid grid-cols-2 xl:auto-cols-fr xl:grid-flow-col",
          className,
        )}
      >
        {children}
      </Card>
      {hint && <p className="m-0 text-meta text-ink-3">{hint}</p>}
    </section>
  );
}

/** One figure of a FigureStrip: what it is, how much, and in what. */
export function Figure({
  label,
  value,
  unit,
  note,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  note?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid min-w-0 content-start gap-0.5 border-border px-4 py-3.5 max-xl:last:odd:col-span-2 max-xl:[&:nth-child(even)]:border-l max-xl:[&:nth-child(n+3)]:border-t sm:px-6 sm:py-1 sm:first:pl-0 sm:max-xl:[&:nth-child(odd)]:pl-0 xl:[&:not(:first-child)]:border-l">
      <p className="m-0 text-meta text-ink-2">{label}</p>
      <p className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className="text-stat tabular-nums text-ink">
          {typeof value === "string" ? <Amount value={value} /> : value}
        </span>
        {unit && <span className="text-meta text-ink-3">{unit}</span>}
      </p>
      {note && <div className="text-meta tabular-nums text-ink-3">{note}</div>}
      {children}
    </div>
  );
}

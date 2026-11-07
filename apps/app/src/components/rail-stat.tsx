import { Card, CardContent } from "@devize/ui/card";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Amount } from "@/components/amount";

/**
 * What a section of the rail comes down to, ahead of its details: what it is,
 * the figure, and the way to its page when it has one.
 */
export function RailStat({
  id,
  label,
  value,
  unit,
  href,
  children,
}: {
  id?: string;
  label: ReactNode;
  value: string;
  unit?: ReactNode;
  href?: string;
  children?: ReactNode;
}) {
  const figure = (
    <p className="m-0 flex items-baseline gap-1.5">
      <span className="text-stat tabular-nums text-ink">
        <Amount value={value} />
      </span>
      {unit && <span className="text-meta text-ink-3">{unit}</span>}
    </p>
  );
  return (
    <Card id={id} data-stat className="scroll-mt-4">
      <CardContent className="gap-0">
        {href ? (
          <Link
            href={href}
            className="group grid rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 text-meta text-ink-2 transition-colors group-hover:text-ink">
                {label}
              </h3>
              {/* The chevron's glyph ends on the column's edge, like a row's. */}
              <ChevronRight
                aria-hidden
                className="-mr-[5px] size-4 shrink-0 text-ink-3"
              />
            </div>
            {figure}
          </Link>
        ) : (
          <>
            <h3 className="m-0 text-meta text-ink-2">{label}</h3>
            {figure}
          </>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * What a rail opens with, whatever the Deviz is at: one frame, its parts a
 * hairline apart. Nothing to show, no frame.
 */
export function RailSummary({ children }: { children: ReactNode }) {
  return (
    <div className="rail-summary grid min-w-0 rounded-lg border border-card-border p-4">
      {children}
    </div>
  );
}

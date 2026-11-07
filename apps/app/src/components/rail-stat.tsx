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
    <>
      <span className="text-stat tabular-nums text-ink">
        <Amount value={value} />
      </span>
      {unit && <span className="text-meta text-ink-3">{unit}</span>}
    </>
  );
  return (
    <Card id={id} data-stat className="scroll-mt-4">
      <CardContent className="gap-0">
        <h3 className="m-0 text-meta text-ink-2">{label}</h3>
        {href ? (
          <Link
            href={href}
            className="group flex items-baseline gap-1.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {figure}
            {/* The chevron's glyph ends on the column's edge, like a row's. */}
            <ChevronRight
              aria-hidden
              className="-mr-[5px] ml-auto size-4 shrink-0 self-center text-ink-3"
            />
          </Link>
        ) : (
          <p className="m-0 flex items-baseline gap-1.5">{figure}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

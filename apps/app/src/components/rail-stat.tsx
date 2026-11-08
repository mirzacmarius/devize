import { Card, CardContent } from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  row = false,
  before,
  children,
}: {
  id?: string;
  label: ReactNode;
  value: string;
  unit?: ReactNode;
  href?: string;
  /** Not what the summary comes down to: a line beside its value, no figure. */
  row?: boolean;
  /** What the figure follows from, above it. */
  before?: ReactNode;
  children?: ReactNode;
}) {
  if (row) {
    return (
      <Card id={id} data-stat className="scroll-mt-4">
        <CardContent className="gap-0">
          {href ? (
            <Link
              href={href}
              className="group flex items-baseline justify-between gap-3 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h3 className="m-0 min-w-0 text-body font-medium text-ink group-hover:underline">
                {label}
              </h3>
              <span className="text-body font-medium tabular-nums text-ink">
                {value}
              </span>
            </Link>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="m-0 text-body font-medium text-ink">{label}</h3>
              <span className="text-body font-medium tabular-nums text-ink">
                {value}
              </span>
            </div>
          )}
          {children}
        </CardContent>
      </Card>
    );
  }
  const figure = (
    <p className="m-0 flex items-baseline gap-1.5">
      <span className="text-figure tabular-nums text-ink">{value}</span>
      {unit && <span className="text-meta text-ink-3">{unit}</span>}
    </p>
  );
  return (
    <Card id={id} data-stat className="scroll-mt-4">
      <CardContent className="gap-0">
        {before}
        {href ? (
          <Link
            href={href}
            className="group grid rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 text-body text-ink-2 transition-colors group-hover:text-ink">
                {label}
              </h3>
              <ChevronRight
                aria-hidden
                className="-mr-[5px] size-4 shrink-0 text-ink-3"
              />
            </div>
            {figure}
          </Link>
        ) : (
          <>
            <h3 className="m-0 text-body text-ink-2">{label}</h3>
            {figure}
          </>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * A page's rail: a RailSummary, then a RailList. `sticky` keeps it in sight
 * beside a long page.
 */
export function Rail({
  sticky = false,
  children,
}: {
  sticky?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rail-sections grid min-w-0 gap-6 xl:gap-5",
        sticky &&
          "xl:sticky xl:top-16 xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto xl:[scrollbar-width:thin]",
      )}
    >
      {children}
    </div>
  );
}

/**
 * What a rail opens with, whatever the Deviz is at: no frame, as the rows
 * under it have none, its parts and its end a hairline apart. Nothing to show,
 * no line.
 */
export function RailSummary({ children }: { children: ReactNode }) {
  return (
    <div className="rail-summary grid min-w-0 border-b border-border pb-5">
      {children}
    </div>
  );
}

/**
 * The rows of a rail that are looked at now and then. Beside the main column
 * they stand under the summary, on its edges; stacked under it, a list.
 */
export function RailList({ children }: { children: ReactNode }) {
  return <div className="rail-list contents xl:block">{children}</div>;
}

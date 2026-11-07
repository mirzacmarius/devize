import { Card, CardContent } from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
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
      <span className="text-figure tabular-nums text-ink">
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
          "xl:sticky xl:top-14 xl:max-h-[calc(100vh-4.5rem)] xl:overflow-y-auto xl:[scrollbar-width:thin]",
      )}
    >
      {children}
    </div>
  );
}

/**
 * What a rail opens with, whatever the Deviz is at: a frame of its own, its
 * parts a hairline apart. Nothing to show, no frame.
 */
export function RailSummary({ children }: { children: ReactNode }) {
  return (
    <div className="rail-summary grid min-w-0 rounded-lg border border-card-border p-4">
      {children}
    </div>
  );
}

/**
 * The rows of a rail that are looked at now and then. Beside the main column
 * they stand under the summary, without a frame, on the edges of what's in it;
 * stacked under it, a list.
 */
export function RailList({ children }: { children: ReactNode }) {
  return (
    <div className="rail-list contents xl:block xl:px-[17px]">{children}</div>
  );
}

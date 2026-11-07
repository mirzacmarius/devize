"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";

// One row of a rail, whatever it does: a name, what it holds, and a chevron when
// it opens or leads somewhere. The whole row is the target.
const ROW =
  "group flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xs text-left tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:min-h-8";

function RowText({
  title,
  lead,
  open,
}: {
  title: ReactNode;
  lead?: ReactNode;
  open?: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "text-body font-normal text-ink-2 transition-colors group-hover:text-ink xl:text-meta",
          lead !== undefined ? "shrink-0" : "min-w-0",
        )}
      >
        {title}
      </span>
      {/* The chevron's glyph ends on the column's edge. */}
      <span
        data-row-end
        className="-mr-[5px] ml-auto flex min-w-0 items-center gap-2"
      >
        {lead !== undefined && (
          <span className="truncate text-body font-normal tabular-nums text-ink xl:text-meta">
            {lead}
          </span>
        )}
        <ChevronRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-ink-3 transition-transform",
            open && "rotate-90",
          )}
        />
      </span>
    </>
  );
}

function useFold(attention: boolean) {
  const [choice, setChoice] = useState<boolean>();
  const open = choice ?? attention;
  return { open, toggle: () => setChoice(!open), contentId: useId() };
}

/** A row that leads to its own page, among the other rows of a section. */
export function LinkRow({
  title,
  lead,
  href,
}: {
  title: ReactNode;
  lead?: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} data-row className={ROW}>
      <RowText title={title} lead={lead} />
    </Link>
  );
}

/** A row that unfolds what it holds, among the other rows of a section. */
export function FoldRow({
  title,
  lead,
  attention = false,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  attention?: boolean;
  children: ReactNode;
}) {
  const { open, toggle, contentId } = useFold(attention);
  return (
    <div data-row>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className={ROW}
      >
        <RowText title={title} lead={lead} open={open} />
      </button>
      <div
        id={contentId}
        className={cn("grid gap-3 pb-3 pt-1", !open && "hidden")}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * What the rows under it are about, where they stand beside the main column
 * and read as one list.
 */
export function RailLabel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h3
      data-rail-label
      className={cn(
        "m-0 mb-0.5 mt-2.5 hidden border-t border-border pt-3.5 text-caption text-ink-3 xl:block",
        className,
      )}
    >
      {children}
    </h3>
  );
}

/**
 * Rows that have had their day. Beside the main column, one row that opens
 * them; stacked under it they stay rows, which the links above the Articole
 * lead to.
 */
export function RailGroup({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  const { open, toggle, contentId } = useFold(false);
  return (
    <>
      <div className="hidden xl:block">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
          className={ROW}
        >
          <RowText title={title} open={open} />
        </button>
      </div>
      <div
        id={contentId}
        data-rail-group
        className={cn(
          "contents",
          open
            ? "xl:mb-1 xl:block xl:border-b xl:border-border xl:pb-1"
            : "xl:hidden",
        )}
      >
        {children}
      </div>
    </>
  );
}

/**
 * A section of a page's rail that is looked at now and then: its name and one
 * line of what it holds, and the rest once opened. `attention` opens it by
 * itself when it has something to say, until someone closes it.
 */
export function FoldCard({
  id,
  title,
  lead,
  attention = false,
  children,
}: {
  id?: string;
  title: string;
  lead?: ReactNode;
  attention?: boolean;
  children: ReactNode;
}) {
  const { open, toggle, contentId } = useFold(attention);
  return (
    <Card id={id} data-fold className="scroll-mt-4">
      <CardHeader className="min-h-0 py-0">
        <CardTitle className="w-full min-w-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={toggle}
            className={ROW}
          >
            <RowText title={title} lead={lead} open={open} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent id={contentId} className={cn(!open && "hidden")}>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * A section that is really the way to its own page: its name and one line of
 * what's there, and, under them, anything that wants a look.
 */
export function LinkCard({
  title,
  lead,
  href,
  children,
}: {
  title: string;
  lead: ReactNode;
  href: string;
  children?: ReactNode;
}) {
  return (
    <Card data-fold>
      <CardHeader className="min-h-0 py-0">
        <CardTitle className="w-full min-w-0">
          <LinkRow title={title} lead={lead} href={href} />
        </CardTitle>
      </CardHeader>
      {children && <CardContent className="gap-1">{children}</CardContent>}
    </Card>
  );
}

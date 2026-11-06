"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";

// The whole row is the target: the section's name and one line of what it holds.
const ROW =
  "group flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Lead({ lead, open }: { lead: ReactNode; open?: boolean }) {
  return (
    <span className="ml-auto flex min-w-0 items-center gap-1.5">
      <span className="truncate text-meta text-ink-3 transition-colors group-hover:text-ink-2">
        {lead}
      </span>
      <ChevronRight
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-ink-3 transition-transform",
          open && "rotate-90",
        )}
      />
    </span>
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
  lead: ReactNode;
  attention?: boolean;
  children: ReactNode;
}) {
  const [choice, setChoice] = useState<boolean>();
  const open = choice ?? attention;
  const contentId = useId();
  return (
    <Card id={id} data-fold className="scroll-mt-4">
      <CardHeader className="min-h-0 py-0">
        <CardTitle className="w-full min-w-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setChoice(!open)}
            className={ROW}
          >
            <span className="shrink-0">{title}</span>
            <Lead lead={lead} open={open} />
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
          <Link href={href} className={ROW}>
            <span className="shrink-0">{title}</span>
            <Lead lead={lead} />
          </Link>
        </CardTitle>
      </CardHeader>
      {children && <CardContent className="gap-1">{children}</CardContent>}
    </Card>
  );
}

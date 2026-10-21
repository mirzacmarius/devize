import type * as React from "react";

import { cn } from "../utils";

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  // The identifier (DVZ-0142) or the name, never a sentence.
  title: React.ReactNode;
  // A StatusPill after the title.
  status?: React.ReactNode;
  // The line under the title: 3–4 facts joined by " · " on a detail page
  // ("Renovare baie · Maria Ionescu · 39.916,16 lei cu TVA"), one sentence
  // on a list page.
  description?: React.ReactNode;
  // At most a secondary and a primary Button, plus an icon button with a menu.
  actions?: React.ReactNode;
  // A Lucide icon or the product's photo, in a 56px tile before the title.
  thumb?: React.ReactNode;
  // The bar above the title: a Breadcrumb on the left, tools (date,
  // notifications) on the right.
  breadcrumb?: React.ReactNode;
  tools?: React.ReactNode;
}

// The top of every page: what this is, its state and the next action.
function PageHeader({
  title,
  status,
  description,
  actions,
  thumb,
  breadcrumb,
  tools,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn("grid min-w-0 gap-6", className)} {...props}>
      {(breadcrumb || tools) && (
        <div className="flex min-w-0 items-center justify-between gap-4">
          {breadcrumb ?? <span />}
          {tools && (
            <div className="flex shrink-0 items-center gap-3 text-meta text-ink-3">
              {tools}
            </div>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        {thumb && (
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-tile text-ink-2 shadow-[inset_0_0_0_1px_hsl(var(--border))] [&_svg]:size-6"
          >
            {thumb}
          </span>
        )}
        <div className="grid min-w-0 flex-1 basis-64 gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-title-page text-ink">{title}</h1>
            {status}
          </div>
          {description && (
            <p className="m-0 text-body-lg text-ink-2 tabular-nums">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 pt-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export { PageHeader };

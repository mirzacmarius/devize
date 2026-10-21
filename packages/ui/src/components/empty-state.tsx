import type * as React from "react";

import { cn } from "../utils";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  // The area's icon from Icons.
  icon?: React.ReactNode;
  title: React.ReactNode;
  // What will be here, in one or two sentences.
  description?: React.ReactNode;
  // The Button that adds the first item, when there is one.
  action?: React.ReactNode;
}

// What a list or a page shows before it has anything in it.
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-4 rounded-lg border bg-card px-6 py-16 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-lg bg-tile text-ink-2 shadow-[inset_0_0_0_1px_hsl(var(--border-control))] [&_svg]:size-6"
        >
          {icon}
        </span>
      )}
      <div className="grid max-w-[460px] gap-1">
        <h2 className="m-0 text-title-card text-ink">{title}</h2>
        {description && (
          <p className="m-0 text-body text-ink-2">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export { EmptyState };

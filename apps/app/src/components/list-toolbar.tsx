import { cn } from "@devize/ui/utils";
import type { HTMLAttributes } from "react";

/**
 * What narrows a list, on one line above it: as high as a page's tabs, so a
 * table's head stands at the same place from page to page.
 */
export function ListToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:min-h-11",
        className,
      )}
      {...props}
    />
  );
}

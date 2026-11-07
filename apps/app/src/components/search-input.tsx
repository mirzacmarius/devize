import { Input, toolbarField } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * A search field with its icon; give it an aria-label or a label. `quiet` when
 * it's in a page's toolbar, where it narrows a list.
 */
export function SearchInput({
  className,
  quiet = false,
  ...props
}: ComponentProps<"input"> & { quiet?: boolean }) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
      />
      <Input
        type="search"
        className={cn("pl-9 max-sm:h-10", quiet && toolbarField)}
        {...props}
      />
    </div>
  );
}

import { Input, toolbarField } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * A search field with its icon; give it an aria-label or a label. `quiet` when
 * it narrows a list; `tall` beside a page's own buttons, as tall as they are.
 */
export function SearchInput({
  className,
  quiet = false,
  tall = false,
  ...props
}: ComponentProps<"input"> & { quiet?: boolean; tall?: boolean }) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
      />
      <Input
        type="search"
        className={cn(
          "pl-9 max-sm:h-11",
          quiet && toolbarField,
          tall && "sm:h-9",
        )}
        {...props}
      />
    </div>
  );
}

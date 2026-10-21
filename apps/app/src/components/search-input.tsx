import { Input } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";

/** A search field with its icon; give it an aria-label or a label. */
export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
      />
      <Input type="search" className="pl-9" {...props} />
    </div>
  );
}

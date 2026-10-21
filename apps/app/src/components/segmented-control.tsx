import { cn } from "@devize/ui/utils";
import type { ReactNode } from "react";

/**
 * Switches between views or filters of the same content ("Toate / Ciorne /
 * Trimise"): exactly one option pressed, the active one raised on a sunken
 * rail. For moving between pages, use TabsNav.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <fieldset
      aria-label={label}
      className={cn(
        "m-0 inline-flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto rounded-md border-0 bg-sunken p-0.5 [scrollbar-width:none]",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-body text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
            option.value === value &&
              "bg-card font-medium text-ink shadow-raised",
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

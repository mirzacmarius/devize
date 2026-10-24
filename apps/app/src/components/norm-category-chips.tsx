"use client";

import {
  type BaseCategoryKey,
  baseCategories,
} from "@devize/backend/convex/catalog/baseCategories";
import { cn } from "@devize/ui/utils";

/**
 * The categories of the base catalog as chips, "Toate" first. They sit in
 * one row that scrolls sideways, with a thin scrollbar so a mouse can reach
 * the last ones, or, with `wrap`, in rows from tablet width up. At most one
 * chip is pressed: the category being browsed. The catalog and the add-norm
 * sheet share it.
 */
export function NormCategoryChips({
  label,
  allLabel,
  value,
  onChange,
  wrap = false,
  className,
}: {
  label: string;
  allLabel: string;
  value: BaseCategoryKey | null;
  onChange: (key: BaseCategoryKey | null) => void;
  wrap?: boolean;
  className?: string;
}) {
  const options: { key: BaseCategoryKey | null; name: string }[] = [
    { key: null, name: allLabel },
    ...baseCategories.map((category) => ({
      key: category.key,
      name: category.name,
    })),
  ];
  return (
    <fieldset
      aria-label={label}
      className={cn(
        "-mx-1 flex min-w-0 gap-1.5 overflow-x-auto border-0 px-1 pt-0.5 pb-1.5 [scrollbar-width:thin]",
        wrap && "sm:flex-wrap sm:overflow-x-visible sm:pb-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const pressed = option.key === value;
        return (
          <button
            key={option.key ?? "all"}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-3 text-meta text-ink-2 transition-colors hover:bg-tile hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pressed &&
                "border-primary bg-selected font-medium text-ink hover:bg-selected",
            )}
          >
            {option.name}
          </button>
        );
      })}
    </fieldset>
  );
}

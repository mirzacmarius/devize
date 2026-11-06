"use client";

import {
  type BaseCategoryKey,
  baseCategories,
} from "@devize/backend/convex/catalog/baseCategories";
import { cn } from "@devize/ui/utils";

/**
 * The categories of the base catalog, "Toate" first, at most one pressed: the
 * category being browsed. As `rail` they are a plain list to sit beside the
 * norms, from tablet width up; otherwise, and always on a phone, one row that
 * scrolls sideways and fades at its end, with a thin scrollbar so a mouse can
 * reach the last ones. The catalog and the add-norm sheet share it.
 */
export function NormCategoryChips({
  label,
  allLabel,
  value,
  onChange,
  rail = false,
  className,
}: {
  label: string;
  allLabel: string;
  value: BaseCategoryKey | null;
  onChange: (key: BaseCategoryKey | null) => void;
  rail?: boolean;
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
        "-mx-1 flex min-w-0 gap-0.5 overflow-x-auto border-0 px-1 pb-1.5 pt-0.5 [mask-image:linear-gradient(to_left,transparent,#000_32px)] [scrollbar-width:thin]",
        rail &&
          // Beside a long list it stays in view, with its own scroll.
          "md:sticky md:top-4 md:m-0 md:grid md:max-h-[calc(100dvh-2rem)] md:content-start md:overflow-y-auto md:overscroll-contain md:p-0 md:[mask-image:linear-gradient(to_top,transparent,#000_32px)] md:[scrollbar-width:none]",
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
              "inline-flex min-h-7 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 py-1 text-left text-meta text-ink-2 transition-colors hover:bg-tile hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              rail && "md:-ml-2.5 md:whitespace-normal",
              pressed &&
                (rail
                  ? "bg-muted font-medium text-ink hover:bg-muted md:bg-transparent md:hover:bg-tile"
                  : "bg-muted font-medium text-ink hover:bg-muted"),
            )}
          >
            {option.name}
          </button>
        );
      })}
    </fieldset>
  );
}

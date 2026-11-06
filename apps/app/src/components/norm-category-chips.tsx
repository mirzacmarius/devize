"use client";

import {
  type BaseCategoryKey,
  baseCategories,
} from "@devize/backend/convex/catalog/baseCategories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { cn } from "@devize/ui/utils";

type CategoryChoice = {
  label: string;
  allLabel: string;
  value: BaseCategoryKey | null;
  onChange: (key: BaseCategoryKey | null) => void;
};

/**
 * The categories of the base catalog, "Toate" first, at most one pressed: the
 * category being browsed. From tablet width up, a list to sit beside the norms;
 * on a phone, one row that scrolls sideways and fades at its end, with a thin
 * scrollbar so a mouse can reach the last ones.
 */
export function NormCategoryChips({
  label,
  allLabel,
  value,
  onChange,
}: CategoryChoice) {
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
      // Beside a long list it stays in view, with its own scroll; pulled up so
      // its first row sits level with the table's head.
      className="-mx-1 flex min-w-0 gap-0.5 overflow-x-auto border-0 px-1 pb-1.5 pt-0.5 [mask-image:linear-gradient(to_left,transparent,#000_32px)] [scrollbar-width:thin] md:sticky md:top-4 md:m-0 md:-mt-[7px] md:grid md:max-h-[calc(100dvh-2rem)] md:content-start md:gap-0 md:overflow-y-auto md:overscroll-contain md:p-0 md:[mask-image:none] md:[scrollbar-width:none]"
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
              "inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 py-1 text-left text-meta text-ink-2 transition-colors hover:bg-tile hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:-ml-2.5 md:whitespace-normal",
              pressed &&
                "bg-nav-active font-medium text-ink hover:bg-nav-active",
            )}
          >
            {option.name}
          </button>
        );
      })}
    </fieldset>
  );
}

/** The same choice where there's no room for a list: the add-norm sheet. */
export function NormCategorySelect({
  label,
  allLabel,
  value,
  onChange,
  className,
}: CategoryChoice & { className?: string }) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) =>
        onChange(next === "all" ? null : (next as BaseCategoryKey))
      }
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {baseCategories.map((category) => (
          <SelectItem key={category.key} value={category.key}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

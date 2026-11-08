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

type CategoryChoice = {
  label: string;
  allLabel: string;
  value: BaseCategoryKey | null;
  onChange: (key: BaseCategoryKey | null) => void;
};

/** The categories of the base catalog, "Toate" first: the one being browsed. */
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

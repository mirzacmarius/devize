"use client";

import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useScopedI18n } from "@/locales/client";
import type { Section } from "./types";

// Radix Select keeps "" for "nothing chosen", so "no section" needs a value.
const NONE = "none";

/** Sections in the order they print, each chapter right after its object. */
export function orderedSections(sections: readonly Section[]) {
  const objects = new Set(
    sections
      .filter((section) => section.kind === "object")
      .map((section) => section._id),
  );
  const result: { section: Section; nested: boolean }[] = [];
  for (const section of sections) {
    if (section.parentId && objects.has(section.parentId)) {
      continue;
    }
    result.push({ section, nested: false });
    for (const child of sections) {
      if (child.parentId === section._id) {
        result.push({ section: child, nested: true });
      }
    }
  }
  return result;
}

/** Picks a Deviz's Obiect or Capitol, or none. */
export function SectionSelect({
  id,
  sections,
  value,
  onChange,
}: {
  id?: string;
  sections: readonly Section[];
  value: Id<"sections"> | undefined;
  onChange: (value: Id<"sections"> | undefined) => void;
}) {
  const t = useScopedI18n("estimate");
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) =>
        onChange(next === NONE ? undefined : (next as Id<"sections">))
      }
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("sections.none")}</SelectItem>
        {sections.length > 0 && <SelectSeparator />}
        {orderedSections(sections).map(({ section, nested }) => (
          <SelectItem key={section._id} value={section._id}>
            {nested ? `— ${section.name}` : section.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

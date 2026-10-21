"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { cn } from "@devize/ui/utils";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

export type Markups = Doc<"estimates">["markups"];
export type MarkupsDraft = Record<keyof Markups, string>;

const keys = ["cam", "indirect", "profit", "vat"] as const;

export function useMarkupsDraft() {
  const locale = useCurrentLocale();
  return (markups: Markups): MarkupsDraft => ({
    cam: formatInputNumber(markups.cam, locale),
    indirect: formatInputNumber(markups.indirect, locale),
    profit: formatInputNumber(markups.profit, locale),
    vat: formatInputNumber(markups.vat, locale),
  });
}

/** The typed percentages, or undefined when one is not a number from 0 to 100. */
export function parseMarkups(draft: MarkupsDraft): Markups | undefined {
  const values = keys.map((key) => parseDecimal(draft[key]));
  if (values.some((value) => value === undefined || value < 0 || value > 100)) {
    return undefined;
  }
  const [cam, indirect, profit, vat] = values as number[];
  return {
    cam: cam ?? 0,
    indirect: indirect ?? 0,
    profit: profit ?? 0,
    vat: vat ?? 0,
  };
}

/** The four Cote of a Recapitulație, each with what it is a share of. */
export function MarkupsFields({
  value,
  onChange,
  disabled,
  idPrefix,
  className,
}: {
  value: MarkupsDraft;
  onChange: (value: MarkupsDraft) => void;
  disabled?: boolean;
  idPrefix: string;
  className?: string;
}) {
  const t = useScopedI18n("markups");
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2", className)}>
      {keys.map((key) => (
        <Field
          key={key}
          label={t(`${key}.label`)}
          hint={t(`${key}.hint`)}
          htmlFor={`${idPrefix}-${key}`}
        >
          <DecimalInput
            id={`${idPrefix}-${key}`}
            value={value[key]}
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
            suffix="%"
            disabled={disabled}
          />
        </Field>
      ))}
    </div>
  );
}

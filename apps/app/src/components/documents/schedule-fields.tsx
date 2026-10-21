"use client";

import {
  clampWindow,
  maxMonths,
  plannedWindow,
  type ScheduleWindow,
  type SheetCategory,
} from "@devize/forms/sheet";
import { Button } from "@devize/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useState } from "react";
import { Field } from "@/components/field";
import { formatHours } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { byObject, type Placement, placedIn } from "./placement-fields";

export type Windows = Readonly<Record<string, ScheduleWindow>>;

/** The months a category of works runs in: the person's, or our plan's. */
export function windowOf(
  category: SheetCategory,
  placement: Placement,
  windows: Windows,
  months: number,
): ScheduleWindow {
  const chosen = windows[category.key];
  return chosen
    ? clampWindow(chosen, months)
    : plannedWindow(placedIn(placement, category), category.name, months);
}

/** Only the months the person chose other than our plan, within the duration. */
export function shiftedWindows(
  categories: readonly SheetCategory[],
  placement: Placement,
  windows: Windows,
  months: number,
): Record<string, ScheduleWindow> {
  return Object.fromEntries(
    categories.flatMap((category): [string, ScheduleWindow][] => {
      if (!windows[category.key]) {
        return [];
      }
      const own = windowOf(category, placement, windows, months);
      const plan = windowOf(category, placement, {}, months);
      return own.start !== plan.start || own.end !== plan.end
        ? [[category.key, own]]
        : [];
    }),
  );
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** How many months the works take, which F6 and the offer form print. */
export function MonthsField({
  suggestedHours,
  months,
  onMonths,
}: {
  // The Deviz's labour hours, which the duration is first planned from.
  suggestedHours: number;
  months: number;
  onMonths: (months: number) => void;
}) {
  const t = useScopedI18n("documents.forms");
  const locale = useCurrentLocale();
  return (
    <Field
      label={t("months")}
      htmlFor="forms-months"
      hint={t("monthsHint", { hours: formatHours(suggestedHours, locale) })}
    >
      <Select
        value={String(months)}
        onValueChange={(next) => onMonths(Number(next))}
      >
        <SelectTrigger id="forms-months" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {range(1, maxMonths).map((option) => (
            <SelectItem key={option} value={String(option)}>
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** F6: the duration of the works and the months of each category. */
export function ScheduleFields({
  categories,
  placement,
  suggestedHours,
  months,
  windows,
  onMonths,
  onWindows,
}: {
  categories: readonly SheetCategory[];
  placement: Placement;
  // The Deviz's labour hours, which the duration is first planned from.
  suggestedHours: number;
  months: number;
  windows: Windows;
  onMonths: (months: number) => void;
  onWindows: (windows: Windows) => void;
}) {
  const t = useScopedI18n("documents.forms");
  const shifted =
    Object.keys(shiftedWindows(categories, placement, windows, months)).length >
    0;
  // Months already moved by hand show.
  const [planning, setPlanning] = useState(shifted);
  const objects = byObject(categories);

  const month = (
    label: string,
    value: number,
    from: number,
    onChange: (value: number) => void,
  ) => (
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger aria-label={label} className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {range(from, months).map((option) => (
          <SelectItem key={option} value={String(option)}>
            {t("month", { month: option })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-1.5 p-0 text-body font-medium text-ink">
        {t("schedule")}
      </legend>
      <MonthsField
        suggestedHours={suggestedHours}
        months={months}
        onMonths={onMonths}
      />
      <Button
        type="button"
        variant="link"
        className="justify-self-start"
        aria-expanded={planning}
        onClick={() => setPlanning(!planning)}
      >
        {planning ? t("windowsDone") : t("windows")}
      </Button>
      {planning && (
        <>
          <p className="m-0 text-meta text-ink-3">{t("windowsHint")}</p>
          {objects.map((object) => (
            <div key={object.key} className="grid gap-2">
              {objects.length > 1 && (
                <p className="m-0 text-meta font-medium text-ink-2">
                  {object.name}
                </p>
              )}
              {object.categories.map((category) => {
                const id = `window-${category.key}`;
                const window = windowOf(category, placement, windows, months);
                const change = (next: ScheduleWindow) =>
                  onWindows({ ...windows, [category.key]: next });
                return (
                  <div
                    key={category.key}
                    className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                  >
                    <span id={id} className="text-body text-ink">
                      {category.name}
                    </span>
                    <fieldset
                      aria-labelledby={id}
                      className="m-0 flex min-w-0 items-center gap-2 border-0 p-0"
                    >
                      {month(t("windowStart"), window.start, 1, (start) =>
                        change({ start, end: Math.max(start, window.end) }),
                      )}
                      <span aria-hidden className="text-ink-3">
                        –
                      </span>
                      {month(t("windowEnd"), window.end, window.start, (end) =>
                        change({ start: window.start, end }),
                      )}
                    </fieldset>
                  </div>
                );
              })}
            </div>
          ))}
          {shifted && (
            <Button
              type="button"
              variant="link"
              className="justify-self-start"
              onClick={() => onWindows({})}
            >
              {t("windowsReset")}
            </Button>
          )}
        </>
      )}
    </fieldset>
  );
}

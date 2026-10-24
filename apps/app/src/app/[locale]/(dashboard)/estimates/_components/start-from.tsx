"use client";

import type { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  type StarterKey,
  type StarterUnit,
  starterLines,
  starterOf,
  starterValues,
} from "@devize/backend/convex/templates/starters";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import type { FunctionReturnType } from "convex/server";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Locale } from "@/locales/locale";

// What a new Deviz starts from: nothing, one of the firm's Șabloane, or one
// of Devize's starters with the measurements typed for it.

export type TemplateList = FunctionReturnType<
  typeof api.templates.templates.list
>;

export type StartFrom =
  | { kind: "blank" }
  | { kind: "template"; templateId: Id<"estimateTemplates"> }
  | { kind: "starter"; key: StarterKey; values: Record<string, string> };

const unitKeys: Record<
  StarterUnit,
  "m" | "mp" | "mc" | "buc" | "percent" | "month"
> = {
  m: "m",
  mp: "mp",
  mc: "mc",
  buc: "buc",
  "%": "percent",
  lună: "month",
};

/** A starter with its measurements at their defaults, as typed numbers. */
export function starterChoice(key: StarterKey, locale: Locale): StartFrom {
  const starter = starterOf(key);
  return {
    kind: "starter",
    key,
    values: Object.fromEntries(
      (starter?.inputs ?? []).map((input) => [
        input.key,
        formatInputNumber(input.default, locale),
      ]),
    ),
  };
}

/** The starter's measurements as numbers, or undefined while one is wrong. */
export function parsedStarter(choice: StartFrom) {
  if (choice.kind !== "starter") {
    return undefined;
  }
  const starter = starterOf(choice.key);
  if (!starter) {
    return undefined;
  }
  const values: Record<string, number> = {};
  for (const input of starter.inputs) {
    const value = parseDecimal(choice.values[input.key] ?? "");
    if (value === undefined) {
      return undefined;
    }
    values[input.key] = value;
  }
  const checked = starterValues(starter, values);
  return checked ? { starter, values: checked } : undefined;
}

function choiceValue(choice: StartFrom): string {
  if (choice.kind === "template") {
    return `template:${choice.templateId}`;
  }
  if (choice.kind === "starter") {
    return `starter:${choice.key}`;
  }
  return "blank";
}

/** The name a Deviz started this way takes until someone types another. */
export function useStartFromName() {
  const t = useScopedI18n("templates");
  return (choice: StartFrom, templates: TemplateList | undefined) => {
    if (choice.kind === "template") {
      return templates?.templates.find(
        (template) => template._id === choice.templateId,
      )?.name;
    }
    if (choice.kind === "starter") {
      return t(`starters.${choice.key}.name`);
    }
    return undefined;
  };
}

/** Picks what the Deviz starts from and, for a starter, its measurements. */
export function StartFromField({
  templates,
  value,
  onChange,
}: {
  templates: TemplateList | undefined;
  value: StartFrom;
  onChange: (next: StartFrom) => void;
}) {
  const t = useScopedI18n("templates");
  const te = useScopedI18n("errors");
  const locale = useCurrentLocale();
  const firmTemplates = templates?.templates ?? [];
  const starters = templates?.starters ?? [];
  const template =
    value.kind === "template"
      ? firmTemplates.find((row) => row._id === value.templateId)
      : undefined;
  const starter = value.kind === "starter" ? starterOf(value.key) : undefined;
  const parsed = parsedStarter(value);

  const choose = (next: string) => {
    if (next.startsWith("template:")) {
      onChange({
        kind: "template",
        templateId: next.slice("template:".length) as Id<"estimateTemplates">,
      });
    } else if (next.startsWith("starter:")) {
      onChange(
        starterChoice(next.slice("starter:".length) as StarterKey, locale),
      );
    } else {
      onChange({ kind: "blank" });
    }
  };

  return (
    <div className="grid gap-3">
      <Field
        label={t("startFrom")}
        htmlFor="estimate-start-from"
        hint={value.kind === "blank" ? t("startFromHint") : undefined}
      >
        <Select value={choiceValue(value)} onValueChange={choose}>
          <SelectTrigger id="estimate-start-from">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blank">{t("blank")}</SelectItem>
            {firmTemplates.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t("firmGroup")}</SelectLabel>
                {firmTemplates.map((row) => (
                  <SelectItem key={row._id} value={`template:${row._id}`}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {starters.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t("starterGroup")}</SelectLabel>
                {starters.map((row) => {
                  const name = t(`starters.${row.key}.name`);
                  return (
                    <SelectItem
                      key={row.key}
                      value={`starter:${row.key}`}
                      disabled={!row.available}
                    >
                      {row.available ? name : t("unavailable", { name })}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </Field>
      {template && (
        <p className="m-0 rounded-md border border-border bg-sunken px-3 py-2 text-meta text-ink-2">
          {[template.description, t("itemCount", { count: template.itemCount })]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {starter && value.kind === "starter" && (
        <fieldset className="m-0 grid min-w-0 gap-3 rounded-md border border-border bg-sunken p-3">
          <legend className="sr-only">{t("measurements")}</legend>
          <p className="m-0 text-meta text-ink-2">
            {t(`starters.${starter.key}.description`)}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {starter.inputs.map((input) => {
              const typed = parseDecimal(value.values[input.key] ?? "");
              const wrong =
                typed === undefined || typed < input.min || typed > input.max;
              return (
                <Field
                  key={input.key}
                  label={t(`inputs.${input.key}` as "inputs.length")}
                  htmlFor={`starter-${input.key}`}
                >
                  <DecimalInput
                    id={`starter-${input.key}`}
                    suffix={t(`units.${unitKeys[input.unit]}`)}
                    value={value.values[input.key] ?? ""}
                    aria-invalid={wrong || undefined}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        values: {
                          ...value.values,
                          [input.key]: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
              );
            })}
          </div>
          <p
            role={parsed ? undefined : "alert"}
            className={
              parsed ? "m-0 text-meta text-ink-3" : "m-0 text-meta text-danger"
            }
          >
            {parsed
              ? `${t("willAdd", {
                  count: starterLines(parsed.starter, parsed.values).length,
                })} ${t("measurementsHint")}`
              : te("invalidStarterValues")}
          </p>
        </fieldset>
      )}
    </div>
  );
}

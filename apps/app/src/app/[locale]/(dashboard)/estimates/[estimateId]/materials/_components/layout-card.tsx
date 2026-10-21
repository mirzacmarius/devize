"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { LayoutMethod } from "@devize/backend/convex/materials/layout";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import {
  formatConsumption,
  formatInputNumber,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { LayoutRow } from "./types";

// Losses up to 50 %, extra labour up to 200 %, as the server checks.
const MAX_WASTE = 50;
const MAX_LABOR = 200;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * The Mod de montaj of the Articole that lay a covering: tiles straight or
 * diagonally, planks in herringbone. A method raises the covering's losses
 * and the labour, which changes the Articol, the Deviz and what to buy.
 */
export function LayoutCard({
  layouts,
  locked,
}: {
  layouts: readonly LayoutRow[];
  locked: boolean;
}) {
  const t = useScopedI18n("materials.layout");
  return (
    <Card>
      <CardHeader className="grid justify-items-start gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="m-0">
          {locked ? t("locked") : t("description")}
        </CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <ul className="m-0 grid list-none p-0">
          {layouts.map((row) => (
            <li
              key={row.lineItemId}
              className="border-b border-border py-4 last:border-b-0"
            >
              <LayoutForm row={row} locked={locked} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LayoutForm({ row, locked }: { row: LayoutRow; locked: boolean }) {
  const t = useScopedI18n("materials.layout");
  const locale = useCurrentLocale();
  const setLayout = useMutation(api.materials.layouts.setLayout);
  const run = useRun();
  const applied = row.layout?.method ?? "straight";

  // A method's losses and labour: the ones applied, else its usual ones.
  const valuesFor = (method: LayoutMethod) => {
    const preset = row.presets.find((p) => p.method === method);
    const values =
      row.layout && row.layout.method === method ? row.layout : preset;
    return {
      waste: formatInputNumber(values?.waste ?? row.normWaste, locale),
      labor: formatInputNumber(values?.labor ?? 0, locale),
    };
  };

  const [method, setMethod] = useState<LayoutMethod>(
    row.layout?.method ?? row.hinted ?? "straight",
  );
  const [values, setValues] = useState(() => valuesFor(method));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const straight = method === "straight";
  const waste = straight ? row.normWaste : parseDecimal(values.waste);
  const labor = straight ? 0 : parseDecimal(values.labor);
  const valid =
    waste !== undefined &&
    labor !== undefined &&
    waste >= 0 &&
    waste <= MAX_WASTE &&
    labor >= 0 &&
    labor <= MAX_LABOR;
  const changed =
    row.stale ||
    method !== applied ||
    (!straight && (waste !== row.layout?.waste || labor !== row.layout?.labor));

  // What the covering would consume, per unit of the Articol, and the cost.
  const preview = valid
    ? row.coverings.map((covering) => ({
        ...covering,
        to: round4(
          covering.layers *
            (1 + (straight ? covering.loss : (waste ?? 0) / 100)),
        ),
      }))
    : [];
  const difference = preview.reduce(
    (sum, covering) =>
      sum + (covering.to - covering.quantity) * covering.unitPrice,
    0,
  );
  const costChange = Math.round(difference * row.quantity * 100) / 100;
  const unit = formatUnit(row.unit, locale);
  const methodName = (value: LayoutMethod) => t(`methods.${value}`);

  const choose = (next: LayoutMethod) => {
    setMethod(next);
    setValues(valuesFor(next));
    setError(undefined);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    await run(
      () =>
        setLayout({
          lineItemId: row.lineItemId,
          method,
          ...(straight ? {} : { waste, labor }),
        }),
      t("applied"),
    );
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-0.5">
        <span className="text-body font-medium text-ink">{row.title}</span>
        <span className="text-meta text-ink-3">
          {[
            row.code,
            `${formatQuantity(row.quantity, locale)} ${unit}`,
            row.layout
              ? t("currentWith", {
                  method: methodName(row.layout.method),
                  waste: formatPercent(row.layout.waste, locale),
                  labor: formatPercent(row.layout.labor, locale),
                })
              : t("current", { method: methodName("straight") }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {!row.layout && (
          <span className="text-meta text-ink-3">
            {t("normWaste", {
              percent: formatPercent(row.normWaste, locale),
            })}
          </span>
        )}
        {row.stale && (
          <span className="text-meta text-warning">{t("stale")}</span>
        )}
        {!row.layout && row.hinted && (
          <span className="text-meta text-warning">
            {t("hinted", { method: methodName(row.hinted) })}
          </span>
        )}
      </div>
      <fieldset disabled={locked} className="m-0 grid gap-3 border-0 p-0">
        <Field label={t("title")} htmlFor={`layout-${row.lineItemId}`}>
          <Select
            value={method}
            onValueChange={(next) => choose(next as LayoutMethod)}
            disabled={locked}
          >
            <SelectTrigger
              id={`layout-${row.lineItemId}`}
              aria-label={t("methodLabel", { title: row.title })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {row.presets.map((preset) => (
                <SelectItem key={preset.method} value={preset.method}>
                  {methodName(preset.method)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("waste")} htmlFor={`waste-${row.lineItemId}`}>
            <DecimalInput
              id={`waste-${row.lineItemId}`}
              suffix="%"
              value={
                straight
                  ? formatInputNumber(row.normWaste, locale)
                  : values.waste
              }
              disabled={straight || locked}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  waste: event.target.value,
                }))
              }
            />
          </Field>
          <Field label={t("labor")} htmlFor={`labor-${row.lineItemId}`}>
            <DecimalInput
              id={`labor-${row.lineItemId}`}
              suffix="%"
              value={straight ? "0" : values.labor}
              disabled={straight || locked}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  labor: event.target.value,
                }))
              }
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="m-0 text-meta text-danger">
            {error}
          </p>
        )}
        {changed && preview.length > 0 && (
          <div className="grid gap-0.5 text-meta text-ink-2">
            {preview.map((covering) => (
              <span key={covering.key}>
                {t("preview", {
                  name: covering.name,
                  from: formatConsumption(covering.quantity, locale),
                  to: formatConsumption(covering.to, locale),
                  unit,
                })}
              </span>
            ))}
            {costChange !== 0 && (
              <span className="tabular-nums">
                {t("previewCost", {
                  sign: costChange > 0 ? "+" : "−",
                  amount: formatMoney(Math.abs(costChange), locale),
                })}
              </span>
            )}
          </div>
        )}
        {!locked && (
          <div>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !changed}
              className="justify-self-start"
            >
              {saving && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("apply")}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

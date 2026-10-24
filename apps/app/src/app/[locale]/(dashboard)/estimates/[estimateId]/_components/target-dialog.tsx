"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  fitLabor,
  fitProfit,
  onBasis,
  type TargetBasis,
  type TargetMethod,
} from "@devize/backend/convex/estimates/target";
import { laborFloor } from "@devize/backend/convex/lib/labor";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { formatMoney, formatPercent, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/**
 * Preț țintă: the client's price, and the Deviz brought to it through its
 * profit or its labour, with the margin that leaves shown before it applies.
 */
export function TargetPriceDialog({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("targetPrice");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <TargetForm estimate={estimate} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TargetForm({
  estimate,
  onDone,
}: {
  estimate: Estimate;
  onDone: () => void;
}) {
  const t = useScopedI18n("targetPrice");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const apply = useMutation(api.estimates.targetPrice.apply);
  const run = useRun();
  const { totals, markups } = estimate;
  const hasVat = markups.vat > 0;
  const [text, setText] = useState("");
  // A tender's prices are without VAT; a private client's, with it.
  const [basis, setBasis] = useState<TargetBasis>(
    hasVat && estimate.kind === "tender" ? "subtotal" : "total",
  );
  const [method, setMethod] = useState<TargetMethod>("profit");
  const [saving, setSaving] = useState(false);
  const target = parseDecimal(text);
  const empty = estimate.lineItems.length === 0;

  const fit = useMemo(() => {
    if (target === undefined || target <= 0 || empty) {
      return undefined;
    }
    return method === "profit"
      ? fitProfit(totals, markups, target, basis)
      : fitLabor(estimate.lineItems, markups, target, basis);
  }, [target, empty, method, totals, markups, basis, estimate.lineItems]);

  const money = (value: number) => formatMoney(value, locale);
  const margin = (profit: number, subtotal: number) =>
    formatPercent(
      subtotal > 0 ? Math.round((profit / subtotal) * 10000) / 100 : 0,
      locale,
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fit?.ok || target === undefined) {
      return;
    }
    setSaving(true);
    const result = await run(() =>
      apply({ estimateId: estimate._id, target, basis, method }),
    );
    setSaving(false);
    if (result.ok) {
      toast.success(
        t(`applied.${basis}`, { total: money(result.value.total) }),
      );
      onDone();
    }
  };

  const missMessage = () => {
    if (!fit || fit.ok) {
      return undefined;
    }
    const limit = money(fit.limit);
    if (fit.reason === "noLabor") {
      return t("misses.noLabor");
    }
    if (method === "profit") {
      return fit.reason === "belowCost"
        ? t("misses.profitBelowCost", { limit })
        : t("misses.profitTooHigh", { limit });
    }
    return fit.reason === "belowCost"
      ? t("misses.laborBelowCost", { limit })
      : t("misses.laborTooHigh", { limit });
  };

  const after = fit?.ok ? fit.recap : undefined;
  const afterProfitRate =
    fit?.ok && "profit" in fit ? fit.profit : markups.profit;
  const rows = after
    ? [
        {
          label: t("rows.labor"),
          now: money(totals.labor),
          after: money(after.labor),
        },
        {
          label: t("rows.profit", {
            rate: formatPercent(afterProfitRate, locale),
          }),
          now: money(totals.profit),
          after: money(after.profit),
        },
        {
          label: t("rows.subtotal"),
          now: money(totals.subtotal),
          after: money(after.subtotal),
          strong: true,
        },
        ...(hasVat
          ? [
              {
                label: t("rows.total"),
                now: money(totals.total),
                after: money(after.total),
                strong: true,
              },
            ]
          : []),
        {
          label: t("rows.margin"),
          now: margin(totals.profit, totals.subtotal),
          after: margin(after.profit, after.subtotal),
        },
      ]
    : [];
  const reached = after ? onBasis(after, basis) : undefined;
  const difference =
    reached !== undefined && target !== undefined
      ? Math.round((reached - target) * 100) / 100
      : 0;
  const change =
    fit?.ok && "factor" in fit
      ? Math.round((fit.factor - 1) * 10000) / 100
      : undefined;
  const lowestHourly =
    fit?.ok && "lowestHourly" in fit ? fit.lowestHourly : undefined;

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label={t("target")} htmlFor="target-price">
          <DecimalInput
            id="target-price"
            suffix="lei"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={empty}
            autoFocus
          />
        </Field>
        {hasVat && (
          <Field label={t("basis")}>
            <SegmentedControl
              label={t("basis")}
              value={basis}
              onChange={setBasis}
              options={[
                { value: "total", label: t("bases.total") },
                { value: "subtotal", label: t("bases.subtotal") },
              ]}
            />
          </Field>
        )}
      </div>
      <Field label={t("method")} hint={t(`methodHints.${method}`)}>
        <SegmentedControl
          label={t("method")}
          value={method}
          onChange={setMethod}
          options={[
            { value: "profit", label: t("methods.profit") },
            { value: "labor", label: t("methods.labor") },
          ]}
        />
      </Field>

      {empty ? (
        <p className="m-0 rounded-md border border-border bg-sunken px-3 py-2 text-meta text-ink-2">
          {t("empty")}
        </p>
      ) : !fit ? (
        <p className="m-0 text-meta text-ink-3">{t("enterTarget")}</p>
      ) : !fit.ok ? (
        <p role="alert" className="m-0 text-meta text-danger">
          {missMessage()}
        </p>
      ) : (
        <div className="grid gap-2">
          <table className="w-full border-collapse text-body">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr className="text-meta text-ink-3">
                <th scope="col" className="py-1 pr-3 text-left font-normal">
                  {t("columns.item")}
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  {t("columns.now")}
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  {t("columns.after")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={cn(row.strong && "border-t border-border")}
                >
                  <th
                    scope="row"
                    className={cn(
                      "py-1.5 pr-3 text-left font-normal",
                      row.strong ? "font-medium text-ink" : "text-ink-2",
                    )}
                  >
                    {row.label}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-ink-3">
                    {row.now}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-right tabular-nums",
                      row.strong ? "font-medium text-ink" : "text-ink",
                    )}
                  >
                    {row.after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {change !== undefined && (
            <p className="m-0 text-meta text-ink-2">
              {t("laborChange", {
                change: `${change >= 0 ? "+" : "−"}${formatPercent(Math.abs(change), locale)}`,
              })}
            </p>
          )}
          {difference !== 0 && reached !== undefined && (
            <p className="m-0 text-meta text-ink-3">
              {t("difference", {
                total: money(reached),
                difference: `${difference > 0 ? "+" : "−"}${money(Math.abs(difference))}`,
              })}
            </p>
          )}
          {lowestHourly !== undefined && lowestHourly < laborFloor.hourly && (
            <p role="alert" className="m-0 text-meta text-danger">
              {t("belowFloor", {
                price: money(lowestHourly),
                floor: money(laborFloor.hourly),
              })}
            </p>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving || !fit?.ok}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("apply")}
        </Button>
      </DialogFooter>
    </form>
  );
}

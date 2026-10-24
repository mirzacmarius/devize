"use client";

import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { TickBar } from "@devize/ui/meter";
import { formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Overview } from "./types";

/** Where the works stand: executed, confirmed and left, against the contract. */
export function SummaryCard({ overview }: { overview: Overview }) {
  const t = useScopedI18n("progress.summary");
  const locale = useCurrentLocale();
  const percent = Math.round(overview.executed.percent * 10) / 10;
  const lei = (value: number) => `${formatMoney(value, locale)} lei`;
  const rows = [
    { label: t("contract"), value: lei(overview.contract.subtotal) },
    { label: t("executedValue"), value: lei(overview.executed.subtotal) },
    {
      label: t("approved"),
      value: overview.approved
        ? `${lei(overview.approved.subtotal)} · ${formatPercent(
            Math.round(overview.approved.percent * 10) / 10,
            locale,
          )}`
        : t("noApproved"),
    },
    { label: t("remaining"), value: lei(overview.remainingSubtotal) },
  ];
  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <span className="text-title-card tabular-nums text-ink">
              {t("executed", { percent: formatPercent(percent, locale) })}
            </span>
            <TickBar
              value={percent}
              tone={percent > 100 ? "warning" : "action"}
              label={t("executed", { percent: formatPercent(percent, locale) })}
            />
          </div>
          <dl className="m-0 grid gap-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-body text-ink-2">{row.label}</dt>
                <dd className="m-0 text-right text-body font-medium tabular-nums text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-meta text-ink-3">{t("hint")}</p>
        </CardContent>
      </Card>
    </CardFrame>
  );
}

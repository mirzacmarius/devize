"use client";

import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { formatCount, formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { ShoppingList } from "./types";

/** What the Lista de cumpărături comes to: whole packages, and what is left. */
export function SummaryCard({ list }: { list: ShoppingList }) {
  const t = useScopedI18n("materials.summary");
  const locale = useCurrentLocale();
  const { totals } = list;
  const share =
    totals.boughtCost > 0 ? (totals.leftoverCost / totals.boughtCost) * 100 : 0;
  const rows = [
    { label: t("packages"), value: formatCount(totals.packages, locale) },
    {
      label: t("bought"),
      value: `${formatMoney(totals.boughtCost, locale)} lei`,
    },
    {
      label: t("leftover"),
      value: `${formatMoney(totals.leftoverCost, locale)} lei · ${formatPercent(Math.round(share * 10) / 10, locale)}`,
    },
    {
      label: t("inEstimate"),
      value: `${formatMoney(totals.cost, locale)} lei`,
    },
  ];
  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="m-0 grid gap-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-body text-ink-2">{row.label}</dt>
                <dd className="m-0 text-body font-medium tabular-nums text-ink">
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

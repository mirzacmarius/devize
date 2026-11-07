"use client";

import { Figure, FigureStrip } from "@/components/figure-strip";
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
  return (
    <FigureStrip>
      <Figure
        lead
        label={t("bought")}
        value={formatMoney(totals.boughtCost, locale)}
        unit="lei"
      />
      <Figure
        label={t("leftover")}
        value={formatMoney(totals.leftoverCost, locale)}
        unit="lei"
        note={t("leftoverShare", {
          percent: formatPercent(Math.round(share * 10) / 10, locale),
        })}
      />
      <Figure
        label={t("inEstimate")}
        value={formatMoney(totals.cost, locale)}
        unit="lei"
      />
      <Figure
        label={t("packages")}
        value={formatCount(totals.packages, locale)}
      />
    </FigureStrip>
  );
}

"use client";

import { MeterBar } from "@devize/ui/meter";
import { Figure, FigureStrip } from "@/components/figure-strip";
import { formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Overview } from "./types";

/** Where the works stand: executed, confirmed and left, against the contract. */
export function SummaryCard({ overview }: { overview: Overview }) {
  const t = useScopedI18n("progress.summary");
  const locale = useCurrentLocale();
  const percent = Math.round(overview.executed.percent * 10) / 10;
  const executed = formatPercent(percent, locale);
  return (
    <FigureStrip compact>
      <Figure
        lead
        label={t("title")}
        value={executed}
        beside={
          <MeterBar
            ruled
            className="ml-2.5 min-w-20 flex-1 self-center max-sm:hidden"
            value={percent}
            tone={percent > 100 ? "warning" : "action"}
            label={t("executed", { percent: executed })}
          />
        }
      >
        <MeterBar
          ruled
          className="mt-1.5 sm:hidden"
          value={percent}
          tone={percent > 100 ? "warning" : "action"}
          label={t("executed", { percent: executed })}
        />
      </Figure>
      <Figure
        label={t("contract")}
        value={formatMoney(overview.contract.subtotal, locale)}
        unit="lei"
      />
      <Figure
        label={t("executedValue")}
        value={formatMoney(overview.executed.subtotal, locale)}
        unit="lei"
      />
      <Figure
        label={t("approved")}
        value={
          overview.approved
            ? formatMoney(overview.approved.subtotal, locale)
            : "–"
        }
        unit={overview.approved && "lei"}
        note={overview.approved ? undefined : t("noApproved")}
      />
      <Figure
        label={t("remaining")}
        value={formatMoney(overview.remainingSubtotal, locale)}
        unit="lei"
      />
    </FigureStrip>
  );
}

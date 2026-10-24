"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { EstimateStatusPill } from "@/components/estimate-status";
import {
  estimateCode,
  formatCount,
  formatMoney,
  formatPercent,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { type Comparison, signedMoney } from "./types";

const MARKUPS = ["cam", "indirect", "profit", "vat"] as const;

/**
 * The difference in the total with VAT, how many articles changed and which
 * markups did.
 */
export function SummaryCard({ comparison }: { comparison: Comparison }) {
  const t = useScopedI18n("compare.summary");
  const tMarkups = useScopedI18n("markups");
  const locale = useCurrentLocale();
  const { before, after, lines } = comparison;
  const difference = after.totals.total - before.totals.total;
  const percent =
    before.totals.total > 0 ? (difference / before.totals.total) * 100 : null;
  const markups = MARKUPS.filter(
    (key) => before.markups[key] !== after.markups[key],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="gap-4 pt-2">
        <p className="m-0 text-label uppercase text-ink-3">{t("total")}</p>
        <dl className="m-0 grid gap-2">
          {[before, after].map((revision) => (
            <div
              key={revision._id}
              className="flex items-center justify-between gap-3"
            >
              <dt className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-code text-ink">
                  {estimateCode(comparison.number, revision.revision)}
                </span>
                <EstimateStatusPill status={revision.status} />
              </dt>
              <dd className="m-0 text-right tabular-nums text-ink">
                {formatMoney(revision.totals.total, locale)}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 border-t border-ink pt-2">
            <dt className="text-ink">{t("difference")}</dt>
            <dd className="m-0 text-right text-title-card font-light tabular-nums text-ink">
              {signedMoney(difference, locale)}
              {percent !== null && Math.abs(difference) >= 0.005 && (
                <span className="ml-2 text-meta text-ink-3">
                  {`${percent > 0 ? "+" : "−"}${formatPercent(Math.abs(percent), locale)}`}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <p className="m-0 text-body text-ink-2">
          {t("counts", {
            added: formatCount(lines.added.length, locale),
            removed: formatCount(lines.removed.length, locale),
            changed: formatCount(lines.changed.length, locale),
            unchanged: formatCount(lines.unchanged, locale),
          })}
        </p>
        {markups.length > 0 && (
          <div className="grid gap-1">
            <p className="m-0 text-label uppercase text-ink-3">
              {t("markups")}
            </p>
            <ul className="m-0 grid list-none gap-1 p-0 text-body text-ink-2">
              {markups.map((key) => (
                <li key={key}>
                  {t("markup", {
                    name: tMarkups(`${key}.label`),
                    before: formatPercent(before.markups[key], locale),
                    after: formatPercent(after.markups[key], locale),
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

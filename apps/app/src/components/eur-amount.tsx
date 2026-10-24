"use client";

import { roundLei } from "@devize/backend/convex/estimates/recap";
import { cn } from "@devize/ui/utils";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

export type EurRate = { rate: number; date: string };

/**
 * A total in lei as euros too, at BNR's rate and with its day, so it reads
 * as the comparison it is (docs/adr/0042).
 */
export function EurAmount({
  lei,
  rate,
  paidInLei = false,
  className,
}: {
  lei: number;
  rate: EurRate;
  // Says the price is still paid in lei, for the client's page.
  paidInLei?: boolean;
  className?: string;
}) {
  const t = useScopedI18n("eur");
  const locale = useCurrentLocale();
  return (
    <p className={cn("m-0 text-meta text-ink-3", className)}>
      {t("amount", {
        amount: formatMoney(roundLei(lei / rate.rate), locale),
        date: formatCalendarDate(rate.date, locale),
        rate: new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        }).format(rate.rate),
      })}
      {paidInLei && ` ${t("paidInLei")}`}
    </p>
  );
}

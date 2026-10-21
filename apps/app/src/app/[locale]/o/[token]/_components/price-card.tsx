"use client";

import { roundLei } from "@devize/backend/convex/estimates/recap";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { useState } from "react";
import { formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { OpenOfferView } from "./types";

type Line = { label: string; value: number; strong?: boolean };

/**
 * How the works add up to the price, in two lines a client follows, with the
 * Recapitulație's full calculation one click away.
 */
export function PriceCard({
  offer,
  updating,
}: {
  offer: OpenOfferView;
  // New totals are on their way from the server.
  updating: boolean;
}) {
  const t = useScopedI18n("offerPage.totals");
  const locale = useCurrentLocale();
  const [details, setDetails] = useState(false);
  const { totals } = offer.choice;
  const { markups } = offer;
  const rate = (value: number) => formatPercent(value, locale);
  const nonZero = (lines: Line[]) => lines.filter((line) => line.value !== 0);

  const lines: Line[] = details
    ? nonZero([
        { label: t("material"), value: totals.material },
        { label: t("labor"), value: totals.labor },
        { label: t("equipment"), value: totals.equipment },
        { label: t("transport"), value: totals.transport },
        { label: t("cam", { rate: rate(markups.cam) }), value: totals.cam },
        ...(totals.indirect !== 0 || totals.profit !== 0
          ? [{ label: t("directTotal"), value: totals.direct, strong: true }]
          : []),
        {
          label: t("indirect", { rate: rate(markups.indirect) }),
          value: totals.indirect,
        },
        {
          label: t("profit", { rate: rate(markups.profit) }),
          value: totals.profit,
        },
      ])
    : nonZero([
        {
          label: t("works"),
          value: roundLei(
            totals.material +
              totals.labor +
              totals.equipment +
              totals.transport,
          ),
        },
        {
          label: t("overhead"),
          value: roundLei(totals.cam + totals.indirect + totals.profit),
        },
      ]);
  const hasVat = totals.vat !== 0;
  if (hasVat) {
    lines.push(
      { label: t("subtotal"), value: totals.subtotal, strong: true },
      { label: t("vat", { rate: rate(markups.vat) }), value: totals.vat },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <Button
          type="button"
          variant="link"
          aria-expanded={details}
          onClick={() => setDetails(!details)}
          className="text-meta"
        >
          {details ? t("hideDetails") : t("showDetails")}
        </Button>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <dl
          aria-busy={updating}
          className={cn(
            "m-0 grid transition-opacity",
            updating && "opacity-60",
          )}
        >
          {lines.map((line) => (
            <div
              key={line.label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2.5"
            >
              <dt
                className={cn(
                  "text-body",
                  line.strong ? "font-medium text-ink" : "text-ink-2",
                )}
              >
                {line.label}
              </dt>
              <dd
                className={cn(
                  "m-0 text-body tabular-nums",
                  line.strong ? "font-medium text-ink" : "text-ink-2",
                )}
              >
                {formatMoney(line.value, locale)}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 pt-3">
            <dt className="text-body-lg font-medium text-ink">
              {hasVat ? t("total") : t("totalNoVat")}
            </dt>
            <dd className="m-0 text-title-card tabular-nums text-ink">
              {t("lei", { total: formatMoney(totals.total, locale) })}
            </dd>
          </div>
        </dl>
        {!hasVat && <p className="m-0 text-meta text-ink-3">{t("noVat")}</p>}
      </CardContent>
    </Card>
  );
}

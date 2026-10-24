"use client";

import { roundLei } from "@devize/backend/convex/estimates/recap";
import { stageAmount } from "@devize/backend/convex/offers/payments";
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
import { useTriggerWords } from "@/components/payment-schedule";
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
  const tp = useScopedI18n("offerPage.payment");
  const triggers = useTriggerWords();
  const locale = useCurrentLocale();
  const [details, setDetails] = useState(false);
  const schedule = offer.paymentSchedule ?? [];
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
        {schedule.length > 0 && (
          <div className="grid gap-1 border-t border-border pt-3">
            <span className="text-meta font-medium text-ink-3">
              {tp("title")}
            </span>
            <dl
              aria-busy={updating}
              className={cn(
                "m-0 grid transition-opacity",
                updating && "opacity-60",
              )}
            >
              {schedule.map((stage) => (
                <div
                  key={`${stage.stage}·${stage.trigger}·${stage.percent ?? stage.amount}`}
                  className="flex items-baseline justify-between gap-4 py-1.5"
                >
                  <dt className="text-body text-ink-2">
                    <span className="text-ink">{stage.stage}</span>{" "}
                    <span className="text-meta text-ink-3">
                      {stage.percent !== undefined
                        ? tp("share", {
                            percent: formatPercent(stage.percent, locale),
                            trigger: triggers[stage.trigger],
                          })
                        : triggers[stage.trigger]}
                    </span>
                  </dt>
                  <dd className="m-0 text-body tabular-nums text-ink-2">
                    {tp("lei", {
                      amount: formatMoney(
                        stageAmount(stage, totals.total),
                        locale,
                      ),
                    })}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="m-0 text-meta text-ink-3">{tp("note")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

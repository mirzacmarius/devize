"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { toast } from "@devize/ui/sonner";
import { StatusPill } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Amount } from "@/components/amount";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import {
  estimateCode,
  formatDay,
  formatMoney,
  formatPercent,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { signedMoney } from "./prices-view";
import { ThresholdControl } from "./threshold-control";
import type { AlertList, PriceAlert } from "./types";

/**
 * The firm's sent and accepted devize whose total today's prices move past
 * its threshold, biggest change first, with a check on demand.
 */
export function AlertsCard({ alerts }: { alerts: AlertList | undefined }) {
  const t = useScopedI18n("prices.alerts");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const checkNow = useMutation(api.prices.alerts.checkNow);
  const run = useRun();
  const [checking, setChecking] = useState(false);
  const on = alerts !== undefined && alerts.alertPercent > 0;
  const percent = formatPercent(alerts?.alertPercent ?? 0, locale);

  const check = async () => {
    setChecking(true);
    const result = await run(() => checkNow({ organizationId: firm._id }));
    setChecking(false);
    if (result.ok) {
      toast.success(
        result.value.started
          ? t("checking", { count: result.value.count })
          : t("checkedRecently"),
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex-wrap items-start">
        <div className="grid min-w-0 flex-1 basis-64 gap-1">
          <CardTitle>{t("title")}</CardTitle>
          {alerts !== undefined && (
            <CardDescription className="m-0">
              {on ? t("description", { percent }) : t("off")}
            </CardDescription>
          )}
        </div>
        {/* Up by what they stand taller than the title, level with its line. */}
        <div className="flex flex-wrap items-center gap-3 sm:-mt-[7px]">
          <ThresholdControl
            alertPercent={alerts?.alertPercent}
            canEdit={firm.role !== "member"}
          />
          {on && (
            <Button
              variant="outline"
              size="sm"
              onClick={check}
              disabled={checking}
            >
              {t("checkNow")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gap-0">
        {alerts === undefined ? (
          <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
        ) : (
          on &&
          (alerts.alerts.length === 0 ? (
            <div className="grid gap-1 rounded-md bg-tile px-4 py-3">
              <p className="m-0 text-body font-medium text-ink">
                {t("noneTitle")}
              </p>
              <p className="m-0 text-meta text-ink-3">{t("noneDescription")}</p>
            </div>
          ) : (
            alerts.alerts.map((alert, index) => (
              <AlertRow key={alert._id} alert={alert} first={index === 0} />
            ))
          ))
        )}
        {on && alerts.dismissed > 0 && (
          <p className="m-0 pt-3 text-meta text-ink-3">
            {t("dismissedCount", { count: alerts.dismissed, percent })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert, first }: { alert: PriceAlert; first: boolean }) {
  const t = useScopedI18n("prices.alerts");
  const locale = useCurrentLocale();
  const dismiss = useMutation(api.prices.alerts.dismiss);
  const run = useRun();
  const money = (value: number) => formatMoney(value, locale);
  const { estimate } = alert;
  const dearer = alert.percent > 0;
  const percent = formatPercent(Math.abs(alert.percent), locale);
  const more = alert.changeCount - alert.changes.length;
  const profitChange = alert.profitLeft - alert.sentProfit;

  return (
    <section
      aria-label={`${estimateCode(estimate.number, estimate.revision)} ${estimate.title}`}
      className={cn(
        "grid gap-4 py-4 last:pb-0",
        first ? "pt-0" : "border-t border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-meta tabular-nums text-ink-3">
            {estimateCode(estimate.number, estimate.revision)}
            {" · "}
            {t("checked", { date: formatDay(alert.checkedAt, locale) })}
          </span>
          <span className="text-body-lg font-medium text-ink">
            {estimate.title}
            {estimate.clientName && (
              <span className="font-normal text-ink-3">
                {" "}
                · {estimate.clientName}
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstimateStatusPill status={estimate.status} />
          <StatusPill tone={dearer ? "warning" : "success"}>
            {dearer ? t("up", { percent }) : t("down", { percent })}
          </StatusPill>
        </div>
      </div>

      {/* What it does to the profit first: it's what the firm stands to lose. */}
      <div className="grid gap-x-10 gap-y-5 border-t border-border pt-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid content-start gap-3">
          <div className="grid gap-0.5">
            <p className="m-0 text-meta text-ink-2">{t("profit")}</p>
            <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
              <span
                className={cn(
                  "text-[26px] leading-8 tabular-nums tracking-[-0.01em] [font-weight:var(--weight-figure)]",
                  alert.profitLeft < 0 ? "text-danger" : "text-ink",
                )}
              >
                {alert.profitLeft < 0 ? (
                  money(alert.profitLeft)
                ) : (
                  <Amount value={money(alert.profitLeft)} />
                )}
              </span>
              <span className="text-meta text-ink-3">lei</span>
            </p>
            <p className="m-0 text-meta tabular-nums text-ink-3">
              <span
                className={cn(
                  "font-medium",
                  profitChange < 0 ? "text-warning" : "text-success",
                )}
              >
                {t("impact", { impact: signedMoney(profitChange, locale) })}
              </span>{" "}
              {t("profitWas", { amount: money(alert.sentProfit) })}
            </p>
          </div>
          <dl className="m-0 grid text-meta">
            <div className="flex flex-wrap justify-between gap-x-4 border-t border-border py-1.5">
              <dt className="text-ink-3">{t("total")}</dt>
              <dd className="m-0 tabular-nums text-ink-2">
                {t("fromTo", {
                  from: money(alert.sentTotal),
                  to: money(alert.currentTotal),
                })}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 border-t border-border py-1.5">
              <dt className="text-ink-3">{t("direct")}</dt>
              <dd className="m-0 tabular-nums text-ink-2">
                {t("fromTo", {
                  from: money(alert.sentDirect),
                  to: money(alert.currentDirect),
                })}
              </dd>
            </div>
          </dl>
        </div>

        {alert.changes.length > 0 && (
          <div className="grid content-start gap-1.5">
            <table className="w-full border-collapse text-body">
              <caption className="pb-2 text-left text-meta text-ink-2">
                {t("changes")}
              </caption>
              <tbody>
                {alert.changes.map((change) => {
                  const moved = t("change", {
                    from: money(change.oldPrice),
                    to: money(change.newPrice),
                    unit: formatUnit(change.unit, locale),
                  });
                  return (
                    <tr
                      key={`${change.name}:${change.unit}`}
                      className="border-t border-border"
                    >
                      <th
                        scope="row"
                        className="py-1.5 pl-0 pr-4 text-left font-normal text-ink"
                      >
                        {change.name}
                        <span className="block text-meta tabular-nums text-ink-3 sm:hidden">
                          {moved}
                        </span>
                      </th>
                      <td className="hidden whitespace-nowrap py-1.5 pr-4 text-right text-meta tabular-nums text-ink-3 sm:table-cell">
                        {moved}
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-0 text-right font-medium tabular-nums text-ink">
                        {t("impact", {
                          impact: signedMoney(change.impact, locale),
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {more > 0 && (
              <p className="m-0 border-t border-border pt-2 text-meta text-ink-3">
                {t("more", { count: more })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={`/estimates/${estimate._id}`}>{t("open")}</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            run(() => dismiss({ alertId: alert._id }), t("dismissed"))
          }
        >
          {t("dismiss")}
        </Button>
      </div>
    </section>
  );
}

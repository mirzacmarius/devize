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
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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

// What it was and what it is now, each in a column of its own under its head:
// the old figure a step back, the new one weighted.
const TOTALS =
  "grid shrink-0 grid-cols-[7rem_7rem] items-baseline justify-items-end tabular-nums";
// A price before and now, and what the change does to the total; what the
// prices are per goes with the name.
const CHANGES =
  "grid shrink-0 grid-cols-[5rem_5rem_6.5rem] items-baseline justify-items-end tabular-nums";
const ROW =
  "flex flex-wrap items-baseline justify-between gap-x-4 border-t border-border py-1.5 text-body";

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
        <div className="flex flex-wrap items-center gap-3 sm:-mt-1">
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
      <CardContent className="gap-4">
        {alerts === undefined ? (
          <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
        ) : (
          on &&
          (alerts.alerts.length === 0 ? (
            <div className="grid gap-1 rounded-lg border border-card-border p-4 sm:p-5">
              <p className="m-0 text-body font-medium text-ink">
                {t("noneTitle")}
              </p>
              <p className="m-0 text-meta text-ink-3">{t("noneDescription")}</p>
            </div>
          ) : (
            alerts.alerts.map((alert) => (
              <AlertRow key={alert._id} alert={alert} />
            ))
          ))
        )}
        {on && alerts.dismissed > 0 && (
          <p className="m-0 text-meta text-ink-3">
            {t("dismissedCount", { count: alerts.dismissed, percent })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: PriceAlert }) {
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
  const code = estimateCode(estimate.number, estimate.revision);

  return (
    <section
      aria-label={`${code} ${estimate.title}`}
      className="grid gap-5 rounded-lg border border-card-border p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3">
          {/* The mark this alert has on Acasă. */}
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md [&_svg]:size-4",
              profitChange < 0
                ? "bg-warning-soft text-warning"
                : "bg-success-soft text-success",
            )}
          >
            {profitChange < 0 ? <TrendingDown /> : <TrendingUp />}
          </span>
          <div className="grid min-w-0 gap-0.5">
            <h4 className="m-0 text-body-lg font-medium text-ink">
              {estimate.title}
            </h4>
            <p className="m-0 flex flex-wrap items-center gap-x-2 text-meta tabular-nums text-ink-3">
              {[
                code,
                estimate.clientName,
                t("checked", { date: formatDay(alert.checkedAt, locale) }),
              ]
                .filter(Boolean)
                .join(" · ")}
              <EstimateStatusPill status={estimate.status} />
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              run(() => dismiss({ alertId: alert._id }), t("dismissed"))
            }
          >
            {t("dismiss")}
          </Button>
          <Button size="sm" asChild>
            <Link href={`/estimates/${estimate._id}`}>{t("open")}</Link>
          </Button>
        </div>
      </div>

      {/* What it does to the profit first: it's what the firm stands to lose.
          Under it, what was and what is in columns of their own, with their
          heads over them. Both sides share one set of rows, so their rules
          fall on one line and they end together. */}
      <div className="grid gap-x-12 gap-y-5 xl:grid-cols-2 xl:gap-y-0">
        <div className="grid content-start xl:row-span-6 xl:grid-rows-subgrid">
          <div className="grid gap-1 pb-2 xl:row-span-2 xl:gap-px">
            <p className="m-0 text-meta text-ink-2">
              {profitChange < 0 ? t("profitDown") : t("profitUp")}
            </p>
            {/* The heads at the foot of the line, level with the other half's. */}
            <div className="flex flex-wrap items-end justify-between gap-x-4">
              <p className="m-0 flex items-baseline gap-x-1.5">
                <span
                  className={cn(
                    "text-stat tabular-nums",
                    // The tile says it's a warning; the figure stays in ink.
                    profitChange < 0 ? "text-ink" : "text-success",
                  )}
                >
                  {/* The label over it says which way it went. */}
                  {money(Math.abs(profitChange))}
                </span>
                <span className="text-meta text-ink-3">lei</span>
              </p>
              <span aria-hidden className={cn(TOTALS, "text-head text-ink-2")}>
                <span>{t("before")}</span>
                <span>{t("now")}</span>
              </span>
            </div>
          </div>
          <dl className="contents">
            <TotalRow
              label={`${t("total")} · ${
                dearer ? t("up", { percent }) : t("down", { percent })
              }`}
              before={money(alert.sentTotal)}
              now={money(alert.currentTotal)}
            />
            <TotalRow
              label={t("direct")}
              before={money(alert.sentDirect)}
              now={money(alert.currentDirect)}
            />
            <TotalRow
              label={t("profit")}
              before={money(alert.sentProfit)}
              now={money(alert.profitLeft)}
              danger={alert.profitLeft < 0}
            />
          </dl>
        </div>

        {alert.changes.length > 0 && (
          <div className="grid content-start xl:row-span-6 xl:grid-rows-subgrid">
            {/* Down to the rule both halves' rows start under. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 pb-2 xl:row-span-2 xl:self-end">
              <p className="m-0 text-meta text-ink-2">{t("changes")}</p>
              <span aria-hidden className={cn(CHANGES, "text-head text-ink-2")}>
                <span>{t("before")}</span>
                <span>{t("now")}</span>
                <span>{t("impact")}</span>
              </span>
            </div>
            <dl className="contents">
              {alert.changes.map((change) => (
                <div key={`${change.name}:${change.unit}`} className={ROW}>
                  <dt className="min-w-0 flex-1 basis-40 text-ink-2">
                    {change.name}
                    <span className="whitespace-nowrap text-meta text-ink-3">
                      {" · lei/"}
                      {formatUnit(change.unit, locale)}
                    </span>
                  </dt>
                  <dd className={cn(CHANGES, "m-0 ml-auto")}>
                    <span className="text-ink-3">{money(change.oldPrice)}</span>
                    <span className="text-ink-2">{money(change.newPrice)}</span>
                    <span className="font-medium text-ink">
                      {signedMoney(change.impact, locale)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            {more > 0 && (
              <p className="m-0 border-t border-border py-1.5 text-meta leading-5 text-ink-3">
                {t("more", { count: more })}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** A total before and now, the new one weighted. */
function TotalRow({
  label,
  before,
  now,
  danger = false,
}: {
  label: string;
  before: string;
  now: string;
  danger?: boolean;
}) {
  return (
    <div className={ROW}>
      <dt className="min-w-0 flex-1 basis-40 text-ink-2">{label}</dt>
      <dd className={cn(TOTALS, "m-0 ml-auto")}>
        <span className="text-ink-3">{before}</span>
        <span className={cn("font-medium text-ink", danger && "text-danger")}>
          {now}
        </span>
      </dd>
    </div>
  );
}

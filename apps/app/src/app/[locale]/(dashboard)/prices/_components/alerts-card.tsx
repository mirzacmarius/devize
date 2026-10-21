"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Badge } from "@devize/ui/badge";
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

  return (
    <section
      aria-label={`${estimateCode(estimate.number, estimate.revision)} ${estimate.title}`}
      className={cn(
        "grid gap-4 py-4",
        first ? "pt-0" : "border-t border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="font-mono text-code text-ink-3">
            {estimateCode(estimate.number, estimate.revision)}
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
          <Badge tone={dearer ? "warning" : "success"}>
            {dearer ? t("up", { percent }) : t("down", { percent })}
          </Badge>
        </div>
      </div>

      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-body">
        <dt className="text-ink-3">{t("total")}</dt>
        <dd className="m-0 tabular-nums text-ink">
          {t("fromTo", {
            from: money(alert.sentTotal),
            to: money(alert.currentTotal),
          })}
        </dd>
        <dt className="text-ink-3">{t("direct")}</dt>
        <dd className="m-0 tabular-nums text-ink">
          {t("fromTo", {
            from: money(alert.sentDirect),
            to: money(alert.currentDirect),
          })}
        </dd>
        <dt className="text-ink-3">{t("profit")}</dt>
        <dd className="m-0 grid gap-0.5">
          <span
            className={cn(
              "tabular-nums",
              alert.profitLeft < 0
                ? "text-danger"
                : alert.profitLeft < alert.sentProfit
                  ? "text-warning"
                  : "text-success",
            )}
          >
            {t("fromTo", {
              from: money(alert.sentProfit),
              to: money(alert.profitLeft),
            })}
          </span>
          <span className="text-meta text-ink-3">{t("profitHint")}</span>
        </dd>
      </dl>

      {alert.changes.length > 0 && (
        <div className="grid gap-1.5">
          <p className="m-0 text-label uppercase text-ink-3">{t("changes")}</p>
          <ul className="m-0 grid list-none gap-1 p-0">
            {alert.changes.map((change) => (
              <li
                key={`${change.name}:${change.unit}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 text-body"
              >
                <span className="min-w-0 text-ink">
                  {change.name}{" "}
                  <span className="text-meta tabular-nums text-ink-3">
                    {t("change", {
                      from: money(change.oldPrice),
                      to: money(change.newPrice),
                      unit: formatUnit(change.unit, locale),
                    })}
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    change.impact > 0 ? "text-warning" : "text-success",
                  )}
                >
                  {t("impact", { impact: signedMoney(change.impact, locale) })}
                </span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <p className="m-0 text-meta text-ink-3">
              {t("more", { count: more })}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
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
        <span className="ml-auto text-meta text-ink-3">
          {t("checked", { date: formatDay(alert.checkedAt, locale) })}
        </span>
      </div>
    </section>
  );
}

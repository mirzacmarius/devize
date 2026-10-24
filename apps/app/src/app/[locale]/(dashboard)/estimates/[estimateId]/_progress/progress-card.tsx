"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { TickBar } from "@devize/ui/meter";
import { useQuery } from "convex/react";
import Link from "next/link";
import { formatCalendarDate, formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";

/**
 * An accepted Deviz under execution, in short: how much is done and
 * confirmed, where the receptions stand, and the way to the Situații de
 * lucrări page.
 */
export function ProgressCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("progress.card");
  const tReceptions = useScopedI18n("progress.receptions");
  const tStages = useScopedI18n("progress.stages");
  const locale = useCurrentLocale();
  const overview = useQuery(api.progress.statements.forEstimate, {
    estimateId: estimate._id,
  });
  const guarantee = useQuery(api.progress.guarantees.forEstimate, {
    estimateId: estimate._id,
  });
  if (overview === undefined || guarantee === undefined) {
    return null;
  }
  const percent = Math.round(overview.executed.percent * 10) / 10;
  const receptionState = (kind: "completion" | "final") => {
    const reception = guarantee.receptions[kind];
    if (!reception) {
      return tReceptions("none");
    }
    return reception.status === "concluded"
      ? `${tReceptions("concluded", {
          date: formatCalendarDate(reception.date, locale),
        })}${
          reception.decision
            ? ` · ${tReceptions(`decisions.${reception.decision}`)}`
            : ""
        }`
      : tReceptions("draft");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {overview.statements.length === 0 ? (
          <p className="m-0 text-body text-ink-2">{t("noStatements")}</p>
        ) : (
          <>
            <div className="grid gap-2">
              <span className="text-body font-medium tabular-nums text-ink">
                {t("executed", { percent: formatPercent(percent, locale) })}
              </span>
              <TickBar
                thin
                value={percent}
                tone={percent > 100 ? "warning" : "action"}
                label={t("executed", {
                  percent: formatPercent(percent, locale),
                })}
              />
            </div>
            <div className="grid gap-1 text-meta text-ink-2">
              <span>
                {t("statements", { count: overview.statements.length })}
              </span>
              {overview.approved && (
                <span>
                  {t("approved", {
                    amount: formatMoney(overview.approved.subtotal, locale),
                  })}
                </span>
              )}
              {guarantee.guarantee && guarantee.outstanding > 0 && (
                <span>
                  {t("outstanding", {
                    amount: formatMoney(guarantee.outstanding, locale),
                  })}
                </span>
              )}
            </div>
          </>
        )}
        <div className="grid gap-1 text-meta text-ink-2">
          {(["completion", "final"] as const).map((kind) => (
            <span key={kind}>
              {t("reception", {
                name: tStages(kind),
                state: receptionState(kind),
              })}
            </span>
          ))}
        </div>
        <Button variant="outline" className="justify-self-start" asChild>
          <Link href={`/estimates/${estimate._id}/progress`}>{t("open")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

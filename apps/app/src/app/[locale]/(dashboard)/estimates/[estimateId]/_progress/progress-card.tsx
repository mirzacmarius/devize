"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { MeterBar } from "@devize/ui/meter";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Fact, FactList } from "@/components/fact-list";
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
        {overview.statements.length > 0 && (
          <span className="text-body font-medium tabular-nums text-ink">
            {t("executed", { percent: formatPercent(percent, locale) })}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {overview.statements.length === 0 ? (
          <p className="m-0 text-body text-ink-2">{t("noStatements")}</p>
        ) : (
          <MeterBar
            value={percent}
            tone={percent > 100 ? "warning" : "action"}
            label={t("executed", {
              percent: formatPercent(percent, locale),
            })}
          />
        )}
        <FactList>
          {overview.statements.length > 0 && (
            <Fact label={t("statements")}>{overview.statements.length}</Fact>
          )}
          {overview.approved && (
            <Fact label={t("approved")}>
              {formatMoney(overview.approved.subtotal, locale)} lei
            </Fact>
          )}
          {guarantee.guarantee && guarantee.outstanding > 0 && (
            <Fact label={t("outstanding")}>
              {formatMoney(guarantee.outstanding, locale)} lei
            </Fact>
          )}
          {(["completion", "final"] as const).map((kind) => (
            <Fact key={kind} label={tStages(kind)}>
              {receptionState(kind)}
            </Fact>
          ))}
        </FactList>
        <Button variant="link" className="justify-self-start" asChild>
          <Link href={`/estimates/${estimate._id}/progress`}>{t("open")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

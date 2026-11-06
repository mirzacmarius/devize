"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { MeterBar } from "@devize/ui/meter";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fact, FactList } from "@/components/fact-list";
import { RailFigure } from "@/components/rail-figure";
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
    <Card id="progress" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <Link
          href={`/estimates/${estimate._id}/progress`}
          aria-label={t("open")}
          className="-mr-[5px] rounded-xs text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="gap-2">
        {overview.statements.length === 0 ? (
          <p className="m-0 text-body text-ink-2">{t("noStatements")}</p>
        ) : (
          <div className="grid gap-2">
            <RailFigure
              value={formatPercent(percent, locale)}
              unit={t("executedUnit")}
            />
            <MeterBar
              value={percent}
              tone={percent > 100 ? "warning" : "action"}
              label={t("executed", {
                percent: formatPercent(percent, locale),
              })}
            />
          </div>
        )}
        <FactList>
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
          {/* A reception says something once the work is done or one is begun. */}
          {(["completion", "final"] as const)
            .filter((kind) => percent >= 100 || guarantee.receptions[kind])
            .map((kind) => (
              <Fact key={kind} label={tStages(kind)}>
                {receptionState(kind)}
              </Fact>
            ))}
        </FactList>
      </CardContent>
    </Card>
  );
}

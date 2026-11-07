"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { MeterBar } from "@devize/ui/meter";
import { useQuery } from "convex/react";
import { Lei } from "@/components/amount";
import { Fact, FactList } from "@/components/fact-list";
import { LinkCard } from "@/components/fold-card";
import { RailStat } from "@/components/rail-stat";
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
  const progress = `/estimates/${estimate._id}/progress`;
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

  if (overview.statements.length === 0) {
    return (
      <LinkCard title={t("title")} lead={t("noStatements")} href={progress} />
    );
  }

  return (
    <RailStat
      id="progress"
      label={t("executedLabel")}
      value={formatPercent(percent, locale)}
      href={progress}
      row
    >
      <MeterBar
        value={percent}
        tone={percent > 100 ? "warning" : "action"}
        label={t("executed", {
          percent: formatPercent(percent, locale),
        })}
        className="mb-1 mt-1.5"
      />
      <FactList>
        {overview.approved && (
          <Fact label={t("approved")}>
            <Lei value={formatMoney(overview.approved.subtotal, locale)} />
          </Fact>
        )}
        {guarantee.guarantee && guarantee.outstanding > 0 && (
          <Fact label={t("outstanding")}>
            <Lei value={formatMoney(guarantee.outstanding, locale)} />
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
    </RailStat>
  );
}

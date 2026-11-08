"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useRouteParam } from "@/components/use-route-param";
import { estimateCode } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { GuaranteeCard } from "./guarantee-card";
import { ReceptionsCard } from "./receptions-card";
import { StatementCard } from "./statement-card";
import { NewStatementButton, StatementPicker } from "./statement-picker";
import { SummaryCard } from "./summary-card";

/**
 * A Deviz under execution: where the works stand, its Situații de lucrări,
 * one open at a time, with the Atașament behind each quantity, then the
 * Garanție de bună execuție and the two Procese-verbale de recepție.
 */
export function ProgressPage() {
  const estimateId = useRouteParam("estimateId") as Id<"estimates">;
  const t = useScopedI18n("progress");
  const tEstimate = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const overview = useQuery(api.progress.statements.forEstimate, {
    estimateId,
  });
  // The statement open on the page; the last one until another is picked.
  const [picked, setPicked] = useState<Id<"workStatements"> | null>(null);

  if (overview === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const { estimate } = overview;
  const code = estimateCode(estimate.number, estimate.revision);
  const latest = overview.statements.at(-1);
  const selected =
    picked && overview.statements.some((statement) => statement._id === picked)
      ? picked
      : (latest?._id ?? null);

  let body: React.ReactNode;
  if (!overview.accepted && overview.statements.length === 0) {
    body = (
      <EmptyState
        icon={<Icons.Progress />}
        title={t("notAcceptedTitle")}
        description={t("notAcceptedDescription")}
      />
    );
  } else if (overview.contract.rows === 0) {
    body = (
      <EmptyState
        icon={<Icons.Progress />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  } else {
    body = (
      <div className="grid min-w-0 gap-6">
        <SummaryCard overview={overview} />
        {selected ? (
          <StatementCard
            key={selected}
            statementId={selected}
            works={estimate}
            picker={
              <StatementPicker
                statements={overview.statements}
                selected={selected}
                onSelect={setPicked}
              />
            }
            onDeleted={() => setPicked(null)}
          />
        ) : (
          <EmptyState
            icon={<Icons.Progress />}
            title={t("list.emptyTitle")}
            description={t("list.emptyDescription")}
            action={
              overview.canCreate && (
                <NewStatementButton overview={overview} onCreated={setPicked} />
              )
            }
          />
        )}
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
          <GuaranteeCard estimateId={estimateId} />
          <ReceptionsCard works={estimate} />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={tEstimate("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/estimates">{tEstimate("breadcrumbList")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbLink asChild className="min-w-0">
              <Link href={`/estimates/${estimate._id}`}>
                <span className="truncate">
                  {code} · {estimate.title}
                </span>
              </Link>
            </BreadcrumbLink>
          </Breadcrumb>
        }
        title={t("title")}
        actions={
          overview.canCreate &&
          selected && (
            <NewStatementButton overview={overview} onCreated={setPicked} />
          )
        }
      />
      {body}
    </>
  );
}

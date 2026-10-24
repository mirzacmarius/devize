"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
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
import { StatementsCard } from "./statements-card";
import { SummaryCard } from "./summary-card";

/**
 * A Deviz under execution: its Situații de lucrări, one open at a time,
 * with the Atașament behind each quantity; on the right, where the works
 * stand, the Garanție de bună execuție and the two Procese-verbale de
 * recepție.
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
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
        <div className="grid min-w-0 gap-6">
          <StatementsCard
            overview={overview}
            selected={selected}
            onSelect={setPicked}
          />
          {selected && (
            <StatementCard
              key={selected}
              statementId={selected}
              works={estimate}
              onDeleted={() => setPicked(null)}
            />
          )}
        </div>
        {/* The state of the works first on a phone, beside the list on a wide screen. */}
        <div className="order-first grid min-w-0 gap-6 xl:order-none">
          <SummaryCard overview={overview} />
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
            <BreadcrumbLink asChild>
              <Link href={`/estimates/${estimate._id}`}>{code}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{t("breadcrumb")}</BreadcrumbPage>
          </Breadcrumb>
        }
        title={t("title")}
        description={t("description", { code, title: estimate.title })}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/estimates/${estimate._id}`}>
              {t("backToEstimate")}
            </Link>
          </Button>
        }
      />
      {body}
    </>
  );
}

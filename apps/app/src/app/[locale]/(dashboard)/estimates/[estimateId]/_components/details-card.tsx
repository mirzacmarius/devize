"use client";

import { Button } from "@devize/ui/button";
import type { ReactNode } from "react";
import { Fact, FactList } from "@/components/fact-list";
import { FoldCard } from "@/components/fold-card";
import { formatCalendarDate } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate, OpenPanel } from "./types";

/** What the Deviz is for: client, site, kind, prices and, for a tender, its procedure. */
export function DetailsCard({
  estimate,
  editable,
  open,
}: {
  estimate: Estimate;
  editable: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const tFields = useScopedI18n("estimates");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const tender = estimate.kind === "tender" ? estimate.tender : undefined;

  const rows: { label: string; value: ReactNode }[] = [
    { label: tFields("fields.client"), value: estimate.client?.name },
    { label: tFields("fields.siteAddress"), value: estimate.siteAddress },
    { label: tFields("fields.county"), value: estimate.county },
    { label: tFields("fields.kind"), value: tFields(`kinds.${estimate.kind}`) },
    ...(estimate.kind === "tender"
      ? [
          { label: tFields("fields.authority"), value: tender?.authority },
          { label: tFields("fields.procedure"), value: tender?.procedure },
          {
            label: tFields("fields.deadline"),
            value:
              tender?.deadline && formatCalendarDate(tender.deadline, locale),
          },
        ]
      : []),
    {
      label: tFields("fields.priceDate"),
      value: formatCalendarDate(estimate.priceDate, locale),
    },
    {
      label: tFields("fields.store"),
      value: estimate.preferredStore
        ? tStores(estimate.preferredStore)
        : tStores("cheapest"),
    },
  ];

  return (
    <FoldCard
      title={t("details.title")}
      lead={tFields(`kinds.${estimate.kind}`)}
    >
      <FactList>
        {rows.map((row) => (
          <Fact key={row.label} label={row.label}>
            {row.value || <span className="text-ink-3">{tc("notSet")}</span>}
          </Fact>
        ))}
      </FactList>
      {estimate.description && (
        <p className="m-0 whitespace-pre-line border-t border-border pt-3 text-body text-ink-2">
          {estimate.description}
        </p>
      )}
      {editable && (
        <Button
          type="button"
          variant="link"
          className="justify-self-start"
          onClick={() => open({ kind: "details" })}
        >
          {t("details.edit")}
        </Button>
      )}
    </FoldCard>
  );
}

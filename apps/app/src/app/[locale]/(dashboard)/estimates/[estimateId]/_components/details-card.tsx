"use client";

import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import type { ReactNode } from "react";
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
    <Card>
      <CardHeader>
        <CardTitle>{t("details.title")}</CardTitle>
        {editable && (
          <Button
            type="button"
            variant="link"
            onClick={() => open({ kind: "details" })}
          >
            {t("details.edit")}
          </Button>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <dl className="m-0 grid gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-w-0 items-baseline justify-between gap-4"
            >
              <dt className="shrink-0 text-body text-ink-3">{row.label}</dt>
              <dd className="m-0 min-w-0 text-right text-body font-medium text-ink [overflow-wrap:anywhere]">
                {row.value || (
                  <span className="font-normal text-ink-3">{tc("notSet")}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {estimate.description && (
          <p className="m-0 whitespace-pre-line border-t border-border pt-3 text-body text-ink-2">
            {estimate.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

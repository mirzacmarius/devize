"use client";

import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { formatHours, formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate, OpenPanel } from "./types";

const RATE_COLUMN = "hidden [@container(min-width:30rem)]:table-cell";
const NARROW_ONLY = "[@container(min-width:30rem)]:hidden";

type Row = {
  label: string;
  // What a markup is a share of: "2,25% din manoperă".
  rate?: string;
  value: number;
  kind?: "subtotal" | "total";
};

/**
 * The Recapitulație: direct costs by kind, then CAM, indirect costs, profit
 * and VAT, each with its rate, as the official forms add them up.
 */
export function RecapCard({
  estimate,
  editable,
  open,
}: {
  estimate: Estimate;
  editable: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const tMarkups = useScopedI18n("markups");
  const tResources = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const { totals, markups } = estimate;
  const rate = (value: number) => formatPercent(value, locale);

  const rows: Row[] = [
    { label: tResources("groups.material"), value: totals.material },
    { label: tResources("groups.labor"), value: totals.labor },
    { label: tResources("groups.equipment"), value: totals.equipment },
    { label: tResources("groups.transport"), value: totals.transport },
    {
      label: tMarkups("cam.label"),
      rate: t("recap.rates.cam", { rate: rate(markups.cam) }),
      value: totals.cam,
    },
    { label: t("recap.direct"), value: totals.direct, kind: "subtotal" },
    {
      label: tMarkups("indirect.label"),
      rate: t("recap.rates.indirect", { rate: rate(markups.indirect) }),
      value: totals.indirect,
    },
    {
      label: tMarkups("profit.label"),
      rate: t("recap.rates.profit", { rate: rate(markups.profit) }),
      value: totals.profit,
    },
    { label: t("recap.subtotal"), value: totals.subtotal, kind: "subtotal" },
    {
      label: tMarkups("vat.label"),
      rate: t("recap.rates.vat", { rate: rate(markups.vat) }),
      value: totals.vat,
    },
    { label: t("recap.total"), value: totals.total, kind: "total" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recap.title")}</CardTitle>
        {editable && (
          <Button
            type="button"
            variant="link"
            onClick={() => open({ kind: "markups" })}
          >
            {t("recap.editRates")}
          </Button>
        )}
      </CardHeader>
      <TickRule />
      {/* A size container: a narrow card puts each rate under its label. */}
      <CardContent className="pt-2 [container-type:inline-size]">
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">{t("recap.caption")}</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">{t("recap.columns.item")}</th>
              <th scope="col" className={RATE_COLUMN}>
                {t("recap.columns.rate")}
              </th>
              <th scope="col">{t("recap.columns.value")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={cn(
                  row.kind && "border-t border-border",
                  row.kind === "total" && "border-ink",
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "py-2 pr-3 text-left font-normal",
                    row.kind ? "text-ink font-medium" : "text-ink-2",
                  )}
                >
                  {row.label}
                  {row.rate && (
                    <span
                      className={cn("block text-meta text-ink-3", NARROW_ONLY)}
                    >
                      {row.rate}
                    </span>
                  )}
                </th>
                <td
                  className={cn("py-2 pr-3 text-meta text-ink-3", RATE_COLUMN)}
                >
                  {row.rate}
                </td>
                <td
                  className={cn(
                    "py-2 text-right tabular-nums",
                    row.kind === "total"
                      ? "text-title-card font-light text-ink"
                      : row.kind
                        ? "font-medium text-ink"
                        : "text-ink",
                  )}
                >
                  {formatMoney(row.value, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="m-0 flex flex-wrap justify-between gap-x-4 gap-y-1 text-meta text-ink-3">
          <span>{t("recap.currency")}</span>
          <span>
            {t("recap.laborHours", {
              hours: formatHours(totals.laborHours, locale),
            })}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

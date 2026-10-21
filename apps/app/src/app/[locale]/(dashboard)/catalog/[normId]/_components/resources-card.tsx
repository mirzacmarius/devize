"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import {
  formatConsumption,
  formatMoney,
  formatPercent,
  formatUnit,
} from "@/lib/format";
import {
  costByKind,
  isPercent,
  resourceKinds,
  resourceValues,
} from "@/lib/resource-values";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

// The card is a size container: a narrow one puts each price under its
// resource's name instead of in a column of its own.
const PRICE_COLUMN = "hidden [@container(min-width:30rem)]:table-cell";
const NARROW_ONLY = "[@container(min-width:30rem)]:hidden";

/**
 * What one unit of work consumes, resource by resource, at the norm's
 * reference prices, and the direct cost that comes to. A Deviz prices the
 * same resources with the firm's own rates and prices instead.
 */
export function ResourcesCard({ norm }: { norm: Norm }) {
  const t = useScopedI18n("norm");
  const tResources = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const unit = formatUnit(norm.unit, locale);
  const rows = [...norm.resources]
    .sort(
      (a, b) => resourceKinds.indexOf(a.kind) - resourceKinds.indexOf(b.kind),
    )
    .map((row) => ({ ...row, price: row.referencePrice }));
  const values = resourceValues(rows);
  const cost = costByKind(rows);
  const kinds = resourceKinds.filter((kind) =>
    rows.some((row) => row.kind === kind),
  );
  const partial = rows.some(
    (row) => !isPercent(row) && row.referencePrice === undefined,
  );

  const price = (row: (typeof rows)[number]) =>
    isPercent(row) ? (
      <span className="text-meta text-ink-3">
        {t(`resources.shareOf.${row.kind}`)}
      </span>
    ) : row.referencePrice === undefined ? (
      <span className="text-meta text-ink-3">{t("resources.noPrice")}</span>
    ) : (
      formatMoney(row.referencePrice, locale)
    );
  // Under the name, a price needs its unit: there is no column head there.
  const narrowPrice = (row: (typeof rows)[number]) =>
    isPercent(row) || row.referencePrice === undefined
      ? price(row)
      : t("resources.perUnitValue", {
          value: formatMoney(row.referencePrice, locale),
          unit: formatUnit(row.unit, locale),
        });

  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("resources.title", { unit })}</CardTitle>
        <CardDescription>{t("resources.description")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2 [container-type:inline-size]">
        {rows.length === 0 ? (
          <p className="m-0 pt-2 text-body text-ink-3">{t("resources.none")}</p>
        ) : (
          <>
            <table className="w-full border-collapse text-body">
              <thead>
                <tr>
                  <th className="py-2 text-left text-label font-normal uppercase text-ink-3">
                    {t("resources.columns.resource")}
                  </th>
                  <th className="py-2 pl-3 text-right text-label font-normal uppercase text-ink-3">
                    {t("resources.columns.consumption")}
                  </th>
                  <th
                    className={cn(
                      "py-2 pl-3 text-right text-label font-normal uppercase text-ink-3",
                      PRICE_COLUMN,
                    )}
                  >
                    {t("resources.columns.price")}
                  </th>
                  <th className="py-2 pl-3 text-right text-label font-normal uppercase text-ink-3">
                    {t("resources.columns.value")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row._id} className="border-t border-border">
                    <td className="py-2.5 align-top">
                      <div className="grid">
                        <span className="text-ink">{row.name}</span>
                        <span className="text-meta text-ink-3">
                          {tResources(`kinds.${row.kind}`)}
                        </span>
                        <span
                          className={cn(
                            "text-meta text-ink-3 tabular-nums",
                            NARROW_ONLY,
                          )}
                        >
                          {narrowPrice(row)}
                        </span>
                        {row.note && (
                          <span className="text-meta text-ink-3">
                            {row.note}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-3 text-right align-top tabular-nums text-ink-2">
                      {isPercent(row)
                        ? formatPercent(row.quantity, locale)
                        : formatConsumption(row.quantity, locale)}
                      {/* A unit column of its own, so the numbers line up. */}
                      <span className="ml-1 inline-block min-w-8 text-left text-ink-3">
                        {isPercent(row) ? null : formatUnit(row.unit, locale)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-2.5 pl-3 text-right align-top tabular-nums text-ink-2",
                        PRICE_COLUMN,
                      )}
                    >
                      {price(row)}
                    </td>
                    <td className="py-2.5 pl-3 text-right align-top tabular-nums text-ink">
                      {formatMoney(values[index] ?? 0, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="m-0 grid gap-2 rounded-md bg-sunken px-4 py-3">
              {kinds.map((kind) => (
                <div
                  key={kind}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="text-body text-ink-2">
                    {tResources(`groups.${kind}`)}
                  </dt>
                  <dd className="m-0 text-body tabular-nums text-ink">
                    {formatMoney(cost[kind], locale)}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                <dt className="text-body font-medium text-ink">
                  {t("resources.total")}
                </dt>
                <dd className="m-0 text-body font-medium tabular-nums text-ink">
                  {t("resources.perUnitValue", {
                    value: formatMoney(cost.total, locale),
                    unit,
                  })}
                </dd>
              </div>
            </dl>
            {partial && (
              <p className="m-0 text-meta text-warning">
                {t("resources.partial")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

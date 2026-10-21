"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { romanianMonth } from "@devize/backend/convex/lib/dates";
import { MIN_FIRMS_PER_COUNTY } from "@devize/backend/convex/producers/lib/usage";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { TickBar } from "@devize/ui/meter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import {
  formatAmount,
  formatCount,
  formatMoney,
  formatMonth,
  formatPercent,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { MonthlyChart } from "./monthly-chart";
import { ProducerHeader } from "./producer-header";
import type { Stats } from "./types";

/**
 * A Producător's usage statistics, next to its profile, for its own firm and
 * Devize staff: how often firms put its norms in devize, the devize sent and
 * accepted with them, how much of its products those hold and where. Never
 * which firm.
 */
export function StatsPage({
  manufacturerId,
}: {
  manufacturerId: Id<"manufacturers">;
}) {
  const t = useScopedI18n("producers");
  const tc = useScopedI18n("common");
  const profile = useQuery(api.producers.profiles.get, { manufacturerId });
  // The month in Romania now, since a query can't read the clock.
  const [until] = useState(() => romanianMonth(Date.now()));
  const stats = useQuery(
    api.producers.usage.stats,
    profile?.viewer.canSeeStats ? { manufacturerId, until } : "skip",
  );

  if (profile === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }
  if (profile === null) {
    return (
      <EmptyState
        icon={<Icons.Producers />}
        title={t("profile.notFound")}
        action={
          <Button variant="outline" asChild>
            <Link href="/producers">{t("profile.back")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <ProducerHeader profile={profile} tab="stats" />
      {!profile.viewer.canSeeStats || stats === null ? (
        <EmptyState
          icon={<Icons.Reports />}
          title={t("stats.denied")}
          action={
            <Button variant="outline" asChild>
              <Link href={`/producers/${manufacturerId}`}>
                {t("stats.backToProfile")}
              </Link>
            </Button>
          }
        />
      ) : stats === undefined ? (
        <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
      ) : (
        <StatsContent stats={stats} />
      )}
    </>
  );
}

function StatsContent({ stats }: { stats: Stats }) {
  const t = useScopedI18n("producers.stats");
  const locale = useCurrentLocale();
  const { totals } = stats;
  const empty =
    totals.added + totals.sent + totals.accepted === 0 &&
    stats.products.length === 0;

  return (
    <>
      <p className="m-0 max-w-3xl text-body text-ink-2">
        {t("period")}. {t("privacy", { min: MIN_FIRMS_PER_COUNTY })}
      </p>
      {empty ? (
        <EmptyState
          icon={<Icons.Reports />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label={t("kpis.added")}
              value={formatCount(totals.added, locale)}
              hint={t("kpis.addedHint")}
            />
            <StatTile
              label={t("kpis.firms")}
              value={formatCount(totals.firms, locale)}
              hint={t("kpis.firmsHint")}
            />
            <StatTile
              label={t("kpis.sent")}
              value={formatCount(totals.sent, locale)}
              hint={t("kpis.sentHint")}
            />
            <StatTile
              label={t("kpis.accepted")}
              value={formatCount(totals.accepted, locale)}
              hint={
                totals.sent > 0
                  ? t("kpis.acceptedRate", {
                      rate: formatPercent(
                        Math.round((totals.accepted / totals.sent) * 100),
                        locale,
                      ),
                    })
                  : t("kpis.acceptedHint")
              }
            />
          </div>
          <MonthsCard stats={stats} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
            <NormsCard stats={stats} />
            <CountiesCard stats={stats} />
          </div>
          <ProductsCard stats={stats} />
        </>
      )}
    </>
  );
}

/** One headline number, with what it counts. */
function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="grid content-start gap-1 p-5">
      <p className="m-0 text-meta text-ink-3">{label}</p>
      <p className="m-0 text-kpi text-ink">{value}</p>
      <p className="m-0 text-meta text-ink-3">{hint}</p>
    </Card>
  );
}

const measures = ["added", "sent", "accepted"] as const;
type Measure = (typeof measures)[number];

/** The months, as a chart of one count at a time or as a table of all. */
function MonthsCard({ stats }: { stats: Stats }) {
  const t = useScopedI18n("producers.stats.chart");
  const locale = useCurrentLocale();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [measure, setMeasure] = useState<Measure>("added");
  const last = stats.months.length - 1;

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <CardTitle>{t("title")}</CardTitle>
        <SegmentedControl
          label={t("view")}
          value={view}
          onChange={setView}
          options={[
            { value: "chart", label: t("asChart") },
            { value: "table", label: t("asTable") },
          ]}
        />
      </CardHeader>
      <TickRule />
      <CardContent className="gap-4 pt-4">
        {view === "chart" ? (
          <>
            <SegmentedControl
              label={t("measure")}
              value={measure}
              onChange={setMeasure}
              className="justify-self-start"
              options={measures.map((value) => ({
                value,
                label: t(`measures.${value}`),
              }))}
            />
            <MonthlyChart
              label={t(`measures.${measure}`)}
              points={stats.months.map((month) => ({
                month: month.month,
                value: month[measure],
              }))}
            />
          </>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("month")}</TableHead>
                {measures.map((value) => (
                  <TableHead key={value} className="text-right">
                    {t(`measures.${value}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.months.map((month, index) => (
                <TableRow key={month.month}>
                  <TableCell className="text-ink-2">
                    {index === last
                      ? t("current", {
                          month: formatMonth(month.month, locale, true),
                        })
                      : formatMonth(month.month, locale, true)}
                  </TableCell>
                  {measures.map((value) => (
                    <TableCell key={value} className="text-right tabular-nums">
                      {formatCount(month[value], locale)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** "Trimise: 239 · Acceptate: 98", for a row of counts. */
function useSentAccepted() {
  const t = useScopedI18n("producers.stats");
  const locale = useCurrentLocale();
  return (row: { sent: number; accepted: number }) =>
    t("sentAccepted", {
      sent: formatCount(row.sent, locale),
      accepted: formatCount(row.accepted, locale),
    });
}

function NormsCard({ stats }: { stats: Stats }) {
  const t = useScopedI18n("producers.stats.norms");
  const locale = useCurrentLocale();
  const sentAccepted = useSentAccepted();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {stats.norms.length === 0 ? (
          <p className="m-0 text-body text-ink-3">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.norm")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.added")}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("columns.sent")}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("columns.accepted")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {t("columns.quantity")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.norms.map((norm) => (
                <TableRow key={norm._id}>
                  <TableCell>
                    <Link
                      href={`/catalog/${norm._id}`}
                      className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-mono text-code text-ink-3">
                        {norm.code}
                      </span>
                      <span className="text-body font-medium text-ink group-hover:underline">
                        {norm.title}
                      </span>
                      <span className="text-meta tabular-nums text-ink-3 sm:hidden">
                        {sentAccepted(norm)}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCount(norm.added, locale)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {formatCount(norm.sent, locale)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {formatCount(norm.accepted, locale)}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-ink-2 md:table-cell">
                    {norm.acceptedQuantity > 0
                      ? `${formatAmount(norm.acceptedQuantity, locale)} ${formatUnit(norm.unit, locale)}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Where the producer's norms go into devize; a county needs enough firms. */
function CountiesCard({ stats }: { stats: Stats }) {
  const t = useScopedI18n("producers.stats.counties");
  const tMeasures = useScopedI18n("producers.stats.chart.measures");
  const locale = useCurrentLocale();
  const sentAccepted = useSentAccepted();
  const others = stats.otherCounties;
  const max = Math.max(
    1,
    others?.added ?? 0,
    ...stats.counties.map((county) => county.added),
  );
  const rows = [
    ...stats.counties.map((county) => ({
      key: county.county,
      name: county.county,
      detail: `${t("firms", { count: formatCount(county.firms, locale) })} · ${sentAccepted(county)}`,
      hint: undefined,
      ...county,
    })),
    ...(others
      ? [
          {
            key: "others",
            name: t("others"),
            detail: sentAccepted(others),
            hint: t("othersHint", { min: MIN_FIRMS_PER_COUNTY }),
            ...others,
          },
        ]
      : []),
  ];

  return (
    <Card className="min-w-0">
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <ul className="m-0 grid list-none gap-4 p-0">
          {rows.map((row) => (
            <li key={row.key} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body font-medium text-ink">
                  {row.name}
                </span>
                <span className="text-body tabular-nums text-ink">
                  {formatCount(row.added, locale)}
                </span>
              </div>
              <TickBar
                thin
                value={(row.added / max) * 100}
                label={`${row.name}: ${tMeasures("added")} ${formatCount(row.added, locale)}`}
              />
              <span className="text-meta tabular-nums text-ink-3">
                {row.detail}
              </span>
              {row.hint && (
                <span className="text-meta text-ink-3">{row.hint}</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * How much of each product the devize sent and accepted hold, what the
 * accepted part is worth, and how often a client chose another producer's.
 */
function ProductsCard({ stats }: { stats: Stats }) {
  const t = useScopedI18n("producers.stats.products");
  const locale = useCurrentLocale();
  const amount = (quantity: number, unit: string) =>
    `${formatAmount(quantity, locale)} ${formatUnit(unit, locale)}`;

  return (
    <Card className="min-w-0">
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {stats.products.length === 0 ? (
          <p className="m-0 text-body text-ink-3">{t("empty")}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.product")}</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    {t("columns.sent")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("columns.accepted")}
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    {t("columns.value")}
                  </TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    {t("columns.replaced")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <span className="text-body font-medium text-ink">
                          {product.name}
                        </span>
                        {product.packageLabel && (
                          <span className="text-meta text-ink-3">
                            {product.packageLabel}
                          </span>
                        )}
                        {product.replaced > 0 && (
                          <span className="text-meta tabular-nums text-ink-3 sm:hidden">
                            {t("replacedCount", {
                              count: formatCount(product.replaced, locale),
                            })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <div className="grid justify-items-end gap-0.5">
                        <span className="whitespace-nowrap tabular-nums">
                          {amount(product.sentQuantity, product.unit)}
                        </span>
                        <span className="text-meta text-ink-3">
                          {t("inEstimates", {
                            count: formatCount(product.sent, locale),
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="grid justify-items-end gap-0.5">
                        <span className="whitespace-nowrap tabular-nums">
                          {amount(product.acceptedQuantity, product.unit)}
                        </span>
                        <span className="text-meta text-ink-3">
                          {product.packageSize && product.acceptedQuantity > 0
                            ? t("packages", {
                                count: formatCount(
                                  Math.ceil(
                                    product.acceptedQuantity /
                                      product.packageSize,
                                  ),
                                  locale,
                                ),
                                package:
                                  product.packageLabel ??
                                  amount(product.packageSize, product.unit),
                              })
                            : t("inEstimates", {
                                count: formatCount(product.accepted, locale),
                              })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {formatMoney(product.acceptedValue, locale)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {formatCount(product.replaced, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="m-0 pt-4 text-meta text-ink-3">{t("replacedHint")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

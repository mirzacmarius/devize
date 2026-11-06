"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Figure, FigureStrip } from "@/components/figure-strip";
import { useFirm } from "@/components/firm-provider";
import { InvoiceArchiveButton } from "@/components/invoice-archive";
import {
  EfacturaPill,
  type InvoiceStatus,
  InvoiceStatusPill,
} from "@/components/invoice-status";
import { SegmentedControl } from "@/components/segmented-control";
import { formatCalendarDate, formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

type Filter = "all" | InvoiceStatus;
const filters = ["all", "draft", "issued", "paid", "cancelled"] as const;

/**
 * The firm's Facturi, newest first: each with its client, where it stands,
 * its total, when it is due and where it is with ANAF's e-Factura.
 */
export function InvoiceList() {
  const t = useScopedI18n("invoices");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const [filter, setFilter] = useState<Filter>("all");
  const listed = usePaginatedQuery(
    api.invoices.invoices.list,
    {
      organizationId: firm._id,
      status: filter === "all" ? undefined : filter,
    },
    { initialNumItems: 25 },
  );
  const rows =
    listed.status === "LoadingFirstPage" ? undefined : listed.results;
  const isEmpty = filter === "all" && rows !== undefined && rows.length === 0;
  const today = todayInput();
  const receivable = useQuery(api.invoices.invoices.receivable, {
    organizationId: firm._id,
    today,
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          isEmpty ? undefined : (
            // The firm keeps its invoices 5 years (Legea 82/1991 art. 25).
            <InvoiceArchiveButton
              organizationId={firm._id}
              firmName={firm.name}
            />
          )
        }
      />
      {isEmpty ? (
        <EmptyState
          icon={<Icons.Invoice />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" asChild>
              <Link href="/estimates">{t("emptyAction")}</Link>
            </Button>
          }
        />
      ) : (
        <section className="grid min-w-0 gap-3">
          <FigureStrip className="mb-3">
            <Figure
              label={t("receivable.total")}
              value={receivable ? formatMoney(receivable.total, locale) : "–"}
              unit="lei"
            />
            <Figure
              label={t("receivable.overdue")}
              value={receivable ? formatMoney(receivable.overdue, locale) : "–"}
              unit={
                receivable &&
                (receivable.overdueCount > 0
                  ? t("receivable.overdueCount", {
                      unit: "lei",
                      count: receivable.overdueCount,
                    })
                  : "lei")
              }
            />
          </FigureStrip>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              label={t("filterLabel")}
              value={filter}
              onChange={setFilter}
              options={filters.map((value) => ({
                value,
                label: t(`filters.${value}`),
              }))}
            />
          </div>
          <Table stack twoLine>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.invoice")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("columns.client")}
                </TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.total")}
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  {t("columns.owed")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {t("columns.due")}
                </TableHead>
                <TableHead className="hidden pl-8 lg:table-cell">
                  {t("columns.efactura")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === undefined && (
                <TableRow>
                  <TableCell colSpan={7} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-ink-3">
                    {t("noneHere")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((row) => {
                const live = row.status === "issued" || row.status === "paid";
                // A storno invoice and the one it reverses bring nothing in.
                const owed =
                  row.status === "issued" &&
                  row.kind !== "storno" &&
                  !row.reversed
                    ? row.total - row.paidAmount
                    : undefined;
                return (
                  <TableRow key={row._id}>
                    <TableCell data-stack="wide">
                      <Link
                        href={`/invoices/${row._id}`}
                        className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate text-meta tabular-nums text-ink-3">
                          {row.code ?? t("draftCode")}
                          {row.estimate && ` · ${row.estimate.code}`}
                          <span className="md:hidden">
                            {row.buyerName && ` · ${row.buyerName}`}
                          </span>
                        </span>
                        <span className="text-body font-medium text-ink group-hover:underline max-md:text-body-lg">
                          {t(`kind.${row.kind}`)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-ink-2 md:table-cell">
                      {row.buyerName || (
                        <span className="text-ink-3">{tc("notSet")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusPill
                        status={row.status}
                        overdue={row.dueDate < today}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums max-md:text-body-lg">
                      {formatMoney(row.total, locale)}
                      <span className="ml-1 text-meta font-normal text-ink-3 md:hidden">
                        lei
                      </span>
                      {/* Below this the column's gone, so a part-paid one says it here. */}
                      {owed !== undefined && row.paidAmount > 0 && (
                        <span className="block text-meta font-normal text-ink-3 xl:hidden">
                          {t("owedPart", { owed: formatMoney(owed, locale) })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-ink-2 xl:table-cell">
                      {owed === undefined ? (
                        <span className="text-ink-3">–</span>
                      ) : (
                        formatMoney(owed, locale)
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right text-ink-3 tabular-nums md:table-cell">
                      {formatCalendarDate(row.dueDate, locale)}
                    </TableCell>
                    <TableCell className="hidden pl-8 lg:table-cell">
                      {live ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <EfacturaPill
                            status={row.efactura.status}
                            late={row.efactura.deadline < today}
                          />
                          {row.efactura.status === "not_sent" && (
                            <span className="text-meta text-ink-3">
                              {t("efacturaDue", {
                                date: formatCalendarDate(
                                  row.efactura.deadline,
                                  locale,
                                ),
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-3">–</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {listed.status === "CanLoadMore" && (
            <Button
              variant="ghost"
              className="justify-self-center"
              onClick={() => listed.loadMore(25)}
            >
              {tc("loadMore")}
            </Button>
          )}
        </section>
      )}
    </>
  );
}

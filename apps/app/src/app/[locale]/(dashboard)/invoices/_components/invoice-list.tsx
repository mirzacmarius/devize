"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { StatusPill } from "@devize/ui/status-pill";
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
import { ListToolbar } from "@/components/list-toolbar";
import { Nil } from "@/components/nil";
import { SegmentedControl } from "@/components/segmented-control";
import {
  formatCalendarDay,
  formatCount,
  formatMoney,
  todayInput,
} from "@/lib/format";
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
  const anaf = useQuery(api.invoices.invoices.efacturaDue, {
    organizationId: firm._id,
    today,
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={
          isEmpty
            ? undefined
            : rows && listed.status === "Exhausted"
              ? `${t("receivable.invoices", { count: rows.length })} · ${tc("inLeiLower")}`
              : tc("inLei")
        }
        actions={
          isEmpty ? undefined : (
            <>
              {/* The firm keeps its invoices 5 years (Legea 82/1991 art. 25). */}
              <InvoiceArchiveButton
                organizationId={firm._id}
                firmName={firm.name}
                className="max-sm:[&>svg]:hidden"
              />
              {anaf?.firstLate && (
                <Button asChild>
                  <Link href={`/invoices/${anaf.firstLate}`}>
                    {t("lateAction")}
                  </Link>
                </Button>
              )}
            </>
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
              lead
              label={t("receivable.total")}
              value={receivable ? formatMoney(receivable.total, locale) : "–"}
              unit="lei"
              note={
                receivable &&
                t("receivable.invoices", { count: receivable.openCount })
              }
            />
            <Figure
              label={t("receivable.overdue")}
              value={
                !receivable ? (
                  "–"
                ) : receivable.overdue > 0 ? (
                  formatMoney(receivable.overdue, locale)
                ) : (
                  <span className="text-ink-3">0</span>
                )
              }
              unit="lei"
              note={
                receivable &&
                t("receivable.invoices", { count: receivable.overdueCount })
              }
            />
            <Figure
              label={t("receivable.toSend")}
              value={anaf ? formatCount(anaf.toSend, locale) : "–"}
              note={
                anaf?.firstLate && (
                  <StatusPill tone="danger">
                    {t("receivable.lateCount", { count: anaf.late })}
                  </StatusPill>
                )
              }
            />
          </FigureStrip>
          <ListToolbar>
            <SegmentedControl
              label={t("filterLabel")}
              className="max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center sm:p-0.5"
              value={filter}
              onChange={setFilter}
              options={filters.map((value) => ({
                value,
                label: t(`filters.${value}`),
              }))}
            />
          </ListToolbar>
          <Table stack twoLine>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.invoice")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("columns.client")}
                </TableHead>
                <TableHead className="xl:pr-8">{t("columns.status")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.total")}
                </TableHead>
                <TableHead className="hidden pl-8 text-right xl:table-cell">
                  {t("columns.owed")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell md:max-xl:pr-0">
                  {t("columns.due")}
                </TableHead>
                <TableHead className="hidden pl-8 xl:table-cell">
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
                const anafAsks =
                  live &&
                  (row.efactura.status === "rejected" ||
                    row.efactura.status === "failed" ||
                    (row.efactura.status === "not_sent" &&
                      row.efactura.deadline < today));
                return (
                  <TableRow key={row._id}>
                    <TableCell data-stack="wide">
                      <Link
                        href={`/invoices/${row._id}`}
                        className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="text-body tabular-nums text-ink group-hover:underline max-md:text-body-lg">
                          {row.code ?? t(`kind.${row.kind}`)}
                        </span>
                        <span className="truncate text-meta tabular-nums text-ink-3">
                          {[
                            row.code ? t(`kind.${row.kind}`) : null,
                            row.estimate?.code ??
                              (row.code ? null : t("draftCode")),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          <span className="md:hidden">
                            {row.buyerName && ` · ${row.buyerName}`}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-ink-2 md:table-cell">
                      <span className="block min-w-[6.75rem]">
                        {row.buyerName}
                      </span>
                    </TableCell>
                    <TableCell className="xl:pr-8">
                      <InvoiceStatusPill
                        status={row.status}
                        overdue={row.dueDate < today}
                      />
                      {/* Below this the column's gone, so what needs doing says it here. */}
                      {anafAsks && (
                        <span className="mt-0.5 block xl:hidden">
                          <EfacturaPill
                            status={row.efactura.status}
                            late
                            named
                          />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums max-md:text-body-lg max-xl:font-medium xl:text-ink-2">
                      {formatMoney(row.total, locale)}
                      <span className="ml-1 text-meta font-normal text-ink-3 md:hidden">
                        lei
                      </span>
                      {/* Below this the column's gone, so a part-paid one says it here. */}
                      {owed !== undefined && row.paidAmount > 0 && (
                        <span className="block whitespace-nowrap text-meta font-normal text-ink-3 xl:hidden">
                          {t("owedPart", { owed: formatMoney(owed, locale) })}
                        </span>
                      )}
                    </TableCell>
                    {/* What's still to come in is what this list is read for. */}
                    <TableCell className="hidden pl-8 text-right tabular-nums xl:table-cell">
                      {owed === undefined ? (
                        <Nil />
                      ) : (
                        <span className="font-medium">
                          {formatMoney(owed, locale)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right text-ink-3 tabular-nums md:table-cell md:max-xl:pr-0">
                      {formatCalendarDay(row.dueDate, locale)}
                    </TableCell>
                    <TableCell className="hidden pl-8 xl:table-cell">
                      {live ? (
                        <EfacturaPill
                          status={row.efactura.status}
                          late={row.efactura.deadline < today}
                          deadline={formatCalendarDay(
                            row.efactura.deadline,
                            locale,
                          )}
                        />
                      ) : (
                        <Nil />
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

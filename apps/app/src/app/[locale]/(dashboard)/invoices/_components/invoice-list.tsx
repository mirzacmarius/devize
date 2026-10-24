"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, TickRule } from "@devize/ui/card";
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
import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useFirm } from "@/components/firm-provider";
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

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
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
        <Card>
          <CardHeader className="flex-wrap">
            <SegmentedControl
              label={t("filterLabel")}
              value={filter}
              onChange={setFilter}
              options={filters.map((value) => ({
                value,
                label: t(`filters.${value}`),
              }))}
            />
          </CardHeader>
          <TickRule />
          <CardContent className="pt-4">
            <Table>
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
                  <TableHead className="hidden text-right sm:table-cell">
                    {t("columns.due")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {t("columns.efactura")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows === undefined && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-ink-3">
                      {tc("loading")}
                    </TableCell>
                  </TableRow>
                )}
                {rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-ink-3">
                      {t("noneHere")}
                    </TableCell>
                  </TableRow>
                )}
                {rows?.map((row) => {
                  const live = row.status === "issued" || row.status === "paid";
                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${row._id}`}
                          className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-mono text-code text-ink-3">
                            {row.code ?? t("draftCode")}
                            {row.estimate && ` · ${row.estimate.code}`}
                          </span>
                          <span className="text-body font-medium text-ink group-hover:underline">
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
                        <div className="grid justify-items-start gap-1">
                          <InvoiceStatusPill
                            status={row.status}
                            overdue={row.dueDate < today}
                          />
                          {row.status === "issued" && row.paidAmount > 0 && (
                            <span className="text-meta text-ink-3 tabular-nums">
                              {t("paidPart", {
                                paid: formatMoney(row.paidAmount, locale),
                              })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.total, locale)}
                      </TableCell>
                      <TableCell className="hidden text-right text-ink-3 tabular-nums sm:table-cell">
                        {formatCalendarDate(row.dueDate, locale)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {live ? (
                          <div className="grid justify-items-start gap-1">
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
          </CardContent>
        </Card>
      )}
    </>
  );
}

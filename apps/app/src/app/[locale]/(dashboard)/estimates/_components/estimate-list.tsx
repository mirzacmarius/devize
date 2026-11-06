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
import { LayoutTemplate, Plus } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  type EstimateStatus,
  EstimateStatusPill,
} from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { SearchInput } from "@/components/search-input";
import { SegmentedControl } from "@/components/segmented-control";
import { estimateCode, formatDay, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { NewEstimateDialog } from "./new-estimate-dialog";
import type { StartFrom } from "./start-from";
import { TemplatesSheet } from "./templates-sheet";

type Filter = "all" | EstimateStatus;
const filters = ["all", "draft", "sent", "accepted", "rejected"] as const;

type Row = {
  _id: string;
  number: number;
  revision: number;
  title: string;
  status: EstimateStatus;
  clientName?: string;
  total: number;
  updatedAt: number;
};

export function EstimateList() {
  const t = useScopedI18n("estimates");
  const tc = useScopedI18n("common");
  const tt = useScopedI18n("templates");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const [creating, setCreating] = useState(false);
  const [startFrom, setStartFrom] = useState<StartFrom>();
  const [browsing, setBrowsing] = useState(false);
  const startBlank = () => {
    setStartFrom(undefined);
    setCreating(true);
  };

  const listed = usePaginatedQuery(
    api.estimates.estimates.list,
    search
      ? "skip"
      : {
          organizationId: firm._id,
          status: filter === "all" ? undefined : filter,
        },
    { initialNumItems: 25 },
  );
  const found = useQuery(
    api.estimates.estimates.search,
    search ? { organizationId: firm._id, text: search } : "skip",
  );
  const rows: Row[] | undefined = search
    ? found
    : listed.status === "LoadingFirstPage"
      ? undefined
      : listed.results;
  const isEmpty =
    !search && filter === "all" && rows !== undefined && rows.length === 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("allWithVat")}
        actions={
          <>
            <Button
              variant="outline"
              className="max-sm:size-9 max-sm:p-0"
              onClick={() => setBrowsing(true)}
            >
              <LayoutTemplate aria-hidden />
              <span className="max-sm:sr-only">{tt("open")}</span>
            </Button>
            <Button onClick={startBlank}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          </>
        }
      />
      {isEmpty ? (
        <EmptyState
          icon={<Icons.Deviz />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" onClick={startBlank}>
              {t("emptyAction")}
            </Button>
          }
        />
      ) : (
        <section className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              label={t("filterLabel")}
              className="max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center"
              value={filter}
              onChange={(value) => {
                setFilter(value);
                setText("");
              }}
              options={filters.map((value) => ({
                value,
                label: t(`filters.${value}`),
              }))}
            />
            <SearchInput
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:max-w-xs"
            />
          </div>
          <Table stack twoLine>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.estimate")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("columns.client")}
                </TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.total")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {t("columns.updated")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === undefined && (
                <TableRow>
                  <TableCell colSpan={5} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-ink-3">
                    {search ? t("noResults", { text: search }) : t("noneHere")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((row) => (
                <TableRow key={row._id}>
                  <TableCell data-stack="wide">
                    <Link
                      href={`/estimates/${row._id}`}
                      className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-body font-medium text-ink group-hover:underline max-md:text-body-lg">
                        {row.title}
                      </span>
                      <span className="truncate text-meta tabular-nums text-ink-3">
                        {estimateCode(row.number, row.revision)}
                        <span className="md:hidden">
                          {" · "}
                          {row.clientName ?? t("noClient")}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-ink-2 md:table-cell">
                    {row.clientName ?? (
                      <span className="text-ink-3">{t("noClient")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EstimateStatusPill status={row.status} />
                  </TableCell>
                  <TableCell className="text-right text-body-lg font-medium tabular-nums">
                    {formatMoney(row.total, locale)}
                    <span className="ml-1 text-meta font-normal text-ink-3 md:hidden">
                      lei
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right text-ink-3 tabular-nums md:table-cell">
                    {formatDay(row.updatedAt, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!search && listed.status === "CanLoadMore" && (
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
      <TemplatesSheet
        open={browsing}
        onOpenChange={setBrowsing}
        onUse={(choice) => {
          setBrowsing(false);
          setStartFrom(choice);
          setCreating(true);
        }}
      />
      <NewEstimateDialog
        open={creating}
        onOpenChange={setCreating}
        initial={startFrom}
      />
    </>
  );
}

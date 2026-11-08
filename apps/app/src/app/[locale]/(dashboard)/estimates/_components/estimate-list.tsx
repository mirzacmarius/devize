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
import { FootAction } from "@/components/foot-action";
import { ListToolbar } from "@/components/list-toolbar";
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
        description={
          rows && !search && !isEmpty && listed.status === "Exhausted"
            ? `${t("count", { count: rows.length })} · ${t("allWithVatLower")}`
            : t("allWithVat")
        }
        actions={
          <>
            {/* On a phone they wait beside the search: here, the one main action. */}
            {!isEmpty && (
              <Button
                variant="outline"
                className="max-sm:hidden"
                onClick={() => setBrowsing(true)}
              >
                <LayoutTemplate aria-hidden />
                {tt("open")}
              </Button>
            )}
            <FootAction>
              <Button onClick={startBlank}>
                <Plus aria-hidden />
                {t("new")}
              </Button>
            </FootAction>
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
          {/* As on every list: the search first, where the table starts,
              then what filters it. */}
          <ListToolbar className="sm:justify-start">
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <SearchInput
                quiet
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="w-full sm:w-80"
              />
              <Button
                variant="outline"
                className="h-11 shrink-0 sm:hidden"
                onClick={() => setBrowsing(true)}
              >
                {tt("open")}
              </Button>
            </div>
            <SegmentedControl
              label={t("filterLabel")}
              className="max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center sm:p-0.5"
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
          </ListToolbar>
          <Table stack twoLine="below-xl">
            <TableHeader>
              <TableRow>
                {/* Where there's room the number has a column, under no title. */}
                <TableHead className="hidden w-24 xl:table-cell">
                  {t("columns.code")}
                </TableHead>
                <TableHead className="md:max-xl:pl-0">
                  {t("columns.estimate")}
                </TableHead>
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
                  <TableCell colSpan={6} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-ink-3">
                    {search ? t("noResults", { text: search }) : t("noneHere")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="hidden whitespace-nowrap xl:table-cell">
                    <span className="text-meta tabular-nums text-ink-3">
                      {estimateCode(row.number, row.revision)}
                    </span>
                  </TableCell>
                  <TableCell data-stack="wide" className="md:max-xl:pl-0">
                    <Link
                      href={`/estimates/${row._id}`}
                      className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-body font-medium text-ink group-hover:underline max-md:text-body-lg">
                        {row.title}
                      </span>
                      {/* Below xl the number has no column; on a phone it's
                          on the state's line. */}
                      <span className="truncate text-meta tabular-nums text-ink-3 max-md:hidden xl:hidden">
                        {estimateCode(row.number, row.revision)}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-meta text-ink-2 md:table-cell">
                    {row.clientName ?? (
                      <span className="text-ink-3">{t("noClient")}</span>
                    )}
                  </TableCell>
                  {/* On a phone a row's second line: its state, number and
                      client, with the total at its end. */}
                  <TableCell className="max-md:flex max-md:min-w-0 max-md:items-baseline">
                    <EstimateStatusPill status={row.status} />
                    {/* The client in full; the number is on the Deviz. */}
                    <span className="min-w-0 truncate text-meta text-ink-3 md:hidden">
                      {"\u00a0· "}
                      {row.clientName ?? t("noClient")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-body tabular-nums text-ink">
                    {formatMoney(row.total, locale)}
                  </TableCell>
                  <TableCell className="hidden text-right text-meta text-ink-3 tabular-nums md:table-cell">
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

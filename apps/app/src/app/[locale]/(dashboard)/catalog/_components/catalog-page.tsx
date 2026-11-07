"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  type BaseCategoryKey,
  baseCategoryByKey,
} from "@devize/backend/convex/catalog/baseCategories";
import { normalizeText } from "@devize/backend/convex/lib/text";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { toolbarField } from "@devize/ui/input";
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
import { TabsNav, TabsNavLink } from "@devize/ui/tabs-nav";
import { cn } from "@devize/ui/utils";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { NormCategorySelect } from "@/components/norm-category-select";
import { useNormSource } from "@/components/norm-source";
import { NormStatusPill } from "@/components/norm-status";
import { SearchInput } from "@/components/search-input";
import { formatDay, formatMoney, formatUnit, keepUnits } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

export type CatalogView = "catalog" | "own";

type NormRow = FunctionReturnType<
  typeof api.catalog.norms.listForOrganization
>[number];

/** A producer's norm its producer hasn't vouched for yet. */
function unconfirmed(norm: NormRow) {
  return norm.source === "manufacturer" && !norm.confirmed;
}

/** Whether a norm's code and name hold every word typed, diacritics aside. */
function matches(norm: NormRow, words: readonly string[]) {
  const text = normalizeText(
    [norm.code, norm.baseCode, norm.title].filter(Boolean).join(" "),
  );
  return words.every((word) => text.includes(word));
}

/**
 * The catalog: the public norms (Devize's base norms and the producers'),
 * and the firm's own norms with their drafts. Both search by code or by the
 * words of the work; the public ones are also browsed by category of the
 * base catalog, which narrows a search too.
 */
// The unit hangs after the number in a slot of its own, as on a Deviz, so the
// numbers and the head over them keep one edge.
const COST_UNIT =
  "ml-2 inline-block w-11 text-left text-meta text-ink-3 max-md:w-auto";

// Under the title only between a phone, which has its own line for it, and the
// width with a column for it.
const TABLET_ONLY = "hidden md:inline xl:hidden";

export function CatalogPage() {
  const t = useScopedI18n("catalog");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const { firm } = useFirm();
  // The list shown is in the address: Back from a norm's page returns to it,
  // and links to "?view=own" or "?category=zid" open the firm's own norms or
  // a category even on a page kept from an earlier visit (ADR 0029).
  const params = useSearchParams();
  const view: CatalogView = params.get("view") === "own" ? "own" : "catalog";
  const category = baseCategoryByKey(params.get("category"));
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const isOwn = view === "own";
  const browsing = !isOwn && !search && category !== undefined;

  const listed = usePaginatedQuery(
    api.catalog.norms.listPublished,
    !isOwn && !search && !category ? {} : "skip",
    { initialNumItems: 50 },
  );
  const inCategory = useQuery(
    api.catalog.norms.listBaseCategory,
    browsing ? { category: category.key } : "skip",
  );
  const found = useQuery(
    api.catalog.norms.search,
    !isOwn && search
      ? {
          organizationId: firm._id,
          text: search,
          category: category?.name,
          scope: "public",
          limit: 50,
        }
      : "skip",
  );
  const own = useQuery(
    api.catalog.norms.listForOrganization,
    isOwn ? { organizationId: firm._id } : "skip",
  );

  const words = normalizeText(search).split(" ").filter(Boolean);
  const rows: NormRow[] | undefined = isOwn
    ? own?.filter((norm) => matches(norm, words))
    : search
      ? found
      : browsing
        ? inCategory
        : listed.status === "LoadingFirstPage"
          ? undefined
          : listed.results;

  const changeCategory = (key: BaseCategoryKey | null) => {
    window.history.replaceState(
      null,
      "",
      key ? `/catalog?category=${key}` : "/catalog",
    );
  };

  const actions = (
    <>
      <Button variant="outline" asChild>
        <Link href="/producers">
          <Icons.Producers aria-hidden />
          {t("producers")}
        </Link>
      </Button>
      <Button asChild>
        <Link href="/catalog/new">
          <Plus aria-hidden />
          {t("newNorm")}
        </Link>
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("costNote")}
        actions={actions}
      />
      <section className="grid min-w-0 gap-3">
        {/* Where there's room the search stands on the tabs' line. */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TabsNav
            aria-label={t("views.label")}
            className="xl:col-span-2 xl:col-start-1 xl:row-start-1"
          >
            <TabsNavLink asChild active={!isOwn}>
              <Link replace href="/catalog" onClick={() => setText("")}>
                {t("views.catalog")}
              </Link>
            </TabsNavLink>
            <TabsNavLink asChild active={isOwn}>
              <Link
                replace
                href="/catalog?view=own"
                onClick={() => setText("")}
              >
                {t("views.own")}
              </Link>
            </TabsNavLink>
          </TabsNav>
          {/* On the tabs' line, their words and the controls' on one middle. */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:col-start-2 xl:row-start-1 xl:mt-1.5 xl:self-start">
            {!isOwn && (
              <NormCategorySelect
                label={t("categories.label")}
                allLabel={t("categories.all")}
                value={category?.key ?? null}
                onChange={changeCategory}
                className={cn("w-full sm:w-56", toolbarField)}
              />
            )}
            <SearchInput
              quiet
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:w-80 sm:max-xl:w-auto sm:max-xl:flex-1"
            />
          </div>
        </div>
        <div className="grid min-w-0 gap-4">
          {isOwn && !search && own?.length === 0 ? (
            <EmptyState
              icon={<Icons.Catalog />}
              title={t("ownEmptyTitle")}
              description={t("ownEmptyDescription")}
              action={
                <Button variant="outline" asChild>
                  <Link href="/catalog/new">{t("ownEmptyAction")}</Link>
                </Button>
              }
            />
          ) : (
            <Table stack twoLine>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.norm")}</TableHead>
                  {!isOwn && (
                    <TableHead className="hidden w-64 xl:table-cell">
                      {t("columns.source")}
                    </TableHead>
                  )}
                  {isOwn && <TableHead>{t("columns.status")}</TableHead>}
                  {isOwn && (
                    <TableHead className="hidden md:table-cell">
                      {t("columns.updated")}
                    </TableHead>
                  )}
                  <TableHead className="pr-[52px] text-right last:pr-[52px]">
                    {t("columns.cost")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows === undefined && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      data-stack="wide"
                      className="text-ink-3"
                    >
                      {tc("loading")}
                    </TableCell>
                  </TableRow>
                )}
                {rows?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      data-stack="wide"
                      className="text-ink-3"
                    >
                      {search && !isOwn && category ? (
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          {t("noResultsInCategory", {
                            category: category.name,
                            text: search,
                          })}
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => changeCategory(null)}
                          >
                            {t("searchAllCategories")}
                          </Button>
                        </span>
                      ) : search ? (
                        t("noResults", { text: search })
                      ) : category ? (
                        t("categoryEmpty", { category: category.name })
                      ) : (
                        t("catalogEmpty")
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {rows?.map((norm) => (
                  <TableRow key={norm._id}>
                    <TableCell data-stack="wide">
                      <Link
                        href={`/catalog/${norm._id}`}
                        className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="text-body font-medium text-ink group-hover:underline">
                          {keepUnits(norm.title)}
                        </span>
                        <span className="flex flex-wrap items-baseline gap-x-2 text-meta text-ink-3">
                          <span>
                            <span className="tabular-nums">
                              {norm.version > 1
                                ? `${norm.code} · v${norm.version}`
                                : norm.code}
                            </span>
                            {norm.category && ` · ${norm.category}`}
                            {/* The public list has a column for this where there's room. */}
                            <span className={isOwn ? undefined : TABLET_ONLY}>
                              {norm.source !== "base" &&
                                ` · ${norm.manufacturerName ?? normSource(norm)}`}
                              {unconfirmed(norm) && (
                                <span title={t("unconfirmedHint")}>
                                  {` · ${t("unconfirmed")}`}
                                </span>
                              )}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    {!isOwn && (
                      // On a phone it opens the line with the cost.
                      <TableCell className="md:max-xl:hidden">
                        <span
                          className={cn(
                            "block max-md:text-meta",
                            norm.source === "base"
                              ? "text-ink-3"
                              : "text-ink-2 max-md:text-ink-3",
                          )}
                        >
                          <span className="inline-block first-letter:uppercase">
                            {norm.manufacturerName ?? normSource(norm)}
                          </span>
                          {unconfirmed(norm) && (
                            <span
                              title={t("unconfirmedHint")}
                              className="text-ink-3"
                            >
                              {` · ${t("unconfirmed")}`}
                            </span>
                          )}
                        </span>
                      </TableCell>
                    )}
                    {isOwn && (
                      <TableCell>
                        <NormStatusPill status={norm.status} />
                      </TableCell>
                    )}
                    {isOwn && (
                      <TableCell className="hidden text-ink-3 tabular-nums md:table-cell">
                        {formatDay(norm.updatedAt, locale)}
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap text-right tabular-nums max-md:align-top">
                      {norm.referenceCost === undefined ? (
                        <>
                          <StatusPill tone="warning">{t("noCost")}</StatusPill>
                          <span className={cn(COST_UNIT, "max-md:hidden")} />
                        </>
                      ) : (
                        <>
                          {formatMoney(norm.referenceCost, locale)}
                          <span className={COST_UNIT}>
                            lei/{formatUnit(norm.unit, locale)}
                          </span>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isOwn &&
            !search &&
            !category &&
            listed.status === "CanLoadMore" && (
              <Button
                variant="ghost"
                className="justify-self-center"
                onClick={() => listed.loadMore(50)}
              >
                {tc("loadMore")}
              </Button>
            )}
        </div>
      </section>
    </>
  );
}

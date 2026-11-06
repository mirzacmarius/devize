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
import { SegmentedControl } from "@/components/segmented-control";
import { formatDay, formatMoney, formatUnit } from "@/lib/format";
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
  const columns = isOwn ? 5 : 4;

  const changeView = (next: CatalogView) => {
    setText("");
    window.history.replaceState(
      null,
      "",
      next === "own" ? "/catalog?view=own" : "/catalog",
    );
  };
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label={t("views.label")}
            value={view}
            onChange={changeView}
            options={[
              { value: "catalog", label: t("views.catalog") },
              { value: "own", label: t("views.own") },
            ]}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full">
            {!isOwn && (
              <NormCategorySelect
                label={t("categories.label")}
                allLabel={t("categories.all")}
                value={category?.key ?? null}
                onChange={changeCategory}
                className="w-full sm:w-56"
              />
            )}
            <SearchInput
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:w-80"
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
            <Table twoLine>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.norm")}</TableHead>
                  {!isOwn && (
                    <TableHead className="hidden lg:table-cell">
                      {t("columns.source")}
                    </TableHead>
                  )}
                  {isOwn && <TableHead>{t("columns.status")}</TableHead>}
                  {isOwn && (
                    <TableHead className="hidden sm:table-cell">
                      {t("columns.updated")}
                    </TableHead>
                  )}
                  <TableHead className="hidden sm:table-cell">
                    {t("columns.unit")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("columns.cost")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows === undefined && (
                  <TableRow>
                    <TableCell colSpan={columns} className="text-ink-3">
                      {tc("loading")}
                    </TableCell>
                  </TableRow>
                )}
                {rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns} className="text-ink-3">
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
                    <TableCell>
                      <Link
                        href={`/catalog/${norm._id}`}
                        className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="text-body font-medium text-ink group-hover:underline">
                          {norm.title}
                        </span>
                        <span className="text-meta text-ink-3">
                          <span className="tabular-nums">
                            {norm.version > 1
                              ? `${norm.code} · v${norm.version}`
                              : norm.code}
                          </span>
                          {norm.category && ` · ${norm.category}`}
                          {/* What its columns say on a wider screen. */}
                          <span className="sm:hidden">
                            {` · ${formatUnit(norm.unit, locale)}`}
                          </span>
                          <span className={isOwn ? undefined : "lg:hidden"}>
                            {norm.source !== "base" && ` · ${normSource(norm)}`}
                          </span>
                          {unconfirmed(norm) && (
                            // Under its producer where that column shows.
                            <span
                              className={cn(
                                "whitespace-nowrap",
                                !isOwn && "lg:hidden",
                              )}
                            >
                              {` · ${t("unconfirmed")}`}
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    {!isOwn && (
                      <TableCell className="hidden lg:table-cell">
                        <div className="grid justify-items-start gap-0.5">
                          <span className="text-ink-2">
                            {norm.source !== "base"
                              ? (norm.manufacturerName ?? normSource(norm))
                              : "–"}
                          </span>
                          {unconfirmed(norm) && (
                            <StatusPill
                              tone="draft"
                              title={t("unconfirmedHint")}
                            >
                              {t("unconfirmed")}
                            </StatusPill>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isOwn && (
                      <TableCell>
                        <NormStatusPill status={norm.status} />
                      </TableCell>
                    )}
                    {isOwn && (
                      <TableCell className="hidden text-ink-3 tabular-nums sm:table-cell">
                        {formatDay(norm.updatedAt, locale)}
                      </TableCell>
                    )}
                    <TableCell className="hidden text-ink-2 sm:table-cell">
                      {formatUnit(norm.unit, locale)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {norm.referenceCost === undefined ? (
                        <StatusPill tone="warning">{t("noCost")}</StatusPill>
                      ) : (
                        formatMoney(norm.referenceCost, locale)
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

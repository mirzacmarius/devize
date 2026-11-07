"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  type BaseCategoryKey,
  baseCategoryByKey,
} from "@devize/backend/convex/catalog/baseCategories";
import { normalizeText } from "@devize/backend/convex/lib/text";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { toolbarField } from "@devize/ui/input";
import { PageHeader } from "@devize/ui/page-header";
import { StatusPill } from "@devize/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableGroupRow,
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
import { Fragment, type ReactNode, useDeferredValue, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { FootAction } from "@/components/foot-action";
import { ListToolbar } from "@/components/list-toolbar";
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

// Browsing everything, the list comes in two parts, each with its own heading.
type Part = "producers" | "base";

/** A producer's norm its producer hasn't vouched for yet. */
function unconfirmed(norm: NormRow) {
  return norm.source === "manufacturer" && !norm.confirmed;
}

function normCode(norm: NormRow) {
  return norm.version > 1 ? `${norm.code} · v${norm.version}` : norm.code;
}

/** Whether a norm's code and name hold every word typed, diacritics aside. */
function matches(norm: NormRow, words: readonly string[]) {
  const text = normalizeText(
    [norm.code, norm.baseCode, norm.title].filter(Boolean).join(" "),
  );
  return words.every((word) => text.includes(word));
}

// Under the title only between a phone, which has its own line for it, and the
// width with a column for it.
const TABLET_ONLY = "hidden md:inline xl:hidden";

/**
 * The catalog: the public norms (the producers', then Devize's base norms by
 * category of work), and the firm's own norms with their drafts. Both search by
 * code or by the words of the work; the public ones are also browsed by category
 * of the base catalog, which narrows a search too.
 */
export function CatalogPage() {
  const t = useScopedI18n("catalog");
  const tc = useScopedI18n("common");
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
  const parts =
    !isOwn && !search && !category && rows && rows.length > 0
      ? (["producers", "base"] as const)
          .map((part: Part) => ({
            part,
            rows: rows.filter(
              (norm) => (norm.source === "base") === (part === "base"),
            ),
          }))
          .filter((entry) => entry.rows.length > 0)
      : undefined;
  // The heading says it for them when it holds for all of them.
  const allUnconfirmed = (norms: NormRow[]) => norms.every(unconfirmed);
  const producerNorms = parts?.find(
    (entry) => entry.part === "producers",
  )?.rows;

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
      <FootAction>
        <Button asChild>
          <Link href="/catalog/new">
            <Plus aria-hidden />
            {t("newNorm")}
          </Link>
        </Button>
      </FootAction>
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
        <TabsNav aria-label={t("views.label")}>
          <TabsNavLink asChild active={!isOwn}>
            <Link replace href="/catalog" onClick={() => setText("")}>
              {t("views.catalog")}
            </Link>
          </TabsNavLink>
          <TabsNavLink asChild active={isOwn}>
            <Link replace href="/catalog?view=own" onClick={() => setText("")}>
              {t("views.own")}
            </Link>
          </TabsNavLink>
        </TabsNav>
        <ListToolbar>
          {!isOwn && (
            <NormCategorySelect
              label={t("categories.label")}
              allLabel={t("categories.all")}
              value={category?.key ?? null}
              onChange={changeCategory}
              className={cn("w-full sm:w-56", toolbarField)}
            />
          )}
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
            <SearchInput
              quiet
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:max-w-xs"
            />
          </div>
        </ListToolbar>
        <div className="grid min-w-0 gap-6">
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
          ) : parts ? (
            parts.map((entry) => (
              <Card key={entry.part}>
                <CardHeader>
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
                    <CardTitle>{t(`parts.${entry.part}`)}</CardTitle>
                    {entry.part === "base" ? (
                      <span className="text-meta text-ink-3">
                        {t("parts.baseNote")}
                      </span>
                    ) : (
                      allUnconfirmed(entry.rows) && (
                        <StatusPill
                          tone="draft"
                          title={t("parts.producersNoteLong")}
                        >
                          {t("parts.producersNote")}
                        </StatusPill>
                      )
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <NormsTable
                    rows={entry.rows}
                    isOwn={false}
                    part={entry.part}
                    allUnconfirmed={
                      entry.part === "producers" && allUnconfirmed(entry.rows)
                    }
                  />
                </CardContent>
              </Card>
            ))
          ) : (
            <NormsTable
              rows={rows}
              isOwn={isOwn}
              empty={
                search && !isOwn && category ? (
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
                )
              }
            />
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
          {!isOwn &&
            rows?.some(unconfirmed) &&
            !(producerNorms && allUnconfirmed(producerNorms)) && (
              <p className="m-0 text-meta text-ink-3">{t("unconfirmedNote")}</p>
            )}
        </div>
      </section>
    </>
  );
}

/**
 * A list of norms. The producers' part names each norm's producer; the base part
 * is grouped by category of work, whose name its rows don't repeat.
 */
function NormsTable({
  rows,
  isOwn,
  part,
  allUnconfirmed = false,
  empty,
}: {
  rows: NormRow[] | undefined;
  isOwn: boolean;
  part?: Part;
  // The heading above says it, so the rows don't.
  allUnconfirmed?: boolean;
  empty?: ReactNode;
}) {
  const t = useScopedI18n("catalog");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const showSource = !isOwn && part !== "base";
  const showState = showSource && !allUnconfirmed;
  let lastCategory: string | undefined;

  return (
    <Table stack twoLine={isOwn ? true : "below-xl"}>
      <TableHeader>
        <TableRow>
          {/* Where there's room the public list is one line a row. */}
          {!isOwn && (
            <TableHead className="hidden w-28 xl:table-cell">
              {t("columns.code")}
            </TableHead>
          )}
          <TableHead className="md:max-xl:pl-0">{t("columns.norm")}</TableHead>
          {showSource && (
            <TableHead className="hidden w-[184px] xl:table-cell">
              {t("columns.source")}
            </TableHead>
          )}
          {showState && (
            <TableHead className="hidden w-[128px] xl:table-cell">
              {t("columns.status")}
            </TableHead>
          )}
          {isOwn && <TableHead>{t("columns.status")}</TableHead>}
          {isOwn && (
            <TableHead className="hidden md:table-cell">
              {t("columns.updated")}
            </TableHead>
          )}
          <TableHead className="hidden w-14 md:table-cell">
            {t("columns.unit")}
          </TableHead>
          <TableHead className="w-32 text-right">{t("columns.cost")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows === undefined && (
          <TableRow>
            <TableCell colSpan={7} data-stack="wide" className="text-ink-3">
              {tc("loading")}
            </TableCell>
          </TableRow>
        )}
        {rows?.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} data-stack="wide" className="text-ink-3">
              {empty}
            </TableCell>
          </TableRow>
        )}
        {rows?.map((norm) => {
          const group =
            part === "base" ? (norm.category ?? normSource(norm)) : undefined;
          const opens = group !== undefined && group !== lastCategory;
          lastCategory = group;
          return (
            <Fragment key={norm._id}>
              {opens && (
                <TableGroupRow ruled>
                  <TableCell colSpan={7} data-stack="wide">
                    <span className="inline-block first-letter:uppercase">
                      {group}
                    </span>
                  </TableCell>
                </TableGroupRow>
              )}
              <TableRow>
                {!isOwn && (
                  <TableCell className="hidden whitespace-nowrap xl:table-cell">
                    <span className="text-meta tabular-nums text-ink-3">
                      {normCode(norm)}
                    </span>
                  </TableCell>
                )}
                <TableCell data-stack="wide" className="md:max-xl:pl-0">
                  <Link
                    href={`/catalog/${norm._id}`}
                    className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-body font-[450] text-ink group-hover:underline">
                      {keepUnits(norm.title)}
                    </span>
                    <span
                      className={cn(
                        "flex flex-wrap items-baseline gap-x-2 text-meta text-ink-3",
                        !isOwn && "xl:hidden",
                        // On a phone it opens the line with the cost.
                        part && "max-md:hidden",
                      )}
                    >
                      <span>
                        <span className="tabular-nums">{normCode(norm)}</span>
                        {!part && norm.category && ` · ${norm.category}`}
                        {/* The public list has a column for this where there's room. */}
                        {part !== "base" && (
                          <span className={isOwn ? undefined : TABLET_ONLY}>
                            {norm.source !== "base" &&
                              ` · ${norm.manufacturerName ?? normSource(norm)}`}
                            {unconfirmed(norm) && !allUnconfirmed && (
                              <span title={t("unconfirmedHint")}>
                                {` · ${t("unconfirmed")}`}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                {part === "base" && (
                  // On a phone it opens the line with the cost.
                  <TableCell className="text-meta tabular-nums text-ink-3 md:hidden">
                    {normCode(norm)}
                  </TableCell>
                )}
                {showSource && (
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
                      {part && (
                        <span className="tabular-nums md:hidden">
                          {normCode(norm)}
                          {" · "}
                        </span>
                      )}
                      {norm.manufacturerId ? (
                        <Link
                          href={`/producers/${norm.manufacturerId}`}
                          className="rounded-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {norm.manufacturerName ?? normSource(norm)}
                        </Link>
                      ) : (
                        <span className="inline-block first-letter:uppercase">
                          {norm.manufacturerName ?? normSource(norm)}
                        </span>
                      )}
                      {unconfirmed(norm) && !allUnconfirmed && (
                        <span
                          title={t("unconfirmedHint")}
                          className="text-ink-3 xl:hidden"
                        >
                          {` · ${t("unconfirmed")}`}
                        </span>
                      )}
                    </span>
                  </TableCell>
                )}
                {showState && (
                  <TableCell className="hidden xl:table-cell">
                    {unconfirmed(norm) && (
                      <StatusPill tone="draft" title={t("unconfirmedHint")}>
                        {t("unconfirmedState")}
                      </StatusPill>
                    )}
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
                <TableCell className="hidden whitespace-nowrap md:table-cell">
                  <span className="text-meta text-ink-3">
                    {formatUnit(norm.unit, locale)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums max-md:align-top">
                  {norm.referenceCost === undefined ? (
                    <StatusPill tone="warning">{t("noCost")}</StatusPill>
                  ) : (
                    <>
                      <span className="font-medium">
                        {formatMoney(norm.referenceCost, locale)}
                      </span>
                      {/* A phone has no heads to say it. */}
                      <span className="ml-2 text-meta text-ink-3 md:hidden">
                        lei/{formatUnit(norm.unit, locale)}
                      </span>
                    </>
                  )}
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

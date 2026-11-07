"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { normalizeText } from "@devize/backend/convex/lib/text";
import { Breadcrumb, BreadcrumbLink } from "@devize/ui/breadcrumb";
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
import { useQuery } from "convex/react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { SearchInput } from "@/components/search-input";
import { useScopedI18n } from "@/locales/client";

/**
 * The Producători whose norms are in the catalog, each opening its profile:
 * the norms and products it publishes and whether it runs the profile itself.
 */
export function ProducersPage() {
  const t = useScopedI18n("producers");
  const tCatalog = useScopedI18n("catalog");
  const tc = useScopedI18n("common");
  const producers = useQuery(api.producers.profiles.list);
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const words = normalizeText(search).split(" ").filter(Boolean);
  const managed = producers?.filter((producer) => producer.claimed).length ?? 0;
  const rows = producers?.filter((producer) => {
    const name = normalizeText(producer.name);
    return words.every((word) => name.includes(word));
  });

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={t("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/catalog">{tCatalog("title")}</Link>
            </BreadcrumbLink>
          </Breadcrumb>
        }
        title={t("title")}
        description={
          producers && producers.length > 0
            ? [
                t("count", { count: producers.length }),
                managed > 0 && t("managedCount", { count: managed }),
              ]
                .filter(Boolean)
                .join(" · ")
            : "\u00a0"
        }
        actions={
          producers?.length !== 0 && (
            <SearchInput
              quiet
              tall
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-48 max-sm:hidden md:w-64 xl:w-80"
            />
          )
        }
      />
      {producers?.length === 0 ? (
        <EmptyState icon={<Icons.Producers />} title={t("empty")} />
      ) : (
        <section className="grid min-w-0 gap-3">
          {/* From a tablet up it stands in the page's head. */}
          <ListToolbar className="sm:hidden">
            <SearchInput
              quiet
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full"
            />
          </ListToolbar>
          <Table stack>
            <TableHeader>
              <TableRow>
                <TableHead className="xl:w-[42%]">
                  {t("columns.name")}
                </TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[30%]">
                  {t("columns.categories")}
                </TableHead>
                <TableHead className="hidden w-24 text-right md:table-cell xl:w-[14%]">
                  {t("columns.edition")}
                </TableHead>
                <TableHead className="hidden w-20 text-right md:table-cell xl:w-[14%]">
                  {t("columns.norms")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === undefined && (
                <TableRow>
                  <TableCell colSpan={4} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-ink-3">
                    {t("noResults", { text: search })}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((producer) => {
                const norms = producer.moreNorms
                  ? t("moreNorms", { count: producer.normCount })
                  : producer.normCount;
                return (
                  // The whole row leads to the profile.
                  <TableRow
                    key={producer._id}
                    className="group/row relative transition-colors hover:bg-tile md:max-xl:[&>td]:h-16 xl:[&>td]:py-[11px] xl:[&>td]:align-baseline"
                  >
                    <TableCell data-stack="wide">
                      <Link
                        href={`/producers/${producer._id}`}
                        className="grid gap-y-0.5 rounded-xs after:absolute xl:gap-y-0 after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                      >
                        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
                          <span className="min-w-0 truncate text-body font-medium text-ink">
                            {producer.name}
                          </span>
                          {producer.claimed && (
                            <StatusPill tone="success">
                              {t("managed")}
                            </StatusPill>
                          )}
                        </span>
                        {/* Where there's room they have a column. */}
                        <span className="truncate text-meta text-ink-3 xl:hidden">
                          {producer.categories.join(" · ")}
                          {/* On a phone its columns move here. */}
                          <span className="md:hidden">
                            {producer.categories.length > 0 && " · "}
                            {t("normCount", { count: norms })}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-meta text-ink-2 xl:table-cell">
                      <span className="line-clamp-1">
                        {producer.categories.join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right text-meta tabular-nums text-ink-2 md:table-cell">
                      {producer.edition}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {norms}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}
    </>
  );
}

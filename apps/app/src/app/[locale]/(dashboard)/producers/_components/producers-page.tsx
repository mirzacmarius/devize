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
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Nil } from "@/components/nil";
import { SearchInput } from "@/components/search-input";
import { initials } from "@/lib/initials";
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

  const searchInput = (className: string) => (
    <SearchInput
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder={t("searchPlaceholder")}
      aria-label={t("searchPlaceholder")}
      className={className}
    />
  );

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
          producers?.length ? searchInput("w-80 max-sm:hidden") : undefined
        }
      />
      {producers?.length === 0 ? (
        <EmptyState icon={<Icons.Producers />} title={t("empty")} />
      ) : (
        <section className="grid min-w-0 gap-3">
          {searchInput("w-full sm:hidden")}
          <Table stack>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead className="hidden w-24 text-right md:table-cell">
                  {t("columns.edition")}
                </TableHead>
                <TableHead className="hidden w-20 text-right md:table-cell">
                  {t("columns.norms")}
                </TableHead>
                <TableHead className="hidden w-10 md:table-cell" />
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
                    className="group/row relative transition-colors hover:bg-tile md:[&>td]:h-[60px]"
                  >
                    <TableCell data-stack="wide">
                      <Link
                        href={`/producers/${producer._id}`}
                        className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 rounded-xs after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                      >
                        <span
                          aria-hidden
                          className="row-span-2 grid size-8 place-items-center rounded-md bg-tile text-[12px] font-medium leading-4 text-ink-2"
                        >
                          {initials(producer.name)}
                        </span>
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
                        <span className="col-start-2 truncate text-meta text-ink-3">
                          {producer.categories.join(" · ")}
                          {/* On a phone its columns move here. */}
                          <span className="md:hidden">
                            {producer.categories.length > 0 && " · "}
                            {t("normCount", { count: norms })}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-ink-2 md:table-cell">
                      {producer.edition ?? <Nil />}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {norms}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ChevronRight
                        aria-hidden
                        className="-mr-[5px] ml-auto size-4 text-ink-3"
                      />
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

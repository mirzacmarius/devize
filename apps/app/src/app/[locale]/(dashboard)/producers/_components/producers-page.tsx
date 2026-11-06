"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { normalizeText } from "@devize/backend/convex/lib/text";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
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
  const rows = producers?.filter((producer) => {
    const name = normalizeText(producer.name);
    return words.every((word) => name.includes(word));
  });

  const hasEdition = producers?.some((producer) => producer.edition);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={t("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/catalog">{tCatalog("title")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{t("title")}</BreadcrumbPage>
          </Breadcrumb>
        }
        title={t("title")}
        description={t("description")}
      />
      {producers?.length === 0 ? (
        <EmptyState icon={<Icons.Producers />} title={t("empty")} />
      ) : (
        <section className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-meta tabular-nums text-ink-3">
              {rows !== undefined && t("count", { count: rows.length })}
            </p>
            <SearchInput
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:max-w-xs"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead className="w-24 text-right">
                  {t("columns.norms")}
                </TableHead>
                {hasEdition && (
                  <TableHead className="hidden w-44 pl-10 md:table-cell">
                    {t("columns.edition")}
                  </TableHead>
                )}
                <TableHead className="hidden w-44 md:table-cell">
                  {t("columns.profile")}
                </TableHead>
                <TableHead className="w-6" />
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
                    {t("noResults", { text: search })}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((producer) => (
                // The whole row opens the profile.
                <TableRow key={producer._id} className="relative">
                  <TableCell>
                    <Link
                      href={`/producers/${producer._id}`}
                      className="rounded-xs text-body font-medium text-ink after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {producer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink">
                    {producer.moreNorms
                      ? t("moreNorms", { count: producer.normCount })
                      : producer.normCount}
                  </TableCell>
                  {hasEdition && (
                    <TableCell className="hidden pl-10 text-ink-2 md:table-cell">
                      {producer.edition ?? "–"}
                    </TableCell>
                  )}
                  <TableCell className="hidden md:table-cell">
                    <StatusPill
                      tone={producer.claimed ? "success" : "draft"}
                      plain
                    >
                      {producer.claimed ? t("claimed") : t("unclaimed")}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <ChevronRight
                      aria-hidden
                      className="ml-auto size-4 text-ink-3"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </>
  );
}

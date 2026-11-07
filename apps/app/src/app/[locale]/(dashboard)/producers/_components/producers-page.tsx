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
        description={t("description")}
      />
      {producers?.length === 0 ? (
        <EmptyState icon={<Icons.Producers />} title={t("empty")} />
      ) : (
        <section className="grid min-w-0 gap-3">
          <SearchInput
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full sm:max-w-xs"
          />
          {rows === undefined && (
            <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
          )}
          {rows?.length === 0 && (
            <p className="m-0 text-body text-ink-3">
              {t("noResults", { text: search })}
            </p>
          )}
          {rows !== undefined && rows.length > 0 && (
            <Table stack>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("columns.edition")}
                  </TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("columns.norms")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((producer) => {
                  const norms = producer.moreNorms
                    ? t("moreNorms", { count: producer.normCount })
                    : producer.normCount;
                  return (
                    <TableRow key={producer._id}>
                      <TableCell data-stack="wide">
                        <Link
                          href={`/producers/${producer._id}`}
                          className="rounded-xs text-body font-medium text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {producer.name}
                        </Link>
                        {producer.edition && (
                          <span className="block text-meta tabular-nums text-ink-3 md:hidden">
                            {t("edition", { edition: producer.edition })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden tabular-nums text-ink-2 md:table-cell">
                        {producer.edition}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          tone={producer.claimed ? "success" : "draft"}
                        >
                          {producer.claimed ? t("claimed") : t("unclaimed")}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink">
                        <span className="md:hidden">
                          {t("normCount", { count: norms })}
                        </span>
                        <span className="max-md:hidden">{norms}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </>
  );
}

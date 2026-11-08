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
 * The Producători whose norms are in the catalog, as a directory: each row says
 * what it covers and opens its profile, with the norms and products it publishes
 * and whether it runs the profile itself.
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
            : " "
        }
      />
      {producers?.length === 0 ? (
        <EmptyState icon={<Icons.Producers />} title={t("empty")} />
      ) : (
        <section className="grid min-w-0 gap-3">
          {/* What narrows the list, under the head as on every list; with
              nothing to filter, the search starts where the table does. */}
          <ListToolbar>
            <SearchInput
              quiet
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:max-w-xs"
            />
          </ListToolbar>
          {rows === undefined && (
            <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
          )}
          {rows?.length === 0 && (
            <p className="m-0 text-body text-ink-3">
              {t("noResults", { text: search })}
            </p>
          )}
          {rows && rows.length > 0 && (
            // As wide as what it says, so the counts that end each row stand
            // near the name they belong to; on a phone, the page's width.
            <Table stack className="md:w-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("columns.categories")}
                  </TableHead>
                  {/* The counts end the row, a step off the words. */}
                  <TableHead className="text-right md:pl-10">
                    {t("columns.edition")}
                  </TableHead>
                  <TableHead className="text-right md:pl-10">
                    {t("columns.norms")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((producer) => (
                  <TableRow key={producer._id} className="relative">
                    <TableCell data-stack="wide">
                      {/* As wide as its name, up to 20rem. */}
                      <div className="grid min-w-0 gap-y-0.5 md:max-w-[20rem]">
                        {/* A managed profile is said beside the name. */}
                        <span className="flex min-w-0 items-baseline gap-3">
                          {/* The whole row opens the profile. */}
                          <Link
                            href={`/producers/${producer._id}`}
                            className="min-w-0 truncate rounded-xs text-body font-medium text-ink before:absolute before:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:text-body-lg"
                          >
                            {producer.name}
                          </Link>
                          {producer.claimed && (
                            <StatusPill
                              tone="success"
                              title={t("managed")}
                              className="shrink-0"
                            >
                              {t("managedShort")}
                            </StatusPill>
                          )}
                        </span>
                        {/* A phone has no column for what it makes: it goes under
                            the name. */}
                        <span className="min-w-0 truncate text-meta text-ink-3 md:hidden">
                          {producer.categories.join(" · ")}
                        </span>
                      </div>
                    </TableCell>
                    {/* A phone has no heads: the two say what they are. */}
                    <TableCell className="text-meta tabular-nums text-ink-3 md:hidden">
                      {producer.moreNorms
                        ? t("normCountMore", { count: producer.normCount })
                        : t("normCount", { count: producer.normCount })}
                      {" · "}
                      {t("edition", { edition: producer.edition })}
                    </TableCell>
                    <TableCell className="hidden text-ink-2 md:table-cell">
                      <span className="block max-w-[22rem] truncate">
                        {producer.categories.join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-ink-2 md:table-cell md:pl-10">
                      {producer.edition}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell md:pl-10">
                      {producer.normCount}
                      {producer.moreNorms && "+"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </>
  );
}

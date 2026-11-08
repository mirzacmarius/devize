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

/** A producer has no logo with us: its initials, on a tile like a firm's. */
function ProducerMark({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="row-span-2 grid size-9 place-items-center self-center rounded-md bg-muted text-meta font-medium text-ink-2"
    >
      {initials}
    </span>
  );
}

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
            : " "
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
          {rows === undefined && (
            <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
          )}
          {rows?.length === 0 && (
            <p className="m-0 text-body text-ink-3">
              {t("noResults", { text: search })}
            </p>
          )}
          {rows && rows.length > 0 && (
            <Table stack className="md:[&>tbody>tr>td]:h-14">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">{t("columns.name")}</TableHead>
                  <TableHead className="w-20 text-right">
                    {t("columns.norms")}
                  </TableHead>
                  <TableHead className="w-28 pl-8">
                    {t("columns.edition")}
                  </TableHead>
                  <TableHead>{t("columns.profile")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((producer) => (
                  <TableRow key={producer._id} className="relative">
                    <TableCell data-stack="wide" className="md:max-w-0">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                        <ProducerMark name={producer.name} />
                        {/* The whole row opens the profile. */}
                        <Link
                          href={`/producers/${producer._id}`}
                          className="min-w-0 truncate rounded-xs text-body font-medium text-ink before:absolute before:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:text-body-lg"
                        >
                          {producer.name}
                        </Link>
                        <span className="min-w-0 truncate text-meta text-ink-3">
                          {producer.categories.join(" · ")}
                        </span>
                      </div>
                    </TableCell>
                    {/* A phone has no heads: the two say what they are. */}
                    <TableCell className="text-meta tabular-nums text-ink-3 max-md:!pl-12 md:hidden">
                      {producer.moreNorms
                        ? t("normCountMore", { count: producer.normCount })
                        : t("normCount", { count: producer.normCount })}
                      {" · "}
                      {t("edition", { edition: producer.edition })}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {producer.normCount}
                      {producer.moreNorms && "+"}
                    </TableCell>
                    <TableCell className="hidden pl-8 tabular-nums text-ink-2 md:table-cell">
                      {producer.edition}
                    </TableCell>
                    <TableCell className="max-md:empty:hidden">
                      {producer.claimed && (
                        <StatusPill tone="success" title={t("managed")}>
                          {t("managedShort")}
                        </StatusPill>
                      )}
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

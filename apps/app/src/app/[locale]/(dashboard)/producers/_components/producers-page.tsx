"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { normalizeText } from "@devize/backend/convex/lib/text";
import { Breadcrumb, BreadcrumbLink } from "@devize/ui/breadcrumb";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { StatusPill } from "@devize/ui/status-pill";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { SearchInput } from "@/components/search-input";
import { useScopedI18n } from "@/locales/client";

/**
 * The Producători whose norms are in the catalog, as a directory: each entry
 * says what it covers and opens its profile, with the norms and products it
 * publishes and whether it runs the profile itself.
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
          <ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2 xl:grid-cols-3">
            {rows?.map((producer) => (
              <li key={producer._id} className="border-t border-border">
                <Link
                  href={`/producers/${producer._id}`}
                  className="group -mx-2 grid h-full content-start gap-y-0.5 rounded-md px-2 pb-5 pt-3 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate text-body font-medium text-ink max-md:text-body-lg">
                      {producer.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-meta tabular-nums text-ink-2">
                      {t("normCount", {
                        count: producer.moreNorms
                          ? t("moreNorms", { count: producer.normCount })
                          : producer.normCount,
                      })}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-meta text-ink-3">
                    {producer.categories.join(" · ")}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-2 text-meta tabular-nums text-ink-3">
                    {t("edition", { edition: producer.edition })}
                    {producer.claimed && (
                      <StatusPill tone="success">{t("managed")}</StatusPill>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

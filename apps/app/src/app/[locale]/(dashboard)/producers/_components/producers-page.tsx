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
      />
      {producers?.length === 0 ? (
        <EmptyState icon={<Icons.Producers />} title={t("empty")} />
      ) : (
        <section className="grid min-w-0 gap-3">
          <div className="flex justify-end">
            <SearchInput
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full sm:w-80"
            />
          </div>
          {rows === undefined && (
            <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
          )}
          {rows?.length === 0 && (
            <p className="m-0 text-body text-ink-3">
              {t("noResults", { text: search })}
            </p>
          )}
          {rows !== undefined && rows.length > 0 && (
            <ul className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((producer) => {
                const norms = producer.moreNorms
                  ? t("moreNorms", { count: producer.normCount })
                  : producer.normCount;
                return (
                  <li key={producer._id} className="border-t border-border">
                    <Link
                      href={`/producers/${producer._id}`}
                      className="-mx-2 flex min-h-[72px] items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-caption font-medium text-ink-2"
                      >
                        {initials(producer.name)}
                      </span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="flex min-w-0 items-baseline justify-between gap-3">
                          <span className="truncate text-body font-medium text-ink">
                            {producer.name}
                          </span>
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
                        <span className="truncate text-meta tabular-nums text-ink-3">
                          {t("normCount", { count: norms })}
                          {producer.edition &&
                            ` · ${t("edition", { edition: producer.edition })}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

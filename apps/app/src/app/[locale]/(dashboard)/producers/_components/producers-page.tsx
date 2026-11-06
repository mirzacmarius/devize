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
          {rows === undefined && (
            <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
          )}
          {rows?.length === 0 && (
            <p className="m-0 text-body text-ink-3">
              {t("noResults", { text: search })}
            </p>
          )}
          <ul className="m-0 grid list-none gap-x-3 p-0 sm:grid-cols-2 sm:gap-y-3 xl:grid-cols-3">
            {rows?.map((producer) => (
              <li key={producer._id}>
                <Link
                  href={`/producers/${producer._id}`}
                  className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 border-t border-border py-3 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-full sm:rounded-lg sm:border sm:border-card-border sm:p-4"
                >
                  <span
                    aria-hidden
                    className="grid size-8 place-items-center rounded-sm bg-tile text-[11px] font-semibold tracking-[0.02em] text-ink-2"
                  >
                    {initials(producer.name)}
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-body font-medium text-ink">
                        {producer.name}
                      </span>
                      {producer.claimed && (
                        <StatusPill
                          tone="success"
                          plain
                          className="shrink-0 self-center"
                        >
                          {t("claimed")}
                        </StatusPill>
                      )}
                    </span>
                    <span className="truncate text-meta tabular-nums text-ink-3">
                      {t("normCount", {
                        count: producer.moreNorms
                          ? t("moreNorms", { count: producer.normCount })
                          : producer.normCount,
                      })}
                      {producer.edition &&
                        ` · ${t("edition", { edition: producer.edition })}`}
                    </span>
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

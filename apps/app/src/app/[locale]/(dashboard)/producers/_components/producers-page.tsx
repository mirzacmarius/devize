"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { normalizeText } from "@devize/backend/convex/lib/text";
import { Breadcrumb, BreadcrumbLink } from "@devize/ui/breadcrumb";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { StatusPill } from "@devize/ui/status-pill";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
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
          <ul className="m-0 grid list-none p-0 sm:grid-cols-2 sm:gap-x-12">
            {rows?.map((producer) => (
              <li key={producer._id} className="border-t border-border">
                <Link
                  href={`/producers/${producer._id}`}
                  className="group -mx-2 grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto_16px] items-center gap-x-3 rounded-md px-2 py-3 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden
                    className="grid size-10 place-items-center rounded-md bg-muted text-[13px] font-medium tracking-[0.02em] text-ink-2"
                  >
                    {initials(producer.name)}
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-body font-medium text-ink">
                      {producer.name}
                    </span>
                    {producer.edition && (
                      <span className="truncate text-meta tabular-nums text-ink-3">
                        {t("edition", { edition: producer.edition })}
                      </span>
                    )}
                  </span>
                  <span className="grid justify-items-end gap-0.5">
                    <span className="text-body tabular-nums text-ink">
                      {t("normCount", {
                        count: producer.moreNorms
                          ? t("moreNorms", { count: producer.normCount })
                          : producer.normCount,
                      })}
                    </span>
                    <StatusPill tone={producer.claimed ? "success" : "draft"}>
                      {producer.claimed ? t("claimed") : t("unclaimed")}
                    </StatusPill>
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

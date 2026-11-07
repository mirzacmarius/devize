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
 * The Producători whose norms are in the catalog, as a directory: each card
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
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
            {rows?.map((producer) => (
              <li key={producer._id} className="grid min-w-0">
                <Link
                  href={`/producers/${producer._id}`}
                  className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_1fr] gap-x-3 rounded-lg border border-card-border p-4 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ProducerMark name={producer.name} />
                  <span className="min-w-0 truncate text-title-card text-ink">
                    {producer.name}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="-mr-1 size-4 self-center text-ink-3 transition-colors group-hover:text-ink"
                  />
                  <span className="col-span-2 col-start-2 line-clamp-2 min-w-0 text-meta text-ink-3">
                    {producer.categories.join(" · ")}
                  </span>
                  <span className="col-span-2 col-start-2 mt-3 flex flex-wrap items-baseline justify-between gap-x-3 self-end text-meta tabular-nums text-ink-2">
                    <span>
                      {producer.moreNorms
                        ? t("normCountMore", { count: producer.normCount })
                        : t("normCount", { count: producer.normCount })}
                      {" · "}
                      {t("edition", { edition: producer.edition })}
                    </span>
                    {producer.claimed && (
                      <StatusPill tone="success" title={t("managed")}>
                        {t("managedShort")}
                      </StatusPill>
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

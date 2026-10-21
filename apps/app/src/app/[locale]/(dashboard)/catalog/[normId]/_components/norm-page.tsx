"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useNormSource } from "@/components/norm-source";
import { NormStatusPill } from "@/components/norm-status";
import { formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { AboutCard } from "./about-card";
import { DatasheetCard } from "./datasheet-card";
import { NormActions } from "./norm-actions";
import { ResourcesCard } from "./resources-card";
import { ScopeCard } from "./scope-card";
import type { Norm } from "./types";
import { VersionsCard } from "./versions-card";

/**
 * The fișa normei: what one unit of work consumes at the norm's reference
 * prices, what the work covers and where the norm comes from. A firm's own
 * drafts are edited, published and versioned from here; a catalog norm is
 * copied into the firm's own norms to adjust it.
 */
export function NormPage({ normId }: { normId: Id<"norms"> }) {
  const t = useScopedI18n("norm");
  const tCatalog = useScopedI18n("catalog");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const norm = useQuery(api.catalog.norms.get, { normId });

  if (norm === undefined) {
    return <p className="m-0 text-body text-ink-3">{t("loading")}</p>;
  }

  const own = norm.source === "organization";
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={t("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href={own ? "/catalog?view=own" : "/catalog"}>
                {tCatalog("title")}
              </Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{norm.code}</BreadcrumbPage>
          </Breadcrumb>
        }
        title={norm.code}
        status={
          // Every norm in the public catalog is published; say so only of
          // the firm's own, and of the versions that are not.
          (own || norm.status !== "published") && (
            <NormStatusPill status={norm.status} />
          )
        }
        description={[
          norm.title,
          normSource(norm),
          t("perUnit", { unit: formatUnit(norm.unit, locale) }),
        ].join(" · ")}
        actions={<NormActions norm={norm} />}
      />
      <NormNotice norm={norm} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
        <div className="grid min-w-0 gap-6">
          <ResourcesCard norm={norm} />
          <ScopeCard norm={norm} />
        </div>
        <div className="grid min-w-0 gap-6">
          {norm.datasheet && (
            <DatasheetCard
              datasheet={norm.datasheet}
              sourcePages={norm.sourcePages ?? []}
            />
          )}
          <AboutCard norm={norm} />
          <VersionsCard norm={norm} />
        </div>
      </div>
    </>
  );
}

/** What this version's state means for the devize, when it is not plain published. */
function NormNotice({ norm }: { norm: Norm }) {
  const t = useScopedI18n("norm");
  const newer = norm.status === "superseded" ? norm.latestVersionId : undefined;
  const notice =
    norm.status === "draft"
      ? t("notices.draft")
      : norm.status === "review"
        ? t("notices.review")
        : norm.status === "archived"
          ? t("notices.archived")
          : newer && t("notices.newer");
  if (!notice) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-border bg-sunken px-4 py-3">
      <div className="grid gap-1">
        <p className="m-0 text-body text-ink-2">{notice}</p>
        {norm.status === "draft" && norm.reviewNote && (
          <p className="m-0 text-body text-warning">
            {t("notices.reviewNote", { note: norm.reviewNote })}
          </p>
        )}
      </div>
      {newer && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/catalog/${newer}`}>{t("notices.openNewer")}</Link>
        </Button>
      )}
    </div>
  );
}

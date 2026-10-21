"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { useQuery } from "convex/react";
import Link from "next/link";
import { NormStatusPill } from "@/components/norm-status";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

/** The norm's other versions, once there is more than one. */
export function VersionsCard({ norm }: { norm: Norm }) {
  const t = useScopedI18n("norm");
  const locale = useCurrentLocale();
  const versions = useQuery(api.catalog.norms.versions, { normId: norm._id });
  if (!versions || versions.length < 2) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("versions.title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <ul className="m-0 grid list-none p-0">
          {versions.map((version) => {
            const name = t("versions.name", { version: version.version });
            return (
              <li
                key={version._id}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="grid min-w-0">
                  {version._id === norm._id ? (
                    <span
                      aria-current="page"
                      className="text-body font-medium text-ink"
                    >
                      {name}
                    </span>
                  ) : (
                    <Link
                      href={`/catalog/${version._id}`}
                      className="rounded-xs text-body text-ink underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {name}
                    </Link>
                  )}
                  <span className="text-meta text-ink-3">
                    {version.publishedAt
                      ? t("versions.published", {
                          date: formatDay(version.publishedAt, locale),
                        })
                      : t("versions.updated", {
                          date: formatDay(version.updatedAt, locale),
                        })}
                  </span>
                </div>
                <NormStatusPill status={version.status} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

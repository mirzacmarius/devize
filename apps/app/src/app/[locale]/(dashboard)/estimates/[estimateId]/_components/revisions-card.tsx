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
import { EstimateStatusPill } from "@/components/estimate-status";
import { estimateCode, formatDay, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/**
 * The other revisions of the same Deviz number, once there is more than one,
 * each with a link to compare it with this one.
 */
export function RevisionsCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const revisions = useQuery(api.estimates.estimates.revisions, {
    estimateId: estimate._id,
  });
  if (!revisions || revisions.length < 2) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revisions.title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <ul className="m-0 grid list-none p-0">
          {revisions.map((revision) => {
            const code = estimateCode(estimate.number, revision.revision);
            const current = revision._id === estimate._id;
            return (
              <li
                key={revision._id}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="grid min-w-0">
                  {current ? (
                    <span
                      aria-current="page"
                      className="font-mono text-code font-medium text-ink"
                    >
                      {code}
                    </span>
                  ) : (
                    <Link
                      href={`/estimates/${revision._id}`}
                      className="rounded-xs font-mono text-code text-ink underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {code}
                    </Link>
                  )}
                  <span className="text-meta text-ink-3">
                    {t("revisions.meta", {
                      total: formatMoney(revision.total, locale),
                      date: formatDay(revision.updatedAt, locale),
                    })}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {!current && (
                    <Link
                      href={`/estimates/${estimate._id}/compare?with=${revision._id}`}
                      aria-label={t("revisions.compareWith", { code })}
                      className="rounded-xs text-meta text-ink-2 underline underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t("revisions.compare")}
                    </Link>
                  )}
                  <EstimateStatusPill status={revision.status} />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

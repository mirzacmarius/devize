"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { useQuery } from "convex/react";
import Link from "next/link";
import { formatCount, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

// How many Articole to name whose Mod de montaj needs a look.
const NAMED = 2;

/**
 * Ambalaje și pierderi on a Deviz's page: how many whole packages it takes
 * and what is left over, and the Articole whose Mod de montaj needs a look.
 */
export function PackagingCard({ estimateId }: { estimateId: Id<"estimates"> }) {
  const t = useScopedI18n("materials.card");
  const tLayout = useScopedI18n("materials.layout");
  const locale = useCurrentLocale();
  const list = useQuery(api.materials.list.forEstimate, { estimateId });
  const empty = list !== undefined && list.rows.length === 0;
  // Articole whose words name a method the consumption doesn't have, or
  // whose method a changed consumption undid.
  const notes = (list?.layouts ?? [])
    .flatMap((row) =>
      row.stale
        ? [t("stale", { title: row.title })]
        : !row.layout && row.hinted
          ? [
              t("hinted", {
                title: row.title,
                method: tLayout(`methods.${row.hinted}`),
              }),
            ]
          : [],
    )
    .slice(0, NAMED);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {!empty && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/estimates/${estimateId}/materials`}>{t("open")}</Link>
          </Button>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="gap-1 pt-3">
        <p className="m-0 text-body text-ink-2">
          {list === undefined || empty
            ? t("hint")
            : t("summary", {
                count: formatCount(list.totals.packages, locale),
                cost: formatMoney(list.totals.leftoverCost, locale),
              })}
        </p>
        {empty && <p className="m-0 text-meta text-ink-3">{t("empty")}</p>}
        {notes.map((note) => (
          <p key={note} className="m-0 text-meta text-warning">
            {note}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

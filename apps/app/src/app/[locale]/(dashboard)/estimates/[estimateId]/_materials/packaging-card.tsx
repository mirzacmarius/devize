"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { LinkCard } from "@/components/fold-card";
import { WarningNote } from "@/components/warning-note";
import { formatMoney } from "@/lib/format";
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
    <LinkCard
      title={t("title")}
      href={`/estimates/${estimateId}/materials`}
      lead={
        list === undefined || list.rows.length === 0
          ? null
          : t("lead", { cost: formatMoney(list.totals.leftoverCost, locale) })
      }
    >
      {notes.length > 0 &&
        notes.map((note) => <WarningNote key={note}>{note}</WarningNote>)}
    </LinkCard>
  );
}

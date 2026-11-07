"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { LinkCard } from "@/components/fold-card";
import { WarningNote } from "@/components/warning-note";
import { formatCount } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";

// How many of the Articole whose quantity drifted to name.
const NAMED = 2;

/**
 * Antemăsurătoare on a Deviz's page: how many rooms and measured Articole
 * it has, and the Articole whose quantity no longer says what was measured.
 */
export function TakeoffCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("takeoff.card");
  const locale = useCurrentLocale();
  const summary = useQuery(api.takeoffs.page.summary, {
    estimateId: estimate._id,
  });
  const notes = summary
    ? [
        ...summary.drifted
          .slice(0, NAMED)
          .map((item) => t("drifted", { title: item.title })),
        ...(summary.unchecked > 0
          ? [t("unchecked", { count: summary.unchecked })]
          : []),
        ...(summary.orphans > 0
          ? [t("orphans", { count: summary.orphans })]
          : []),
      ]
    : [];

  return (
    <LinkCard
      title={t("title")}
      href={`/estimates/${estimate._id}/takeoff`}
      lead={
        summary === undefined || summary.items === 0
          ? null
          : summary.measured === 1
            ? t("leadOne", { items: formatCount(summary.items, locale) })
            : t("lead", {
                measured: formatCount(summary.measured, locale),
                items: formatCount(summary.items, locale),
              })
      }
    >
      {notes.length > 0 &&
        notes.map((note) => <WarningNote key={note}>{note}</WarningNote>)}
    </LinkCard>
  );
}

"use client";

import { api } from "@devize/backend/convex/_generated/api";
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
  const started =
    summary !== undefined && (summary.rooms > 0 || summary.takeoffs > 0);
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
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/estimates/${estimate._id}/takeoff`}>
            {started ? t("open") : t("start")}
          </Link>
        </Button>
      </CardHeader>
      <TickRule />
      <CardContent className="gap-1 pt-3">
        <p className="m-0 text-body text-ink-2">
          {summary === undefined || !started
            ? t("hint")
            : t("summary", {
                rooms: formatCount(summary.rooms, locale),
                measured: formatCount(summary.measured, locale),
                items: formatCount(summary.items, locale),
              })}
        </p>
        {summary !== undefined && !started && (
          <p className="m-0 text-meta text-ink-3">{t("empty")}</p>
        )}
        {notes.map((note) => (
          <p key={note} className="m-0 text-meta text-warning">
            {note}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

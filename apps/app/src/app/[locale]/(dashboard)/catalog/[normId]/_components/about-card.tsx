"use client";

import { baseCategoryByName } from "@devize/backend/convex/catalog/baseCategories";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import Link from "next/link";
import type { ReactNode } from "react";
import { useNormSource } from "@/components/norm-source";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

/** Where the norm comes from, which version this is and who checked it. */
export function AboutCard({ norm }: { norm: Norm }) {
  const t = useScopedI18n("norm");
  const tNorms = useScopedI18n("norms");
  const locale = useCurrentLocale();
  const normSource = useNormSource();

  // Devize checks every public norm; a producer's own firm confirms theirs.
  const check =
    norm.visibility !== "public"
      ? undefined
      : [
          norm.verifiedAt ? t("about.verified") : t("about.notVerified"),
          norm.source === "manufacturer" &&
            (norm.confirmedAt ? t("about.confirmed") : tNorms("unconfirmed")),
        ]
          .filter(Boolean)
          .join(" · ");

  // A producer's norm leads to the producer's profile.
  const source =
    norm.source === "manufacturer" &&
    norm.manufacturerId &&
    norm.visibility === "public" ? (
      <Link
        href={`/producers/${norm.manufacturerId}`}
        className="rounded-xs underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {normSource(norm)}
      </Link>
    ) : (
      normSource(norm)
    );

  // A category of the base catalog leads to the catalog browsed by it.
  const baseCategory = baseCategoryByName(norm.category);
  const category = baseCategory ? (
    <Link
      href={`/catalog?category=${baseCategory.key}`}
      className="rounded-xs underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {baseCategory.name}
    </Link>
  ) : (
    norm.category
  );

  const rows: { label: string; value: ReactNode }[] = [
    { label: t("about.source"), value: source },
    ...(norm.category ? [{ label: t("about.category"), value: category }] : []),
    { label: t("about.version"), value: `v${norm.version}` },
    ...(norm.edition
      ? [{ label: t("about.edition"), value: norm.edition }]
      : []),
    norm.publishedAt
      ? {
          label: t("about.published"),
          value: formatDay(norm.publishedAt, locale),
        }
      : { label: t("about.updated"), value: formatDay(norm.updatedAt, locale) },
    ...(check ? [{ label: t("about.check"), value: check }] : []),
    ...(norm.copiedFrom
      ? [
          {
            label: t("about.copiedFrom"),
            value: (
              <Link
                href={`/catalog/${norm.copiedFrom._id}`}
                className="rounded-xs font-mono text-code underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {norm.copiedFrom.code}
              </Link>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("about.title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <dl className="m-0 grid gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-w-0 items-baseline justify-between gap-4"
            >
              <dt className="shrink-0 text-body text-ink-3">{row.label}</dt>
              <dd className="m-0 min-w-0 text-right text-body font-medium text-ink [overflow-wrap:anywhere]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

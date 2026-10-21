"use client";

import { AISuggestion } from "@devize/ui/ai-suggestion";
import { Badge } from "@devize/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

const linkClass =
  "rounded-xs underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The technical data sheet Devize AI drafted the norm from, for the producer
 * and Devize staff who check it: the PDF, opened at the page each figure
 * comes from, what the sheet says about applying the product and what the
 * AI says to check before the norm goes for review.
 */
export function DatasheetCard({
  datasheet,
  sourcePages,
}: {
  datasheet: NonNullable<Norm["datasheet"]>;
  sourcePages: number[];
}) {
  const t = useScopedI18n("norm.datasheet");
  const { url } = datasheet;
  // Browsers' PDF viewers open a file at the page its address names.
  const page = (number: number): ReactNode =>
    url ? (
      <a
        href={`${url}#page=${number}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {t("page", { page: number })}
      </a>
    ) : (
      t("page", { page: number })
    );

  const rows: { label: string; value: ReactNode }[] = [
    {
      label: t("file"),
      value: url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} inline-flex items-center gap-1.5`}
        >
          <FileText className="size-4 shrink-0" aria-hidden />
          {datasheet.fileName}
        </a>
      ) : (
        t("deleted")
      ),
    },
    ...(datasheet.product
      ? [
          {
            label: t("product"),
            value: [datasheet.product.name, datasheet.product.packaging]
              .filter(Boolean)
              .join(" · "),
          },
        ]
      : []),
    ...(sourcePages.length > 0
      ? [
          {
            label: t("pages"),
            value: (
              <span className="inline-flex flex-wrap justify-end gap-x-2">
                {sourcePages.map((number) => (
                  <span key={number}>{page(number)}</span>
                ))}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("title")}</CardTitle>
          <Badge tone="ai">
            <Icons.AI aria-hidden />
            {t("badge")}
          </Badge>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="gap-5 pt-4">
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
        {datasheet.conditions.length > 0 && (
          <section className="grid gap-2">
            <h4 className="m-0 text-label font-normal uppercase text-ink-3">
              {t("conditions")}
            </h4>
            <ul className="m-0 grid list-none gap-2 p-0">
              {datasheet.conditions.map((condition) => (
                <li key={condition.text} className="text-body text-ink-2">
                  {condition.text}
                  {condition.page !== undefined && (
                    <span className="text-meta text-ink-3">
                      {" "}
                      ({page(condition.page)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <AISuggestion variant="inline" title={t("checks")}>
          <ul className="m-0 grid list-disc gap-1 pl-4 text-ink-2">
            {datasheet.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
            <li>{t("estimates")}</li>
          </ul>
        </AISuggestion>
      </CardContent>
    </Card>
  );
}

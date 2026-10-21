"use client";

import type { ReactNode } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  confidenceTone,
  ExternalLink,
  Panel,
  Pill,
  useFormat,
} from "../../../_components/ui";
import type { Manufacturer, ManufacturerData } from "./types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-primary/50">{label}</dt>
      <dd className="min-w-0 text-primary/80">{children}</dd>
    </>
  );
}

export function FindingsPanel({
  manufacturer,
  research,
}: {
  manufacturer: Manufacturer;
  research: ManufacturerData["research"];
}) {
  const t = useScopedI18n("admin.manufacturer.findings");
  const tAdmin = useScopedI18n("admin");
  const format = useFormat();

  if (!manufacturer.researchedAt) {
    return (
      <Panel title={t("title")}>
        <p className="text-sm text-primary/60">{t("none")}</p>
      </Panel>
    );
  }

  const list = (values: string[]) =>
    values.length > 0 ? values.join(", ") : null;
  const facts: [string, ReactNode][] = [
    [t("legalName"), manufacturer.legalName],
    [t("cui"), manufacturer.cui],
    [t("categories"), list(manufacturer.categories)],
    [t("products"), list(manufacturer.mainProducts)],
    [t("brands"), list(manufacturer.brands)],
    [t("retailers"), list(manufacturer.retailers)],
  ];

  return (
    <Panel
      title={t("title")}
      description={t("researchedAt", {
        date: format.date(manufacturer.researchedAt),
      })}
      actions={
        manufacturer.confidence && (
          <Pill tone={confidenceTone[manufacturer.confidence]}>
            {tAdmin(`confidence.${manufacturer.confidence}`)}
          </Pill>
        )
      }
    >
      {manufacturer.needsReview && (
        <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-medium">{t("needsReview")}: </span>
          {manufacturer.needsReview}
        </p>
      )}

      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        {facts.map(
          ([label, value]) =>
            value && (
              <Row key={label} label={label}>
                {value}
              </Row>
            ),
        )}
        {manufacturer.personalization && (
          <Row label={t("personalization")}>
            „{manufacturer.personalization.sentence}”
            {manufacturer.personalization.sourceUrl && (
              <>
                {" "}
                <ExternalLink href={manufacturer.personalization.sourceUrl}>
                  {t("source")}
                </ExternalLink>
              </>
            )}
          </Row>
        )}
        {manufacturer.existingNorms.length > 0 && (
          <Row label={t("existingNorms")}>
            <ul className="flex flex-col gap-1">
              {manufacturer.existingNorms.map((norm) => (
                <li key={norm.url}>
                  <ExternalLink href={norm.url}>{norm.title}</ExternalLink>
                  {[norm.edition, norm.author].filter(Boolean).length > 0 && (
                    <span className="text-primary/50">
                      {" "}
                      ({[norm.edition, norm.author].filter(Boolean).join(", ")})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Row>
        )}
        {manufacturer.technicalDocs.length > 0 && (
          <Row label={t("technicalDocs")}>
            <ul className="flex flex-col gap-1">
              {manufacturer.technicalDocs.map((doc) => (
                <li key={doc.url}>
                  <ExternalLink href={doc.url}>{doc.title}</ExternalLink>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {manufacturer.declaredConsumption.length > 0 && (
          <Row label={t("consumption")}>
            <ul className="flex flex-col gap-1">
              {manufacturer.declaredConsumption.map((item) => (
                <li key={`${item.product}-${item.value}`}>
                  {item.product}: {item.value} {item.unit}{" "}
                  <ExternalLink href={item.sourceUrl}>
                    {t("source")}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </Row>
        )}
      </dl>

      {research && (
        <>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary/80">
              {t("report")}
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-primary/70">
              {research.report}
            </p>
          </details>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary/80">
              {t("sources", { count: research.sources.length })}
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {research.sources.map((source) => (
                <li key={source.url}>
                  <ExternalLink href={source.url}>
                    {source.title || source.url}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </Panel>
  );
}

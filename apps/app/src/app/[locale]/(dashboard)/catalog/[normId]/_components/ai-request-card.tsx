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
import { useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

/**
 * The description Devize AI wrote the norm from, for the firm that asked:
 * what the model assumed where the description was silent, and what it says
 * to check before the norm is used, so a colleague doesn't take an estimate
 * for a measured consumption.
 */
export function AiRequestCard({
  request,
}: {
  request: NonNullable<Norm["aiRequest"]>;
}) {
  const t = useScopedI18n("norm.aiRequest");
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
        <section className="grid gap-1">
          <h4 className="m-0 text-label font-normal uppercase text-ink-3">
            {t("request")}
          </h4>
          <p className="m-0 whitespace-pre-line text-body text-ink-2">
            {request.description}
          </p>
        </section>
        {request.assumptions.length > 0 && (
          <section className="grid gap-2">
            <h4 className="m-0 text-label font-normal uppercase text-ink-3">
              {t("assumptions")}
            </h4>
            <ul className="m-0 grid list-none gap-2 p-0">
              {request.assumptions.map((assumption) => (
                <li key={assumption} className="text-body text-ink-2">
                  {assumption}
                </li>
              ))}
            </ul>
          </section>
        )}
        {request.checks.length > 0 && (
          <AISuggestion variant="inline" title={t("checks")}>
            <ul className="m-0 grid list-disc gap-1 pl-4 text-ink-2">
              {request.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </AISuggestion>
        )}
      </CardContent>
    </Card>
  );
}

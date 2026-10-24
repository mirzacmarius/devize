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
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InvoiceStatusPill } from "@/components/invoice-status";
import { useRun } from "@/components/use-run";
import { formatMoney, formatPercent, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";

/**
 * The Deviz's Facturi: what the client accepted, what is billed so far, and
 * the next invoice one click away: the advance the Ofertă asked, then the
 * final invoice with the advances deducted.
 */
export function InvoicesCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("invoices");
  const locale = useCurrentLocale();
  const router = useRouter();
  const run = useRun();
  const billing = useQuery(api.invoices.invoices.forEstimate, {
    estimateId: estimate._id,
  });
  const createAdvance = useMutation(api.invoices.invoices.createAdvance);
  const createFinal = useMutation(api.invoices.invoices.createFinal);
  const [busy, setBusy] = useState(false);
  if (billing === undefined) {
    return null;
  }
  const { accepted } = billing;
  const today = todayInput();

  const create = async (action: () => Promise<string>) => {
    setBusy(true);
    const result = await run(action, t("card.created"));
    setBusy(false);
    if (result.ok) {
      router.push(`/invoices/${result.value}`);
    }
  };

  const facts =
    accepted === null
      ? []
      : [
          { label: t("card.accepted"), value: accepted.net },
          { label: t("card.invoiced"), value: billing.invoicedNet },
          { label: t("card.remaining"), value: billing.remainingNet ?? 0 },
        ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("card.title")}</CardTitle>
        {billing.invoices.length > 0 && (
          <Button variant="link" asChild>
            <Link href="/invoices">{t("card.all")}</Link>
          </Button>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {accepted === null && billing.invoices.length === 0 ? (
          <p className="m-0 text-body text-ink-2">{t("card.noOffer")}</p>
        ) : (
          <>
            {facts.length > 0 && (
              <dl className="m-0 grid gap-1.5">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="text-body text-ink-3">{fact.label}</dt>
                    <dd className="m-0 text-body font-medium text-ink tabular-nums">
                      {formatMoney(fact.value, locale)} lei{" "}
                      <span className="font-normal text-ink-3">
                        {t("card.withoutVat")}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {billing.invoices.length > 0 && (
              <ul className="m-0 grid list-none gap-2 border-t border-border p-0 pt-3">
                {billing.invoices.map((invoice) => (
                  <li key={invoice._id}>
                    <Link
                      href={`/invoices/${invoice._id}`}
                      className="group flex items-center justify-between gap-3 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid min-w-0 gap-0.5">
                        <span className="font-mono text-code text-ink-3">
                          {invoice.code ?? t("draftCode")}
                        </span>
                        <span className="truncate text-body font-medium text-ink group-hover:underline">
                          {t(`kind.${invoice.kind}`)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <InvoiceStatusPill
                          status={invoice.status}
                          overdue={invoice.dueDate < today}
                        />
                        <span className="text-body tabular-nums text-ink">
                          {formatMoney(invoice.total, locale)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {(billing.canAdvance || billing.canFinal) && (
              <div className="grid gap-2 border-t border-border pt-3">
                <div className="flex flex-wrap gap-2">
                  {billing.canAdvance && accepted?.depositPercent != null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        create(() =>
                          createAdvance({ estimateId: estimate._id }),
                        )
                      }
                    >
                      {t("card.advance", {
                        percent: formatPercent(accepted.depositPercent, locale),
                      })}
                    </Button>
                  )}
                  {billing.canFinal && (
                    <Button
                      type="button"
                      variant={billing.canAdvance ? "ghost" : "outline"}
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        create(() => createFinal({ estimateId: estimate._id }))
                      }
                    >
                      {t("card.final")}
                    </Button>
                  )}
                </div>
                {billing.canFinal && billing.openAdvances > 0 && (
                  <p className="m-0 text-meta text-ink-3">
                    {t("card.finalHint")}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

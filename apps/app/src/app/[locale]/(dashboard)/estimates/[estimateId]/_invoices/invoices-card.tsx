"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { MeterBar } from "@devize/ui/meter";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Fact, FactList } from "@/components/fact-list";
import { FoldRow } from "@/components/fold-card";
import { InvoiceStatusPill } from "@/components/invoice-status";
import { formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";

/**
 * The Deviz's Facturi: what is left to bill of what the client accepted, and
 * the invoices so far. The next one to make is the header's main action.
 */
export function InvoicesCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("invoices");
  const locale = useCurrentLocale();
  const billing = useQuery(api.invoices.invoices.forEstimate, {
    estimateId: estimate._id,
  });
  // Nothing to bill until the client accepts.
  if (
    billing === undefined ||
    (billing.accepted === null && billing.invoices.length === 0)
  ) {
    return null;
  }
  const { accepted } = billing;
  const today = todayInput();

  const invoiced = t("card.invoicedOf", {
    invoiced: formatMoney(billing.invoicedNet, locale),
    accepted: formatMoney(accepted?.net ?? 0, locale),
  });

  return (
    <Card id="invoices" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("card.title")}</CardTitle>
      </CardHeader>
      <CardContent className="gap-0">
        {accepted && (
          <>
            <FactList>
              <Fact label={t("card.remaining")}>
                {formatMoney(billing.remainingNet ?? 0, locale)} lei
              </Fact>
            </FactList>
            <MeterBar
              value={
                accepted.net > 0
                  ? (billing.invoicedNet / accepted.net) * 100
                  : 0
              }
              tone="action"
              label={invoiced}
              className="mb-1.5 mt-1"
            />
            <FactList>
              <Fact label={t("card.invoiced")}>
                {t("card.invoicedValue", {
                  invoiced: formatMoney(billing.invoicedNet, locale),
                  accepted: formatMoney(accepted.net, locale),
                })}
              </Fact>
            </FactList>
          </>
        )}
        {billing.invoices.length > 0 && (
          <FoldRow
            title={t("card.list")}
            lead={billing.invoices.length}
            attention={accepted === null}
          >
            <ul className="m-0 grid list-none gap-3 p-0">
              {billing.invoices.map((invoice) => (
                <li key={invoice._id}>
                  <Link
                    href={`/invoices/${invoice._id}`}
                    className="group grid gap-1 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-body text-ink group-hover:underline">
                        {t(`kind.${invoice.kind}`)}
                      </span>
                      <span className="shrink-0 text-body tabular-nums text-ink">
                        {formatMoney(invoice.total, locale)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-meta tabular-nums text-ink-3">
                        {invoice.code ?? t("draftCode")}
                      </span>
                      <InvoiceStatusPill
                        status={invoice.status}
                        overdue={invoice.dueDate < today}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {billing.canFinal && billing.openAdvances > 0 && (
              <p className="m-0 text-meta text-ink-3">{t("card.finalHint")}</p>
            )}
            <Button variant="link" className="justify-self-start" asChild>
              <Link href="/invoices">{t("card.all")}</Link>
            </Button>
          </FoldRow>
        )}
      </CardContent>
    </Card>
  );
}

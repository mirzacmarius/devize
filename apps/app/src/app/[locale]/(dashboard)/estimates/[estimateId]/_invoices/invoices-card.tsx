"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { MeterBar } from "@devize/ui/meter";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Fact, FactList } from "@/components/fact-list";
import { FoldRow } from "@/components/fold-card";
import { InvoiceStatusPill } from "@/components/invoice-status";
import { RailStat } from "@/components/rail-stat";
import { formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { useInvoiceActions } from "./use-invoice-actions";

/**
 * The Deviz's Facturi: what is left to bill of what the client accepted, the
 * invoices so far, and the next one to make. Once the work is done that's the
 * header's main action too; while it goes on, only here and in the menu.
 */
export function InvoicesCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("invoices");
  const locale = useCurrentLocale();
  const billing = useQuery(api.invoices.invoices.forEstimate, {
    estimateId: estimate._id,
  });
  const invoicing = useInvoiceActions(
    estimate._id,
    estimate.status === "accepted",
  );
  const next = invoicing.actions[0];
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

  const list = billing.invoices.length > 0 && (
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
  );

  // Without an accepted offer there's no sum to bill, only the invoices made.
  if (!accepted) {
    return (
      <Card id="invoices" className="scroll-mt-4">
        <CardHeader>
          <CardTitle>{t("card.title")}</CardTitle>
        </CardHeader>
        <CardContent className="gap-0">{list}</CardContent>
      </Card>
    );
  }

  return (
    <RailStat
      id="invoices"
      label={t("card.remaining")}
      value={formatMoney(billing.remainingNet ?? 0, locale)}
      unit="lei"
    >
      <MeterBar
        value={
          accepted.net > 0 ? (billing.invoicedNet / accepted.net) * 100 : 0
        }
        tone="action"
        label={invoiced}
        className="mb-1 mt-1.5"
      />
      <FactList>
        <Fact label={t("card.invoiced")}>
          {t("card.invoicedValue", {
            invoiced: formatMoney(billing.invoicedNet, locale),
            accepted: formatMoney(accepted.net, locale),
          })}
        </Fact>
      </FactList>
      {list}
      {next && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 justify-self-start"
          disabled={invoicing.busy}
          onClick={next.run}
        >
          <Plus aria-hidden />
          {next.label}
        </Button>
      )}
    </RailStat>
  );
}

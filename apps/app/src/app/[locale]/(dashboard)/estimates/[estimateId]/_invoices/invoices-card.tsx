"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Lei } from "@/components/amount";
import { Fact, FactList } from "@/components/fact-list";
import { FoldCard } from "@/components/fold-card";
import { InvoiceStatusPill } from "@/components/invoice-status";
import { RailStat } from "@/components/rail-stat";
import { formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { useInvoiceActions } from "./use-invoice-actions";

/**
 * What is left to bill of what the client accepted, and the next invoice to
 * make. Once the work is done that's the header's main action too; while it
 * goes on, only here and in the menu.
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
  if (!billing?.accepted) {
    return null;
  }
  return (
    <RailStat
      id="invoices"
      label={t("card.remaining")}
      value={formatMoney(billing.remainingNet ?? 0, locale)}
      unit="lei"
      before={
        <FactList className="mb-1">
          <Fact label={t("card.invoiced")}>
            <Lei value={formatMoney(billing.invoicedNet, locale)} />
          </Fact>
        </FactList>
      }
    >
      {next && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
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

/** The invoices made from a Deviz, among the other rows of its rail. */
export function InvoicesRow({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("invoices");
  const locale = useCurrentLocale();
  const billing = useQuery(api.invoices.invoices.forEstimate, {
    estimateId: estimate._id,
  });
  if (billing === undefined || billing.invoices.length === 0) {
    return null;
  }
  const today = todayInput();
  return (
    <FoldCard
      // Without an accepted offer there's no sum to bill, only this.
      id={billing.accepted ? undefined : "invoices"}
      title={t("card.list")}
      lead={billing.invoices.length}
      attention={billing.accepted === null}
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
    </FoldCard>
  );
}

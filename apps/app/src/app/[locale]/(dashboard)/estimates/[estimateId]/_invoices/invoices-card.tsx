"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { MeterBar } from "@devize/ui/meter";
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
  // Nothing to bill until the client accepts.
  if (
    billing === undefined ||
    (billing.accepted === null && billing.invoices.length === 0)
  ) {
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

  const invoiced = t("card.invoicedOf", {
    invoiced: formatMoney(billing.invoicedNet, locale),
    accepted: formatMoney(accepted?.net ?? 0, locale),
  });

  return (
    <Card id="invoices" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("card.title")}</CardTitle>
        {accepted && (
          <span className="text-body font-medium tabular-nums text-ink">
            {t("card.remainingLead", {
              amount: formatMoney(billing.remainingNet ?? 0, locale),
            })}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {accepted && (
          <div className="grid gap-2">
            <MeterBar
              value={
                accepted.net > 0
                  ? (billing.invoicedNet / accepted.net) * 100
                  : 0
              }
              tone="action"
              label={invoiced}
            />
            <p className="m-0 text-meta tabular-nums text-ink-3">{invoiced}</p>
          </div>
        )}
        {billing.invoices.length > 0 && (
          <ul className="m-0 grid list-none gap-2 border-t border-border p-0 pt-3">
            {billing.invoices.map((invoice) => (
              <li key={invoice._id}>
                <Link
                  href={`/invoices/${invoice._id}`}
                  className="group grid gap-1 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-body font-medium text-ink group-hover:underline">
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
        )}
        {(billing.canAdvance ||
          billing.canFinal ||
          billing.invoices.length > 0) && (
          <div className="grid gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {billing.canAdvance && accepted?.depositPercent != null && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    create(() => createAdvance({ estimateId: estimate._id }))
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
                  variant={billing.canAdvance ? "ghost" : "default"}
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    create(() => createFinal({ estimateId: estimate._id }))
                  }
                >
                  {t("card.final")}
                </Button>
              )}
              {billing.invoices.length > 0 && (
                <Button variant="link" asChild>
                  <Link href="/invoices">{t("card.all")}</Link>
                </Button>
              )}
            </div>
            {billing.canFinal && billing.openAdvances > 0 && (
              <p className="m-0 text-meta text-ink-3">{t("card.finalHint")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

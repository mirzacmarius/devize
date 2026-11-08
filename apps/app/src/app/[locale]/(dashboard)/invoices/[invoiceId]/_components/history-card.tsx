"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useRun } from "@/components/use-run";
import { formatCalendarDay, formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

type Entry = {
  key: string;
  // YYYY-MM-DD, so the entries sort as text.
  day: string;
  text: string;
  detail?: string;
  amount?: number;
  // The payment's place on the invoice, to take it back by.
  payment?: number;
};

/**
 * What became of an issued invoice, in order: its date, how ANAF took it,
 * each payment that came in and the storno that reversed it.
 */
export function HistoryCard({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.history");
  const tPayments = useScopedI18n("invoices.payments");
  const locale = useCurrentLocale();
  const run = useRun();
  const removePayment = useMutation(api.invoices.invoices.removePayment);
  // A payment can be taken back while the invoice stands.
  const open = invoice.status === "issued" || invoice.status === "paid";
  const { efactura, stornoedBy } = invoice;
  // A moment, as the day it was where it's read.
  const dayOf = (timestamp: number) => todayInput(new Date(timestamp));

  const entries: Entry[] = [
    { key: "issued", day: invoice.issueDate, text: t("issued") },
  ];
  if (efactura.uploadedAt !== undefined) {
    entries.push({
      key: "uploaded",
      day: dayOf(efactura.uploadedAt),
      text: t("uploaded"),
    });
  }
  if (
    (efactura.status === "accepted" || efactura.status === "rejected") &&
    efactura.checkedAt !== undefined
  ) {
    entries.push({
      key: efactura.status,
      day: dayOf(efactura.checkedAt),
      text: t(efactura.status),
    });
  }
  invoice.payments.forEach((payment, index) => {
    entries.push({
      key: `payment-${index}`,
      day: payment.date,
      text: t("payment"),
      detail: [tPayments(`methods.${payment.method}`), payment.note]
        .filter(Boolean)
        .join(" · "),
      amount: payment.amount,
      payment: index,
    });
  });
  // Once the storno is issued: a draft of one reverses nothing yet.
  if (stornoedBy?.code) {
    entries.push({
      key: "storno",
      day: stornoedBy.issueDate,
      text: t("storno", { code: stornoedBy.code }),
    });
  }
  // On the same day they keep the order above: issued, sent, answered, paid.
  entries.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="m-0 grid list-none border-t border-border p-0">
          {entries.map((entry) => {
            const index = entry.payment;
            return (
              <li
                key={entry.key}
                className="group/row grid min-h-11 grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-border py-1.5 last:border-0"
              >
                <span className="text-body tabular-nums text-ink-3">
                  {formatCalendarDay(entry.day, locale)}
                </span>
                <span className="min-w-0 text-body text-ink">
                  {entry.text}
                  {entry.detail && (
                    <span className="text-ink-3"> · {entry.detail}</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {open && index !== undefined && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-ink-3 focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:hover)]:opacity-0"
                      aria-label={tPayments("remove")}
                      onClick={() =>
                        run(
                          () =>
                            removePayment({ invoiceId: invoice._id, index }),
                          tPayments("removed"),
                        )
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                  {/* On the edge where the lines above end their amounts. */}
                  {entry.amount !== undefined && (
                    <span className="text-body tabular-nums text-ink-2">
                      {formatMoney(entry.amount, locale)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

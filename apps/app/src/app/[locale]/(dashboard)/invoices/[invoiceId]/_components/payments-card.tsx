"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { roundLei } from "@devize/backend/convex/estimates/recap";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { FoldCard } from "@/components/fold-card";
import { useRun } from "@/components/use-run";
import {
  formatCalendarDate,
  formatCalendarDay,
  formatInputNumber,
  formatMoney,
  parseDecimal,
  todayInput,
} from "@/lib/format";
import { uniqueKeys } from "@/lib/keys";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

type Method = Doc<"invoices">["payments"][number]["method"];
const methods: readonly Method[] = ["transfer", "cash", "card", "other"];

/** What the client paid on the invoice, and the form for the next payment. */
export function PaymentsCard({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.payments");
  const locale = useCurrentLocale();
  const remaining = roundLei(invoice.totals.total - invoice.paidAmount);
  const open = invoice.status === "issued" || invoice.status === "paid";

  return (
    <Card>
      <CardHeader>
        <div className="grid min-w-0 gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <span className="text-meta text-ink-3 tabular-nums">
            {remaining > 0
              ? `${t("remaining")}: ${formatMoney(remaining, locale)}`
              : t("settled")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {invoice.payments.length === 0 ? (
          <p className="m-0 text-body text-ink-3">{t("none")}</p>
        ) : (
          <PaymentRows invoice={invoice} />
        )}
        {open && remaining > 0 && (
          <PaymentForm
            key={`${invoice.paidAmount}-${invoice.payments.length}`}
            invoice={invoice}
            remaining={remaining}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Once the invoice is paid in full, what came in is looked at now and then: a
 * row of the rail that opens on the payments.
 */
export function PaymentsFold({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.payments");
  const locale = useCurrentLocale();
  // Dates are calendar days, which sort as text.
  const last = invoice.payments.reduce(
    (latest, payment) => (payment.date > latest ? payment.date : latest),
    "",
  );
  return (
    <FoldCard
      title={t("title")}
      lead={
        last ? t("lead", { date: formatCalendarDay(last, locale) }) : undefined
      }
    >
      <PaymentRows invoice={invoice} className="border-t-0" />
    </FoldCard>
  );
}

/** Each payment: when, how, and what it brought in. */
function PaymentRows({
  invoice,
  className,
}: {
  invoice: Invoice;
  className?: string;
}) {
  const t = useScopedI18n("invoices.payments");
  const locale = useCurrentLocale();
  const run = useRun();
  const removePayment = useMutation(api.invoices.invoices.removePayment);
  const open = invoice.status === "issued" || invoice.status === "paid";
  const keys = uniqueKeys(
    invoice.payments,
    (payment) => `${payment.date}|${payment.amount}|${payment.method}`,
  );
  return (
    <ul
      className={cn("m-0 grid list-none border-t border-border p-0", className)}
    >
      {invoice.payments.map((payment, index) => (
        <li
          key={keys[index]}
          className="group/row flex min-h-11 items-center gap-3 border-b border-border py-1.5 last:border-0"
        >
          <span className="min-w-0 flex-1 text-body text-ink-2">
            {[
              formatCalendarDate(payment.date, locale),
              t(`methods.${payment.method}`),
              payment.note,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {open && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-ink-3 focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:hover)]:opacity-0"
              aria-label={t("remove")}
              onClick={() =>
                run(
                  () => removePayment({ invoiceId: invoice._id, index }),
                  t("removed"),
                )
              }
            >
              <Trash2 aria-hidden />
            </Button>
          )}
          {/* On the edge where the lines above end their amounts, as
                    quiet as the line: the total above is what it pays. */}
          <span className="shrink-0 text-body tabular-nums text-ink-2">
            {formatMoney(payment.amount, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PaymentForm({
  invoice,
  remaining,
}: {
  invoice: Invoice;
  remaining: number;
}) {
  const t = useScopedI18n("invoices.payments");
  const locale = useCurrentLocale();
  const run = useRun();
  const addPayment = useMutation(api.invoices.invoices.addPayment);
  const [date, setDate] = useState(todayInput);
  const [amount, setAmount] = useState(() =>
    formatInputNumber(remaining, locale),
  );
  const [method, setMethod] = useState<Method>("transfer");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = parseDecimal(amount);
    if (value === undefined || value <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    if (!date) {
      setError(t("invalidDate"));
      return;
    }
    setError(undefined);
    setBusy(true);
    await run(
      () =>
        addPayment({
          invoiceId: invoice._id,
          date,
          amount: value,
          method,
          note: note.trim() || undefined,
        }),
      t("saved"),
    );
    setBusy(false);
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-4 border-t border-border pt-4"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
        <Field label={t("date")} htmlFor="payment-date">
          <Input
            id="payment-date"
            type="date"
            value={date}
            max={todayInput()}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label={t("amount")} htmlFor="payment-amount" error={error}>
          <DecimalInput
            id="payment-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={error !== undefined}
          />
        </Field>
        <Field label={t("method")} htmlFor="payment-method">
          <Select
            value={method}
            onValueChange={(value) => setMethod(value as Method)}
          >
            <SelectTrigger id="payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {methods.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`methods.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label={t("note")} htmlFor="payment-note">
          <Input
            id="payment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={200}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={busy}>
          {busy && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

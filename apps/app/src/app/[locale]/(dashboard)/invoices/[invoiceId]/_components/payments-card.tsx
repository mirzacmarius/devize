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
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import {
  formatInputNumber,
  formatMoney,
  parseDecimal,
  todayInput,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

type Method = Doc<"invoices">["payments"][number]["method"];
const methods: readonly Method[] = ["transfer", "cash", "card", "other"];

/**
 * What is left to collect on an issued invoice, and the form for the next
 * payment. The payments that came in are in its history.
 */
export function PaymentsCard({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.payments");
  const locale = useCurrentLocale();
  const remaining = roundLei(invoice.totals.total - invoice.paidAmount);
  const open = invoice.status === "issued";

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
      {open && remaining > 0 && (
        <CardContent>
          <PaymentForm
            key={`${invoice.paidAmount}-${invoice.payments.length}`}
            invoice={invoice}
            remaining={remaining}
          />
        </CardContent>
      )}
    </Card>
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

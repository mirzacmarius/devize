"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { roundLei } from "@devize/backend/convex/estimates/recap";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import {
  formatCalendarDate,
  formatInputNumber,
  formatMoney,
  formatPercent,
  parseDecimal,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

/** The invoice's dates, notes and retention, editable while it is a draft, and what it refers to. */
export function DetailsCard({ invoice }: { invoice: Invoice }) {
  return invoice.status === "draft" ? (
    <DetailsForm key={invoice._id} invoice={invoice} />
  ) : (
    <DetailsList invoice={invoice} />
  );
}

/** A link to another invoice: its code and date. */
function InvoiceRef({ target }: { target: NonNullable<Invoice["stornoOf"]> }) {
  const t = useScopedI18n("invoices");
  const locale = useCurrentLocale();
  return (
    <Link
      href={`/invoices/${target._id}`}
      className="underline-offset-2 hover:underline"
    >
      {target.code ?? t("draftCode")} ·{" "}
      {formatCalendarDate(target.issueDate, locale)}
    </Link>
  );
}

/** The rows every invoice shows: kind, Deviz, references, standing notes. */
function useReferenceRows(invoice: Invoice) {
  const t = useScopedI18n("invoices");
  const rows: { label: string; value: ReactNode }[] = [
    { label: t("details.kind"), value: t(`kind.${invoice.kind}`) },
  ];
  if (invoice.estimate) {
    rows.push({
      label: t("details.deviz"),
      value: (
        <Link
          href={`/estimates/${invoice.estimate._id}`}
          className="underline-offset-2 hover:underline"
        >
          {invoice.estimate.code} · {invoice.estimate.title}
        </Link>
      ),
    });
    if (invoice.workStatementId) {
      rows.push({
        label: t("details.statement"),
        value: (
          <Link
            href={`/estimates/${invoice.estimate._id}/progress`}
            className="underline-offset-2 hover:underline"
          >
            {t("details.statement")}
          </Link>
        ),
      });
    }
  }
  if (invoice.stornoOf) {
    rows.push({
      label: t("details.stornoOf"),
      value: <InvoiceRef target={invoice.stornoOf} />,
    });
  }
  if (invoice.stornoedBy) {
    rows.push({
      label: t("details.stornoedBy"),
      value: <InvoiceRef target={invoice.stornoedBy} />,
    });
  }
  for (const settled of invoice.settles) {
    rows.push({
      label: t("details.settles"),
      value: <InvoiceRef target={settled} />,
    });
  }
  return rows;
}

function Rows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  const tc = useScopedI18n("common");
  return (
    <dl className="m-0 grid gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 items-baseline justify-between gap-4"
        >
          <dt className="shrink-0 text-body text-ink-3">{row.label}</dt>
          <dd className="m-0 min-w-0 text-right text-body font-medium text-ink [overflow-wrap:anywhere]">
            {row.value || (
              <span className="font-normal text-ink-3">{tc("notSet")}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Mentions({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.details");
  if (invoice.mentions.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-1 border-t border-border pt-3">
      <span className="text-meta text-ink-3">{t("mentions")}</span>
      <ul className="m-0 grid list-none gap-0.5 p-0 text-body text-ink-2">
        {invoice.mentions.map((mention) => (
          <li key={mention}>{mention}</li>
        ))}
      </ul>
    </div>
  );
}

function DetailsList({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.details");
  const locale = useCurrentLocale();
  const references = useReferenceRows(invoice);
  const rows = [
    ...references.slice(0, 1),
    {
      label: t("issueDate"),
      value: formatCalendarDate(invoice.issueDate, locale),
    },
    { label: t("dueDate"), value: formatCalendarDate(invoice.dueDate, locale) },
    ...(invoice.period
      ? [
          {
            label: t("period"),
            value: t("periodValue", {
              start: formatCalendarDate(invoice.period.start, locale),
              end: formatCalendarDate(invoice.period.end, locale),
            }),
          },
        ]
      : []),
    ...(invoice.retention
      ? [
          {
            label: t("retention"),
            value: `${formatPercent(invoice.retention.percent, locale)} · ${formatMoney(invoice.retention.amount, locale)} lei`,
          },
        ]
      : []),
    ...references.slice(1),
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <Rows rows={rows} />
        {invoice.notes && (
          <p className="m-0 whitespace-pre-line border-t border-border pt-3 text-body text-ink-2">
            {invoice.notes}
          </p>
        )}
        <Mentions invoice={invoice} />
      </CardContent>
    </Card>
  );
}

/** What a draft can still change besides its lines and client. */
function DetailsForm({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.details");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const update = useMutation(api.invoices.invoices.update);
  const references = useReferenceRows(invoice);
  const withRetention =
    invoice.kind === "statement" || invoice.kind === "final";
  const [issueDate, setIssueDate] = useState(invoice.issueDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [retention, setRetention] = useState(
    invoice.retention
      ? formatInputNumber(invoice.retention.percent, locale)
      : "",
  );
  const [errors, setErrors] = useState<{
    date?: string;
    retention?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const percent = retention.trim() ? parseDecimal(retention) : undefined;
    const found = {
      date: issueDate && dueDate ? undefined : t("invalidDate"),
      retention:
        retention.trim() &&
        (percent === undefined || percent < 0 || percent > 100)
          ? t("invalidPercent")
          : undefined,
    };
    setErrors(found);
    if (found.date || found.retention) {
      return;
    }
    setSaving(true);
    await run(
      () =>
        update({
          invoiceId: invoice._id,
          issueDate,
          dueDate,
          notes: notes.trim(),
          retention: withRetention
            ? percent
              ? {
                  percent,
                  amount: roundLei((invoice.totals.net * percent) / 100),
                }
              : null
            : undefined,
        }),
      t("saved"),
    );
    setSaving(false);
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={submit} noValidate>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <TickRule />
        <CardContent className="pt-4">
          <Rows rows={references} />
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Field
              label={t("issueDate")}
              htmlFor="invoice-issue-date"
              error={errors.date}
            >
              <Input
                id="invoice-issue-date"
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
            </Field>
            <Field label={t("dueDate")} htmlFor="invoice-due-date">
              <Input
                id="invoice-due-date"
                type="date"
                value={dueDate}
                min={issueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
          </div>
          {invoice.period && (
            <p className="m-0 text-meta text-ink-3">
              {t("period")}:{" "}
              {t("periodValue", {
                start: formatCalendarDate(invoice.period.start, locale),
                end: formatCalendarDate(invoice.period.end, locale),
              })}
            </p>
          )}
          {withRetention && (
            <Field
              label={t("retentionPercent")}
              htmlFor="invoice-retention"
              hint={t("retentionHint")}
              error={errors.retention}
            >
              <DecimalInput
                id="invoice-retention"
                value={retention}
                suffix="%"
                placeholder="0"
                onChange={(event) => setRetention(event.target.value)}
                aria-invalid={errors.retention !== undefined}
              />
            </Field>
          )}
          <Field
            label={t("notes")}
            htmlFor="invoice-notes"
            hint={t("notesHint")}
          >
            <Textarea
              id="invoice-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </Field>
          <Mentions invoice={invoice} />
        </CardContent>
        <CardFooter className="justify-between gap-4 border-t bg-sunken py-3">
          <span />
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Icons.Loader className="animate-spin" aria-hidden />}
            {tc("save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

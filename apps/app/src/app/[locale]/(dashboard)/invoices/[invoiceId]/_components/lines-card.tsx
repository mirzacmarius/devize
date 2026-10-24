"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  computeTotals,
  type InvoiceLineInput,
  priceLine,
} from "@devize/backend/convex/invoices/money";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { useRun } from "@/components/use-run";
import {
  formatInputNumber,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { uniqueKeys } from "@/lib/keys";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Invoice, InvoiceLine } from "./types";

/** A line as the editor holds it: text fields, parsed when saving. */
type Row = {
  key: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  lineItemId: InvoiceLine["lineItemId"];
  settles: InvoiceLine["settles"];
};

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

/** The invoice's lines: an editor while it is a draft, a table once issued. */
export function LinesCard({ invoice }: { invoice: Invoice }) {
  return invoice.status === "draft" ? (
    <LinesEditor key={invoice._id} invoice={invoice} />
  ) : (
    <LinesTable invoice={invoice} />
  );
}

function LinesTable({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.lines");
  const locale = useCurrentLocale();
  const keys = uniqueKeys(
    invoice.lines,
    (line) => `${line.description}|${line.quantity}|${line.unitPrice}`,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.description")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("columns.unit")}
              </TableHead>
              <TableHead className="text-right">
                {t("columns.quantity")}
              </TableHead>
              <TableHead className="hidden text-right md:table-cell">
                {t("columns.unitPrice")}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t("columns.vatRate")}
              </TableHead>
              <TableHead className="text-right">{t("columns.net")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line, index) => (
              <TableRow key={keys[index]}>
                <TableCell className="text-ink">{line.description}</TableCell>
                <TableCell className="hidden text-ink-2 sm:table-cell">
                  {formatUnit(line.unit, locale)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.quantity, locale)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">
                  {formatMoney(line.unitPrice, locale)}
                </TableCell>
                <TableCell className="hidden text-right text-ink-2 tabular-nums sm:table-cell">
                  {formatPercent(line.vatRate, locale)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(line.net, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Totals invoice={invoice} totals={invoice.totals} />
      </CardContent>
    </Card>
  );
}

/** Net, VAT by rate and the total, with the retention held when there is one. */
function Totals({
  invoice,
  totals,
}: {
  invoice: Pick<Invoice, "retention" | "seller">;
  totals: Invoice["totals"];
}) {
  const t = useScopedI18n("invoices.lines");
  const locale = useCurrentLocale();
  const rows: { label: string; value: number; strong?: boolean }[] = [
    { label: t("net"), value: totals.net },
    ...(invoice.seller.vatRegistered
      ? totals.byRate.length > 0
        ? totals.byRate.map((group) => ({
            label: t("vat", { rate: formatPercent(group.vatRate, locale) }),
            value: group.vat,
          }))
        : [{ label: t("vatPlain"), value: 0 }]
      : []),
    { label: t("total"), value: totals.total, strong: true },
  ];
  if (invoice.retention) {
    rows.push(
      {
        label: t("retention", {
          percent: formatPercent(invoice.retention.percent, locale),
        }),
        value: -invoice.retention.amount,
      },
      {
        label: t("toPay"),
        value: totals.total - invoice.retention.amount,
        strong: true,
      },
    );
  }
  return (
    <dl className="m-0 grid justify-end gap-1.5 border-t border-border pt-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-6 sm:justify-end"
        >
          <dt
            className={
              row.strong
                ? "text-body font-medium text-ink"
                : "text-body text-ink-3"
            }
          >
            {row.label}
          </dt>
          <dd
            className={`m-0 min-w-32 text-right tabular-nums ${
              row.strong
                ? "text-body-lg font-semibold text-ink"
                : "text-body text-ink"
            }`}
          >
            {formatMoney(row.value, locale)} lei
          </dd>
        </div>
      ))}
    </dl>
  );
}

function fromLine(line: InvoiceLine, locale: "ro" | "en"): Row {
  return {
    key: newKey(),
    description: line.description,
    unit: line.unit,
    quantity: formatInputNumber(line.quantity, locale),
    unitPrice: formatInputNumber(line.unitPrice, locale),
    vatRate: formatInputNumber(line.vatRate, locale),
    lineItemId: line.lineItemId,
    settles: line.settles,
  };
}

/** A row's numbers, or undefined while one of them is not a number yet. */
function parseRow(row: Row): InvoiceLineInput | undefined {
  const quantity = parseDecimal(row.quantity);
  const unitPrice = parseDecimal(row.unitPrice);
  const vatRate = parseDecimal(row.vatRate);
  if (
    !row.description.trim() ||
    !row.unit.trim() ||
    quantity === undefined ||
    quantity === 0 ||
    unitPrice === undefined ||
    unitPrice < 0 ||
    vatRate === undefined ||
    vatRate < 0 ||
    vatRate > 100
  ) {
    return undefined;
  }
  return {
    description: row.description.trim(),
    unit: row.unit.trim(),
    quantity,
    unitPrice,
    vatRate,
    lineItemId: row.lineItemId,
    settles: row.settles,
  };
}

/** The draft's lines, edited in place and saved together. */
function LinesEditor({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.lines");
  const locale = useCurrentLocale();
  const run = useRun();
  const update = useMutation(api.invoices.invoices.update);
  // Nothing typed yet: the rows follow the invoice as the server has it.
  const [edits, setEdits] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const rows = edits ?? invoice.lines.map((line) => fromLine(line, locale));
  const dirty = edits !== null;

  const parsed = rows.map(parseRow);
  const valid = parsed.every((line) => line !== undefined);
  const defaultVat = invoice.seller.vatRegistered
    ? (invoice.lines[0]?.vatRate ?? 21)
    : 0;
  const totals = computeTotals(
    parsed
      .filter((line): line is InvoiceLineInput => line !== undefined)
      .map((line) => priceLine(line, invoice.seller.vatRegistered)),
  );

  const change = (key: string, patch: Partial<Row>) =>
    setEdits(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const add = () =>
    setEdits([
      ...rows,
      {
        key: newKey(),
        description: "",
        unit: "buc",
        quantity: "1",
        unitPrice: "",
        vatRate: formatInputNumber(defaultVat, locale),
        lineItemId: undefined,
        settles: undefined,
      },
    ]);
  const remove = (key: string) =>
    setEdits(rows.filter((row) => row.key !== key));

  const save = async () => {
    if (!valid) {
      setShowInvalid(true);
      return;
    }
    setShowInvalid(false);
    setSaving(true);
    const result = await run(
      () =>
        update({
          invoiceId: invoice._id,
          lines: parsed.filter(
            (line): line is InvoiceLineInput => line !== undefined,
          ),
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      setEdits(null);
    }
  };

  const cell = (id: string, label: string, input: ReactNode) => (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-meta text-ink-3 md:sr-only">
        {label}
      </label>
      {input}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <p className="m-0 text-meta text-ink-3">{t("description")}</p>
        </div>
        {dirty && (
          <span className="shrink-0 text-meta text-warning">
            {t("unsaved")}
          </span>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <div className="hidden grid-cols-[minmax(0,1fr)_72px_88px_112px_72px_104px_32px] gap-2 text-meta text-ink-3 md:grid">
          <span>{t("columns.description")}</span>
          <span>{t("columns.unit")}</span>
          <span className="text-right">{t("columns.quantity")}</span>
          <span className="text-right">{t("columns.unitPrice")}</span>
          <span className="text-right">{t("columns.vatRate")}</span>
          <span className="text-right">{t("columns.net")}</span>
          <span />
        </div>
        <ul className="m-0 grid list-none gap-3 p-0">
          {rows.map((row, index) => {
            const line = parsed[index];
            return (
              <li
                key={row.key}
                className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[minmax(0,1fr)_72px_88px_112px_72px_104px_32px] md:items-center md:border-0 md:p-0"
              >
                {cell(
                  `${row.key}-description`,
                  t("columns.description"),
                  <Input
                    id={`${row.key}-description`}
                    value={row.description}
                    onChange={(event) =>
                      change(row.key, { description: event.target.value })
                    }
                    maxLength={200}
                    aria-invalid={showInvalid && !row.description.trim()}
                  />,
                )}
                <div className="grid grid-cols-2 gap-2 md:contents">
                  {cell(
                    `${row.key}-unit`,
                    t("columns.unit"),
                    <Input
                      id={`${row.key}-unit`}
                      value={row.unit}
                      onChange={(event) =>
                        change(row.key, { unit: event.target.value })
                      }
                      maxLength={20}
                      aria-invalid={showInvalid && !row.unit.trim()}
                    />,
                  )}
                  {cell(
                    `${row.key}-quantity`,
                    t("columns.quantity"),
                    <DecimalInput
                      id={`${row.key}-quantity`}
                      value={row.quantity}
                      onChange={(event) =>
                        change(row.key, { quantity: event.target.value })
                      }
                      aria-invalid={showInvalid && !parseDecimal(row.quantity)}
                    />,
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 md:contents">
                  {cell(
                    `${row.key}-unitPrice`,
                    t("columns.unitPrice"),
                    <DecimalInput
                      id={`${row.key}-unitPrice`}
                      value={row.unitPrice}
                      onChange={(event) =>
                        change(row.key, { unitPrice: event.target.value })
                      }
                      aria-invalid={
                        showInvalid && (parseDecimal(row.unitPrice) ?? -1) < 0
                      }
                    />,
                  )}
                  {cell(
                    `${row.key}-vatRate`,
                    t("columns.vatRate"),
                    <DecimalInput
                      id={`${row.key}-vatRate`}
                      value={row.vatRate}
                      suffix="%"
                      onChange={(event) =>
                        change(row.key, { vatRate: event.target.value })
                      }
                      aria-invalid={
                        showInvalid && parseDecimal(row.vatRate) === undefined
                      }
                    />,
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 md:contents">
                  <span className="text-body font-medium text-ink tabular-nums md:text-right">
                    {line
                      ? formatMoney(
                          priceLine(line, invoice.seller.vatRegistered).net,
                          locale,
                        )
                      : "–"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove")}
                    onClick={() => remove(row.key)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={add}
        >
          <Plus aria-hidden />
          {t("add")}
        </Button>
        {showInvalid && !valid && (
          <p role="alert" className="m-0 text-meta text-danger">
            {t("invalid")}
          </p>
        )}
        <Totals invoice={invoice} totals={totals} />
      </CardContent>
      <CardFooter className="justify-between gap-4 border-t bg-sunken py-3">
        <span className="text-meta text-ink-3">
          {dirty ? t("unsaved") : ""}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={saving || !dirty}
          onClick={save}
        >
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}

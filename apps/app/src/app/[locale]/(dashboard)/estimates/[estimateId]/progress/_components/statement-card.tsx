"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader } from "@devize/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { StatusPill } from "@devize/ui/status-pill";
import { Switch } from "@devize/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableGroupRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { Textarea } from "@devize/ui/textarea";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { Paperclip } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { DocumentsFormat } from "@/components/documents/use-download-documents";
import { InlineNumber } from "@/components/inline-number";
import { useRun } from "@/components/use-run";
import {
  formatCalendarDate,
  formatDay,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ApproveDialog } from "./approve-dialog";
import { AttachmentDialog } from "./attachment-dialog";
import { StatementDialog } from "./statement-dialog";
import { StatementInvoice } from "./statement-invoice";
import { statementTone } from "./statement-status";
import type { Statement, StatementRow, Works } from "./types";
import { useDownloadProgress } from "./use-download-progress";

/**
 * One Situație de lucrări: every Articol of the contract with what was
 * executed before, in this period and in all, the period's Recapitulație,
 * and the steps it goes through: to the beneficiary, confirmed, invoiced.
 */
export function StatementCard({
  statementId,
  works,
  picker,
  onDeleted,
}: {
  statementId: Id<"workStatements">;
  works: Works;
  /** The card's title, which also leads to the Deviz's other statements. */
  picker: ReactNode;
  onDeleted: () => void;
}) {
  const t = useScopedI18n("progress.statement");
  const tStatus = useScopedI18n("progress.status");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const statement = useQuery(api.progress.statements.get, { statementId });
  const setStatus = useMutation(api.progress.statements.setStatus);
  const completeAll = useMutation(api.progress.statements.completeAll);
  const remove = useMutation(api.progress.statements.remove);
  const { downloadStatement } = useDownloadProgress(works);
  const [attachmentRow, setAttachmentRow] = useState<StatementRow | null>(null);
  const [dialog, setDialog] = useState<"edit" | "approve" | "delete" | null>(
    null,
  );
  const [withAttachment, setWithAttachment] = useState(true);
  const [downloading, setDownloading] = useState<DocumentsFormat>();
  const [busy, setBusy] = useState(false);

  if (statement === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const { editable } = statement;
  const number = statement.number;

  const change = async (status: Statement["status"], message: string) => {
    setBusy(true);
    await run(() => setStatus({ statementId, status }), message);
    setBusy(false);
  };

  const complete = async () => {
    setBusy(true);
    const result = await run(() => completeAll({ statementId }));
    setBusy(false);
    if (result.ok) {
      toast.success(
        result.value > 0
          ? t("completed", { count: result.value })
          : t("completedNone"),
      );
    }
  };

  const deleteStatement = async () => {
    setBusy(true);
    const result = await run(() => remove({ statementId }), t("deleted"));
    setBusy(false);
    if (result.ok) {
      setDialog(null);
      onDeleted();
    }
  };

  const download = async (format: DocumentsFormat) => {
    setDownloading(format);
    await downloadStatement(
      statement,
      format,
      withAttachment,
      t("fileTitle", { number }),
    );
    setDownloading(undefined);
  };

  const facts = [
    t("period", {
      start: formatCalendarDate(statement.periodStart, locale),
      end: formatCalendarDate(statement.periodEnd, locale),
    }),
    t("date", { date: formatCalendarDate(statement.date, locale) }),
    statement.status === "sent" &&
      statement.sentAt !== undefined &&
      t("sentOn", { date: formatDay(statement.sentAt, locale) }),
    statement.status === "approved" &&
      statement.approvedAt !== undefined &&
      (statement.approvedBy
        ? t("approvedBy", {
            name: statement.approvedBy,
            date: formatDay(statement.approvedAt, locale),
          })
        : t("approvedOn", { date: formatDay(statement.approvedAt, locale) })),
    !editable && !statement.latest && t("notLatest"),
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {picker}
            <StatusPill tone={statementTone[statement.status]}>
              {tStatus(statement.status)}
            </StatusPill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statement.status === "draft" && statement.latest && (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => change("sent", t("sentToast"))}
              >
                {t("send")}
              </Button>
            )}
            {statement.status !== "approved" && statement.latest && (
              <Button
                type="button"
                size="sm"
                variant={statement.status === "sent" ? "default" : "outline"}
                disabled={busy}
                onClick={() => setDialog("approve")}
              >
                {t("approve")}
              </Button>
            )}
            {statement.status === "approved" && (
              <StatementInvoice statementId={statementId} />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={tc("actions")}
                >
                  <Icons.More aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {editable && (
                  <>
                    <DropdownMenuItem onSelect={() => setDialog("edit")}>
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={complete}>
                      {t("completeAll")}
                    </DropdownMenuItem>
                  </>
                )}
                {statement.status !== "draft" && statement.latest && (
                  <DropdownMenuItem
                    onSelect={() => change("draft", t("reopened"))}
                  >
                    {t("reopen")}
                  </DropdownMenuItem>
                )}
                {statement.latest && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-danger focus:text-danger"
                      onSelect={() => setDialog("delete")}
                    >
                      {t("delete")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="m-0 text-meta text-ink-3">{facts.join(" · ")}</p>
        {/* Nothing leaves from here: the firm sends it and notes what happened. */}
        {statement.latest && statement.status !== "approved" && (
          <p className="m-0 text-meta text-ink-2">
            {statement.status === "draft" ? t("nextDraft") : t("nextSent")}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <RowsTable
          statement={statement}
          onAttachment={setAttachmentRow}
          busy={busy}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Notes statement={statement} />
          <Recap statement={statement} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(["pdf", "xlsx"] as const).map((format) => (
            <Button
              key={format}
              type="button"
              variant="outline"
              size="sm"
              aria-label={t(`downloadLabel.${format}`)}
              disabled={downloading !== undefined}
              onClick={() => download(format)}
            >
              {downloading === format && (
                <Icons.Loader className="animate-spin" aria-hidden />
              )}
              {t(`download.${format}`)}
            </Button>
          ))}
          <div className="flex items-center gap-2">
            <Switch
              id="statement-attachment"
              checked={withAttachment}
              onCheckedChange={setWithAttachment}
            />
            <label
              htmlFor="statement-attachment"
              className="text-meta text-ink-2"
            >
              {t("withAttachment")}
            </label>
          </div>
        </div>
      </CardContent>
      <AttachmentDialog
        row={attachmentRow}
        editable={editable}
        onClose={() => setAttachmentRow(null)}
      />
      <StatementDialog
        estimateId={works._id}
        statement={statement}
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
      />
      <ApproveDialog
        statement={statement}
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={t("deleteTitle", { number })}
        description={t("deleteDescription")}
        confirm={t("deleteConfirm")}
        destructive
        busy={busy}
        onConfirm={deleteStatement}
      />
    </Card>
  );
}

/** The Articole with their quantities; the period's is typed in place. */
function RowsTable({
  statement,
  onAttachment,
  busy,
}: {
  statement: Statement;
  onAttachment: (row: StatementRow) => void;
  busy: boolean;
}) {
  const t = useScopedI18n("progress.statement");
  const locale = useCurrentLocale();
  const run = useRun();
  const setQuantity = useMutation(api.progress.statements.setQuantity);
  const { editable } = statement;
  let group: string | undefined;
  let periodValue = 0;

  // What's not there stays out of the way, so the period's figures stand out.
  const orDash = (value: number, shown: string) =>
    value === 0 ? <span className="text-ink-3">–</span> : shown;

  return (
    <Table bleed className="min-w-[50rem]">
      <TableHeader>
        <TableRow>
          <TableHead>{t("article")}</TableHead>
          <TableHead className="text-right">{t("contract")}</TableHead>
          <TableHead className="text-right">{t("previous")}</TableHead>
          <TableHead className="bg-muted text-right font-medium text-ink">
            {t("quantity")}
          </TableHead>
          <TableHead className="text-right">{t("cumulative")}</TableHead>
          <TableHead className="text-right">{t("remaining")}</TableHead>
          <TableHead className="text-right">{t("value")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {statement.rows.map((row) => {
          const heading = row.group !== group ? row.group : undefined;
          group = row.group;
          periodValue += row.value;
          const lines = row.attachment.length;
          const differs =
            lines > 0 && Math.abs(row.attachmentTotal - row.quantity) > 0.0005;
          const unit = formatUnit(row.unit, locale);
          return (
            <Fragment key={row._id}>
              {heading && (
                <TableGroupRow>
                  <TableCell
                    colSpan={7}
                    className="band-start band-end font-medium"
                  >
                    {heading}
                  </TableCell>
                </TableGroupRow>
              )}
              <TableRow className="group/row [&>td]:py-2.5">
                <TableCell className="relative align-top">
                  <div className="grid min-w-64 justify-items-start gap-0.5 pr-14">
                    <span>
                      <span className="tabular-nums text-ink-3">
                        {row.position}.{" "}
                      </span>
                      {row.title}
                    </span>
                    <span className="text-meta tabular-nums text-ink-3">
                      <span className="tabular-nums">{row.code}</span>
                      {" · "}
                      {t("pricePerUnit", {
                        price: formatMoney(row.unitPrice, locale),
                        unit,
                      })}
                    </span>
                  </div>
                  <div className="absolute right-1 top-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 gap-1 px-2",
                        differs ? "text-warning" : "text-ink-2",
                        // An empty one shows on the row it belongs to.
                        lines === 0 &&
                          "focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:hover)]:opacity-0",
                      )}
                      aria-label={t("attachmentLabel", { title: row.title })}
                      title={
                        differs
                          ? t("attachmentDiffers", {
                              total: formatQuantity(
                                row.attachmentTotal,
                                locale,
                              ),
                              unit,
                            })
                          : t("attachment")
                      }
                      onClick={() => onAttachment(row)}
                    >
                      <Paperclip aria-hidden />
                      {lines > 0 && (
                        <span className="tabular-nums">{lines}</span>
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-ink-2">
                  {formatQuantity(row.contractQuantity, locale)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-ink-2">
                  {orDash(
                    row.previousQuantity,
                    formatQuantity(row.previousQuantity, locale),
                  )}
                </TableCell>
                {/* The column being filled in. */}
                <TableCell className="whitespace-nowrap bg-muted text-right align-top">
                  <InlineNumber
                    value={row.quantity}
                    format={(value) =>
                      value === 0 ? "–" : formatQuantity(value, locale)
                    }
                    label={t("quantityLabel", { title: row.title })}
                    disabled={!editable || busy}
                    onCommit={(quantity) =>
                      void run(() => setQuantity({ rowId: row._id, quantity }))
                    }
                    className={cn(
                      // Up by the field's padding, level with the row's first line.
                      "-my-1 h-7",
                      // What can be typed in looks like it.
                      editable && !busy && "border-input bg-field",
                      row.quantity === 0 ? "text-ink-3" : "font-medium",
                    )}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-ink-2">
                  <div className="grid justify-items-end gap-0.5">
                    {orDash(
                      row.cumulativeQuantity,
                      formatQuantity(row.cumulativeQuantity, locale),
                    )}
                    {row.cumulativeQuantity !== 0 && (
                      <span
                        className={cn(
                          "text-meta",
                          row.over ? "text-warning" : "text-ink-3",
                        )}
                        title={row.over ? t("over") : undefined}
                      >
                        {formatPercent(row.percent, locale)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-ink-2">
                  {orDash(
                    Math.max(0, row.remainingQuantity),
                    formatQuantity(Math.max(0, row.remainingQuantity), locale),
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right align-top tabular-nums">
                  {orDash(row.value, formatMoney(row.value, locale))}
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="text-right font-medium">
            {t("direct")}
          </TableCell>
          <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
            {formatMoney(Math.round(periodValue * 100) / 100, locale)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

/** The period's totals with the Deviz's Cote, and what is kept back. */
function Recap({ statement }: { statement: Statement }) {
  const t = useScopedI18n("progress.statement.recap");
  const locale = useCurrentLocale();
  const { period, markups, retention } = statement;
  const lines = [
    { label: t("subtotal"), value: period.subtotal, strong: true },
    {
      label: t("vat", { percent: formatPercent(markups.vat, locale) }),
      value: period.vat,
    },
    { label: t("total"), value: period.total, strong: true },
    ...(retention > 0
      ? [
          {
            label: t("retention", {
              percent: formatPercent(statement.guarantee?.percent ?? 0, locale),
            }),
            value: -retention,
          },
          {
            label: t("net"),
            value: Math.round((period.total - retention) * 100) / 100,
            strong: true,
          },
        ]
      : []),
  ];
  return (
    <div className="grid content-start gap-2">
      <span className="text-caption text-ink-3">{t("title")}</span>
      <dl className="m-0 grid gap-1.5">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt
              className={cn(
                "text-body",
                line.strong ? "text-ink" : "text-ink-2",
              )}
            >
              {line.label}
            </dt>
            <dd
              className={cn(
                "m-0 text-body tabular-nums",
                line.strong ? "font-medium text-ink" : "text-ink-2",
              )}
            >
              {formatMoney(line.value, locale)} lei
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-meta text-ink-3">
        {t("cumulative", {
          amount: formatMoney(statement.cumulative.subtotal, locale),
          percent: formatPercent(statement.percent, locale),
        })}
      </p>
    </div>
  );
}

/** The notes printed under the statement, changed in place while a draft. */
function Notes({ statement }: { statement: Statement }) {
  const t = useScopedI18n("progress.statement");
  const run = useRun();
  const update = useMutation(api.progress.statements.update);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const notes = statement.notes ?? "";

  if (!statement.editable) {
    return (
      <div className="grid content-start gap-2">
        <span className="text-caption text-ink-3">{t("notes")}</span>
        <p className="m-0 whitespace-pre-line text-body text-ink-2">
          {notes || "–"}
        </p>
      </div>
    );
  }

  const save = async () => {
    if (draft === null) {
      return;
    }
    setSaving(true);
    const result = await run(
      () => update({ statementId: statement._id, notes: draft.trim() }),
      t("notesSaved"),
    );
    setSaving(false);
    if (result.ok) {
      setDraft(null);
    }
  };

  return (
    <div className="grid content-start gap-2">
      <label
        htmlFor="statement-notes-inline"
        className="text-caption text-ink-3"
      >
        {t("notes")}
      </label>
      <Textarea
        id="statement-notes-inline"
        value={draft ?? notes}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        maxLength={2000}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-meta text-ink-3">{t("notesHint")}</span>
        {draft !== null && draft.trim() !== notes && (
          <Button type="button" size="sm" disabled={saving} onClick={save}>
            {t("notesSave")}
          </Button>
        )}
      </div>
    </div>
  );
}

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
import { Download, Paperclip } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { DocumentsFormat } from "@/components/documents/use-download-documents";
import { InlineNumber } from "@/components/inline-number";
import { Nil } from "@/components/nil";
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

// Where there's room the table has all its columns. Where there isn't, an
// Articol says them on a line of its own, and the quantity to fill in stays.
const ROOMY_HEAD = "hidden text-right xl:table-cell";
const ROOMY_CELL =
  "hidden whitespace-nowrap text-right align-top tabular-nums text-ink-2 xl:table-cell";

// A quantity for reference, quieter than what's being filled in and what it
// comes to, on the row's baseline.
function Reference({ children }: { children: ReactNode }) {
  return (
    <span className="block">
      <span className="text-meta">{children}</span>
    </span>
  );
}

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
    // Usually the day the period ends: said only when it isn't.
    statement.date !== statement.periodEnd &&
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
      <CardHeader className="grid justify-stretch gap-1 sm:!pb-3">
        {/* Its name, what it comes to and what to do with it on one line;
            where it stands on a line of its own under them. */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="order-1 min-w-0">{picker}</div>
          <p className="order-3 m-0 basis-full text-meta tabular-nums text-ink-3 sm:order-4">
            <StatusPill tone={statementTone[statement.status]}>
              {tStatus(statement.status)}
            </StatusPill>
            {" · "}
            {facts.join(" · ")}
          </p>
          <p className="order-2 m-0 flex items-baseline gap-1.5 text-meta text-ink-3 xl:ml-auto">
            <span className="sr-only">{t("thisValue")}</span>
            <span className="text-figure tabular-nums text-ink">
              {formatMoney(statement.period.subtotal, locale)}
            </span>
            {t("thisValueUnit")}
          </p>
          <div className="order-4 flex flex-wrap items-center gap-2 sm:order-3 sm:ml-auto xl:ml-2">
            {/* Its label is on the line's baseline, with the words before it. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-wrap content-center items-baseline [&_svg]:self-center"
              aria-label={t("downloadLabel.pdf")}
              disabled={downloading !== undefined}
              onClick={() => download("pdf")}
            >
              {downloading === "pdf" ? (
                <Icons.Loader className="animate-spin" aria-hidden />
              ) : (
                <Download aria-hidden />
              )}
              {t("downloadPdf")}
            </Button>
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
            {statement.status === "sent" && statement.latest && (
              <Button
                type="button"
                size="sm"
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
                  // The dots end on the page's edge, not the button's.
                  className="-mr-2 size-8"
                  aria-label={tc("actions")}
                >
                  <Icons.More aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {statement.status === "draft" && statement.latest && (
                  <DropdownMenuItem onSelect={() => setDialog("approve")}>
                    {t("approve")}
                  </DropdownMenuItem>
                )}
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
        {/* Nothing leaves from here: the firm sends it and notes what happened.
            Said once, on the first statement. */}
        {number === 1 && statement.status !== "approved" && (
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
  const fillable = editable && !busy;
  let group: string | undefined;
  let periodValue = 0;
  // What a group's Articole come to in the period, for its band.
  const groupValues = new Map<StatementRow["group"], number>();
  for (const row of statement.rows) {
    groupValues.set(row.group, (groupValues.get(row.group) ?? 0) + row.value);
  }

  // What's not there is a quiet dash, so the period's figures stand out.
  const ifAny = (value: number, shown: string) =>
    value === 0 ? <Nil /> : shown;

  return (
    <Table bleed stack className="xl:min-w-[50rem]">
      <TableHeader>
        <TableRow>
          {/* Over the positions and the titles. */}
          <TableHead>
            <span className="inline-block w-4 text-right">#</span>
            <span className="ml-3">{t("article")}</span>
          </TableHead>
          <TableHead className={ROOMY_HEAD}>{t("contract")}</TableHead>
          <TableHead className={ROOMY_HEAD}>{t("previous")}</TableHead>
          {/* Over the numbers, not over the unit that follows them; in ink,
              over the column being filled in, whose cells are fields. */}
          <TableHead className="w-[140px] pr-[57px] text-right font-medium text-ink">
            {t("quantity")}
          </TableHead>
          <TableHead className={ROOMY_HEAD}>{t("cumulative")}</TableHead>
          <TableHead className={ROOMY_HEAD}>{t("remaining")}</TableHead>
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
          // All of it is done and nothing's typed in for this period.
          const spent = row.quantity === 0 && row.remainingQuantity <= 0;
          return (
            <Fragment key={row._id}>
              {heading && (
                <TableGroupRow className="max-md:py-0">
                  {/* A span can't follow which columns show. */}
                  <TableCell
                    colSpan={6}
                    className="band-start hidden font-medium first:pl-7 xl:table-cell"
                  >
                    {heading}
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    className="band-start font-medium !pl-7 max-md:flex max-md:items-center xl:hidden"
                  >
                    {heading}
                  </TableCell>
                  <TableCell className="band-end whitespace-nowrap text-right font-medium tabular-nums max-md:flex max-md:items-center">
                    {ifAny(
                      groupValues.get(row.group) ?? 0,
                      formatMoney(
                        Math.round((groupValues.get(row.group) ?? 0) * 100) /
                          100,
                        locale,
                      ),
                    )}
                  </TableCell>
                </TableGroupRow>
              )}
              <TableRow className="group/row md:[&>td]:h-14">
                <TableCell data-stack="wide" className="relative align-top">
                  <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-y-0.5 pr-6 xl:min-w-64">
                    <span className="w-4 text-right tabular-nums text-ink-3">
                      {row.position}
                    </span>
                    <span>{row.title}</span>
                    <span className="col-start-2 text-meta tabular-nums text-ink-3">
                      <span className="tabular-nums">{row.code}</span>
                      {" · "}
                      {t("pricePerUnit", {
                        price: formatMoney(row.unitPrice, locale),
                        unit,
                      })}
                    </span>
                    <span className="col-start-2 text-meta tabular-nums text-ink-3 xl:hidden">
                      {t("contract")}{" "}
                      {formatQuantity(row.contractQuantity, locale)} {unit}
                      {row.previousQuantity !== 0 &&
                        ` · ${t("previous")} ${formatQuantity(row.previousQuantity, locale)}`}
                      {row.remainingQuantity > 0 &&
                        ` · ${t("remaining")} ${formatQuantity(row.remainingQuantity, locale)}`}
                      {row.over && (
                        <span className="text-warning">
                          {" · "}
                          {t("over")}
                        </span>
                      )}
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
                <TableCell className={ROOMY_CELL}>
                  <Reference>
                    {formatQuantity(row.contractQuantity, locale)}
                  </Reference>
                </TableCell>
                <TableCell className={ROOMY_CELL}>
                  <Reference>
                    {ifAny(
                      row.previousQuantity,
                      formatQuantity(row.previousQuantity, locale),
                    )}
                  </Reference>
                </TableCell>
                {/* The column being filled in. */}
                <TableCell
                  className={cn(
                    "whitespace-nowrap pr-3 text-right align-top max-md:!pl-7 max-md:text-left",
                    // Nothing in it and nothing to put in it: a phone skips the line.
                    !fillable && row.quantity === 0 && "max-md:hidden",
                  )}
                >
                  <div className="flex items-baseline justify-end max-md:items-center max-md:justify-start max-md:gap-2">
                    {/* On a phone its head is gone, so it says what it is. */}
                    <span className="text-meta text-ink-3 md:hidden">
                      {t("quantity")}
                    </span>
                    <InlineNumber
                      fixed
                      value={row.quantity}
                      format={(value) =>
                        value !== 0 ? formatQuantity(value, locale) : ""
                      }
                      // A thumb can't point at a blank cell to find the field.
                      placeholder={spent && fillable ? "–" : undefined}
                      label={t("quantityLabel", { title: row.title })}
                      disabled={!fillable}
                      onCommit={(quantity) =>
                        void run(() =>
                          setQuantity({ rowId: row._id, quantity }),
                        )
                      }
                      className={cn(
                        // Up by the field's padding, level with the row's first line.
                        "-my-1 h-7 w-20",
                        // What's still to fill in is a field like any other, and
                        // so is what's been filled in: the column reads as the
                        // one being filled in.
                        fillable &&
                          !spent &&
                          "border-input border-b-edge bg-field",
                        fillable && "hover:bg-field focus:bg-field",
                        row.quantity === 0
                          ? "text-ink-3 placeholder:text-ink-3/60 md:placeholder:text-transparent"
                          : "font-medium text-ink",
                        // A thumb needs room, and has nothing to point with.
                        fillable && !spent
                          ? "max-md:my-0 max-md:mr-0 max-md:h-10 max-md:w-24 max-md:border-input max-md:border-b-edge max-md:bg-field"
                          : fillable
                            ? "max-md:my-0 max-md:mr-0 max-md:h-10 max-md:w-12 max-md:px-0 max-md:text-left"
                            : "max-md:my-0 max-md:h-auto max-md:w-auto",
                      )}
                    />
                    {/* What's being typed in, as on the Deviz. */}
                    <span
                      className={cn(
                        "text-meta text-ink-3 md:ml-[17px] md:w-7 md:text-left md:text-body",
                        spent && "invisible",
                      )}
                    >
                      {unit}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={ROOMY_CELL}>
                  <div className="grid justify-items-end gap-0.5">
                    <Reference>
                      {ifAny(
                        row.cumulativeQuantity,
                        formatQuantity(row.cumulativeQuantity, locale),
                      )}
                    </Reference>
                    {/* What's left says how far it got; more than all of it
                        wants saying. */}
                    {row.over && (
                      <span
                        className="text-meta text-warning"
                        title={t("over")}
                      >
                        {formatPercent(row.percent, locale)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className={ROOMY_CELL}>
                  <Reference>
                    {/* All of it done says so, rather than a zero. */}
                    {row.remainingQuantity <= 0
                      ? t("complete")
                      : formatQuantity(row.remainingQuantity, locale)}
                  </Reference>
                </TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap text-right align-top font-medium tabular-nums",
                    !fillable && row.quantity === 0 && "max-md:hidden",
                  )}
                >
                  {ifAny(row.value, formatMoney(row.value, locale))}
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
        <TableRow className="hover:bg-transparent">
          {/* A span can't follow which columns show. */}
          <TableCell
            colSpan={6}
            className="hidden text-right font-medium xl:table-cell"
          >
            {t("direct")}
          </TableCell>
          <TableCell
            colSpan={2}
            className="text-right font-medium max-md:text-left xl:hidden"
          >
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

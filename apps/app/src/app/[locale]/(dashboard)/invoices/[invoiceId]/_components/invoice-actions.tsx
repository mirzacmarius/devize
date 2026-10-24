"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { toast } from "@devize/ui/sonner";
import { useMutation, useQuery } from "convex/react";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";
import { useDownloadInvoice } from "./use-download-invoice";

type Open = "issue" | "delete" | "storno" | "cancel" | null;

/**
 * The header's actions, which follow the invoice's life: issue a draft or
 * delete it; download an issued one as PDF or e-Factura XML, reverse it with
 * a storno, or cancel one that never left the firm.
 */
export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.page");
  const tc = useScopedI18n("common");
  const router = useRouter();
  const run = useRun();
  const user = useQuery(api.users.getUser);
  const remove = useMutation(api.invoices.invoices.remove);
  const createStorno = useMutation(api.invoices.invoices.createStorno);
  const cancel = useMutation(api.invoices.invoices.cancel);
  const download = useDownloadInvoice();
  const [open, setOpen] = useState<Open>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = invoice.status === "draft";
  const live = invoice.status === "issued" || invoice.status === "paid";
  const code = invoice.code ?? t("draft");
  const canStorno =
    live && invoice.kind !== "storno" && invoice.stornoedBy === null;
  const canCancel =
    invoice.canCancel &&
    invoice.status === "issued" &&
    invoice.efactura.status === "not_sent" &&
    invoice.payments.length === 0 &&
    invoice.stornoedBy === null;

  const close = () => setOpen(null);

  const withBusy = async (action: () => Promise<boolean>) => {
    setBusy(true);
    const done = await action();
    setBusy(false);
    return done;
  };

  const deleteDraft = () =>
    withBusy(async () => {
      const result = await run(
        () => remove({ invoiceId: invoice._id }),
        t("deleted"),
      );
      if (result.ok) {
        router.push(
          invoice.estimate ? `/estimates/${invoice.estimate._id}` : "/invoices",
        );
      }
      return result.ok;
    });

  const storno = () =>
    withBusy(async () => {
      const result = await run(
        () =>
          createStorno({
            invoiceId: invoice._id,
            reason: reason.trim() || undefined,
          }),
        t("stornoCreated"),
      );
      if (result.ok) {
        close();
        router.push(`/invoices/${result.value}`);
      }
      return result.ok;
    });

  const cancelInvoice = () =>
    withBusy(async () => {
      const result = await run(
        () => cancel({ invoiceId: invoice._id }),
        t("cancelled"),
      );
      if (result.ok) {
        close();
      }
      return result.ok;
    });

  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() =>
          withBusy(() => download.pdf(invoice, user?.name ?? undefined))
        }
      >
        <FileText aria-hidden />
        {t("pdf")}
      </Button>
      {draft ? (
        <Button onClick={() => setOpen("issue")} disabled={busy}>
          {t("issue")}
        </Button>
      ) : (
        live && (
          <Button
            disabled={busy}
            onClick={() => withBusy(() => download.xml(invoice._id))}
          >
            <Download aria-hidden />
            {t("xml")}
          </Button>
        )
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tc("actions")}>
            <Icons.More aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {invoice.estimate && (
            <DropdownMenuItem asChild>
              <Link href={`/estimates/${invoice.estimate._id}`}>
                {t("deviz", { code: invoice.estimate.code })}
              </Link>
            </DropdownMenuItem>
          )}
          {canStorno && (
            <DropdownMenuItem onSelect={() => setOpen("storno")}>
              {t("storno")}
            </DropdownMenuItem>
          )}
          {(draft || canCancel) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onSelect={() => setOpen(draft ? "delete" : "cancel")}
              >
                {draft ? t("delete") : t("cancel")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {draft && (
        <IssueDialog
          invoice={invoice}
          open={open === "issue"}
          onClose={close}
        />
      )}
      <ConfirmDialog
        open={open === "delete"}
        onClose={close}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirm={t("deleteConfirm")}
        destructive
        busy={busy}
        onConfirm={deleteDraft}
      />
      <ConfirmDialog
        open={open === "cancel"}
        onClose={close}
        title={t("cancelTitle", { code })}
        description={t("cancelDescription")}
        confirm={t("cancelConfirm")}
        destructive
        busy={busy}
        onConfirm={cancelInvoice}
      />
      <Dialog
        open={open === "storno"}
        onOpenChange={(next) => !next && close()}
      >
        <DialogContent closeLabel={tc("close")}>
          <DialogHeader>
            <DialogTitle>{t("stornoTitle", { code })}</DialogTitle>
            <DialogDescription>{t("stornoDescription")}</DialogDescription>
          </DialogHeader>
          <Field label={t("stornoReason")} htmlFor="storno-reason">
            <Input
              id="storno-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("stornoReasonPlaceholder")}
              maxLength={200}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              {tc("cancel")}
            </Button>
            <Button disabled={busy} onClick={storno}>
              {t("stornoConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Numbers the draft: the series it goes in and the day it is issued. */
function IssueDialog({
  invoice,
  open,
  onClose,
}: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("invoices.page");
  const tc = useScopedI18n("common");
  const run = useRun();
  const issue = useMutation(api.invoices.invoices.issue);
  // Without a series of its own, the firm's first invoice starts DVZ at 1.
  const fallback = { code: "DVZ", nextNumber: 1, isDefault: true };
  const options =
    invoice.seriesOptions.length > 0 ? invoice.seriesOptions : [fallback];
  const preferred =
    options.find((option) => option.isDefault) ?? options[0] ?? fallback;
  const [series, setSeries] = useState(preferred.code);
  const [date, setDate] = useState(() =>
    invoice.issueDate < todayInput() ? invoice.issueDate : todayInput(),
  );
  const [busy, setBusy] = useState(false);
  const errors = invoice.findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const chosen = options.find((option) => option.code === series) ?? preferred;

  const confirm = async () => {
    setBusy(true);
    const result = await run(() =>
      issue({ invoiceId: invoice._id, series, issueDate: date }),
    );
    setBusy(false);
    if (result.ok) {
      onClose();
      toast.success(t("issued", { code: result.value.code }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("issueTitle")}</DialogTitle>
          <DialogDescription>{t("issueDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {options.length > 1 ? (
            <Field label={t("issueSeries")} htmlFor="issue-series">
              <Select value={series} onValueChange={setSeries}>
                <SelectTrigger id="issue-series">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {t("issueNext", {
                        code: option.code,
                        number: option.nextNumber,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <p className="m-0 text-body text-ink-2">
              {t("issueNext", {
                code: chosen.code,
                number: chosen.nextNumber,
              })}
            </p>
          )}
          <Field
            label={t("issueDate")}
            htmlFor="issue-date"
            hint={t("issueDateHint")}
          >
            <Input
              id="issue-date"
              type="date"
              value={date}
              max={todayInput()}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          {errors > 0 && (
            <p role="alert" className="m-0 text-body text-danger">
              {t("issueBlocked", { count: errors })}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button disabled={busy || errors > 0 || !date} onClick={confirm}>
            {t("issueConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

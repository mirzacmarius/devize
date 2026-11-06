"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
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
import { toast } from "@devize/ui/sonner";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { estimateCode } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { useInvoiceActions } from "../_invoices/use-invoice-actions";
import { SaveTemplateDialog } from "./save-template";
import type { Estimate, OpenPanel } from "./types";

type Status = Doc<"estimates">["status"];

/**
 * The header's actions, which follow the Deviz's life: make the client's
 * Ofertă from a draft, record the client's answer, start a revision to change
 * a sent one, bill an accepted one. Marking a draft sent is for one that left
 * some other way.
 */
export function EstimateActions({
  estimate,
  failedChecks,
  openChecks,
  open,
  fill = false,
}: {
  estimate: Estimate;
  failedChecks: number;
  openChecks: number;
  open: OpenPanel;
  // On a phone the main action takes the bar, while nothing else is beside it.
  fill?: boolean;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const tBasket = useScopedI18n("prices.basket");
  const tMaterials = useScopedI18n("materials");
  const tProgress = useScopedI18n("progress");
  const tTemplates = useScopedI18n("templates.save");
  const tTarget = useScopedI18n("targetPrice");
  const router = useRouter();
  const run = useRun();
  const setStatus = useMutation(api.estimates.estimates.setStatus);
  const duplicate = useMutation(api.estimates.estimates.duplicate);
  const remove = useMutation(api.estimates.estimates.remove);
  const refreshPrices = useMutation(api.estimates.lineItems.refreshPrices);
  const offer = useQuery(api.offers.offers.forEstimate, {
    estimateId: estimate._id,
  });
  const refreshedMessage = useRefreshedMessage();
  const [confirm, setConfirm] = useState<"send" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const { status } = estimate;
  const estimateId = estimate._id;
  const code = estimateCode(estimate.number, estimate.revision);
  const invoicing = useInvoiceActions(estimateId, status === "accepted");
  const [nextInvoice, ...laterInvoices] = invoicing.actions;
  const work = useQuery(
    api.progress.statements.forEstimate,
    status === "accepted" ? { estimateId } : "skip",
  );
  // While the work goes on, what comes next is its next Situație; the final
  // invoice waits in the menu.
  const midWork =
    nextInvoice?.key === "final" &&
    work !== undefined &&
    work.statements.length > 0 &&
    work.executed.percent < 100;
  const menuInvoices = midWork ? invoicing.actions : laterInvoices;
  const primaryClass = fill ? "max-sm:flex-1" : undefined;

  const changeStatus = async (next: Status, success: string) => {
    setBusy(true);
    await run(() => setStatus({ estimateId, status: next }), success);
    setBusy(false);
  };

  const copy = async (asRevision: boolean) => {
    setBusy(true);
    const result = await run(
      () => duplicate({ estimateId, asRevision }),
      asRevision ? t("actions.revisionCreated") : t("actions.copyCreated"),
    );
    setBusy(false);
    if (result.ok) {
      router.push(`/estimates/${result.value}`);
    }
  };

  const refresh = async () => {
    setBusy(true);
    const result = await run(() => refreshPrices({ estimateId }));
    setBusy(false);
    if (result.ok) {
      toast.success(refreshedMessage(result.value));
    }
  };

  const deleteEstimate = async () => {
    setBusy(true);
    const result = await run(
      () => remove({ estimateId }),
      t("actions.deleted", { code }),
    );
    if (result.ok) {
      router.push("/estimates");
    } else {
      setBusy(false);
    }
  };

  const empty = estimate.lineItems.length === 0;
  // Only one link at a time, and none once one is accepted.
  const linkInUse =
    offer?.status === "sent" ||
    offer?.status === "viewed" ||
    offer?.status === "accepted";

  const primary =
    status === "draft" ? (
      // An empty draft's next step is in its Articole.
      empty ? null : linkInUse ? (
        <Button
          className={primaryClass}
          onClick={() => setConfirm("send")}
          disabled={busy}
        >
          {t("actions.markSent")}
        </Button>
      ) : (
        <Button
          className={primaryClass}
          onClick={() => open({ kind: "offer" })}
          disabled={busy}
        >
          {t("actions.createOffer")}
        </Button>
      )
    ) : status === "sent" ? (
      <Button
        className={primaryClass}
        onClick={() => changeStatus("accepted", t("actions.acceptedDone"))}
        disabled={busy}
      >
        {t("actions.markAccepted")}
      </Button>
    ) : midWork ? (
      <Button className={primaryClass} asChild>
        <Link href={`/estimates/${estimateId}/progress`}>
          {t("actions.openProgress")}
        </Link>
      </Button>
    ) : nextInvoice ? (
      // Once accepted, what comes next is billing it.
      <Button
        className={primaryClass}
        onClick={nextInvoice.run}
        disabled={busy || invoicing.busy}
      >
        {nextInvoice.label}
      </Button>
    ) : (
      <Button
        variant={status === "accepted" ? "outline" : "default"}
        className={primaryClass}
        onClick={() => copy(true)}
        disabled={busy}
      >
        {t("actions.newRevision")}
      </Button>
    );

  return (
    <>
      {status === "sent" && (
        <Button
          variant="outline"
          className="max-sm:hidden"
          onClick={() => changeStatus("rejected", t("actions.rejectedDone"))}
          disabled={busy}
        >
          {t("actions.markRejected")}
        </Button>
      )}
      {status === "draft" && !empty && openChecks > 0 && (
        <Button variant="ghost" className="max-md:hidden" asChild>
          <a href="#checks">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-warning-dot"
            />
            {t("actions.openChecks", { count: openChecks })}
          </a>
        </Button>
      )}
      {primary}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // The dots end on the page's edge, not the button's.
            className="max-sm:ml-auto sm:-mr-2.5"
            aria-label={tc("actions")}
          >
            <Icons.More aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {status === "draft" ? (
            <>
              {!linkInUse && (
                <DropdownMenuItem
                  disabled={empty}
                  onSelect={() => setConfirm("send")}
                >
                  {t("actions.markSent")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => open({ kind: "details" })}>
                {t("actions.details")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => open({ kind: "markups" })}>
                {t("actions.markups")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={estimate.lineItems.length === 0}
                onSelect={() => open({ kind: "target" })}
              >
                {tTarget("open")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={refresh}>
                {t("actions.refreshPrices")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {menuInvoices.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  disabled={invoicing.busy}
                  onSelect={action.run}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
              {nextInvoice && (
                <DropdownMenuItem onSelect={() => copy(true)}>
                  {t("actions.newRevision")}
                </DropdownMenuItem>
              )}
              {status === "sent" && (
                <>
                  <DropdownMenuItem
                    className="sm:hidden"
                    onSelect={() =>
                      changeStatus("rejected", t("actions.rejectedDone"))
                    }
                  >
                    {t("actions.markRejected")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => copy(true)}>
                    {t("actions.newRevision")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onSelect={() => changeStatus("draft", t("actions.reopened"))}
              >
                {t("actions.backToDraft")}
              </DropdownMenuItem>
              {status !== "archived" && (
                <DropdownMenuItem
                  onSelect={() =>
                    changeStatus("archived", t("actions.archivedDone"))
                  }
                >
                  {t("actions.archive")}
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/estimates/${estimateId}/basket`}>
              {tBasket("open")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/estimates/${estimateId}/materials`}>
              {tMaterials("open")}
            </Link>
          </DropdownMenuItem>
          {status === "accepted" && !midWork && (
            <DropdownMenuItem asChild>
              <Link href={`/estimates/${estimateId}/progress`}>
                {tProgress("open")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => copy(false)}>
            {t("actions.copy")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={estimate.lineItems.length === 0}
            onSelect={() => setSavingTemplate(true)}
          >
            {tTemplates("action")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() => setConfirm("delete")}
          >
            {t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveTemplateDialog
        estimate={estimate}
        open={savingTemplate}
        onOpenChange={setSavingTemplate}
      />

      <Dialog
        open={confirm === "send"}
        onOpenChange={(next) => !next && setConfirm(null)}
      >
        <DialogContent closeLabel={tc("close")}>
          <DialogHeader>
            <DialogTitle>{t("send.title", { code })}</DialogTitle>
            <DialogDescription>{t("send.description")}</DialogDescription>
          </DialogHeader>
          {failedChecks > 0 && (
            <p role="alert" className="m-0 text-body text-danger">
              {t("send.failedChecks", { count: failedChecks })}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {tc("cancel")}
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                await changeStatus("sent", t("send.done"));
                setConfirm(null);
              }}
            >
              {t("send.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirm === "delete"}
        onOpenChange={(next) => !next && setConfirm(null)}
      >
        <DialogContent closeLabel={tc("close")}>
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title", { code })}</DialogTitle>
            <DialogDescription>
              {t("deleteDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={deleteEstimate}
            >
              {t("deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Says how many line items got new prices, or that none changed. */
export function useRefreshedMessage() {
  const t = useScopedI18n("estimate");
  return (changed: number) =>
    changed > 0
      ? t("actions.pricesRefreshed", { count: changed })
      : t("actions.pricesUnchanged");
}

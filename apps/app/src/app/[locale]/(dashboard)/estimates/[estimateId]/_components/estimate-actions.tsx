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
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { estimateCode } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import type { Estimate, OpenPanel } from "./types";

type Status = Doc<"estimates">["status"];

/**
 * The header's actions, which follow the Deviz's life: mark a draft sent,
 * record the client's answer, start a revision to change a sent one.
 */
export function EstimateActions({
  estimate,
  failedChecks,
  open,
}: {
  estimate: Estimate;
  failedChecks: number;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const tBasket = useScopedI18n("prices.basket");
  const tMaterials = useScopedI18n("materials");
  const tProgress = useScopedI18n("progress");
  const router = useRouter();
  const run = useRun();
  const setStatus = useMutation(api.estimates.estimates.setStatus);
  const duplicate = useMutation(api.estimates.estimates.duplicate);
  const remove = useMutation(api.estimates.estimates.remove);
  const refreshPrices = useMutation(api.estimates.lineItems.refreshPrices);
  const refreshedMessage = useRefreshedMessage();
  const [confirm, setConfirm] = useState<"send" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const { status } = estimate;
  const estimateId = estimate._id;
  const code = estimateCode(estimate.number, estimate.revision);

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

  const primary =
    status === "draft" ? (
      <Button onClick={() => setConfirm("send")} disabled={busy}>
        {t("actions.markSent")}
      </Button>
    ) : status === "sent" ? (
      <Button
        onClick={() => changeStatus("accepted", t("actions.acceptedDone"))}
        disabled={busy}
      >
        {t("actions.markAccepted")}
      </Button>
    ) : (
      <Button onClick={() => copy(true)} disabled={busy}>
        {t("actions.newRevision")}
      </Button>
    );

  return (
    <>
      {status === "draft" && (
        <Button variant="outline" onClick={() => open({ kind: "details" })}>
          {t("actions.details")}
        </Button>
      )}
      {status === "sent" && (
        <Button
          variant="outline"
          onClick={() => changeStatus("rejected", t("actions.rejectedDone"))}
          disabled={busy}
        >
          {t("actions.markRejected")}
        </Button>
      )}
      {primary}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tc("actions")}>
            <Icons.More aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {status === "draft" ? (
            <>
              <DropdownMenuItem onSelect={() => open({ kind: "markups" })}>
                {t("actions.markups")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={refresh}>
                {t("actions.refreshPrices")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {status === "sent" && (
                <DropdownMenuItem onSelect={() => copy(true)}>
                  {t("actions.newRevision")}
                </DropdownMenuItem>
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
          {status === "accepted" && (
            <DropdownMenuItem asChild>
              <Link href={`/estimates/${estimateId}/progress`}>
                {tProgress("open")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => copy(false)}>
            {t("actions.copy")}
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

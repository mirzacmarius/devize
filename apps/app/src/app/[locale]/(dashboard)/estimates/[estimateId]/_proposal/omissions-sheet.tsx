"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { AISuggestion } from "@devize/ui/ai-suggestion";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { toast } from "@devize/ui/sonner";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { ProposalReview } from "./proposal-review";
import type { OmissionsCheck } from "./types";
import { failureReason, useProposalError } from "./use-proposal-error";

/** Starts an omissions check, and says why when it can't. */
export function useStartOmissions(estimateId: Id<"estimates">) {
  const start = useMutation(api.proposals.omissions.start);
  const proposalError = useProposalError();
  const [starting, setStarting] = useState(false);
  const run = async () => {
    setStarting(true);
    try {
      await start({ estimateId });
      return true;
    } catch (error) {
      toast.error(proposalError(error));
      return false;
    } finally {
      setStarting(false);
    }
  };
  return { start: run, starting };
}

/**
 * The Detector de omisiuni: Devize AI reads the Deviz for the works it
 * misses, in the background, and the contractor keeps the ones that belong
 * before any of them goes into the Deviz. For a tender, the missing works
 * are clarifications to request from the contracting authority.
 */
export function OmissionsSheet({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("proposal");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icons.AI className="size-5 text-ai" aria-hidden />
            {t("omissions.title")}
          </SheetTitle>
          <SheetDescription>
            {estimate.kind === "tender"
              ? t("omissions.tender")
              : t("omissions.description")}
          </SheetDescription>
        </SheetHeader>
        {open && <OmissionsFlow estimate={estimate} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function OmissionsFlow({
  estimate,
  onClose,
}: {
  estimate: Estimate;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  const check = useQuery(api.proposals.omissions.latest, {
    estimateId: estimate._id,
  });
  const { start, starting } = useStartOmissions(estimate._id);

  if (check === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }
  switch (check?.status) {
    case "working":
    case "applying":
      return <Working check={check} />;
    case "failed":
      return (
        <Failed
          check={check}
          editable={estimate.lockedAt === undefined}
          starting={starting}
          onRetry={start}
        />
      );
    case "ready":
      return (
        <ProposalReview
          proposal={check}
          forTender={estimate.kind === "tender"}
          onApplied={onClose}
          onNew={() => void start()}
        />
      );
    default:
      return (
        <Start
          estimate={estimate}
          check={check}
          starting={starting}
          onStart={start}
        />
      );
  }
}

/** What the check does, what the last one left, and the button to run it. */
function Start({
  estimate,
  check,
  starting,
  onStart,
}: {
  estimate: Estimate;
  check: OmissionsCheck | null;
  starting: boolean;
  onStart: () => Promise<boolean>;
}) {
  const t = useScopedI18n("proposal");
  const empty = estimate.lineItems.length === 0;
  const reviewed =
    check?.status === "dismissed" &&
    check.found + check.questions.length + check.remarks.length > 0;
  return (
    <div className="grid gap-4">
      {check?.status === "applied" && (
        <p className="m-0 text-body text-ink-2">
          {t("omissions.lastApplied", { count: check.appliedCount })}
        </p>
      )}
      {reviewed && (
        <p className="m-0 text-body text-ink-2">
          {t("omissions.lastReviewed")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ai"
          disabled={empty || starting || estimate.lockedAt !== undefined}
          onClick={() => void onStart()}
        >
          {starting ? (
            <Icons.Loader className="animate-spin" aria-hidden />
          ) : (
            <Icons.AI aria-hidden />
          )}
          {check ? t("omissions.again") : t("omissions.start")}
        </Button>
        {empty && (
          <span className="text-meta text-ink-3">{t("omissions.noItems")}</span>
        )}
      </div>
      <p className="m-0 text-meta text-ink-3">{t("omissions.privacy")}</p>
    </div>
  );
}

function Working({ check }: { check: OmissionsCheck }) {
  const t = useScopedI18n("proposal");
  const dismiss = useMutation(api.proposals.proposals.dismiss);
  const run = useRun();
  return (
    <div className="grid gap-4">
      <AISuggestion title={t("omissions.working.title")}>
        <p role="status" className="m-0 flex items-center gap-2">
          <Icons.Loader
            className="size-4 shrink-0 animate-spin text-ai"
            aria-hidden
          />
          {check.items.length > 0
            ? t("omissions.working.matching", { count: check.items.length })
            : t("omissions.working.reading")}
        </p>
        <p className="m-0 mt-1 text-meta text-ink-3">
          {t("omissions.working.hint")}
        </p>
      </AISuggestion>
      <Button
        variant="ghost"
        className="justify-self-start"
        onClick={() => run(() => dismiss({ proposalId: check._id }))}
      >
        {t("omissions.working.cancel")}
      </Button>
    </div>
  );
}

function Failed({
  check,
  editable,
  starting,
  onRetry,
}: {
  check: OmissionsCheck;
  editable: boolean;
  starting: boolean;
  onRetry: () => Promise<boolean>;
}) {
  const t = useScopedI18n("proposal");
  return (
    <div className="grid gap-4">
      <div
        role="alert"
        className="grid gap-1 rounded-md border border-danger-border bg-danger-soft px-4 py-3"
      >
        <p className="m-0 text-body font-medium text-danger">
          {t("omissions.failedTitle")}
        </p>
        <p className="m-0 text-body text-ink-2">
          {t(`failed.reasons.${failureReason(check.error, "omissions")}`)}
        </p>
      </div>
      <Button
        className="justify-self-end"
        disabled={!editable || starting}
        onClick={() => void onRetry()}
      >
        {starting && <Icons.Loader className="animate-spin" aria-hidden />}
        {t("failed.retry")}
      </Button>
    </div>
  );
}

"use client";

import { api } from "@devize/backend/convex/_generated/api";
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
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { DescribeForm, type DescribeInitial } from "./describe-form";
import { ProposalReview } from "./proposal-review";
import type { Proposal } from "./types";
import { failureReason, useProposalError } from "./use-proposal-error";

/**
 * Proposes the Deviz's articles with AI: the contractor describes the work,
 * the AI writes the articles in the background, and the contractor checks
 * them here before any goes into the Deviz.
 */
export function ProposalSheet({
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
            {t("title")}
          </SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        {open && <ProposalFlow estimate={estimate} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function ProposalFlow({
  estimate,
  onClose,
}: {
  estimate: Estimate;
  onClose: () => void;
}) {
  const t = useScopedI18n("proposal");
  const tc = useScopedI18n("common");
  const proposal = useQuery(api.proposals.proposals.latest, {
    estimateId: estimate._id,
  });
  // A new description, started fresh or from the last proposal's.
  const [composing, setComposing] = useState<DescribeInitial | null>(null);

  if (proposal === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }
  const again = (from: Proposal) =>
    setComposing({ text: from.text, photos: from.photos });
  const open =
    proposal?.status === "working" ||
    proposal?.status === "ready" ||
    proposal?.status === "failed";
  if (composing || !proposal || !open) {
    return (
      <div className="grid gap-4">
        {open && (
          <Button
            variant="link"
            className="justify-self-start"
            onClick={() => setComposing(null)}
          >
            <ArrowLeft aria-hidden />
            {t("describe.back")}
          </Button>
        )}
        <DescribeForm
          estimate={estimate}
          initial={composing ?? undefined}
          onStarted={() => setComposing(null)}
        />
      </div>
    );
  }
  switch (proposal.status) {
    case "working":
      return <Working proposal={proposal} />;
    case "failed":
      return (
        <Failed
          estimateId={estimate._id}
          proposal={proposal}
          onEdit={() => again(proposal)}
        />
      );
    case "ready":
      return (
        <ProposalReview
          proposal={proposal}
          onApplied={onClose}
          onNew={() => again(proposal)}
        />
      );
  }
}

/** What the contractor asked for: the description and the photos. */
function Request({ proposal }: { proposal: Proposal }) {
  if (!proposal.text && proposal.photos.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-3 rounded-md border border-border bg-sunken px-4 py-3">
      {proposal.text && (
        <p className="m-0 line-clamp-6 whitespace-pre-line text-body text-ink-2">
          {proposal.text}
        </p>
      )}
      {proposal.photos.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {proposal.photos.map((photo) => (
            <li
              key={photo._id}
              className="size-16 overflow-hidden rounded-sm border border-border bg-card"
            >
              {photo.url && (
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="size-full object-cover"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Working({ proposal }: { proposal: Proposal }) {
  const t = useScopedI18n("proposal");
  const dismiss = useMutation(api.proposals.proposals.dismiss);
  const run = useRun();
  return (
    <div className="grid gap-4">
      <AISuggestion title={t("working.title")}>
        <p role="status" className="m-0 flex items-center gap-2">
          <Icons.Loader className="size-4 animate-spin text-ai" aria-hidden />
          {proposal.items.length > 0
            ? t("working.matching", { count: proposal.items.length })
            : t("working.reading")}
        </p>
        <p className="m-0 mt-1 text-meta text-ink-3">{t("working.hint")}</p>
      </AISuggestion>
      <Request proposal={proposal} />
      <Button
        variant="ghost"
        className="justify-self-start"
        onClick={() => run(() => dismiss({ proposalId: proposal._id }))}
      >
        {t("working.cancel")}
      </Button>
    </div>
  );
}

function Failed({
  estimateId,
  proposal,
  onEdit,
}: {
  estimateId: Estimate["_id"];
  proposal: Proposal;
  onEdit: () => void;
}) {
  const t = useScopedI18n("proposal");
  const start = useMutation(api.proposals.proposals.start);
  const proposalError = useProposalError();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await start({
        estimateId,
        text: proposal.text,
        fileIds: proposal.photos.map((photo) => photo._id),
      });
    } catch (error) {
      toast.error(proposalError(error));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div
        role="alert"
        className="grid gap-1 rounded-md border border-danger-border bg-danger-soft px-4 py-3"
      >
        <p className="m-0 text-body font-medium text-danger">
          {t("failed.title")}
        </p>
        <p className="m-0 text-body text-ink-2">
          {t(`failed.reasons.${failureReason(proposal.error)}`)}
        </p>
      </div>
      <Request proposal={proposal} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onEdit}>
          {t("failed.edit")}
        </Button>
        <Button onClick={retry} disabled={retrying}>
          {retrying && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("failed.retry")}
        </Button>
      </div>
    </div>
  );
}

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
import { ArrowLeft, File as FileIcon } from "lucide-react";
import { useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { DescribeForm, type DescribeInitial } from "./describe-form";
import { ProposalReview } from "./proposal-review";
import { TenderForm, type TenderInitial } from "./tender-form";
import type { Proposal } from "./types";
import { failureReason, useProposalError } from "./use-proposal-error";

type Mode = "describe" | "tender";

/** A new proposal being written, started fresh or from the last one's. */
type Compose =
  | { mode: "describe"; initial?: DescribeInitial }
  | { mode: "tender"; initial?: TenderInitial };

/**
 * Proposes the Deviz's articles with AI: from a description of the work, or
 * from a tender's quantity lists. The AI works in the background, and the
 * contractor checks its proposal here before any of it goes into the Deviz.
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
  const [composing, setComposing] = useState<Compose | null>(null);

  if (proposal === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }
  const again = (from: Proposal) =>
    setComposing(
      from.source === "tender"
        ? { mode: "tender", initial: { files: from.files } }
        : {
            mode: "describe",
            initial: { text: from.text, photos: from.photos },
          },
    );
  const open =
    proposal?.status === "working" ||
    proposal?.status === "ready" ||
    proposal?.status === "applying" ||
    proposal?.status === "failed";
  if (composing || !proposal || !open) {
    // A tender's Deviz starts from its lists.
    const compose: Compose = composing ?? {
      mode: estimate.kind === "tender" ? "tender" : "describe",
    };
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
        <SegmentedControl<Mode>
          label={t("modes.label")}
          value={compose.mode}
          onChange={(mode) => setComposing({ mode })}
          options={[
            { value: "describe", label: t("modes.describe") },
            { value: "tender", label: t("modes.tender") },
          ]}
          className="justify-self-start"
        />
        {compose.mode === "tender" ? (
          <TenderForm
            key="tender"
            estimate={estimate}
            initial={compose.initial}
            onStarted={() => setComposing(null)}
          />
        ) : (
          <DescribeForm
            key="describe"
            estimate={estimate}
            initial={compose.initial}
            onStarted={() => setComposing(null)}
          />
        )}
      </div>
    );
  }
  switch (proposal.status) {
    case "working":
      return <Working proposal={proposal} />;
    case "applying":
      return <Applying proposal={proposal} />;
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

/** What the contractor gave: the description and photos, or the lists. */
function Request({ proposal }: { proposal: Proposal }) {
  if (proposal.source === "tender") {
    return (
      <ul className="m-0 grid list-none gap-1.5 rounded-md border border-border bg-sunken px-4 py-3">
        {proposal.files.map((file) => (
          <li
            key={file._id}
            className="flex min-w-0 items-center gap-2 text-body text-ink-2"
          >
            <FileIcon className="size-4 shrink-0 text-ink-3" aria-hidden />
            <span className="truncate">{file.name}</span>
          </li>
        ))}
      </ul>
    );
  }
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

/** Where the AI is: writing articles, or reading a tender's lists. */
function useWorkingStatus() {
  const t = useScopedI18n("proposal");
  return (proposal: Proposal) => {
    const progress = proposal.progress;
    if (proposal.source !== "tender" || !progress) {
      return proposal.items.length > 0
        ? t("working.matching", { count: proposal.items.length })
        : t("working.reading");
    }
    const files = Math.max(proposal.files.length, 1);
    return progress.stage === "reading"
      ? t("tender.working.reading", {
          count: progress.read,
          file: Math.min(progress.file + 1, files),
          files,
        })
      : t("tender.working.matching", {
          count: progress.read,
          matched: progress.matched,
        });
  };
}

function Working({ proposal }: { proposal: Proposal }) {
  const t = useScopedI18n("proposal");
  const status = useWorkingStatus();
  const dismiss = useMutation(api.proposals.proposals.dismiss);
  const run = useRun();
  const tender = proposal.source === "tender";
  return (
    <div className="grid gap-4">
      <AISuggestion
        title={tender ? t("tender.working.title") : t("working.title")}
      >
        <p role="status" className="m-0 flex items-center gap-2">
          <Icons.Loader
            className="size-4 shrink-0 animate-spin text-ai"
            aria-hidden
          />
          {status(proposal)}
        </p>
        <p className="m-0 mt-1 text-meta text-ink-3">
          {tender ? t("tender.working.hint") : t("working.hint")}
        </p>
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

/** A proposal's kept items going into the Deviz, a hundred at a time. */
function Applying({ proposal }: { proposal: Proposal }) {
  const t = useScopedI18n("proposal");
  return (
    <AISuggestion>
      <p role="status" className="m-0 flex items-center gap-2">
        <Icons.Loader
          className="size-4 shrink-0 animate-spin text-ai"
          aria-hidden
        />
        {t("applying", {
          applied: proposal.applying?.applied ?? 0,
          total: proposal.applying?.total ?? 0,
        })}
      </p>
    </AISuggestion>
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
  const startTender = useMutation(api.proposals.proposals.startTender);
  const proposalError = useProposalError();
  const [retrying, setRetrying] = useState(false);
  const tender = proposal.source === "tender";

  const retry = async () => {
    setRetrying(true);
    try {
      if (tender) {
        await startTender({
          estimateId,
          fileIds: proposal.files.map((file) => file._id),
        });
      } else {
        await start({
          estimateId,
          text: proposal.text,
          fileIds: proposal.photos.map((photo) => photo._id),
        });
      }
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
          {t(
            `failed.reasons.${failureReason(proposal.error, proposal.source)}`,
          )}
        </p>
      </div>
      <Request proposal={proposal} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onEdit}>
          {tender ? t("tender.edit") : t("failed.edit")}
        </Button>
        <Button onClick={retry} disabled={retrying}>
          {retrying && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("failed.retry")}
        </Button>
      </div>
    </div>
  );
}

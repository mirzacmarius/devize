"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { AISuggestion } from "@devize/ui/ai-suggestion";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { useQuery } from "convex/react";
import { useScopedI18n } from "@/locales/client";

/**
 * Says on the Deviz's page that an AI proposal is being written or going
 * into the Deviz, waits for review or failed, and opens it. Nothing shows
 * once it is applied or set aside.
 */
export function ProposalBanner({
  estimateId,
  onOpen,
}: {
  estimateId: Id<"estimates">;
  onOpen: () => void;
}) {
  const t = useScopedI18n("proposal");
  const proposal = useQuery(api.proposals.proposals.latest, { estimateId });
  if (!proposal) {
    return null;
  }
  const tender = proposal.source === "tender";
  let text: string;
  switch (proposal.status) {
    case "working":
      text = tender ? t("banner.tenderWorking") : t("banner.working");
      break;
    case "applying":
      text = t("banner.applying", {
        applied: proposal.applying?.applied ?? 0,
        total: proposal.applying?.total ?? 0,
      });
      break;
    case "ready":
      text = tender
        ? t("banner.tenderReady", { count: proposal.items.length })
        : t("banner.ready", { count: proposal.items.length });
      break;
    case "failed":
      text = t("banner.failed");
      break;
    default:
      return null;
  }
  const busy = proposal.status === "working" || proposal.status === "applying";
  return (
    <AISuggestion
      variant="side"
      actions={
        proposal.status !== "applying" && (
          <Button variant="ai" size="sm" onClick={onOpen}>
            {proposal.status === "ready"
              ? t("banner.review")
              : t("banner.open")}
          </Button>
        )
      }
    >
      <span role="status" className="flex items-center gap-2">
        {busy && (
          <Icons.Loader
            className="size-4 shrink-0 animate-spin text-ai"
            aria-hidden
          />
        )}
        {text}
      </span>
    </AISuggestion>
  );
}

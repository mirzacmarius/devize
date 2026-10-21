"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { AISuggestion } from "@devize/ui/ai-suggestion";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { useQuery } from "convex/react";
import { useScopedI18n } from "@/locales/client";

/**
 * Says on the Deviz's page that an AI proposal is being written, waits for
 * review or failed, and opens it. Nothing shows once it is applied or set
 * aside.
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
  if (
    !proposal ||
    (proposal.status !== "working" &&
      proposal.status !== "ready" &&
      proposal.status !== "failed")
  ) {
    return null;
  }
  const ready = proposal.status === "ready";
  return (
    <AISuggestion
      variant="side"
      actions={
        <Button variant="ai" size="sm" onClick={onOpen}>
          {ready ? t("banner.review") : t("banner.open")}
        </Button>
      }
    >
      <span role="status" className="flex items-center gap-2">
        {proposal.status === "working" && (
          <Icons.Loader className="size-4 animate-spin text-ai" aria-hidden />
        )}
        {proposal.status === "working"
          ? t("banner.working")
          : ready
            ? t("banner.ready", { count: proposal.items.length })
            : t("banner.failed")}
      </span>
    </AISuggestion>
  );
}

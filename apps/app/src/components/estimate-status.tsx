"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useScopedI18n } from "@/locales/client";

export type EstimateStatus = Doc<"estimates">["status"];

const tones: Record<EstimateStatus, StatusPillProps["tone"]> = {
  draft: "draft",
  sent: "active",
  accepted: "success",
  rejected: "declined",
  archived: "neutral",
};

/**
 * Where a Deviz stands, in one word wherever it's listed: Ciornă, Trimis,
 * Acceptat…; `long` in its own head: Trimis clientului, Acceptat de client…
 */
export function EstimateStatusPill({
  status,
  long = false,
}: {
  status: EstimateStatus;
  long?: boolean;
}) {
  const t = useScopedI18n("estimateStatus");
  const tShort = useScopedI18n("estimateStatusShort");
  const short = tShort(status);
  const full = t(status);
  return (
    <StatusPill
      tone={tones[status]}
      title={!long && short !== full ? full : undefined}
    >
      {long ? full : short}
    </StatusPill>
  );
}

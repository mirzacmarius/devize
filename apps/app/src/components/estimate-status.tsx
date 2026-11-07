"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useScopedI18n } from "@/locales/client";

export type EstimateStatus = Doc<"estimates">["status"];

const tones: Record<EstimateStatus, StatusPillProps["tone"]> = {
  draft: "draft",
  sent: "active",
  accepted: "success",
  rejected: "danger",
  archived: "neutral",
};

/**
 * Where a Deviz stands: Ciornă, Trimis clientului, Acceptat de client…; `short`
 * where a list has its titles to fit: Trimis, Acceptat…
 */
export function EstimateStatusPill({
  status,
  short = false,
}: {
  status: EstimateStatus;
  short?: boolean;
}) {
  const t = useScopedI18n("estimateStatus");
  const tShort = useScopedI18n("estimateStatusShort");
  return (
    <StatusPill tone={tones[status]} title={short ? t(status) : undefined}>
      {short ? tShort(status) : t(status)}
    </StatusPill>
  );
}

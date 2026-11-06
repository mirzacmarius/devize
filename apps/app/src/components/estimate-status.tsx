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

/** Where a Deviz stands: Ciornă, Trimis clientului, Acceptat de client… */
export function EstimateStatusPill({
  status,
  plain,
}: {
  status: EstimateStatus;
  plain?: boolean;
}) {
  const t = useScopedI18n("estimateStatus");
  return (
    <StatusPill tone={tones[status]} plain={plain}>
      {t(status)}
    </StatusPill>
  );
}

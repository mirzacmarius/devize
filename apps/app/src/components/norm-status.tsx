"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useScopedI18n } from "@/locales/client";

export type NormStatus = Doc<"norms">["status"];

const tones: Record<NormStatus, StatusPillProps["tone"]> = {
  draft: "neutral",
  review: "warning",
  published: "success",
  superseded: "neutral",
  archived: "neutral",
};

/** Where a norm version stands: Ciornă, În verificare, Publicată… */
export function NormStatusPill({ status }: { status: NormStatus }) {
  const t = useScopedI18n("norms");
  return (
    <StatusPill tone={tones[status]}>{t(`statuses.${status}`)}</StatusPill>
  );
}

"use client";

import { Stepper } from "@devize/ui/stepper";
import { cn } from "@devize/ui/utils";
import { EstimateStatusPill } from "@/components/estimate-status";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/**
 * Where a Deviz is in its life: draft, sent, then the client's answer. Once
 * answered, the way there says nothing: only the answer and when.
 */
export function EstimateStepper({
  estimate,
  className,
}: {
  estimate: Estimate;
  className?: string;
}) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const { status, lockedAt } = estimate;
  if (status === "archived") {
    return null;
  }
  if (status === "accepted" || status === "rejected") {
    return (
      <p
        className={cn(
          "m-0 flex items-baseline gap-2 text-meta tabular-nums text-ink-3",
          className,
        )}
      >
        <EstimateStatusPill status={status} />
        {formatDay(estimate.updatedAt, locale)}
      </p>
    );
  }
  const sent = status !== "draft";
  return (
    <Stepper
      className={className}
      aria-label={t("steps.label")}
      stateLabels={{
        done: t("steps.states.done"),
        success: t("steps.states.done"),
        failed: t("steps.states.failed"),
        current: t("steps.states.current"),
        todo: t("steps.states.todo"),
      }}
      steps={[
        {
          id: "draft",
          title: t("steps.draft"),
          // Only where it's at says when; the Deviz's data has the rest.
          meta: sent ? undefined : formatDay(estimate._creationTime, locale),
          state: sent ? "done" : "current",
        },
        {
          id: "sent",
          title: t("steps.sent"),
          meta:
            status === "sent" && lockedAt
              ? formatDay(lockedAt, locale)
              : undefined,
          state: sent ? "done" : "todo",
        },
        {
          id: "answer",
          title: t("steps.accepted"),
          meta: sent ? t("steps.waiting") : undefined,
          state: sent ? "current" : "todo",
        },
      ]}
    />
  );
}

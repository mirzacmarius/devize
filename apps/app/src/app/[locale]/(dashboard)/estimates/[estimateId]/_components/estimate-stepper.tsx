"use client";

import { type Step, Stepper } from "@devize/ui/stepper";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/** Where a Deviz is in its life: draft, sent, then the client's answer. */
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
  const sent = status !== "draft";
  const answer: Step =
    status === "rejected"
      ? {
          id: "answer",
          title: t("steps.rejected"),
          meta: formatDay(estimate.updatedAt, locale),
          state: "failed",
        }
      : {
          id: "answer",
          title: t("steps.accepted"),
          meta:
            status === "accepted"
              ? formatDay(estimate.updatedAt, locale)
              : status === "sent"
                ? t("steps.waiting")
                : undefined,
          state:
            status === "accepted"
              ? "success"
              : status === "sent"
                ? "current"
                : "todo",
        };
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
        answer,
      ]}
    />
  );
}

"use client";

import { type Step, Stepper } from "@devize/ui/stepper";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/** Where a Deviz is in its life: draft, sent, then the client's answer. */
export function EstimateStepper({ estimate }: { estimate: Estimate }) {
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
              ? "done"
              : status === "sent"
                ? "current"
                : "todo",
        };
  return (
    <Stepper
      aria-label={t("steps.label")}
      stateLabels={{
        done: t("steps.states.done"),
        failed: t("steps.states.failed"),
        current: t("steps.states.current"),
        todo: t("steps.states.todo"),
      }}
      steps={[
        {
          id: "draft",
          title: t("steps.draft"),
          meta: formatDay(estimate._creationTime, locale),
          state: sent ? "done" : "current",
        },
        {
          id: "sent",
          title: t("steps.sent"),
          meta: lockedAt ? formatDay(lockedAt, locale) : undefined,
          state: sent ? "done" : "todo",
        },
        answer,
      ]}
    />
  );
}

"use client";

import { Stepper } from "@devize/ui/stepper";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/**
 * Where a Deviz is in its life, until the client answers: draft, sent, then
 * what it waits for. The header says the answer once there is one.
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
  if (status !== "draft" && status !== "sent") {
    return null;
  }
  const sent = status === "sent";
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
      // Where it's at, then what's still to come: what's behind it needs no saying.
      steps={[
        ...(sent
          ? []
          : [
              {
                id: "draft",
                title: t("steps.draft"),
                state: "current" as const,
                // The mark a draft has in the lists.
                mark: (
                  <span className="size-[7px] rounded-full shadow-[inset_0_0_0_1.5px_hsl(var(--neutral-dot))]" />
                ),
              },
            ]),
        {
          id: "sent",
          title: t("steps.sent"),
          // Only where it's at says when; the Deviz's data has the rest.
          meta: sent && lockedAt ? formatDay(lockedAt, locale) : undefined,
          state: sent ? "current" : "todo",
        },
        {
          id: "answer",
          title: sent ? t("steps.waiting") : t("steps.accepted"),
          state: "todo",
        },
      ]}
    />
  );
}

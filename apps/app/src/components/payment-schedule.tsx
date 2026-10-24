"use client";

import type {
  PaymentStage,
  PaymentTrigger,
} from "@devize/backend/convex/offers/payments";
import { stageAmount } from "@devize/backend/convex/offers/payments";
import { formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

// How an Ofertă is paid, in words and as a list, the same on the firm's page
// and on the client's link.

/** The stages in one line each: "Avans: 30% la semnare (1.200,00 lei)". */
export function useScheduleWords() {
  const t = useScopedI18n("payment");
  const locale = useCurrentLocale();
  return (stages: readonly PaymentStage[], total?: number): string[] =>
    stages.map((stage) => {
      const trigger = t(`triggers.${stage.trigger}`);
      if (stage.percent === undefined) {
        return t("fixed", {
          stage: stage.stage,
          amount: formatMoney(stage.amount ?? 0, locale),
          trigger,
        });
      }
      const percent = formatPercent(stage.percent, locale);
      return total === undefined
        ? t("share", { stage: stage.stage, percent, trigger })
        : t("shareAmount", {
            stage: stage.stage,
            percent,
            trigger,
            amount: formatMoney(stageAmount(stage, total), locale),
          });
    });
}

/** The moments of payment as the person picks them. */
export function useTriggerWords(): Record<PaymentTrigger, string> {
  const t = useScopedI18n("payment");
  return {
    signing: t("triggers.signing"),
    start: t("triggers.start"),
    statement: t("triggers.statement"),
    completion: t("triggers.completion"),
    final: t("triggers.final"),
  };
}

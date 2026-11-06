"use client";

import type {
  PaymentStage,
  PaymentTrigger,
} from "@devize/backend/convex/offers/payments";
import { stageAmount } from "@devize/backend/convex/offers/payments";
import { Fact, FactList } from "@/components/fact-list";
import { formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

// How an Ofertă is paid, in words and as a list, the same on the firm's page
// and on the client's link.

/** The stages one under the other: the stage and its share, then the money. */
export function PaymentStages({
  stages,
  total,
}: {
  stages: readonly PaymentStage[];
  total: number;
}) {
  const t = useScopedI18n("payment");
  const locale = useCurrentLocale();
  return (
    <FactList>
      {stages.map((stage) => (
        <Fact
          key={`${stage.stage}-${stage.trigger}`}
          label={
            stage.percent === undefined
              ? stage.stage
              : `${stage.stage} · ${formatPercent(stage.percent, locale)}`
          }
          title={t(`triggers.${stage.trigger}`)}
        >
          {formatMoney(stageAmount(stage, total), locale)} lei
        </Fact>
      ))}
    </FactList>
  );
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

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

/**
 * The stages one under the other: the stage and when it falls due on the left,
 * the money on the right.
 */
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
    <dl className="m-0 grid gap-2">
      {stages.map((stage) => (
        <div
          key={`${stage.stage}-${stage.trigger}`}
          className="flex items-baseline justify-between gap-3"
        >
          <dt className="grid min-w-0 text-meta text-ink">
            {stage.stage}
            <span className="text-ink-3">
              {stage.percent === undefined
                ? t(`triggers.${stage.trigger}`)
                : `${formatPercent(stage.percent, locale)} ${t(`triggers.${stage.trigger}`)}`}
            </span>
          </dt>
          <dd className="m-0 whitespace-nowrap text-meta tabular-nums text-ink">
            {formatMoney(stageAmount(stage, total), locale)} lei
          </dd>
        </div>
      ))}
    </dl>
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

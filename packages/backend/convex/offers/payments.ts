import type { Infer } from "convex/values";
import { roundLei } from "../estimates/recap";
import { invalid } from "../lib/errors";
import type { paymentStage, paymentTrigger } from "./validators";

// How an Ofertă's price is paid: stages the firm writes, each due at a moment
// of the works, as a share of the total with VAT or a fixed sum. The same
// code reads them in the app, so every page shows the same figures.

export type PaymentTrigger = Infer<typeof paymentTrigger>;
export type PaymentStage = Infer<typeof paymentStage>;

export const MAX_STAGES = 8;
const MAX_STAGE_LABEL = 60;

export const paymentTriggers: readonly PaymentTrigger[] = [
  "signing",
  "start",
  "statement",
  "completion",
  "final",
];

/**
 * Checks a schedule as the firm wrote it: one to eight stages, each named,
 * with a share of the total (over 0, up to 100%) or a sum in lei (over 0),
 * never both, the shares adding up to at most 100%. Throws
 * `invalid("paymentSchedule")`.
 */
export function checkPaymentSchedule(
  stages: readonly PaymentStage[],
): PaymentStage[] {
  if (stages.length === 0 || stages.length > MAX_STAGES) {
    throw invalid("paymentSchedule");
  }
  let shares = 0;
  const clean = stages.map((stage): PaymentStage => {
    const label = stage.stage.trim().replace(/\s+/g, " ");
    if (label.length === 0 || label.length > MAX_STAGE_LABEL) {
      throw invalid("paymentSchedule");
    }
    if ((stage.percent === undefined) === (stage.amount === undefined)) {
      throw invalid("paymentSchedule");
    }
    if (stage.percent !== undefined) {
      const percent = Math.round(stage.percent * 100) / 100;
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        throw invalid("paymentSchedule");
      }
      shares += percent;
      return { stage: label, percent, trigger: stage.trigger };
    }
    const amount = roundLei(stage.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw invalid("paymentSchedule");
    }
    return { stage: label, amount, trigger: stage.trigger };
  });
  if (Math.round(shares * 100) / 100 > 100) {
    throw invalid("paymentSchedule");
  }
  return clean;
}

/** What each stage comes to for a total with VAT, in lei. */
export function stageAmount(stage: PaymentStage, total: number): number {
  return stage.percent !== undefined
    ? roundLei((total * stage.percent) / 100)
    : roundLei(stage.amount ?? 0);
}

/** The share due at signing, for the pages that show the deposit alone. */
export function depositOf(
  stages: readonly PaymentStage[] | undefined,
): number | undefined {
  return stages?.find((stage) => stage.trigger === "signing")?.percent;
}

/** The stages in words, for an email or a prompt: "Avans: 30% la semnare (1.200,00 lei)". */
export function describeSchedule(
  stages: readonly PaymentStage[],
  total: number,
  lei: (value: number) => string,
  trigger: (trigger: PaymentTrigger) => string,
): string[] {
  return stages.map((stage) => {
    const amount = lei(stageAmount(stage, total));
    const share =
      stage.percent !== undefined
        ? `${String(stage.percent).replace(".", ",")}% ${trigger(stage.trigger)} (${amount} lei)`
        : `${amount} lei ${trigger(stage.trigger)}`;
    return `${stage.stage}: ${share}`;
  });
}

/** The moments of payment in Romanian, as the emails and the assistant say them. */
export const triggerWords: Record<PaymentTrigger, string> = {
  signing: "la semnare",
  start: "la începerea lucrărilor",
  statement: "pe situații de lucrări",
  completion: "la recepția lucrărilor",
  final: "la recepția finală",
};

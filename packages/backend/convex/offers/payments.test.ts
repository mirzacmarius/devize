import { describe, expect, test } from "bun:test";
import {
  checkPaymentSchedule,
  depositOf,
  describeSchedule,
  stageAmount,
  triggerWords,
} from "./payments";

describe("a payment schedule", () => {
  test("is cleaned: names trimmed, shares and sums rounded", () => {
    expect(
      checkPaymentSchedule([
        { stage: "  Avans  la  semnare ", percent: 30.004, trigger: "signing" },
        { stage: "Restul", amount: 1234.567, trigger: "completion" },
      ]),
    ).toEqual([
      { stage: "Avans la semnare", percent: 30, trigger: "signing" },
      { stage: "Restul", amount: 1234.57, trigger: "completion" },
    ]);
  });

  test("refuses what no client could follow", () => {
    const bad: Parameters<typeof checkPaymentSchedule>[0][] = [
      [],
      [{ stage: "", percent: 30, trigger: "signing" }],
      [{ stage: "x".repeat(61), percent: 30, trigger: "signing" }],
      [{ stage: "Avans", trigger: "signing" }],
      [{ stage: "Avans", percent: 30, amount: 100, trigger: "signing" }],
      [{ stage: "Avans", percent: 0, trigger: "signing" }],
      [{ stage: "Avans", percent: 100.01, trigger: "signing" }],
      [{ stage: "Avans", amount: 0, trigger: "signing" }],
      [
        { stage: "Avans", percent: 60, trigger: "signing" },
        { stage: "Restul", percent: 40.01, trigger: "completion" },
      ],
      Array.from({ length: 9 }, (_, i) => ({
        stage: `Etapa ${i + 1}`,
        percent: 10,
        trigger: "statement" as const,
      })),
    ];
    for (const stages of bad) {
      expect(() => checkPaymentSchedule(stages)).toThrow(/paymentSchedule/);
    }
    // Shares may stop short of 100%: the rest stays as agreed.
    expect(
      checkPaymentSchedule([
        { stage: "Avans", percent: 30, trigger: "signing" },
      ]),
    ).toHaveLength(1);
  });

  test("gives each stage's amount and the deposit", () => {
    const stages = checkPaymentSchedule([
      { stage: "Avans", percent: 30, trigger: "signing" },
      { stage: "Pe parcurs", amount: 1000, trigger: "statement" },
      { stage: "Restul", percent: 33.33, trigger: "completion" },
    ]);
    expect(stages.map((stage) => stageAmount(stage, 12345.67))).toEqual([
      3703.7, 1000, 4114.81,
    ]);
    expect(depositOf(stages)).toBe(30);
    expect(depositOf([{ stage: "Tot", percent: 100, trigger: "final" }])).toBe(
      undefined,
    );
    expect(depositOf(undefined)).toBeUndefined();
  });

  test("is said in words for emails and the assistant", () => {
    const lei = (value: number) =>
      value.toLocaleString("ro-RO", { minimumFractionDigits: 2 });
    expect(
      describeSchedule(
        [
          { stage: "Avans", percent: 30.5, trigger: "signing" },
          { stage: "Restul", amount: 700, trigger: "completion" },
        ],
        1000,
        lei,
        (trigger) => triggerWords[trigger],
      ),
    ).toEqual([
      "Avans: 30,5% la semnare (305,00 lei)",
      "Restul: 700,00 lei la recepția lucrărilor",
    ]);
  });
});

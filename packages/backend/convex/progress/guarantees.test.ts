import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup } from "../test.helper";
import { acceptedDeviz, statementFor } from "./test.helper";

describe("guarantees", () => {
  test("is kept back from each approved statement and freed by the receptions", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    const none = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(none.guarantee).toBeNull();
    expect(none.total).toBe(0);
    expect(none.contractSubtotal).toBeGreaterThan(0);

    await expect(
      firm.as.mutation(api.progress.guarantees.set, {
        estimateId,
        percent: 12,
        method: "retention",
      }),
    ).rejects.toThrow(/percent/);
    await firm.as.mutation(api.progress.guarantees.set, {
      estimateId,
      percent: 10,
      method: "retention",
    });
    let state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.guarantee?.percent).toBe(10);
    expect(state.total).toBe(Math.round(state.contractSubtotal * 10) / 100);
    expect(state.withheld).toBe(0);
    expect(state.remainingToWithhold).toBe(state.total);
    expect(state.stages.completion.amount).toBe(
      Math.round(state.total * 70) / 100,
    );
    expect(state.stages.final.amount).toBe(
      Math.round((state.total - state.stages.completion.amount) * 100) / 100,
    );
    expect(state.stages.completion.dueDate).toBeUndefined();

    // A statement keeps 10 % of its value back.
    const { statementId, statement } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    await firm.as.mutation(api.progress.statements.completeAll, {
      statementId,
    });
    const filled = await firm.as.query(api.progress.statements.get, {
      statementId,
    });
    expect(filled.retention).toBe(
      Math.round(filled.period.subtotal * 10) / 100,
    );
    // Not counted until approved.
    state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.withheld).toBe(0);
    await firm.as.mutation(api.progress.statements.setStatus, {
      statementId,
      status: "approved",
    });
    state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.withheld).toBe(filled.retention);
    expect(state.withheld).toBe(state.total);
    expect(state.remainingToWithhold).toBe(0);
    expect(state.outstanding).toBe(state.total);

    // The reception at the end of the works, admitted, frees 70 % in 14 days.
    const receptionId = await firm.as.mutation(api.progress.receptions.save, {
      estimateId,
      kind: "completion",
      date: "2026-12-10",
      people: [{ name: "Maria Ionescu", role: "president" }],
      objections: [],
      decision: "admitted",
    });
    await firm.as.mutation(api.progress.receptions.conclude, { receptionId });
    state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.stages.completion.dueDate).toBe("2026-12-24");
    expect(state.stages.final.dueDate).toBeUndefined();
    await firm.as.mutation(api.progress.guarantees.release, {
      estimateId,
      stage: "completion",
      amount: state.stages.completion.amount,
      date: "2026-12-20",
      note: "OP 123",
    });
    state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.stages.completion.released).toBe(
      state.stages.completion.amount,
    );
    expect(state.releasedTotal).toBe(state.stages.completion.amount);
    expect(state.outstanding).toBe(state.stages.final.amount);
    await firm.as.mutation(api.progress.guarantees.removeRelease, {
      estimateId,
      index: 0,
    });
    state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.releasedTotal).toBe(0);
    expect(statement.contract.subtotal).toBe(state.contractSubtotal);
  });

  test("a bank instrument keeps nothing back from the statements", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    const { statementId } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    await firm.as.mutation(api.progress.statements.completeAll, {
      statementId,
    });
    await firm.as.mutation(api.progress.guarantees.set, {
      estimateId,
      percent: 5,
      method: "instrument",
      instrument: {
        issuer: "Banca Exemplu",
        reference: "SGB 2026/77",
        amount: 1500,
        validUntil: "2028-01-31",
      },
    });
    const statement = await firm.as.query(api.progress.statements.get, {
      statementId,
    });
    expect(statement.retention).toBe(0);
    const state = await firm.as.query(api.progress.guarantees.forEstimate, {
      estimateId,
    });
    expect(state.guarantee?.instrument?.reference).toBe("SGB 2026/77");
    expect(state.outstanding).toBe(1500);
    expect(state.remainingToWithhold).toBe(0);
    // Switching to retention takes it from the open statement at once.
    await firm.as.mutation(api.progress.guarantees.set, {
      estimateId,
      percent: 5,
      method: "retention",
    });
    const retained = await firm.as.query(api.progress.statements.get, {
      statementId,
    });
    expect(retained.retention).toBe(
      Math.round(retained.period.subtotal * 5) / 100,
    );
    await firm.as.mutation(api.progress.guarantees.remove, { estimateId });
    expect(
      (await firm.as.query(api.progress.statements.get, { statementId }))
        .retention,
    ).toBe(0);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.query(api.progress.guarantees.forEstimate, { estimateId }),
    ).rejects.toThrow(/not_found/);
  });
});

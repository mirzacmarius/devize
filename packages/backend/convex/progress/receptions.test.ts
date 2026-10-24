import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup } from "../test.helper";
import { acceptedDeviz, statementFor } from "./test.helper";

describe("receptions", () => {
  test("the PV is filled in from the statements and concluded with a decision", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    const empty = await firm.as.query(api.progress.receptions.forEstimate, {
      estimateId,
    });
    expect(empty.completion).toBeNull();
    expect(empty.final).toBeNull();
    expect(empty.suggested.allExecuted).toBe(false);

    const { statementId } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-02",
      periodEnd: "2026-11-27",
    });
    await firm.as.mutation(api.progress.statements.completeAll, {
      statementId,
    });
    await firm.as.mutation(api.progress.statements.setStatus, {
      statementId,
      status: "approved",
    });
    const ready = await firm.as.query(api.progress.receptions.forEstimate, {
      estimateId,
    });
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(ready.suggested).toEqual({
      executionStart: "2026-11-02",
      executionEnd: "2026-11-27",
      value: estimate.totals.subtotal,
      valueWithVat: estimate.totals.total,
      approvedStatements: 1,
      allExecuted: true,
    });

    const receptionId = await firm.as.mutation(api.progress.receptions.save, {
      estimateId,
      kind: "completion",
      number: "12",
      date: "2026-12-04",
      place: "Brașov",
      contract: { number: "45", date: "2026-10-20" },
      executionStart: "2026-11-02",
      executionEnd: "2026-11-27",
      people: [
        {
          name: "Maria Ionescu",
          role: "president",
          organization: "Beneficiar",
        },
        { name: "Dan Pop", role: "member" },
        {
          name: "Ana Georgescu",
          role: "executant",
          organization: "Ana Construct SRL",
        },
      ],
      findings: "Lucrările corespund proiectului.",
      objections: [{ text: "Retuș vopsea hol", deadline: "2026-12-20" }],
      copies: 3,
    });
    // Without a decision it can't be concluded.
    await expect(
      firm.as.mutation(api.progress.receptions.conclude, { receptionId }),
    ).rejects.toThrow(/decision/);
    const again = await firm.as.mutation(api.progress.receptions.save, {
      estimateId,
      kind: "completion",
      date: "2026-12-04",
      people: [{ name: "Maria Ionescu", role: "president" }],
      objections: [],
      decision: "admitted",
      reasons: "Fără obiecții care să împiedice folosirea.",
    });
    expect(again).toBe(receptionId);
    await firm.as.mutation(api.progress.receptions.conclude, { receptionId });
    const state = await firm.as.query(api.progress.receptions.forEstimate, {
      estimateId,
    });
    expect(state.completion).toMatchObject({
      status: "concluded",
      decision: "admitted",
      value: estimate.totals.subtotal,
      people: [{ name: "Maria Ionescu", role: "president" }],
    });
    expect(state.completion?.concludedAt).toBeDefined();
    // Concluded, it doesn't change until reopened.
    await expect(
      firm.as.mutation(api.progress.receptions.save, {
        estimateId,
        kind: "completion",
        date: "2026-12-05",
        people: [],
        objections: [],
      }),
    ).rejects.toThrow(/locked/);
    await firm.as.mutation(api.progress.receptions.reopen, { receptionId });
    expect(
      (await firm.as.query(api.progress.receptions.forEstimate, { estimateId }))
        .completion?.status,
    ).toBe("draft");

    // The final one, a year on.
    const finalId = await firm.as.mutation(api.progress.receptions.save, {
      estimateId,
      kind: "final",
      date: "2027-12-04",
      warrantyMonths: 12,
      people: [{ name: "Maria Ionescu", role: "president" }],
      objections: [],
      decision: "admitted",
    });
    expect(finalId).not.toBe(receptionId);
    const both = await firm.as.query(api.progress.receptions.forEstimate, {
      estimateId,
    });
    expect(both.final?.warrantyMonths).toBe(12);
    await firm.as.mutation(api.progress.receptions.remove, {
      receptionId: finalId,
    });
    expect(
      (await firm.as.query(api.progress.receptions.forEstimate, { estimateId }))
        .final,
    ).toBeNull();
  });

  test("checks what it is given, and keeps it to the firm", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    await expect(
      firm.as.mutation(api.progress.receptions.save, {
        estimateId,
        kind: "completion",
        date: "2026-13-01",
        people: [],
        objections: [],
      }),
    ).rejects.toThrow(/date/);
    await expect(
      firm.as.mutation(api.progress.receptions.save, {
        estimateId,
        kind: "completion",
        date: "2026-12-01",
        people: [{ name: "  ", role: "member" }],
        objections: [],
      }),
    ).rejects.toThrow(/people/);
    await expect(
      firm.as.mutation(api.progress.receptions.save, {
        estimateId,
        kind: "final",
        date: "2026-12-01",
        warrantyMonths: 1.5,
        people: [],
        objections: [],
      }),
    ).rejects.toThrow(/warrantyMonths/);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.mutation(api.progress.receptions.save, {
        estimateId,
        kind: "completion",
        date: "2026-12-01",
        people: [],
        objections: [],
      }),
    ).rejects.toThrow(/not_found/);
  });
});

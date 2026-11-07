import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import { issuedAdvance } from "../invoices/test.helper";
import { firmOwner, setup } from "../test.helper";

afterEach(() => {
  setSystemTime();
});

describe("what a firm has going on with its clients", () => {
  test("each client's devize and what they still owe", async () => {
    setSystemTime(new Date("2026-10-23T10:00:00Z"));
    const t = setup();
    const { firm, organizationId, estimateId, advanceId } =
      await issuedAdvance(t);
    const activity = () =>
      firm.as.query(api.accounts.clients.activity, { organizationId });
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const invoice = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    const [row] = await activity();
    expect(row?.clientId).toBe(estimate?.client?._id as never);
    expect(row?.estimates).toBe(1);
    expect(row?.owed).toBe(invoice.totals.total);

    await firm.as.mutation(api.invoices.invoices.addPayment, {
      invoiceId: advanceId,
      date: "2026-10-23",
      amount: invoice.totals.total,
      method: "cash",
    });
    const [paid] = await activity();
    expect(paid?.estimates).toBe(1);
    expect(paid?.owed).toBe(0);
  });

  test("an archived Deviz isn't counted, and a client with nothing isn't listed", async () => {
    const t = setup();
    const firm = await firmOwner(t, "Ana");
    const { organizationId } = firm;
    const clientId = await firm.as.mutation(api.accounts.clients.create, {
      organizationId,
      kind: "person",
      name: "Ion Popescu",
    });
    await firm.as.mutation(api.accounts.clients.create, {
      organizationId,
      kind: "person",
      name: "Fără lucrări",
    });
    const kept = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId,
      title: "Baie",
      clientId,
    });
    const archived = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId,
      title: "Bucătărie",
      clientId,
    });
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId: archived,
      status: "archived",
    });
    expect(kept).toBeDefined();
    expect(
      await firm.as.query(api.accounts.clients.activity, { organizationId }),
    ).toEqual([{ clientId, estimates: 1, owed: 0 }]);
  });

  test("another firm can't see it", async () => {
    const t = setup();
    const firm = await firmOwner(t, "Ana");
    const other = await firmOwner(t, "Altă firmă");
    await expect(
      other.as.query(api.accounts.clients.activity, {
        organizationId: firm.organizationId,
      }),
    ).rejects.toThrow();
  });
});

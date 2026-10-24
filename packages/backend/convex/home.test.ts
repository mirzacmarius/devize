import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "./_generated/api";
import { devizFor } from "./offers/test.helper";
import { firmOwner, publishedBaseNorm, setup } from "./test.helper";

afterEach(() => {
  setSystemTime();
});

describe("Acasă", () => {
  test("is a firm's own page", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.query(api.home.overview, {
        organizationId: ana.organizationId,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("starts empty, with the first steps in front of a new firm", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const home = await ana.as.query(api.home.overview, {
      organizationId: ana.organizationId,
    });
    expect(home).toMatchObject({
      drafts: { count: 0, total: 0 },
      sent: { count: 0, total: 0, unread: 0 },
      accepted: { count: 0, total: 0, allTime: 0 },
      acceptance: { accepted: 0, decided: 0 },
      todo: [],
      recent: [],
      setup: { firmDetails: false, rates: false, estimates: false },
    });
  });

  test("counts the devize by state and lists what wants doing", async () => {
    const t = setup();
    setSystemTime(new Date("2026-10-23T08:00:00Z"));
    const { firm, estimateId } = await devizFor(t);
    const { normId } = await publishedBaseNorm(t, { code: "DV-ZID-01" });
    await firm.as.mutation(api.accounts.rates.set, {
      organizationId: firm.organizationId,
      kind: "labor",
      name: "Faianțar",
      unit: "ora",
      price: 45,
    });

    // A second Deviz stays a draft; a third was accepted, a fourth rejected.
    // Each is a minute after the one before, so the recent list has an order.
    setSystemTime(new Date("2026-10-23T08:01:00Z"));
    const draftId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Licitație școală",
      kind: "tender",
    });
    await firm.as.mutation(api.estimates.estimates.update, {
      estimateId: draftId,
      tender: { authority: "Primăria", deadline: "2026-10-30" },
    });
    await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId: draftId,
      normId,
      quantity: 10,
    });
    setSystemTime(new Date("2026-10-23T08:02:00Z"));
    const acceptedId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Gard",
    });
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId: acceptedId,
      status: "accepted",
    });
    setSystemTime(new Date("2026-10-23T08:03:00Z"));
    const rejectedId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Garaj",
    });
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId: rejectedId,
      status: "rejected",
    });

    // The first Deviz goes to its client, who doesn't open it for three days.
    setSystemTime(new Date("2026-10-23T08:04:00Z"));
    await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      validDays: 9,
    });
    setSystemTime(new Date("2026-10-26T08:10:00Z"));

    const home = await firm.as.query(api.home.overview, {
      organizationId: firm.organizationId,
    });
    expect(home.drafts.count).toBe(1);
    expect(home.drafts.total).toBeGreaterThan(0);
    expect(home.sent).toMatchObject({ count: 1, unread: 1 });
    expect(home.sent.total).toBeGreaterThan(0);
    expect(home.accepted).toMatchObject({ count: 1, total: 0, allTime: 1 });
    expect(home.acceptance).toEqual({ accepted: 1, decided: 2 });
    expect(home.setup).toEqual({
      firmDetails: false,
      rates: true,
      estimates: true,
    });
    // Sending the first Deviz touched it last.
    expect(home.recent.map((row) => row.title)).toEqual([
      "Baie apartament",
      "Garaj",
      "Gard",
      "Licitație școală",
    ]);
    expect(home.recent[0]?.clientName).toBe("Ion Popescu");

    // The tender closes in four days, the Ofertă expires in six and the
    // client hasn't read it: in that order.
    expect(home.todo).toMatchObject([
      {
        kind: "deadline",
        estimate: { _id: draftId, title: "Licitație școală" },
        date: "2026-10-30",
        days: 4,
      },
      { kind: "expiring", estimate: { _id: estimateId }, days: 6 },
      {
        kind: "unread",
        estimate: { _id: estimateId, clientName: "Ion Popescu" },
        days: 3,
      },
    ]);
  });

  test("puts a client's unanswered question first", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      assistant: false,
    });
    await t.mutation(api.offers.questions.ask, {
      token,
      question: "Prețul include și transportul molozului?",
    });
    const home = await firm.as.query(api.home.overview, {
      organizationId: firm.organizationId,
    });
    expect(home.todo[0]).toMatchObject({
      kind: "question",
      estimate: { _id: estimateId },
      count: 1,
    });
    // Read just after it was sent, the Ofertă is neither stale nor expiring.
    expect(home.todo).toHaveLength(1);
    expect(home.sent.unread).toBe(1);
  });

  test("counts an acceptance only within the last 30 days", async () => {
    const t = setup();
    setSystemTime(new Date("2026-08-01T08:00:00Z"));
    const ana = await firmOwner(t, "Ana");
    const oldId = await ana.as.mutation(api.estimates.estimates.create, {
      organizationId: ana.organizationId,
      title: "Veche",
    });
    await ana.as.mutation(api.estimates.estimates.setStatus, {
      estimateId: oldId,
      status: "accepted",
    });
    setSystemTime(new Date("2026-10-23T08:00:00Z"));
    const home = await ana.as.query(api.home.overview, {
      organizationId: ana.organizationId,
    });
    expect(home.accepted).toMatchObject({ count: 0, allTime: 1 });
    expect(home.acceptance).toEqual({ accepted: 1, decided: 1 });
    expect(home.todo).toEqual([]);
  });
});

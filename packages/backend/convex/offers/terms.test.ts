import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { setup } from "../test.helper";
import { devizFor, fakeResend, restoreEmail } from "./test.helper";

// The terms of an Ofertă beyond its prices: how it is paid, a consumer's
// rights under OUG 34/2014, and what is kept of the client's signature.

afterEach(() => {
  restoreEmail();
  setSystemTime();
});

const DAY_MS = 24 * 60 * 60_000;

const evidence = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)",
  language: "ro-RO",
  timeZone: "Europe/Bucharest",
  screen: "390×844",
  address: "203.0.113.7",
};

/** The client's email, so the signed copy has somewhere to go. */
async function giveEmail(
  firm: Awaited<ReturnType<typeof devizFor>>["firm"],
  estimateId: Id<"estimates">,
  email: string,
) {
  const estimate = await firm.as.query(api.estimates.estimates.get, {
    estimateId,
  });
  if (!estimate.client) {
    throw new Error("expected a client");
  }
  await firm.as.mutation(api.accounts.clients.update, {
    clientId: estimate.client._id,
    email,
  });
}

describe("the terms of an Ofertă", () => {
  test("a payment schedule is checked and gives the deposit", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    await expect(
      firm.as.mutation(api.offers.offers.create, {
        estimateId,
        paymentSchedule: [
          { stage: "Avans", percent: 60, trigger: "signing" },
          { stage: "Restul", percent: 50, trigger: "completion" },
        ],
      }),
    ).rejects.toThrow(/paymentSchedule/);
    await expect(
      firm.as.mutation(api.offers.offers.create, {
        estimateId,
        paymentSchedule: [{ stage: " ", percent: 30, trigger: "signing" }],
      }),
    ).rejects.toThrow(/paymentSchedule/);

    await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      paymentSchedule: [
        { stage: " Avans ", percent: 30, trigger: "signing" },
        { stage: "La început", percent: 40, trigger: "start" },
        { stage: "La recepție", percent: 30, trigger: "completion" },
      ],
    });
    const offer = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(offer).toMatchObject({
      depositPercent: 30,
      paymentSchedule: [
        { stage: "Avans", percent: 30, trigger: "signing" },
        { stage: "La început", percent: 40, trigger: "start" },
        { stage: "La recepție", percent: 30, trigger: "completion" },
      ],
    });
    // The client's page shows the same stages.
    const page = await t.query(api.offers.public.view, {
      token: offer?.token ?? "",
    });
    expect(page).toMatchObject({
      state: "open",
      depositPercent: 30,
      paymentSchedule: offer?.paymentSchedule,
    });
  });

  test("a private person is a consumer unless the firm says otherwise", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const first = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    expect(
      await t.query(api.offers.public.view, { token: first.token }),
    ).toMatchObject({ consumer: true });
    await firm.as.mutation(api.offers.offers.withdraw, {
      offerId: first.offerId,
    });

    const second = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      consumer: false,
    });
    expect(
      await t.query(api.offers.public.view, { token: second.token }),
    ).toMatchObject({ consumer: false });
    await firm.as.mutation(api.offers.offers.withdraw, {
      offerId: second.offerId,
    });

    // A company has no consumer's rights.
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    await firm.as.mutation(api.accounts.clients.update, {
      clientId: estimate.client?._id as Id<"clients">,
      kind: "company",
    });
    const third = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    expect(
      await t.query(api.offers.public.view, { token: third.token }),
    ).toMatchObject({ consumer: false });
  });

  test("accepting keeps the evidence, hashes the document and emails the signed copy", async () => {
    const t = setup();
    const sent = fakeResend();
    setSystemTime(new Date("2026-10-24T11:05:00Z"));
    const { firm, estimateId } = await devizFor(t);
    await giveEmail(firm, estimateId, "ion.popescu@exemplu.ro");
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      paymentSchedule: [
        { stage: "Avans", percent: 30, trigger: "signing" },
        { stage: "Restul", percent: 70, trigger: "completion" },
      ],
    });

    await expect(
      t.mutation(api.offers.public.accept, {
        token,
        excludedItemIds: [],
        name: "Ion Popescu",
        evidence: { userAgent: "x".repeat(301) },
      }),
    ).rejects.toThrow(/evidence/);

    await t.mutation(api.offers.public.accept, {
      token,
      excludedItemIds: [],
      name: "Ion Popescu",
      evidence,
      earlyStart: true,
    });
    const page = await t.query(api.offers.public.view, { token });
    if (page?.state !== "accepted") {
      throw new Error("expected an accepted offer");
    }
    const signedAt = page.accepted?.signedAt ?? 0;
    expect(Math.abs(signedAt - Date.now())).toBeLessThan(1000);
    expect(page.accepted).toMatchObject({
      name: "Ion Popescu",
      earlyStart: true,
      withdrawalUntil: signedAt + 14 * DAY_MS,
    });
    expect(page.accepted?.contentHash).toMatch(/^[0-9a-f]{64}$/);

    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed?.signature).toMatchObject({
      name: "Ion Popescu",
      contentHash: page.accepted?.contentHash,
      evidence,
      earlyStart: true,
    });

    // The firm hears of the answer, and the client gets the signed copy.
    await new Promise((resolve) => setTimeout(resolve, 10));
    await t.finishInProgressScheduledFunctions();
    expect(sent.map((email) => email.to)).toEqual([
      ["ana@example.com"],
      ["ion.popescu@exemplu.ro"],
    ]);
    const copy = sent[1];
    expect(copy?.subject).toBe(
      "Confirmare: ați acceptat oferta DVZ-0001 de la Ana Construct SRL",
    );
    expect(copy?.text).toContain("24.10.2026");
    expect(copy?.text).toContain("14:05");
    expect(copy?.text).toContain("Avans: 30% la semnare");
    expect(copy?.text).toContain("Restul: 70% la recepția lucrărilor");
    expect(copy?.text).toContain("07.11.2026");
    expect(copy?.text).toContain(page.accepted?.contentHash ?? "");
    expect(copy?.text).toContain(`https://devize.test/o/${token}`);

    // Both sides see where the copy went, the client's page with the address hidden.
    const confirmed = await t.query(api.offers.public.view, { token });
    expect(confirmed).toMatchObject({
      state: "accepted",
      confirmation: { email: "i***@exemplu.ro" },
    });
    const followedAgain = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followedAgain?.confirmation).toMatchObject({
      email: "ion.popescu@exemplu.ro",
    });

    // The PDF carries the terms and the signature's record.
    const document = await t.query(api.offers.public.document, { token });
    expect(document?.offer).toMatchObject({
      consumer: true,
      paymentSchedule: [
        { stage: "Avans", percent: 30, trigger: "signing" },
        { stage: "Restul", percent: 70, trigger: "completion" },
      ],
      signature: {
        name: "Ion Popescu",
        contentHash: page.accepted?.contentHash,
        evidence,
        earlyStart: true,
        withdrawalUntil: signedAt + 14 * DAY_MS,
      },
      confirmation: { email: "i***@exemplu.ro" },
    });
    expect(document?.client).toMatchObject({
      name: "Ion Popescu",
      email: "ion.popescu@exemplu.ro",
    });
  });

  test("without an email, only the firm is written to", async () => {
    const t = setup();
    const sent = fakeResend();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    await t.mutation(api.offers.public.accept, {
      token,
      excludedItemIds: [],
      name: "Ion Popescu",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await t.finishInProgressScheduledFunctions();
    expect(sent.map((email) => email.to)).toEqual([["ana@example.com"]]);
    const page = await t.query(api.offers.public.view, { token });
    expect(page).toMatchObject({ state: "accepted", confirmation: null });
    if (page?.state === "accepted") {
      // No evidence was sent, but the hash and the deadline are there.
      expect(page.accepted?.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(page.accepted?.earlyStart).toBe(false);
      expect(page.accepted?.withdrawalUntil).toBeDefined();
    }
    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed?.signature?.evidence).toBeUndefined();
    expect(followed?.confirmation).toBeNull();
  });

  test("a company's acceptance has no withdrawal deadline", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      consumer: false,
    });
    await t.mutation(api.offers.public.accept, {
      token,
      excludedItemIds: [],
      name: "Ion Popescu",
      earlyStart: true,
    });
    const page = await t.query(api.offers.public.view, { token });
    if (page?.state !== "accepted") {
      throw new Error("expected an accepted offer");
    }
    expect(page.accepted?.withdrawalUntil).toBeUndefined();
    // An early start means nothing outside a consumer's withdrawal days.
    expect(page.accepted?.earlyStart).toBe(false);
  });
});

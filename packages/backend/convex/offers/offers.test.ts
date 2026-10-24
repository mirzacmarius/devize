import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { firmOwner, setup, signIn } from "../test.helper";
import { decisionEmail, formatLei } from "./notify";
import {
  devizFor,
  fakeResend,
  premiumVariant,
  restoreEmail,
} from "./test.helper";

afterEach(() => {
  restoreEmail();
  setSystemTime();
});

// A signature as the page draws it: a few strokes in the 600 × 200 box.
const signature = "M40 120 L60 80 L80 130 L100 70 L130 125 M150 90 L220 95";

describe("offers", () => {
  test("a link sends a draft Deviz and the client reads it without an account", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, ceilingId } = await devizFor(t);
    const { offerId, token } = await firm.as.mutation(
      api.offers.offers.create,
      {
        estimateId,
        message: "Bună ziua, vă trimit oferta pentru baie.",
        depositPercent: 30,
        optionalItems: [{ lineItemId: ceilingId, included: false }],
      },
    );
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    // Making the link marks the Deviz sent, so it can't change any more.
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.status).toBe("sent");
    expect(estimate.lockedAt).toBeDefined();

    const page = await t.query(api.offers.public.view, { token });
    if (page?.state !== "open") {
      throw new Error(`expected an open offer, got ${page?.state}`);
    }
    expect(page.preview).toBe(false);
    expect(page.title).toBe("Baie apartament");
    expect(page.client).toEqual({ name: "Ion Popescu" });
    expect(page.firm.name).toBe("Ana Construct SRL");
    expect(page.message).toBe("Bună ziua, vă trimit oferta pentru baie.");
    expect(page.depositPercent).toBe(30);
    expect(
      page.items.map((item) => [item._id, item.optional, item.included]),
    ).toEqual([
      [tilingId, false, true],
      [ceilingId, true, false],
    ]);
    // The ceiling starts left out, so the total is the tiling's alone.
    const tilingOnly = estimate.lineItems[0]?.totals.total ?? 0;
    expect(page.choice.totals.direct).toBeGreaterThan(tilingOnly);
    expect(page.choice.excludedItemIds).toEqual([ceilingId]);
    expect(page.items[0]?.materials).toEqual([
      "Adeziv flexibil C2TE",
      "Faianță",
      "Chit de rosturi",
    ]);

    // Built field by field: no notes, no resource prices, no sources.
    const text = JSON.stringify(page);
    expect(text).not.toContain("releveu");
    expect(text).not.toContain("Plătește greu");
    expect(text).not.toContain("priceSource");
    expect(text).not.toContain("0722");
    expect(text).not.toContain(firm.userId);

    // The firm previewing its own link is told so.
    const preview = await firm.as.query(api.offers.public.view, { token });
    expect(preview?.preview).toBe(true);

    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed).toMatchObject({
      _id: offerId,
      status: "sent",
      viewCount: 0,
      depositPercent: 30,
      choice: {
        chosen: false,
        excluded: [{ _id: ceilingId, title: "Tavan fals din gips-carton" }],
      },
    });
  });

  test("an unknown or malformed token shows nothing", async () => {
    const t = setup();
    expect(
      await t.query(api.offers.public.view, { token: "x".repeat(32) }),
    ).toBeNull();
    expect(await t.query(api.offers.public.view, { token: "" })).toBeNull();
    await expect(
      t.mutation(api.offers.public.choose, {
        token: "y".repeat(32),
        excludedItemIds: [],
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("only the firm makes and follows its links, one live link per Deviz", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.mutation(api.offers.offers.create, { estimateId }),
    ).rejects.toThrow(/not_found/);
    const { offerId } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    await expect(
      firm.as.mutation(api.offers.offers.create, { estimateId }),
    ).rejects.toThrow(/in_use/);
    await expect(
      other.as.query(api.offers.offers.forEstimate, { estimateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.offers.offers.withdraw, { offerId }),
    ).rejects.toThrow(/not_found/);
    // While the link is out, the Deviz can't go back to draft.
    await expect(
      firm.as.mutation(api.estimates.estimates.setStatus, {
        estimateId,
        status: "draft",
      }),
    ).rejects.toThrow(/locked/);
  });

  test("a Deviz without line items gets no link", async () => {
    const t = setup();
    const firm = await firmOwner(t, "Ana");
    const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Gol",
    });
    await expect(
      firm.as.mutation(api.offers.offers.create, { estimateId }),
    ).rejects.toThrow(/invalid/);
  });

  test("optional works must be the Deviz's own", async () => {
    const t = setup();
    const { firm, estimateId, tilingId } = await devizFor(t);
    const other = await devizFor(t, "Bogdan", "DV-FAI-02");
    await expect(
      firm.as.mutation(api.offers.offers.create, {
        estimateId,
        optionalItems: [{ lineItemId: other.tilingId, included: true }],
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      firm.as.mutation(api.offers.offers.create, {
        estimateId,
        optionalItems: [
          { lineItemId: tilingId, included: true },
          { lineItemId: tilingId, included: false },
        ],
      }),
    ).rejects.toThrow(/invalid/);
  });

  test("visits count once per half hour, and the firm's previews don't count", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    const start = Date.now();
    setSystemTime(start);
    await firm.as.mutation(api.offers.public.recordView, { token });
    await t.mutation(api.offers.public.recordView, { token });
    setSystemTime(start + 10 * 60_000);
    await t.mutation(api.offers.public.recordView, { token });
    setSystemTime(start + 45 * 60_000);
    await t.mutation(api.offers.public.recordView, { token });
    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed).toMatchObject({ status: "viewed", viewCount: 2 });
    // The clock runs on from each setSystemTime.
    expect(followed?.viewedAt).toBeLessThan(start + 10 * 60_000);
    expect(followed?.lastViewedAt).toBeGreaterThanOrEqual(start + 45 * 60_000);
  });

  test("the client compares variants and options, and the server prices them", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, ceilingId } = await devizFor(t);
    const variantId = await premiumVariant(t, firm, estimateId, tilingId);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      variantIds: [variantId],
      optionalItems: [{ lineItemId: ceilingId, included: true }],
    });
    const base = await t.query(api.offers.public.view, { token });
    if (base?.state !== "open") {
      throw new Error("expected an open offer");
    }
    expect(base.baseLabel).toBe("Standard");
    expect(base.variants).toHaveLength(1);
    const premiumTotal = base.variants[0]?.total ?? 0;
    expect(premiumTotal).toBeGreaterThan(base.baseTotal);

    // The page asks for prices before saving the choice.
    const premium = await t.query(api.offers.public.view, {
      token,
      variantId,
      excludedItemIds: [ceilingId],
    });
    if (premium?.state !== "open") {
      throw new Error("expected an open offer");
    }
    expect(premium.items[0]?.changes).toEqual([
      { from: "Faianță", to: "Faianță rectificată 60×120" },
    ]);
    expect(premium.items[0]?.materials).toContain("Faianță rectificată 60×120");
    expect(premium.items[0]?.unitPrice).toBeGreaterThan(
      base.items[0]?.unitPrice ?? 0,
    );
    expect(premium.items[1]?.included).toBe(false);
    expect(premium.choice.totals.total).toBeLessThan(premiumTotal);

    // Only optional works can be left out, and only this offer's variants.
    await expect(
      t.query(api.offers.public.view, { token, excludedItemIds: [tilingId] }),
    ).rejects.toThrow(/invalid/);
    const other = await devizFor(t, "Bogdan", "DV-FAI-02");
    const strangerVariant = await premiumVariant(
      t,
      other.firm,
      other.estimateId,
      other.tilingId,
    );
    await expect(
      t.mutation(api.offers.public.choose, {
        token,
        variantId: strangerVariant,
        excludedItemIds: [],
      }),
    ).rejects.toThrow(/not_found/);

    await t.mutation(api.offers.public.choose, {
      token,
      variantId,
      excludedItemIds: [ceilingId],
    });
    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed?.choice).toMatchObject({
      chosen: true,
      variantName: "Premium",
      excluded: [{ _id: ceilingId }],
      totals: { total: premium.choice.totals.total },
    });

    // The firm's preview doesn't move the client's choice.
    await firm.as.mutation(api.offers.public.choose, {
      token,
      excludedItemIds: [],
    });
    const after = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(after?.choice.variantName).toBe("Premium");
  });

  test("the client accepts and signs; the choice and its price are frozen", async () => {
    const t = setup();
    const sent = fakeResend();
    const { firm, estimateId, tilingId, ceilingId } = await devizFor(t);
    const variantId = await premiumVariant(t, firm, estimateId, tilingId);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      variantIds: [variantId],
      optionalItems: [{ lineItemId: ceilingId, included: true }],
    });

    await expect(
      t.mutation(api.offers.public.accept, {
        token,
        variantId,
        excludedItemIds: [],
        name: "Ion Popescu",
        signature: "M1 1",
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      t.mutation(api.offers.public.accept, {
        token,
        excludedItemIds: [],
        name: "I",
        signature,
      }),
    ).rejects.toThrow(/invalid/);
    // The firm can't sign for its client.
    await expect(
      firm.as.mutation(api.offers.public.accept, {
        token,
        excludedItemIds: [],
        name: "Ana",
        signature,
      }),
    ).rejects.toThrow(/forbidden/);

    await t.mutation(api.offers.public.accept, {
      token,
      variantId,
      excludedItemIds: [ceilingId],
      name: "  Ion   Popescu ",
      signature,
    });
    const page = await t.query(api.offers.public.view, {
      token,
      // A decided offer ignores what the page asks for.
      excludedItemIds: [],
    });
    if (page?.state !== "accepted") {
      throw new Error("expected an accepted offer");
    }
    expect(page.accepted).toMatchObject({
      name: "Ion Popescu",
      path: signature,
      variantName: "Premium",
    });
    expect(page.choice.excludedItemIds).toEqual([ceilingId]);

    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.status).toBe("accepted");
    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed).toMatchObject({
      status: "accepted",
      signature: { name: "Ion Popescu", path: signature },
      choice: { variantName: "Premium", totals: page.choice.totals },
    });

    // An answer is final.
    await expect(
      t.mutation(api.offers.public.decline, { token }),
    ).rejects.toThrow(/locked/);
    await expect(
      t.mutation(api.offers.public.choose, { token, excludedItemIds: [] }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.offers.offers.withdraw, {
        offerId: followed?._id as Id<"offers">,
      }),
    ).rejects.toThrow(/locked/);

    // Whoever made the link hears about it.
    await new Promise((resolve) => setTimeout(resolve, 10));
    await t.finishInProgressScheduledFunctions();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(["ana@example.com"]);
    expect(sent[0]?.subject).toBe("Ion Popescu a acceptat oferta DVZ-0001");
    expect(sent[0]?.text).toContain("Varianta aleasă: Premium.");
    expect(sent[0]?.text).toContain(
      `https://devize.test/estimates/${estimateId}`,
    );
  });

  test("the client declines with a reason, and the Deviz is rejected", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    await expect(
      t.mutation(api.offers.public.decline, {
        token,
        reason: "x".repeat(1001),
      }),
    ).rejects.toThrow(/invalid/);
    await t.mutation(api.offers.public.decline, {
      token,
      reason: "Am găsit o ofertă mai mică.",
    });
    const page = await t.query(api.offers.public.view, { token });
    expect(page).toMatchObject({
      state: "declined",
      declined: { reason: "Am găsit o ofertă mai mică." },
    });
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.status).toBe("rejected");
    // A declined Deviz can go back to draft for a new try.
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId,
      status: "draft",
    });
  });

  test("a withdrawn link closes, and an expired one refuses answers", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const start = Date.now();
    setSystemTime(start);
    const { offerId, token } = await firm.as.mutation(
      api.offers.offers.create,
      { estimateId, validDays: 7 },
    );
    await firm.as.mutation(api.offers.offers.withdraw, { offerId });
    expect(await t.query(api.offers.public.view, { token })).toMatchObject({
      state: "closed",
      reason: "withdrawn",
      firm: { name: "Ana Construct SRL" },
    });
    await expect(
      t.mutation(api.offers.public.accept, {
        token,
        excludedItemIds: [],
        name: "Ion Popescu",
        signature,
      }),
    ).rejects.toThrow(/locked/);
    expect(await t.query(api.offers.public.document, { token })).toBeNull();

    // A new link; a week and a day later it no longer takes answers.
    const second = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      validDays: 7,
    });
    setSystemTime(start + 8 * 24 * 60 * 60_000);
    await expect(
      t.mutation(api.offers.public.accept, {
        token: second.token,
        excludedItemIds: [],
        name: "Ion Popescu",
        signature,
      }),
    ).rejects.toThrow(/locked/);
    await t.mutation(internal.offers.offers.expire, {
      offerId: second.offerId,
    });
    expect(
      await t.query(api.offers.public.view, { token: second.token }),
    ).toMatchObject({ state: "closed", reason: "expired" });
  });

  test("a revision's link replaces the earlier one, which leads to it", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const first = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    const revisionId = await firm.as.mutation(
      api.estimates.estimates.duplicate,
      { estimateId, asRevision: true },
    );
    const second = await firm.as.mutation(api.offers.offers.create, {
      estimateId: revisionId,
    });
    expect(
      await t.query(api.offers.public.view, { token: first.token }),
    ).toMatchObject({
      state: "closed",
      reason: "replaced",
      replacementToken: second.token,
    });
    const page = await t.query(api.offers.public.view, {
      token: second.token,
    });
    expect(page).toMatchObject({ state: "open", revision: 2 });
  });

  test("the client's PDF holds only what they chose", async () => {
    const t = setup();
    const { firm, estimateId, ceilingId, tilingId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      optionalItems: [{ lineItemId: ceilingId, included: false }],
    });
    const data = await t.query(api.offers.public.document, { token });
    expect(data?.lineItems.map((item) => item._id)).toEqual([tilingId]);
    expect(data?.client).toMatchObject({ name: "Ion Popescu" });
    expect(JSON.stringify(data)).not.toContain("resources");
  });

  test("deleting a Deviz deletes its links", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    await firm.as.mutation(api.estimates.estimates.remove, { estimateId });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await t.finishInProgressScheduledFunctions();
    expect(await t.query(api.offers.public.view, { token })).toBeNull();
  });
});

describe("offer emails", () => {
  test("lei are written the Romanian way", () => {
    expect(formatLei(39916.16)).toBe("39.916,16");
    expect(formatLei(1234567)).toBe("1.234.567,00");
    expect(formatLei(0.5)).toBe("0,50");
  });

  test("a refusal says why", () => {
    const email = decisionEmail(
      {
        email: "ana@example.com",
        accepted: false,
        code: "DVZ-0007-R2",
        title: "Acoperiș",
        estimateId: "e1" as Id<"estimates">,
        clientName: null,
        signerName: null,
        variantName: null,
        total: 1000,
        reason: "Prea scump <b>",
      },
      "https://devize.test/estimates/e1",
    );
    expect(email.subject).toBe("Clientul a refuzat oferta DVZ-0007-R2");
    expect(email.text).toContain("Motivul: Prea scump <b>");
    expect(email.html).toContain("Prea scump &lt;b&gt;");
  });
});

describe("signing", () => {
  test("someone signed in elsewhere is a visitor and may sign by name", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
    });
    const stranger = await signIn(t, { name: "Străin" });
    // Someone who can't draw signs with their typed name alone.
    await stranger.as.mutation(api.offers.public.accept, {
      token,
      excludedItemIds: [],
      name: "Ion Popescu",
    });
    const followed = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(followed?.status).toBe("accepted");
    expect(followed?.signature).toMatchObject({ name: "Ion Popescu" });
    expect(followed?.signature?.path).toBeUndefined();
  });
});

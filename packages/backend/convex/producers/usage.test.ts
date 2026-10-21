import { afterEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { romanianMonth } from "../lib/dates";
import { fakeResend, restoreEmail } from "../offers/test.helper";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  type TestConvex,
} from "../test.helper";
import { claimedProducer, insertManufacturer } from "./test.helper";

// Made-up producers, norms and products: a real producer's are copyrighted,
// and the repository is public.

type Firm = Awaited<ReturnType<typeof firmOwner>>;

function thisMonth() {
  return romanianMonth(Date.now());
}

/**
 * Termo Test's norm for gluing insulation boards, with its own adhesive, and
 * a rival producer's adhesive that a Variantă can put in its place.
 */
async function gluingProducer(t: TestConvex) {
  const producer = await claimedProducer(t);
  const { admin, manufacturerId } = producer;
  const adhesive = (owner: Id<"manufacturers">, name: string) =>
    t.run(
      async (ctx) =>
        await ctx.db.insert("products", {
          manufacturerId: owner,
          name,
          nameKey: name.toLowerCase(),
          unit: "kg",
          packageSize: 25,
          packageLabel: "sac 25 kg",
          attributes: [],
          status: "published",
          createdBy: admin.userId,
        }),
    );
  const adhesiveId = await adhesive(manufacturerId, "Adeziv Termo Test");
  const rivalId = await insertManufacturer(t, "Rival Test SRL", admin.userId);
  const rivalAdhesiveId = await adhesive(rivalId, "Adeziv Rival");
  const gluingId = await admin.as.mutation(api.catalog.norms.create, {
    source: "manufacturer",
    manufacturerId,
    code: "TT-02A01",
    title: "Lipire plăci termoizolante",
    unit: "mp",
    resources: [
      {
        kind: "material",
        name: "Adeziv Termo Test",
        unit: "kg",
        quantity: 5,
        productId: adhesiveId,
        referencePrice: 3,
      },
      {
        kind: "labor",
        name: "Montator",
        unit: "ore",
        quantity: 0.3,
        referencePrice: 40,
      },
    ],
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId: gluingId });
  return { ...producer, adhesiveId, rivalId, rivalAdhesiveId, gluingId };
}

/** A firm's Deviz for a site in `county`, with the gluing on it. */
async function devizWithGluing(
  firm: Firm,
  gluingId: Id<"norms">,
  county: string | undefined,
  quantity = 100,
) {
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Termoizolație bloc",
    county,
  });
  const lineItemId = await firm.as.mutation(
    api.estimates.lineItems.addFromNorm,
    { estimateId, normId: gluingId, quantity },
  );
  return { estimateId, lineItemId };
}

async function setStatus(
  t: TestConvex,
  firm: Firm,
  estimateId: Id<"estimates">,
  status: "draft" | "sent" | "accepted",
) {
  await firm.as.mutation(api.estimates.estimates.setStatus, {
    estimateId,
    status,
  });
  // Counting runs right after, in the background.
  await t.finishAllScheduledFunctions(() => {});
}

describe("producer statistics", () => {
  afterEach(restoreEmail);

  test("count the producer's norms added to devize, across their versions", async () => {
    const t = setup();
    const { admin, ana, manufacturerId, gluingId } = await gluingProducer(t);
    const mihai = await firmOwner(t, "Mihai");
    const { estimateId } = await devizWithGluing(mihai, gluingId, "Cluj");
    const newer = await admin.as.mutation(api.catalog.norms.createVersion, {
      normId: gluingId,
    });
    await admin.as.mutation(api.catalog.norms.update, {
      normId: newer,
      title: "Lipire plăci din vată minerală",
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId: newer });
    await mihai.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId: newer,
      quantity: 20,
    });
    // Devize's own norms count for no producer.
    const { normId: baseNormId } = await publishedBaseNorm(t);
    await mihai.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId: baseNormId,
      quantity: 12,
    });

    const stats = await ana.as.query(api.producers.usage.stats, {
      manufacturerId,
      until: thisMonth(),
    });
    expect(stats?.totals).toEqual({ added: 2, sent: 0, accepted: 0, firms: 1 });
    expect(stats?.months).toHaveLength(12);
    expect(stats?.months.at(-1)).toEqual({
      month: thisMonth(),
      added: 2,
      sent: 0,
      accepted: 0,
    });
    // Listed as its newest version.
    expect(stats?.norms).toEqual([
      {
        _id: newer,
        code: "TT-02A01",
        title: "Lipire plăci din vată minerală",
        unit: "mp",
        added: 2,
        sent: 0,
        accepted: 0,
        acceptedQuantity: 0,
      },
    ]);
    expect(stats?.products).toEqual([]);
    // One firm's county doesn't show on its own.
    expect(stats?.counties).toEqual([]);
    expect(stats?.otherCounties).toEqual({ added: 2, sent: 0, accepted: 0 });
  });

  test("count a Deviz sent and accepted once, whatever its revisions", async () => {
    const t = setup();
    const { ana, manufacturerId, gluingId, adhesiveId } =
      await gluingProducer(t);
    const mihai = await firmOwner(t, "Mihai");
    const { estimateId } = await devizWithGluing(mihai, gluingId, "Cluj");
    const read = () =>
      ana.as.query(api.producers.usage.stats, {
        manufacturerId,
        until: thisMonth(),
      });

    await setStatus(t, mihai, estimateId, "sent");
    // Taken back, then sent again, and sent as a revision: still one.
    await setStatus(t, mihai, estimateId, "draft");
    await setStatus(t, mihai, estimateId, "sent");
    const revisionId = await mihai.as.mutation(
      api.estimates.estimates.duplicate,
      { estimateId, asRevision: true },
    );
    await setStatus(t, mihai, revisionId, "sent");
    let stats = await read();
    expect(stats?.totals).toEqual({ added: 1, sent: 1, accepted: 0, firms: 1 });
    expect(stats?.norms[0]).toMatchObject({ added: 1, sent: 1, accepted: 0 });
    // 5 kg of adhesive on each of 100 mp.
    expect(stats?.products).toEqual([
      {
        _id: adhesiveId,
        name: "Adeziv Termo Test",
        unit: "kg",
        packageSize: 25,
        packageLabel: "sac 25 kg",
        sent: 1,
        sentQuantity: 500,
        accepted: 0,
        acceptedQuantity: 0,
        acceptedValue: 0,
        replaced: 0,
      },
    ]);

    await setStatus(t, mihai, revisionId, "accepted");
    stats = await read();
    expect(stats?.totals).toEqual({ added: 1, sent: 1, accepted: 1, firms: 1 });
    expect(stats?.norms[0]).toMatchObject({
      accepted: 1,
      acceptedQuantity: 100,
    });
    // At the norm's reference price of 3 lei a kilogram.
    expect(stats?.products[0]).toMatchObject({
      accepted: 1,
      acceptedQuantity: 500,
      acceptedValue: 1500,
    });

    // Accepted straight from draft, it counts as sent too.
    const other = await devizWithGluing(mihai, gluingId, "Cluj", 40);
    await setStatus(t, mihai, other.estimateId, "accepted");
    stats = await read();
    expect(stats?.totals).toEqual({ added: 2, sent: 2, accepted: 2, firms: 1 });
    expect(stats?.norms[0]).toMatchObject({
      added: 2,
      sent: 2,
      accepted: 2,
      acceptedQuantity: 140,
    });
  });

  test("count what the client accepts on an Ofertă: the chosen Variantă, without the works left out", async () => {
    const t = setup();
    fakeResend();
    const {
      admin,
      ana,
      manufacturerId,
      gluingId,
      adhesiveId,
      rivalId,
      rivalAdhesiveId,
    } = await gluingProducer(t);
    const mihai = await firmOwner(t, "Mihai");
    const { estimateId, lineItemId } = await devizWithGluing(
      mihai,
      gluingId,
      "Cluj",
    );
    // The plinth, as optional work.
    const plinthId = await mihai.as.mutation(
      api.estimates.lineItems.addFromNorm,
      { estimateId, normId: gluingId, quantity: 10 },
    );
    // A cheaper Variantă glues with the rival's adhesive.
    const variantId = await t.run(async (ctx) => {
      const item = await ctx.db.get("lineItems", lineItemId);
      const own = item?.resources.find((r) => r.productId === adhesiveId);
      if (!own) {
        throw new Error("no adhesive");
      }
      return await ctx.db.insert("variants", {
        organizationId: mihai.organizationId,
        estimateId,
        name: "Economic",
        tier: "economy",
        position: 1,
        swaps: [
          {
            lineItemId,
            resourceKey: own.key,
            productId: rivalAdhesiveId,
            name: "Adeziv Rival",
            unitPrice: 2.5,
            priceSource: "manual",
          },
        ],
      });
    });
    const { token } = await mihai.as.mutation(api.offers.offers.create, {
      estimateId,
      variantIds: [variantId],
      optionalItems: [{ lineItemId: plinthId, included: true }],
    });
    await t.finishAllScheduledFunctions(() => {});
    const read = async (as: typeof ana.as, of: Id<"manufacturers">) =>
      await as.query(api.producers.usage.stats, {
        manufacturerId: of,
        until: thisMonth(),
      });

    // Sent, the Deviz offers both adhesives.
    let own = await read(ana.as, manufacturerId);
    expect(own?.products[0]).toMatchObject({
      _id: adhesiveId,
      sent: 1,
      sentQuantity: 550,
    });
    let rival = await read(admin.as, rivalId);
    expect(rival?.totals).toEqual({ added: 0, sent: 1, accepted: 0, firms: 1 });
    expect(rival?.products[0]).toMatchObject({
      _id: rivalAdhesiveId,
      sent: 1,
      sentQuantity: 500,
    });

    await t.mutation(api.offers.public.accept, {
      token,
      variantId,
      excludedItemIds: [plinthId],
      name: "Ion Popescu",
    });
    await t.finishAllScheduledFunctions(() => {});

    own = await read(ana.as, manufacturerId);
    expect(own?.totals).toEqual({ added: 2, sent: 1, accepted: 1, firms: 1 });
    // Its norm was accepted without the plinth, its adhesive swapped out.
    expect(own?.norms[0]).toMatchObject({
      added: 2,
      sent: 1,
      accepted: 1,
      acceptedQuantity: 100,
    });
    expect(own?.products[0]).toMatchObject({
      accepted: 0,
      acceptedQuantity: 0,
      acceptedValue: 0,
      replaced: 1,
    });
    rival = await read(admin.as, rivalId);
    expect(rival?.totals).toEqual({ added: 0, sent: 1, accepted: 1, firms: 1 });
    expect(rival?.norms).toEqual([]);
    expect(rival?.products[0]).toMatchObject({
      accepted: 1,
      acceptedQuantity: 500,
      acceptedValue: 1250,
      replaced: 0,
    });
  });

  test("show a county with three firms on its own, and only to the producer and Devize", async () => {
    const t = setup();
    const { admin, ana, manufacturerId, gluingId } = await gluingProducer(t);
    const firms: Firm[] = [];
    for (const name of ["Mihai", "Ioana", "Radu"]) {
      const firm = await firmOwner(t, name);
      await devizWithGluing(firm, gluingId, "Cluj");
      firms.push(firm);
    }
    await devizWithGluing(firms[0], gluingId, "Iași");
    await devizWithGluing(await firmOwner(t, "Elena"), gluingId, undefined);

    const args = { manufacturerId, until: thisMonth() };
    const stats = await ana.as.query(api.producers.usage.stats, args);
    expect(stats?.totals).toEqual({ added: 5, sent: 0, accepted: 0, firms: 4 });
    expect(stats?.counties).toEqual([
      { county: "Cluj", firms: 3, added: 3, sent: 0, accepted: 0 },
    ]);
    expect(stats?.otherCounties).toEqual({ added: 2, sent: 0, accepted: 0 });
    expect(await admin.as.query(api.producers.usage.stats, args)).toEqual(
      stats,
    );

    // A firm that uses the norms sees no one's statistics.
    expect(await firms[0].as.query(api.producers.usage.stats, args)).toBeNull();
    await expect(t.query(api.producers.usage.stats, args)).rejects.toThrow(
      /unauthenticated/,
    );
    await expect(
      ana.as.query(api.producers.usage.stats, {
        manufacturerId,
        until: "2026-13",
      }),
    ).rejects.toThrow(/invalid/);
    const profile = (as: typeof ana.as) =>
      as.query(api.producers.profiles.get, { manufacturerId });
    expect((await profile(ana.as))?.viewer.canSeeStats).toBe(true);
    expect((await profile(admin.as))?.viewer.canSeeStats).toBe(true);
    expect((await profile(firms[0].as))?.viewer.canSeeStats).toBe(false);
  });

  test("forget which firms used the producer when a firm goes, and keep the counts", async () => {
    const t = setup();
    const { ana, manufacturerId, gluingId } = await gluingProducer(t);
    const mihai = await firmOwner(t, "Mihai");
    const { estimateId } = await devizWithGluing(mihai, gluingId, "Cluj");
    await setStatus(t, mihai, estimateId, "sent");

    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId: mihai.organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});
    const left = await t.run(async (ctx) => ({
      firms: await ctx.db.query("usageFirms").collect(),
      counted: await ctx.db.query("countedEstimates").collect(),
      events: await ctx.db.query("usageEvents").collect(),
    }));
    expect(left).toEqual({ firms: [], counted: [], events: [] });
    const stats = await ana.as.query(api.producers.usage.stats, {
      manufacturerId,
      until: thisMonth(),
    });
    expect(stats?.totals).toEqual({ added: 1, sent: 1, accepted: 0, firms: 0 });
  });
});

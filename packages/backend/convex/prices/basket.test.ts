import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  type TestConvex,
} from "../test.helper";

// Made-up norms, stores' products and prices.

async function tilingEstimate(t: TestConvex) {
  const { normId } = await publishedBaseNorm(t);
  const ana = await firmOwner(t, "Ana");
  const estimateId = await ana.as.mutation(api.estimates.estimates.create, {
    organizationId: ana.organizationId,
    title: "Baie apartament Popescu",
  });
  await ana.as.mutation(api.estimates.lineItems.addFromNorm, {
    estimateId,
    normId,
    quantity: 20,
  });
  await ana.as.mutation(api.estimates.lineItems.addFromNorm, {
    estimateId,
    normId,
    quantity: 4,
  });
  return { ana, estimateId };
}

async function resourceNamed(t: TestConvex, nameKey: string) {
  const resource = await t.run(
    async (ctx) =>
      await ctx.db
        .query("resources")
        .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
          q
            .eq("organizationId", undefined)
            .eq("kind", "material")
            .eq("nameKey", nameKey),
        )
        .unique(),
  );
  if (!resource) {
    throw new Error(`no resource ${nameKey}`);
  }
  return resource._id;
}

describe("the Coș", () => {
  test("sums a Deviz's materials over its line items", async () => {
    const t = setup();
    const { ana, estimateId } = await tilingEstimate(t);
    const basket = await ana.as.query(api.prices.basket.forEstimate, {
      estimateId,
    });
    // 24 mp of tiling: 4.5 kg adhesive, 1.05 mp tiles and 0.5 kg grout each;
    // the "%" share of small materials isn't bought.
    expect(
      basket.materials.map((m) => [m.name, m.quantity, m.unit, m.lineItems]),
    ).toEqual([
      ["Faianță", 25.2, "mp", 2],
      ["Adeziv flexibil C2TE", 108, "kg", 2],
      ["Chit de rosturi", 12, "kg", 2],
    ]);
    expect(basket.materials[0]?.estimateCost).toBe(1134);
    expect(basket.materials.every((m) => m.offers.length === 0)).toBe(true);
    expect(basket.storeFees).toEqual([]);
    expect(basket.omitted).toBe(0);
  });

  test("offers the firm's chosen products and public matches, one per store", async () => {
    const t = setup();
    const { ana, estimateId } = await tilingEstimate(t);
    const adhesive = await resourceNamed(t, "adeziv flexibil c2te");
    await ana.as.mutation(api.prices.choices.typePrice, {
      organizationId: ana.organizationId,
      store: "dedeman",
      resourceId: adhesive,
      title: "Adeziv flexibil C2TE 25 kg",
      price: 45.9,
      unitsPerSale: 25,
    });
    // A Hornbach product linked to the adhesive for everyone, and another
    // firm's typed price, which Ana never sees.
    const publicListing = await t.run(
      async (ctx) =>
        await ctx.db.insert("listings", {
          source: "retailer",
          store: "hornbach",
          resourceId: adhesive,
          title: "Adeziv C2TE, sac 25 kg",
          url: "https://www.hornbach.ro/p/adeziv-c2te/1",
          price: 42.5,
          includedVat: 21,
          saleUnit: "buc",
          unitsPerSale: 25,
          status: "active",
          checkedAt: Date.now(),
        }),
    );
    const bogdan = await firmOwner(t, "Bogdan");
    await bogdan.as.mutation(api.prices.choices.typePrice, {
      organizationId: bogdan.organizationId,
      store: "leroy_merlin",
      resourceId: adhesive,
      title: "Adeziv 25 kg",
      price: 30,
      unitsPerSale: 25,
    });

    const basket = await ana.as.query(api.prices.basket.forEstimate, {
      estimateId,
    });
    const offers = basket.materials.find(
      (m) => m.resourceId === adhesive,
    )?.offers;
    expect(
      offers?.map((o) => [o.store, o.price, o.unitsPerSale, o.typed]),
    ).toEqual([
      ["dedeman", 45.9, 25, true],
      ["hornbach", 42.5, 25, false],
    ]);
    const hornbach = offers?.find((o) => o.store === "hornbach");
    expect(hornbach?.choiceId).toBeUndefined();

    // Choosing the Hornbach product with a checked conversion makes it Ana's.
    await ana.as.mutation(api.prices.choices.pick, {
      organizationId: ana.organizationId,
      listingId: publicListing,
      resourceId: adhesive,
      unitsPerSale: 25,
    });
    const after = await ana.as.query(api.prices.basket.forEstimate, {
      estimateId,
    });
    const picked = after.materials
      .find((m) => m.resourceId === adhesive)
      ?.offers.find((o) => o.store === "hornbach");
    expect(picked?.choiceId).toBeDefined();
    expect(picked?.unitsChecked).toBe(true);

    // Another firm can't choose Ana's typed price.
    const typed = offers?.find((o) => o.store === "dedeman")?.listingId as
      | Id<"listings">
      | undefined;
    if (!typed) {
      throw new Error("no typed listing");
    }
    await expect(
      bogdan.as.mutation(api.prices.choices.pick, {
        organizationId: bogdan.organizationId,
        listingId: typed,
        resourceId: adhesive,
      }),
    ).rejects.toThrow();
  });

  test("keeps what each store costs the firm besides the goods", async () => {
    const t = setup();
    const { ana, estimateId } = await tilingEstimate(t);
    await ana.as.mutation(api.prices.basket.setStoreFee, {
      organizationId: ana.organizationId,
      store: "dedeman",
      fee: 49.999,
      freeFrom: 1500,
    });
    await ana.as.mutation(api.prices.basket.setStoreFee, {
      organizationId: ana.organizationId,
      store: "dedeman",
      fee: 60,
    });
    await ana.as.mutation(api.prices.basket.setStoreFee, {
      organizationId: ana.organizationId,
      store: "hornbach",
      fee: 0,
    });
    const basket = await ana.as.query(api.prices.basket.forEstimate, {
      estimateId,
    });
    expect(basket.storeFees).toEqual([
      { store: "dedeman", fee: 60 },
      { store: "hornbach", fee: 0 },
    ]);
    await expect(
      ana.as.mutation(api.prices.basket.setStoreFee, {
        organizationId: ana.organizationId,
        store: "dedeman",
        fee: -1,
      }),
    ).rejects.toThrow();
  });

  test("shows a Deviz only to its firm", async () => {
    const t = setup();
    const { estimateId } = await tilingEstimate(t);
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.query(api.prices.basket.forEstimate, { estimateId }),
    ).rejects.toThrow();
  });
});

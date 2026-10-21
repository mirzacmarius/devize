import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { insertManufacturer } from "../manufacturers/test.helper";
import { firmOwner, setup, signIn, type TestConvex } from "../test.helper";
import { devizFor } from "./test.helper";
import { searchWords } from "./variants";

// Made-up materials: never use a producer's real catalog in tests.

/** The tiling work's own resource called `name`. */
async function resourceOf(
  t: TestConvex,
  lineItemId: Id<"lineItems">,
  name: string,
) {
  const item = await t.run(
    async (ctx) => await ctx.db.get("lineItems", lineItemId),
  );
  const resource = item?.resources.find((r) => r.name === name);
  if (!resource) {
    throw new Error(`no ${name}`);
  }
  return resource;
}

/** A shared catalog material, as a super admin adds one. */
async function sharedMaterial(
  t: TestConvex,
  name: string,
  unit: string,
  referencePrice?: number,
) {
  const admin = await signIn(t, { name: "Catalog", superadmin: true });
  return await admin.as.mutation(api.catalog.resources.create, {
    kind: "material",
    name,
    unit,
    referencePrice,
  });
}

describe("variants", () => {
  test("a firm makes a Variantă of a draft Deviz, priced whenever it's read", async () => {
    const t = setup();
    const { firm, estimateId, tilingId } = await devizFor(t);
    const tiles = await resourceOf(t, tilingId, "Faianță");
    const variantId = await firm.as.mutation(api.offers.variants.create, {
      estimateId,
      name: " Premium ",
      tier: "premium",
      description: "Faianță rectificată, mai mare, cu rosturi fine.",
    });
    const changed = await firm.as.mutation(api.offers.variants.setSwap, {
      variantId,
      lineItemId: tilingId,
      resourceKey: tiles.key,
      name: "Faianță rectificată 60×120",
      unitPrice: 120,
    });
    expect(changed).toBe(1);

    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const read = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(read.baseTotal).toBe(estimate.totals.total);
    expect(read.variants).toHaveLength(1);
    const premium = read.variants[0];
    expect(premium).toMatchObject({
      _id: variantId,
      name: "Premium",
      tier: "premium",
      description: "Faianță rectificată, mai mare, cu rosturi fine.",
      swaps: [
        {
          lineItemId: tilingId,
          resourceKey: tiles.key,
          name: "Faianță rectificată 60×120",
          unitPrice: 120,
          priceSource: "manual",
        },
      ],
    });
    expect(premium?.total).toBeGreaterThan(read.baseTotal);

    // More tiling makes the Variantă dearer too, without touching it.
    await firm.as.mutation(api.estimates.lineItems.update, {
      lineItemId: tilingId,
      quantity: 30,
    });
    const after = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(after.baseTotal).toBeGreaterThan(read.baseTotal);
    expect(after.variants[0]?.total).toBeGreaterThan(premium?.total ?? 0);
    expect((after.variants[0]?.total ?? 0) - after.baseTotal).toBeGreaterThan(
      (premium?.total ?? 0) - read.baseTotal,
    );

    // Renaming, describing and the tier are the firm's to change.
    await firm.as.mutation(api.offers.variants.update, {
      variantId,
      name: "Lux",
      tier: null,
      description: "",
    });
    const renamed = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(renamed.variants[0]).toMatchObject({ name: "Lux" });
    expect(renamed.variants[0]?.tier).toBeUndefined();
    expect(renamed.variants[0]?.description).toBeUndefined();

    // The work's own material comes back.
    await firm.as.mutation(api.offers.variants.removeSwap, {
      variantId,
      lineItemId: tilingId,
      resourceKey: tiles.key,
    });
    const plain = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(plain.variants[0]?.swaps).toEqual([]);
    expect(plain.variants[0]?.total).toBe(plain.baseTotal);

    await firm.as.mutation(api.offers.variants.remove, { variantId });
    const none = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(none.variants).toEqual([]);
  });

  test("names are short and unique, and a Deviz has at most four Variante", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const create = (name: string) =>
      firm.as.mutation(api.offers.variants.create, { estimateId, name });
    await expect(create("  ")).rejects.toThrow(/invalid.*name/);
    await expect(create("x".repeat(41))).rejects.toThrow(/invalid.*name/);
    await expect(
      firm.as.mutation(api.offers.variants.create, {
        estimateId,
        name: "Economic",
        description: "x".repeat(301),
      }),
    ).rejects.toThrow(/invalid.*description/);

    const economy = await create("Economic");
    await expect(create("ECONOMIC")).rejects.toThrow(/in_use.*name/);
    const premium = await create("Premium");
    await expect(
      firm.as.mutation(api.offers.variants.update, {
        variantId: premium,
        name: "economic",
      }),
    ).rejects.toThrow(/in_use.*name/);
    // A Variantă keeps its own name.
    await firm.as.mutation(api.offers.variants.update, {
      variantId: economy,
      name: "Economic",
    });
    await create("Lux");
    await create("Lux plus");
    await expect(create("Încă una")).rejects.toThrow(/invalid.*variants/);
  });

  test("a material from the catalog is priced like the Deviz's own, in the same unit", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, ceilingId } = await devizFor(t);
    const tiles = await resourceOf(t, tilingId, "Faianță");
    const labour = await resourceOf(t, tilingId, "Faianțar");
    const sundries = await resourceOf(t, tilingId, "Material mărunt");
    const variantId = await firm.as.mutation(api.offers.variants.create, {
      estimateId,
      name: "Premium",
    });
    const swap = (fields: {
      lineItemId?: Id<"lineItems">;
      resourceKey?: string;
      resourceId?: Id<"resources">;
      name?: string;
      unitPrice?: number;
    }) =>
      firm.as.mutation(api.offers.variants.setSwap, {
        variantId,
        lineItemId: tilingId,
        resourceKey: tiles.key,
        ...fields,
      });

    const rectified = await sharedMaterial(t, "Faianță rectificată", "m2", 89);
    await swap({ resourceId: rectified });
    let read = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(read.variants[0]?.swaps).toEqual([
      {
        lineItemId: tilingId,
        resourceKey: tiles.key,
        resourceId: rectified,
        name: "Faianță rectificată",
        unitPrice: 89,
        priceSource: "reference",
      },
    ]);

    // A price typed by hand wins over the catalog's.
    await swap({ resourceId: rectified, unitPrice: 75 });
    read = await firm.as.query(api.offers.variants.forEstimate, { estimateId });
    expect(read.variants[0]?.swaps[0]).toMatchObject({
      unitPrice: 75,
      priceSource: "manual",
    });

    // Counted otherwise, a material can't keep the work's consumption.
    const pieces = await sharedMaterial(t, "Faianță decor", "buc", 5);
    await expect(swap({ resourceId: pieces })).rejects.toThrow(/invalid.*unit/);
    // Without a price, it would make the Variantă look cheap.
    const unpriced = await sharedMaterial(t, "Faianță fără preț", "mp");
    await expect(swap({ resourceId: unpriced })).rejects.toThrow(
      /invalid.*unitPrice/,
    );
    // Another firm's own material stays theirs.
    const other = await firmOwner(t, "Bogdan");
    const theirs = await other.as.mutation(api.catalog.resources.create, {
      organizationId: other.organizationId,
      kind: "material",
      name: "Faianța lui Bogdan",
      unit: "mp",
      referencePrice: 50,
    });
    await expect(swap({ resourceId: theirs })).rejects.toThrow(/not_found/);
    // A material typed by hand needs a name and a price.
    await expect(swap({ name: " ", unitPrice: 50 })).rejects.toThrow(
      /invalid.*materialName/,
    );
    await expect(swap({ name: "Faianță italiană" })).rejects.toThrow(
      /invalid.*unitPrice/,
    );
    await expect(swap({ name: "Faianță", unitPrice: -1 })).rejects.toThrow(
      /invalid.*unitPrice/,
    );
    // Only materials swap: not labour, not the sundries counted in "%".
    await expect(
      swap({
        resourceKey: labour.key,
        name: "Faianțar cu experiență",
        unitPrice: 60,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      swap({ resourceKey: sundries.key, name: "Altceva", unitPrice: 1 }),
    ).rejects.toThrow(/not_found/);
    // And only in this Deviz's works.
    const elsewhere = await devizFor(t, "Bogdan 2", "DV-FAI-02");
    await expect(
      swap({ lineItemId: elsewhere.tilingId, name: "Faianță", unitPrice: 50 }),
    ).rejects.toThrow(/not_found/);
    // Nor in a work without that material.
    await expect(
      swap({ lineItemId: ceilingId, name: "Faianță", unitPrice: 50 }),
    ).rejects.toThrow(/not_found/);
  });

  test("a swap can go in every work with the same material", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, normId } = await devizFor(t);
    const kitchenId = await firm.as.mutation(
      api.estimates.lineItems.addFromNorm,
      { estimateId, normId, quantity: 8 },
    );
    const adhesive = await resourceOf(t, tilingId, "Adeziv flexibil C2TE");
    const variantId = await firm.as.mutation(api.offers.variants.create, {
      estimateId,
      name: "Premium",
    });
    const changed = await firm.as.mutation(api.offers.variants.setSwap, {
      variantId,
      lineItemId: tilingId,
      resourceKey: adhesive.key,
      name: "Adeziv flexibil S1, gri",
      unitPrice: 4.1,
      everywhere: true,
    });
    expect(changed).toBe(2);
    const read = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(
      read.variants[0]?.swaps.map((swap) => [swap.lineItemId, swap.name]),
    ).toEqual([
      [tilingId, "Adeziv flexibil S1, gri"],
      [kitchenId, "Adeziv flexibil S1, gri"],
    ]);

    // A work that leaves the Deviz takes its swap with it.
    await firm.as.mutation(api.estimates.lineItems.remove, {
      lineItemId: kitchenId,
    });
    const after = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(after.variants[0]?.swaps.map((swap) => swap.lineItemId)).toEqual([
      tilingId,
    ]);
  });

  test("a sent Deviz's Variante can't change, and only the firm sees them", async () => {
    const t = setup();
    const { firm, estimateId, tilingId } = await devizFor(t);
    const tiles = await resourceOf(t, tilingId, "Faianță");
    const variantId = await firm.as.mutation(api.offers.variants.create, {
      estimateId,
      name: "Premium",
    });

    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.query(api.offers.variants.forEstimate, { estimateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.offers.variants.update, {
        variantId,
        name: "A mea",
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.query(api.offers.variants.alternatives, {
        lineItemId: tilingId,
        resourceKey: tiles.key,
      }),
    ).rejects.toThrow(/not_found/);

    await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      variantIds: [variantId],
    });
    await expect(
      firm.as.mutation(api.offers.variants.setSwap, {
        variantId,
        lineItemId: tilingId,
        resourceKey: tiles.key,
        name: "Faianță rectificată",
        unitPrice: 100,
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.offers.variants.update, {
        variantId,
        name: "Lux",
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.offers.variants.remove, { variantId }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.offers.variants.create, {
        estimateId,
        name: "Economic",
      }),
    ).rejects.toThrow(/locked/);
    // The firm still reads them.
    const read = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(read.variants.map((x) => x.name)).toEqual(["Premium"]);
  });

  test("the link shows a Variantă's description", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const variantId = await firm.as.mutation(api.offers.variants.create, {
      estimateId,
      name: "Premium",
      tier: "premium",
      description: "Gresie și faianță rectificate.",
    });
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      variantIds: [variantId],
    });
    const page = await t.query(api.offers.public.view, { token });
    if (page?.state !== "open") {
      throw new Error("expected an open offer");
    }
    expect(page.variants).toMatchObject([
      {
        _id: variantId,
        name: "Premium",
        description: "Gresie și faianță rectificate.",
      },
    ]);
  });
});

describe("alternatives", () => {
  test("other makes of the material come first, then the catalog's, in its unit, priced", async () => {
    const t = setup();
    const { firm, tilingId } = await devizFor(t);
    const tiles = await resourceOf(t, tilingId, "Faianță");
    if (!tiles.resourceId) {
      throw new Error("the norm's tiles should be a catalog material");
    }
    const { userId: adminId } = await signIn(t, {
      name: "Admin",
      superadmin: true,
    });
    const manufacturerId = await insertManufacturer(t, adminId);
    const genericId = tiles.resourceId;
    const make = await t.run(
      async (ctx) =>
        await ctx.db.insert("products", {
          manufacturerId,
          resourceId: genericId,
          name: "Faianță Test Albă 30×60",
          nameKey: "faianta test alba 30 60",
          unit: "mp",
          attributes: [],
          status: "published",
          createdBy: adminId,
        }),
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("products", {
        manufacturerId,
        resourceId: genericId,
        name: "Faianță Test, nepublicată",
        nameKey: "faianta test nepublicata",
        unit: "mp",
        attributes: [],
        status: "draft",
        createdBy: adminId,
      });
    });
    const cheap = await sharedMaterial(t, "Faianță economică", "mp", 30);
    const dear = await sharedMaterial(t, "Faianță rectificată", "mp", 89);
    await sharedMaterial(t, "Faianță decor", "buc", 5);
    await sharedMaterial(t, "Faianță fără preț", "mp");

    const found = await firm.as.query(api.offers.variants.alternatives, {
      lineItemId: tilingId,
      resourceKey: tiles.key,
    });
    expect(
      found.map((x) => [x.name, x.unitPrice, x.priceSource, x.sameMaterial]),
    ).toEqual([
      // A make of the norm's material first; nothing prices it yet.
      ["Faianță Test Albă 30×60", 0, "missing", true],
      ["Faianță economică", 30, "reference", false],
      ["Faianță rectificată", 89, "reference", false],
      ["Faianță fără preț", 0, "missing", false],
    ]);
    expect(found[0]).toMatchObject({ productId: make, resourceId: genericId });
    expect(found.map((x) => x.resourceId)).toContain(cheap);
    expect(found.map((x) => x.resourceId)).toContain(dear);

    // A make without a price goes in once the firm types one.
    const { estimateId } = await t.run(async (ctx) => {
      const item = await ctx.db.get("lineItems", tilingId);
      return { estimateId: item?.estimateId as Id<"estimates"> };
    });
    const variantId = await firm.as.mutation(api.offers.variants.create, {
      estimateId,
      name: "Premium",
    });
    const pick = { variantId, lineItemId: tilingId, resourceKey: tiles.key };
    await expect(
      firm.as.mutation(api.offers.variants.setSwap, {
        ...pick,
        productId: make,
      }),
    ).rejects.toThrow(/invalid.*unitPrice/);
    await firm.as.mutation(api.offers.variants.setSwap, {
      ...pick,
      productId: make,
      unitPrice: 52,
    });
    const read = await firm.as.query(api.offers.variants.forEstimate, {
      estimateId,
    });
    expect(read.variants[0]?.swaps[0]).toMatchObject({
      productId: make,
      resourceId: genericId,
      name: "Faianță Test Albă 30×60",
      unitPrice: 52,
      priceSource: "manual",
    });

    // The firm can look for something else.
    const other = await firm.as.query(api.offers.variants.alternatives, {
      lineItemId: tilingId,
      resourceKey: tiles.key,
      text: "rectificată",
    });
    expect(other.map((x) => x.name)).toContain("Faianță rectificată");
    expect(other.map((x) => x.name)).not.toContain("Faianță economică");
  });

  test("the material's name without sizes is what's looked up", () => {
    expect(searchWords("Faianță 30×60")).toBe("faianta");
    expect(searchWords("Adeziv flexibil C2TE, sac 25 kg")).toBe(
      "adeziv flexibil",
    );
  });
});

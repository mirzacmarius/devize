import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  type TestConvex,
  tilingResources,
} from "../test.helper";

async function estimateWithRates(t: TestConvex) {
  const { normId, admin } = await publishedBaseNorm(t);
  const firm = await firmOwner(t, "Ana");
  const norm = await firm.as.query(api.catalog.norms.get, { normId });
  const helper = norm.resources.find((r) => r.name === "Muncitor deservire");
  // Every trade at 40 lei/h, except the helper at 25 lei/h.
  await firm.as.mutation(api.accounts.rates.set, {
    organizationId: firm.organizationId,
    kind: "labor",
    name: "Manoperă",
    unit: "ora",
    price: 40,
  });
  await firm.as.mutation(api.accounts.rates.set, {
    organizationId: firm.organizationId,
    kind: "labor",
    resourceId: helper?.resourceId,
    name: "Muncitor deservire",
    unit: "ora",
    price: 25,
  });
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie apartament Popescu",
  });
  return { t, admin, firm, normId, estimateId };
}

describe("line items", () => {
  test("price a norm with the firm's rates and the norm's reference prices", async () => {
    const t = setup();
    const { firm, normId, estimateId } = await estimateWithRates(t);
    const lineItemId = await firm.as.mutation(
      api.estimates.lineItems.addFromNorm,
      { estimateId, normId, quantity: 24 },
    );
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const item = estimate.lineItems.find((i) => i._id === lineItemId);
    expect(item?.code).toBe("DV-FAI-01");
    expect(item?.unit).toBe("mp");
    const priceOf = (name: string) => {
      const resource = item?.resources.find((r) => r.name === name);
      return [resource?.unitPrice, resource?.priceSource];
    };
    expect(priceOf("Faianțar")).toEqual([40, "own"]);
    expect(priceOf("Muncitor deservire")).toEqual([25, "own"]);
    expect(priceOf("Faianță")).toEqual([45, "reference"]);
    expect(item?.unitCost).toEqual({
      material: 62.27,
      labor: 41,
      equipment: 0.5,
      transport: 1.22,
    });
    expect(estimate.totals).toEqual({
      material: 1494.48,
      labor: 984,
      equipment: 12,
      transport: 29.28,
      cam: 22.14,
      direct: 2541.9,
      indirect: 254.19,
      profit: 139.8,
      subtotal: 2935.89,
      vat: 616.54,
      total: 3552.43,
      laborHours: 26.4,
    });
  });

  test("keep their copy when the norm gets a new version, until upgraded", async () => {
    const t = setup();
    const { admin, firm, normId, estimateId } = await estimateWithRates(t);
    const lineItemId = await firm.as.mutation(
      api.estimates.lineItems.addFromNorm,
      { estimateId, normId, quantity: 10 },
    );
    const before = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const draftId = await admin.as.mutation(api.catalog.norms.createVersion, {
      normId,
    });
    await admin.as.mutation(api.catalog.norms.setResources, {
      normId: draftId,
      resources: tilingResources.map((r) =>
        r.name === "Adeziv flexibil C2TE" ? { ...r, quantity: 5 } : r,
      ),
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId: draftId });

    const unchanged = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(unchanged.totals).toEqual(before.totals);
    const updates = await firm.as.query(api.estimates.estimates.checkUpdates, {
      estimateId,
    });
    expect(updates.normUpdates).toEqual([
      { lineItemId, normId, latestNormId: draftId, latestVersion: 2 },
    ]);

    await firm.as.mutation(api.estimates.lineItems.upgradeNorm, {
      lineItemId,
    });
    const upgraded = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const item = upgraded.lineItems[0];
    expect(item?.normId).toBe(draftId);
    expect(
      item?.resources.find((r) => r.name === "Adeziv flexibil C2TE")?.quantity,
    ).toBe(5);
    // 0.5 kg more adhesive at 2.40, plus 2% small materials, per mp.
    expect(upgraded.totals.material).toBeGreaterThan(before.totals.material);
  });

  test("can't change once the Deviz is sent", async () => {
    const t = setup();
    const { firm, normId, estimateId } = await estimateWithRates(t);
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId,
      status: "sent",
    });
    await expect(
      firm.as.mutation(api.estimates.lineItems.addFromNorm, {
        estimateId,
        normId,
        quantity: 1,
      }),
    ).rejects.toThrow(/locked/);
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId,
      status: "draft",
    });
    await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId,
      quantity: 1,
    });
  });

  test("can't use another firm's private norm or touch its Deviz", async () => {
    const t = setup();
    const { firm, estimateId } = await estimateWithRates(t);
    const other = await firmOwner(t, "Bogdan");
    const privateNormId = await other.as.mutation(api.catalog.norms.create, {
      source: "organization",
      organizationId: other.organizationId,
      code: "B-01",
      title: "Rețeta noastră de glet",
      unit: "mp",
      resources: [
        {
          kind: "material",
          name: "Glet de ipsos",
          unit: "kg",
          quantity: 1.2,
          referencePrice: 3,
        },
      ],
    });
    await other.as.mutation(api.catalog.norms.publish, {
      normId: privateNormId,
    });
    await expect(
      firm.as.mutation(api.estimates.lineItems.addFromNorm, {
        estimateId,
        normId: privateNormId,
        quantity: 1,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.query(api.estimates.estimates.get, { estimateId }),
    ).rejects.toThrow(/not_found/);
  });

  test("keep prices set by hand when the Deviz is repriced", async () => {
    const t = setup();
    const { firm, normId, estimateId } = await estimateWithRates(t);
    const lineItemId = await firm.as.mutation(
      api.estimates.lineItems.addFromNorm,
      { estimateId, normId, quantity: 1 },
    );
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const tile = estimate.lineItems[0]?.resources.find(
      (r) => r.name === "Faianță",
    );
    const adhesive = estimate.lineItems[0]?.resources.find(
      (r) => r.name === "Adeziv flexibil C2TE",
    );
    await firm.as.mutation(api.estimates.lineItems.updateResource, {
      lineItemId,
      key: tile?.key ?? "",
      unitPrice: 80,
    });
    // The firm's own price for the adhesive: 60.50 lei per 25 kg bag, VAT
    // included, is 2 lei per kg without VAT.
    await firm.as.mutation(api.prices.listings.setOwnPrice, {
      organizationId: firm.organizationId,
      source: "own",
      resourceId: adhesive?.resourceId as Id<"resources">,
      title: "Adeziv flexibil, sac 25 kg",
      price: 60.5,
      includedVat: 21,
      saleUnit: "sac",
      unitsPerSale: 25,
    });
    const changed = await firm.as.mutation(
      api.estimates.lineItems.refreshPrices,
      { estimateId },
    );
    expect(changed).toBe(1);
    const repriced = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const resources = repriced.lineItems[0]?.resources ?? [];
    expect(resources.find((r) => r.name === "Faianță")).toMatchObject({
      unitPrice: 80,
      priceSource: "manual",
    });
    expect(
      resources.find((r) => r.name === "Adeziv flexibil C2TE"),
    ).toMatchObject({ unitPrice: 2, priceSource: "own" });
  });

  test("a revision keeps the number and a copy gets a new one", async () => {
    const t = setup();
    const { firm, normId, estimateId } = await estimateWithRates(t);
    await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId,
      quantity: 3,
    });
    const revisionId = await firm.as.mutation(
      api.estimates.estimates.duplicate,
      { estimateId, asRevision: true },
    );
    const copyId = await firm.as.mutation(api.estimates.estimates.duplicate, {
      estimateId,
    });
    const original = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const revision = await firm.as.query(api.estimates.estimates.get, {
      estimateId: revisionId,
    });
    const copy = await firm.as.query(api.estimates.estimates.get, {
      estimateId: copyId,
    });
    expect([original.number, original.revision]).toEqual([1, 1]);
    expect([revision.number, revision.revision]).toEqual([1, 2]);
    expect([copy.number, copy.revision]).toEqual([2, 1]);
    expect(revision.lineItems).toHaveLength(1);
    expect(revision.totals).toEqual(original.totals);
  });
});

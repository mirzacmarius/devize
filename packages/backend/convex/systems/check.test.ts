import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { claimedProducer, publishedNorm } from "../producers/test.helper";
import {
  firmOwner,
  setup,
  signIn,
  type TestConvex,
  tilingResources,
} from "../test.helper";
import { compatibilityFindings } from "./check";

// Made-up norms with the codes of the Norme de bază the check names. Never
// use real producer norms in tests.
type Material = [name: string, unit: string, quantity: number, price: number];

async function baseNorms(t: TestConvex) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const write = async (
    code: string,
    title: string,
    unit: string,
    materials: Material[],
  ) => {
    const normId = await admin.as.mutation(api.catalog.norms.create, {
      source: "base",
      code,
      title,
      unit,
      category: "Pardoseli",
      resources: [
        ...materials.map(([name, materialUnit, quantity, referencePrice]) => ({
          kind: "material" as const,
          name,
          unit: materialUnit,
          quantity,
          referencePrice,
        })),
        {
          kind: "labor" as const,
          name: "Faianțar",
          unit: "ora",
          quantity: 0.5,
          referencePrice: 40,
        },
      ],
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId });
    return normId;
  };
  return {
    admin,
    tiles: await write("DV-PRD-03", "Pardoseală din gresie de test", "mp", [
      ["Gresie porțelanată", "mp", 1.06, 50],
      ["Adeziv flexibil C2TE", "kg", 5.5, 2],
    ]),
    skirting: await write("DV-PRD-04", "Plintă din gresie de test", "m", [
      ["Plintă din gresie", "m", 1.05, 9],
    ]),
    waterproofing: await write(
      "DV-HDR-03",
      "Hidroizolație de test sub placaje",
      "mp",
      [["Mortar hidroizolant elastic bicomponent", "kg", 3, 9]],
    ),
    laminate: await write("DV-PRD-05", "Parchet laminat de test", "mp", [
      ["Parchet laminat, 8 mm", "mp", 1.05, 45],
    ]),
    vinyl: await write("DV-PRD-06", "Pardoseală vinilică de test", "mp", [
      ["Pardoseală vinilică SPC cu click", "mp", 1.05, 65],
    ]),
  };
}

async function estimate(t: TestConvex, title: string) {
  const firm = await firmOwner(t, "Ana");
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title,
  });
  const add = async (normId: Id<"norms">, quantity: number) =>
    await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId,
      quantity,
    });
  const check = async () =>
    await firm.as.query(api.systems.check.forEstimate, { estimateId });
  return { firm, estimateId, add, check };
}

describe("the compatibility check", () => {
  test("switches a bathroom's laminate to vinyl, and suggests the waterproofing", async () => {
    const t = setup();
    const norms = await baseNorms(t);
    const deviz = await estimate(t, "Renovare baie");
    const tilesId = await deviz.add(norms.tiles, 6);
    const laminateId = await deviz.add(norms.laminate, 6);
    const found = await deviz.check();
    expect(
      found.findings.map((f) => [f.ruleId, f.severity, f.reason?.from]),
    ).toEqual([["wet_laminate", "warning", "estimate"]]);
    const finding = found.findings[0];
    expect(finding?.fix).toEqual({
      kind: "norm",
      norm: expect.objectContaining({ normId: norms.vinyl, code: "DV-PRD-06" }),
    });
    // In a bathroom: the waterproofing, not the skirting.
    expect(found.rest.map((r) => [r.norm.code, r.quantity, r.afterId])).toEqual(
      [["DV-HDR-03", { quantity: 6, from: "same" }, tilesId]],
    );

    await deviz.firm.as.mutation(api.systems.fixes.useNorm, {
      lineItemId: laminateId,
      normId: norms.vinyl,
    });
    const after = await deviz.check();
    expect(after.findings).toEqual([]);
    const items = (
      await deviz.firm.as.query(api.estimates.estimates.get, {
        estimateId: deviz.estimateId,
      })
    ).lineItems;
    expect(items.find((i) => i._id === laminateId)).toMatchObject({
      code: "DV-PRD-06",
      quantity: 6,
    });
  });

  test("swaps wall tiles on a terrace for frost-proof ones", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const normId = await admin.as.mutation(api.catalog.norms.create, {
      source: "base",
      code: "DV-FAI-01",
      title: "Placare cu faianță pe terasă",
      unit: "mp",
      resources: tilingResources,
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId });
    const deviz = await estimate(t, "Casa Popescu");
    const lineItemId = await deviz.add(normId, 10);
    const found = await deviz.check();
    const finding = found.findings.find(
      (f) => f.ruleId === "outdoor_wall_tiles",
    );
    // Read from the Articol's own title: an error.
    expect(finding?.severity).toBe("error");
    expect(finding?.fix).toEqual({
      kind: "material",
      material: {
        name: "Gresie porțelanată rezistentă la îngheț",
        unit: "mp",
        referencePrice: 65,
      },
    });
    await deviz.firm.as.mutation(api.systems.fixes.swapMaterial, {
      lineItemId,
      resourceKey: finding?.resourceKey ?? "",
      ruleId: "outdoor_wall_tiles",
    });
    const item = (
      await deviz.firm.as.query(api.estimates.estimates.get, {
        estimateId: deviz.estimateId,
      })
    ).lineItems[0];
    const tiles = item?.resources.find((r) => r.key === finding?.resourceKey);
    expect(tiles).toMatchObject({
      name: "Gresie porțelanată rezistentă la îngheț",
      quantity: 1.05,
      unitPrice: 65,
      priceSource: "reference",
    });
    const after = await deviz.check();
    expect(after.findings.map((f) => f.ruleId)).not.toContain(
      "outdoor_wall_tiles",
    );
    // A swap a rule doesn't name is refused.
    await expect(
      deviz.firm.as.mutation(api.systems.fixes.swapMaterial, {
        lineItemId,
        resourceKey: finding?.resourceKey ?? "",
        ruleId: "wet_laminate",
      }),
    ).rejects.toThrow(/invalid/);
  });

  test("sets a finding aside for every revision, and back", async () => {
    const t = setup();
    const norms = await baseNorms(t);
    const deviz = await estimate(t, "Renovare baie");
    await deviz.add(norms.tiles, 6);
    await deviz.add(norms.laminate, 6);
    const key = (await deviz.check()).findings[0]?.key ?? "";
    await deviz.firm.as.mutation(api.systems.fixes.dismiss, {
      estimateId: deviz.estimateId,
      key,
    });
    expect((await deviz.check()).findings[0]?.dismissed).toBe(true);
    const doc = await t.run(
      async (ctx) => await ctx.db.get("estimates", deviz.estimateId),
    );
    if (!doc) {
      throw new Error("no estimate");
    }
    // The omission detector only hears of what is still open.
    expect(
      await t.run(async (ctx) => await compatibilityFindings(ctx, doc)),
    ).toEqual([
      {
        lineItemIds: [expect.any(String)],
        sentence: expect.stringContaining("Hidroizolație de test"),
      },
    ]);
    await deviz.firm.as.mutation(api.systems.fixes.restore, {
      estimateId: deviz.estimateId,
      key,
    });
    expect((await deviz.check()).findings[0]?.dismissed).toBe(false);
    // Another firm can't read the check.
    const other = await firmOwner(t, "Ion");
    await expect(
      other.as.query(api.systems.check.forEstimate, {
        estimateId: deviz.estimateId,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("measures the skirting around the floors an Antemăsurătoare measured", async () => {
    const t = setup();
    const norms = await baseNorms(t);
    const deviz = await estimate(t, "Renovare apartament");
    const tilesId = await deviz.add(norms.tiles, 20);
    await t.run(async (ctx) => {
      const item = await ctx.db.get("lineItems", tilesId);
      if (!item) {
        throw new Error("no item");
      }
      await ctx.db.insert("takeoffs", {
        organizationId: item.organizationId,
        estimateId: item.estimateId,
        lineItemId: tilesId,
        method: "manual",
        unit: "mp",
        rows: [{ count: 1, length: 5, width: 4, deduct: false }],
        total: 20,
        createdBy: deviz.firm.userId,
      });
    });
    const found = await deviz.check();
    expect(found.rest.map((r) => [r.norm.code, r.quantity])).toEqual([
      ["DV-PRD-04", { quantity: 18, from: "perimeter" }],
    ]);
  });
});

describe("producers' systems", () => {
  test("a producer writes a system; a firm using it gets the rest and its warnings", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const adhesive = await publishedNorm(
      producer.admin,
      producer.manufacturerId,
      {
        code: "TT-02A01",
        title: "Adeziv Test pentru gresie",
      },
    );
    // The norms' first versions are their lineages.
    const systemId = await producer.ana.as.mutation(
      api.systems.producerSystems.save,
      {
        manufacturerId: producer.manufacturerId,
        name: "Sistem Test de pardoseală",
        normLineageIds: [producer.normId, adhesive],
        productIds: [],
        suitable: ["wet"],
        unsuitable: ["floor_heating"],
      },
    );
    // A draft shows only to the producer.
    const firm = await firmOwner(t, "Ion");
    const seen = await firm.as.query(
      api.systems.producerSystems.forManufacturer,
      {
        manufacturerId: producer.manufacturerId,
      },
    );
    expect(seen?.systems).toEqual([]);
    await producer.ana.as.mutation(api.systems.producerSystems.setStatus, {
      systemId,
      status: "published",
    });
    await expect(
      firm.as.mutation(api.systems.producerSystems.setStatus, {
        systemId,
        status: "archived",
      }),
    ).rejects.toThrow(/forbidden/);

    const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Casă cu încălzire în pardoseală",
    });
    await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId: producer.normId,
      quantity: 12,
    });
    const found = await firm.as.query(api.systems.check.forEstimate, {
      estimateId,
    });
    expect(found.rest.map((r) => [r.norm.code, r.system.kind])).toEqual([
      ["TT-02A01", "producer"],
    ]);
    expect(
      found.findings
        .filter((f) => f.ruleId === "system_unsuitable")
        .map((f) => [f.material, f.context, f.severity]),
    ).toEqual([["Sistem Test de pardoseală", "floor_heating", "warning"]]);
  });

  test("a system holds only the producer's own norms", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const other = await baseNorm(t);
    await expect(
      producer.ana.as.mutation(api.systems.producerSystems.save, {
        manufacturerId: producer.manufacturerId,
        name: "Sistem",
        normLineageIds: [other],
        productIds: [],
        suitable: [],
        unsuitable: [],
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      producer.ana.as.mutation(api.systems.producerSystems.save, {
        manufacturerId: producer.manufacturerId,
        name: "Sistem",
        normLineageIds: [producer.normId],
        productIds: [],
        suitable: ["wet"],
        unsuitable: ["wet"],
      }),
    ).rejects.toThrow(/invalid/);
  });
});

/** A Normă de bază, which no producer's system may hold. */
async function baseNorm(t: TestConvex) {
  const admin = await signIn(t, { name: "Admin 2", superadmin: true });
  const normId = await admin.as.mutation(api.catalog.norms.create, {
    source: "base",
    code: "DV-ALT-01",
    title: "Normă de bază de test",
    unit: "mp",
    resources: tilingResources,
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId });
  return normId;
}

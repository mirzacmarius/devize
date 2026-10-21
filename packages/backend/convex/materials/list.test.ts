import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup, signIn, type TestConvex } from "../test.helper";

// A made-up floor tiling norm, per mp, written by a super admin.
async function floorNorm(t: TestConvex) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const normId = await admin.as.mutation(api.catalog.norms.create, {
    source: "base",
    code: "DV-TST-01",
    title: "Pardoseală din gresie de test",
    unit: "mp",
    category: "Pardoseli",
    resources: [
      {
        kind: "material",
        name: "Gresie porțelanată",
        unit: "mp",
        quantity: 1.06,
        referencePrice: 50,
      },
      {
        kind: "material",
        name: "Adeziv flexibil C2TE",
        unit: "kg",
        quantity: 5.5,
        referencePrice: 2,
      },
      {
        kind: "material",
        name: "Chit de rosturi",
        unit: "kg",
        quantity: 0.35,
        referencePrice: 6,
      },
      { kind: "material", name: "Material mărunt", unit: "%", quantity: 2 },
      {
        kind: "labor",
        name: "Faianțar",
        unit: "ora",
        quantity: 0.8,
        referencePrice: 40,
      },
    ],
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId });
  return normId;
}

async function floorEstimate(t: TestConvex) {
  const normId = await floorNorm(t);
  const firm = await firmOwner(t, "Ana");
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Apartament Popescu",
  });
  const lineItemId = await firm.as.mutation(
    api.estimates.lineItems.addFromNorm,
    { estimateId, normId, quantity: 20 },
  );
  return { firm, estimateId, lineItemId };
}

describe("Lista de cumpărături", () => {
  test("buys whole packages and says what is left over", async () => {
    const t = setup();
    const { firm, estimateId } = await floorEstimate(t);
    const list = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    const row = (name: string) => {
      const found = list.rows.find((r) => r.name === name);
      return {
        need: found?.need,
        source: found?.package?.source,
        counts: found?.purchase?.counts,
        leftover: found?.purchase?.leftover,
      };
    };
    // 21,2 mp of tiles in boxes of 1,44 mp.
    expect(row("Gresie porțelanată")).toEqual({
      need: 21.2,
      source: "typical",
      counts: [{ size: 1.44, count: 15 }],
      leftover: 0.4,
    });
    expect(row("Adeziv flexibil C2TE")).toEqual({
      need: 110,
      source: "typical",
      counts: [{ size: 25, count: 5 }],
      leftover: 15,
    });
    // 7 kg of grout: a 5 kg and a 2 kg bag, nothing left.
    expect(row("Chit de rosturi").counts).toEqual([
      { size: 5, count: 1 },
      { size: 2, count: 1 },
    ]);
    expect(list.rows.some((r) => r.unit === "%")).toBe(false);
    // The leftovers at the Deviz's prices: 0,4 mp × 50 and 15 kg × 2.
    expect(list.totals.leftoverCost).toBe(50);
  });

  test("counts the firm's own package first", async () => {
    const t = setup();
    const { firm, estimateId } = await floorEstimate(t);
    const before = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    const adhesive = before.rows.find((r) => r.name === "Adeziv flexibil C2TE");
    await firm.as.mutation(api.materials.packagings.setPackage, {
      organizationId: firm.organizationId,
      key: adhesive?.key ?? "",
      unit: "kg",
      kind: "bag",
      sizes: [20],
    });
    const after = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    const row = after.rows.find((r) => r.name === "Adeziv flexibil C2TE");
    expect(row?.package).toEqual({ kind: "bag", sizes: [20], source: "firm" });
    expect(row?.purchase?.packages).toBe(6);
    await firm.as.mutation(api.materials.packagings.clearPackage, {
      organizationId: firm.organizationId,
      key: adhesive?.key ?? "",
    });
    const cleared = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    expect(
      cleared.rows.find((r) => r.name === "Adeziv flexibil C2TE")?.package
        ?.source,
    ).toBe("typical");
  });

  test("is only for the firm's members", async () => {
    const t = setup();
    const { estimateId } = await floorEstimate(t);
    const other = await firmOwner(t, "Ion");
    await expect(
      other.as.query(api.materials.list.forEstimate, { estimateId }),
    ).rejects.toThrow(/not_found/);
  });
});

describe("Mod de montaj", () => {
  test("lays tiles diagonally, then the norm's way again", async () => {
    const t = setup();
    const { firm, estimateId, lineItemId } = await floorEstimate(t);
    const initial = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const list = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    expect(list.layouts).toHaveLength(1);
    expect(list.layouts[0]).toMatchObject({
      family: "tiles",
      layout: null,
      normWaste: 6,
      stale: false,
    });
    await firm.as.mutation(api.materials.layouts.setLayout, {
      lineItemId,
      method: "diagonal",
    });
    const laid = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const item = laid.lineItems[0];
    const quantityOf = (name: string) =>
      item?.resources.find((r) => r.name === name)?.quantity;
    expect(quantityOf("Gresie porțelanată")).toBe(1.15);
    expect(quantityOf("Faianțar")).toBe(1);
    expect(item?.layout).toMatchObject({ method: "diagonal", waste: 15 });
    // 23 mp of tiles: 16 boxes now.
    const after = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    expect(
      after.rows.find((r) => r.name === "Gresie porțelanată")?.purchase
        ?.packages,
    ).toBe(16);
    // Herringbone starts again from the norm's consumptions.
    await firm.as.mutation(api.materials.layouts.setLayout, {
      lineItemId,
      method: "herringbone",
      waste: 22,
    });
    const herringbone = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(
      herringbone.lineItems[0]?.resources.find(
        (r) => r.name === "Gresie porțelanată",
      )?.quantity,
    ).toBe(1.22);
    await firm.as.mutation(api.materials.layouts.setLayout, {
      lineItemId,
      method: "straight",
    });
    const straight = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(straight.lineItems[0]?.layout).toBeUndefined();
    expect(straight.lineItems[0]?.resources.map((r) => r.quantity)).toEqual([
      1.06, 5.5, 0.35, 2, 0.8,
    ]);
    expect(straight.totals).toEqual(initial.totals);
  });

  test("refuses a method the covering doesn't have, or losses past 50 %", async () => {
    const t = setup();
    const { firm, lineItemId } = await floorEstimate(t);
    await expect(
      firm.as.mutation(api.materials.layouts.setLayout, {
        lineItemId,
        method: "complex",
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      firm.as.mutation(api.materials.layouts.setLayout, {
        lineItemId,
        method: "diagonal",
        waste: 80,
      }),
    ).rejects.toThrow(/invalid/);
  });

  test("shows a method as stale when a consumption changes", async () => {
    const t = setup();
    const { firm, estimateId, lineItemId } = await floorEstimate(t);
    await firm.as.mutation(api.materials.layouts.setLayout, {
      lineItemId,
      method: "diagonal",
    });
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const tiles = estimate.lineItems[0]?.resources.find(
      (r) => r.name === "Gresie porțelanată",
    );
    await firm.as.mutation(api.estimates.lineItems.updateResource, {
      lineItemId,
      key: tiles?.key ?? "",
      quantity: 1.3,
    });
    const list = await firm.as.query(api.materials.list.forEstimate, {
      estimateId,
    });
    expect(list.layouts[0]?.stale).toBe(true);
  });
});

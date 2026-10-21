import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { setup, signIn, type TestConvex } from "../test.helper";

// Made-up rows in the shape the admin import extracts from a producer's PDF.
const rows = [
  {
    baseCode: "TT-01",
    code: "TT-01A01",
    title: "Termosistem Test, montare sub 8 m, tencuială decorativă",
    quantity: 1.05,
  },
  {
    baseCode: "TT-01",
    code: "TT-01B01",
    title: "Termosistem Test, montare între 8 și 20 m, tencuială decorativă",
    quantity: 1.05,
  },
];

async function importWith(
  t: TestConvex,
  adminId: Id<"users">,
  manufacturerId: Id<"manufacturers">,
  values: typeof rows,
) {
  return await t.run(async (ctx) => {
    const fileId = await ctx.storage.store(new Blob(["%PDF-1.7"]));
    const normImportId = await ctx.db.insert("normImports", {
      manufacturerId,
      fileId,
      fileName: "norme-test.pdf",
      status: "review",
      edition: "2026",
      articles: [],
      articlesDone: 1,
      createdBy: adminId,
    });
    for (const row of values) {
      const resources: Doc<"importedNorms">["resources"] = [
        {
          kind: "material",
          name: "Placă termoizolantă Test 100 mm",
          unit: "mp",
          unitRaw: "mp",
          quantity: row.quantity,
          unitPrice: 60,
        },
        {
          kind: "labor",
          name: "Zidar",
          unit: "ora",
          unitRaw: "ore",
          quantity: 1,
          unitPrice: 30,
        },
      ];
      await ctx.db.insert("importedNorms", {
        normImportId,
        manufacturerId,
        baseCode: row.baseCode,
        code: row.code,
        title: row.title,
        unit: "mp",
        unitRaw: "mp",
        pages: [3],
        resources,
        checks: [],
        status: "approved",
      });
    }
    return normImportId;
  });
}

describe("publishImportedNorms", () => {
  test("publishes approved rows once, then new versions when they change", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const manufacturerId = await t.run(
      async (ctx) =>
        await ctx.db.insert("manufacturers", {
          name: "Termo Test SA",
          nameKey: "termo test",
          wave: 1,
          status: "norms_received",
          normsStatus: "received",
          claimStatus: "unclaimed",
          brands: [],
          categories: [],
          mainProducts: [],
          retailers: [],
          existingNorms: [],
          technicalDocs: [],
          declaredConsumption: [],
          createdBy: admin.userId,
        }),
    );
    const firstImport = await importWith(t, admin.userId, manufacturerId, rows);
    expect(
      await admin.as.mutation(api.catalog.publishing.publishImportedNorms, {
        normImportId: firstImport,
      }),
    ).toEqual({ published: 2, skipped: 0 });
    expect(
      await admin.as.mutation(api.catalog.publishing.publishImportedNorms, {
        normImportId: firstImport,
      }),
    ).toEqual({ published: 0, skipped: 2 });

    // A new edition changes one variant's consumption.
    const changed = rows.map((row) =>
      row.code === "TT-01B01" ? { ...row, quantity: 1.1 } : row,
    );
    const secondImport = await importWith(
      t,
      admin.userId,
      manufacturerId,
      changed,
    );
    expect(
      await admin.as.mutation(api.catalog.publishing.publishImportedNorms, {
        normImportId: secondImport,
      }),
    ).toEqual({ published: 1, skipped: 1 });

    const norms = await t.run(
      async (ctx) =>
        await ctx.db
          .query("norms")
          .withIndex("by_code", (q) => q.eq("code", "TT-01B01"))
          .collect(),
    );
    expect(norms.map((norm) => [norm.version, norm.status]).sort()).toEqual([
      [1, "superseded"],
      [2, "published"],
    ]);
    const latest = norms.find((norm) => norm.status === "published");
    expect(latest?.verifiedAt).toBeDefined();
    expect(latest?.lineageId).toBe(norms.find((n) => n.version === 1)?._id);

    // Both norms share one catalog resource per material and trade.
    const resources = await t.run(
      async (ctx) => await ctx.db.query("resources").collect(),
    );
    expect(resources.map((r) => [r.kind, r.name]).sort()).toEqual([
      ["labor", "Zidar"],
      ["material", "Placă termoizolantă Test 100 mm"],
    ]);
  });

  test("is for super admins only", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const someone = await signIn(t, { name: "Ana" });
    const manufacturerId = await t.run(
      async (ctx) =>
        await ctx.db.insert("manufacturers", {
          name: "Termo Test SA",
          nameKey: "termo test",
          wave: 1,
          status: "norms_received",
          normsStatus: "received",
          claimStatus: "unclaimed",
          brands: [],
          categories: [],
          mainProducts: [],
          retailers: [],
          existingNorms: [],
          technicalDocs: [],
          declaredConsumption: [],
          createdBy: admin.userId,
        }),
    );
    const normImportId = await importWith(
      t,
      admin.userId,
      manufacturerId,
      rows,
    );
    await expect(
      someone.as.mutation(api.catalog.publishing.publishImportedNorms, {
        normImportId,
      }),
    ).rejects.toThrow(/forbidden/);
  });
});

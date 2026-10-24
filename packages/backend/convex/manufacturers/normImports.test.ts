import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { setup, signIn, type TestConvex } from "../test.helper";
import { insertManufacturer, insertNormImport } from "./test.helper";

/** A document whose approved Normă was published with the given agreement. */
async function publishedImport(
  t: TestConvex,
  admin: Awaited<ReturnType<typeof signIn>>,
  manufacturerId: Id<"manufacturers">,
  note: string,
) {
  const normImportId = await insertNormImport(t, admin.userId, manufacturerId);
  await admin.as.mutation(api.manufacturers.normImports.recordConsent, {
    normImportId,
    note,
  });
  await admin.as.mutation(api.catalog.publishing.publishImportedNorms, {
    normImportId,
  });
  return normImportId;
}

async function leftOf(t: TestConvex, manufacturerId: Id<"manufacturers">) {
  return await t.run(async (ctx) => ({
    manufacturer: await ctx.db.get("manufacturers", manufacturerId),
    normImports: await ctx.db.query("normImports").collect(),
    importedNorms: await ctx.db.query("importedNorms").collect(),
    files: await ctx.db.system.query("_storage").collect(),
    norms: await ctx.db.query("norms").collect(),
  }));
}

describe("recordConsent", () => {
  test("records how the manufacturer agreed, for super admins only", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const contractor = await signIn(t, { name: "Ana" });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    const normImportId = await insertNormImport(
      t,
      admin.userId,
      manufacturerId,
    );
    const record = api.manufacturers.normImports.recordConsent;

    await expect(
      contractor.as.mutation(record, { normImportId, note: "Email" }),
    ).rejects.toThrow(/forbidden/);
    await expect(
      admin.as.mutation(record, { normImportId, note: "   " }),
    ).rejects.toThrow(/invalid/);
    await expect(
      admin.as.mutation(record, { normImportId, note: "x".repeat(501) }),
    ).rejects.toThrow(/invalid/);

    await admin.as.mutation(record, {
      normImportId,
      note: "  Emailul biroului tehnic din 21.10.2026 ",
    });
    const data = await admin.as.query(api.manufacturers.normImports.get, {
      normImportId,
    });
    expect(data?.normImport.consent).toMatchObject({
      note: "Emailul biroului tehnic din 21.10.2026",
      recordedBy: admin.userId,
    });
    expect(data?.consentBy).toBe("Admin");
  });
});

describe("get", () => {
  test("compares each printed total with the document's own prices", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    const normImportId = await insertNormImport(
      t,
      admin.userId,
      manufacturerId,
      { laborRate: 20 },
    );
    // A row extracted before the comparison moved here, with its old note.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("importedNorms")
        .withIndex("by_normImportId_and_baseCode", (q) =>
          q.eq("normImportId", normImportId),
        )
        .unique();
      if (!row) {
        throw new Error("no imported norm");
      }
      await ctx.db.patch("importedNorms", row._id, {
        resources: [
          ...row.resources,
          {
            kind: "labor",
            name: "Zidar",
            unit: "ora",
            unitRaw: "ore",
            quantity: 0.5,
          },
        ],
        totalPrice: 70,
        checks: [
          { code: "price_total", level: "info", detail: "73 / 70 (+4.3%)" },
          { code: "no_labor", level: "info" },
        ],
      });
    });

    const data = await admin.as.query(api.manufacturers.normImports.get, {
      normImportId,
    });
    const [norm] = data?.norms ?? [];
    expect(norm?.checks).toEqual([{ code: "no_labor", level: "info" }]);
    expect(norm?.printedTotal).toEqual({
      computed: 73,
      difference: 0.0429,
      matches: false,
    });
  });
});

describe("deleting a document", () => {
  test("keeps the agreement under which its norms reached the catalog", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    const published = await publishedImport(
      t,
      admin,
      manufacturerId,
      "Emailul biroului tehnic din 21.10.2026",
    );
    // Agreed to, but nothing from it was published.
    const unpublished = await insertNormImport(t, admin.userId, manufacturerId);
    await admin.as.mutation(api.manufacturers.normImports.recordConsent, {
      normImportId: unpublished,
      note: "Telefon, 22.10.2026",
    });

    const remove = api.manufacturers.normImports.remove;
    await admin.as.mutation(remove, { normImportId: unpublished });
    await admin.as.mutation(remove, { normImportId: published });

    const left = await leftOf(t, manufacturerId);
    expect(left.normImports).toEqual([]);
    expect(left.importedNorms).toEqual([]);
    expect(left.files).toEqual([]);
    expect(left.norms).toHaveLength(1);
    expect(left.manufacturer?.keptConsents).toEqual([
      {
        note: "Emailul biroului tehnic din 21.10.2026",
        recordedBy: admin.userId,
        recordedAt: expect.any(Number),
        fileName: "norme-test.pdf",
        edition: "2026",
        deletedAt: expect.any(Number),
      },
    ]);
    const data = await admin.as.query(api.manufacturers.admin.get, {
      manufacturerId,
    });
    expect(data?.manufacturer.keptConsents).toHaveLength(1);
  });

  test("a profile taken down loses the documents its producer sent", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    await publishedImport(t, admin, manufacturerId, "Email, 21.10.2026");
    await insertNormImport(t, admin.userId, manufacturerId);
    await insertNormImport(t, admin.userId, manufacturerId, {
      fileName: "norme-test-2.pdf",
    });

    // What a removal request ends with (producers/admin.ts remove).
    await t.run(async (ctx) => {
      await ctx.db.patch("manufacturers", manufacturerId, {
        status: "excluded",
      });
    });
    await t.mutation(internal.producers.admin.withdrawNorms, {
      manufacturerId,
    });
    await t.finishAllScheduledFunctions(() => {});

    const left = await leftOf(t, manufacturerId);
    expect(left.norms.map((norm) => norm.status)).toEqual(["archived"]);
    expect(left.normImports).toEqual([]);
    expect(left.importedNorms).toEqual([]);
    expect(left.files).toEqual([]);
    expect(left.manufacturer?.keptConsents).toMatchObject([
      { note: "Email, 21.10.2026", fileName: "norme-test.pdf" },
    ]);
  });

  test("documents stay while the producer isn't excluded", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    await insertNormImport(t, admin.userId, manufacturerId);

    await t.mutation(internal.manufacturers.normImports.dropImports, {
      manufacturerId,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect((await leftOf(t, manufacturerId)).normImports).toHaveLength(1);
  });
});

import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { setup, signIn } from "../test.helper";
import { insertManufacturer, insertNormImport } from "./test.helper";

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

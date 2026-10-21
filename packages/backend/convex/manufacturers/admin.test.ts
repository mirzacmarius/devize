import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { setup, signIn } from "../test.helper";
import { insertManufacturer, insertNormImport } from "./test.helper";

describe("remove", () => {
  test("deletes a manufacturer with its contacts and norm imports", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    const normImportId = await insertNormImport(
      t,
      admin.userId,
      manufacturerId,
    );
    await t.run(
      async (ctx) =>
        await ctx.db.insert("manufacturerContacts", {
          manufacturerId,
          kind: "generic",
          email: "office@termo-test.example",
          sourceVerified: true,
          origin: "manual",
        }),
    );

    await admin.as.mutation(api.manufacturers.admin.remove, {
      manufacturerId,
    });

    await t.run(async (ctx) => {
      expect(await ctx.db.get("manufacturers", manufacturerId)).toBeNull();
      expect(await ctx.db.get("normImports", normImportId)).toBeNull();
      expect(await ctx.db.query("manufacturerContacts").collect()).toEqual([]);
      expect(await ctx.db.query("importedNorms").collect()).toEqual([]);
    });
  });

  test("keeps one whose norms are in the catalog or that a firm claimed", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const remove = api.manufacturers.admin.remove;

    const published = await insertManufacturer(t, admin.userId);
    const normImportId = await insertNormImport(t, admin.userId, published, {
      consent: {
        note: "Emailul biroului tehnic",
        recordedBy: admin.userId,
        recordedAt: Date.now(),
      },
    });
    await admin.as.mutation(api.catalog.publishing.publishImportedNorms, {
      normImportId,
    });
    await expect(
      admin.as.mutation(remove, { manufacturerId: published }),
    ).rejects.toThrow(/in_use/);

    const claimed = await insertManufacturer(t, admin.userId, {
      name: "Alt Test SRL",
      nameKey: "alt test",
    });
    await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          name: "Alt Test SRL",
          kind: "manufacturer",
          vatPayer: true,
          defaultMarkups: { cam: 0, indirect: 0, profit: 0, vat: 21 },
          manufacturerId: claimed,
          lastEstimateNumber: 0,
          createdBy: admin.userId,
        }),
    );
    await expect(
      admin.as.mutation(remove, { manufacturerId: claimed }),
    ).rejects.toThrow(/in_use/);

    await t.run(async (ctx) => {
      expect(await ctx.db.get("manufacturers", published)).not.toBeNull();
      expect(await ctx.db.get("manufacturers", claimed)).not.toBeNull();
    });
  });
});

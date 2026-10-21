import type { Doc, Id } from "../_generated/dataModel";
import type { TestConvex } from "../test.helper";

// A made-up Producător and norms document for the outreach tests. Never use a
// real producer's norms: they are copyrighted and the repository is public.

export async function insertManufacturer(
  t: TestConvex,
  adminId: Id<"users">,
  fields: Partial<Doc<"manufacturers">> = {},
) {
  return await t.run(
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
        createdBy: adminId,
        ...fields,
      }),
  );
}

/** A reviewed document with one approved Normă, ready to publish. */
export async function insertNormImport(
  t: TestConvex,
  adminId: Id<"users">,
  manufacturerId: Id<"manufacturers">,
  fields: Partial<Doc<"normImports">> = {},
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
      ...fields,
    });
    await ctx.db.insert("importedNorms", {
      normImportId,
      manufacturerId,
      baseCode: "TT-01",
      code: "TT-01A01",
      title: "Termosistem Test, montare sub 8 m",
      unit: "mp",
      unitRaw: "mp",
      pages: [3],
      resources: [
        {
          kind: "material",
          name: "Placă termoizolantă Test 100 mm",
          unit: "mp",
          unitRaw: "mp",
          quantity: 1.05,
          unitPrice: 60,
        },
      ],
      checks: [],
      status: "approved",
    });
    return normImportId;
  });
}

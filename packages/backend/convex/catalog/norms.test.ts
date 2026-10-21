import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  signIn,
  tilingResources,
} from "../test.helper";

describe("norms", () => {
  test("only super admins write the base catalog", async () => {
    const t = setup();
    const firm = await firmOwner(t, "Ana");
    await expect(
      firm.as.mutation(api.catalog.norms.create, {
        source: "base",
        code: "DV-X",
        title: "Zidărie din BCA 25 cm",
        unit: "mc",
        resources: tilingResources,
      }),
    ).rejects.toThrow(/forbidden/);
  });

  test("are found without diacritics, and private ones only by their firm", async () => {
    const t = setup();
    await publishedBaseNorm(t);
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    const own = await ana.as.mutation(api.catalog.norms.create, {
      source: "organization",
      organizationId: ana.organizationId,
      code: "A-FAI",
      title: "Faianță cu adezivul nostru",
      unit: "mp",
      resources: tilingResources,
    });
    await ana.as.mutation(api.catalog.norms.publish, { normId: own });

    const forAna = await ana.as.query(api.catalog.norms.search, {
      organizationId: ana.organizationId,
      text: "faianta",
    });
    expect(forAna.map((norm) => norm.code)).toEqual(["A-FAI", "DV-FAI-01"]);
    const forBogdan = await bogdan.as.query(api.catalog.norms.search, {
      organizationId: bogdan.organizationId,
      text: "faianta",
    });
    expect(forBogdan.map((norm) => norm.code)).toEqual(["DV-FAI-01"]);
    await expect(
      bogdan.as.query(api.catalog.norms.get, { normId: own }),
    ).rejects.toThrow(/not_found/);
  });

  test("producer norms wait for a super admin to verify them", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const producer = await signIn(t, { name: "Producator" });
    const manufacturerId = await t.run(
      async (ctx) =>
        await ctx.db.insert("manufacturers", {
          name: "Termo Test SA",
          nameKey: "termo test",
          wave: 1,
          status: "norms_received",
          normsStatus: "received",
          claimStatus: "claimed",
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
    // The producer's firm claimed the manufacturer.
    const organizationId = await producer.as.mutation(
      api.accounts.organizations.create,
      { name: "Termo Test SA", kind: "manufacturer" },
    );
    await t.run(async (ctx) => {
      await ctx.db.patch("organizations", organizationId, { manufacturerId });
    });

    const normId = await producer.as.mutation(api.catalog.norms.create, {
      source: "manufacturer",
      manufacturerId,
      code: "TT-01A01",
      baseCode: "TT-01",
      title: "Termosistem Test, montare sub 8 m",
      unit: "mp",
      resources: tilingResources,
    });
    await expect(
      producer.as.mutation(api.catalog.norms.publish, { normId }),
    ).rejects.toThrow(/forbidden/);
    await producer.as.mutation(api.catalog.norms.submit, { normId });
    const waiting = await admin.as.query(api.catalog.norms.listForReview, {});
    expect(waiting.map((norm) => norm.code)).toEqual(["TT-01A01"]);

    await admin.as.mutation(api.catalog.norms.publish, { normId });
    const published = await producer.as.query(api.catalog.norms.get, {
      normId,
    });
    expect(published.status).toBe("published");
    expect(published.verifiedAt).toBeDefined();
    expect(published.manufacturerName).toBe("Termo Test SA");
  });

  test("a code names one norm in its catalog", async () => {
    const t = setup();
    const { admin } = await publishedBaseNorm(t);
    await expect(
      admin.as.mutation(api.catalog.norms.create, {
        source: "base",
        code: "DV-FAI-01",
        title: "Altă placare",
        unit: "mp",
        resources: tilingResources,
      }),
    ).rejects.toThrow(/in_use/);
  });

  test("a published norm only changes through a new version", async () => {
    const t = setup();
    const { admin, normId } = await publishedBaseNorm(t);
    await expect(
      admin.as.mutation(api.catalog.norms.update, {
        normId,
        title: "Placare schimbată",
      }),
    ).rejects.toThrow(/locked/);
    const draftId = await admin.as.mutation(api.catalog.norms.createVersion, {
      normId,
    });
    // Asking again returns the open draft instead of a second one.
    expect(
      await admin.as.mutation(api.catalog.norms.createVersion, { normId }),
    ).toBe(draftId);
    await admin.as.mutation(api.catalog.norms.update, {
      normId: draftId,
      title: "Placare cu faianță pe pereți, rost 2 mm",
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId: draftId });
    const old = await admin.as.query(api.catalog.norms.get, { normId });
    expect(old.status).toBe("superseded");
    expect(old.latestVersionId).toBe(draftId);
  });
});

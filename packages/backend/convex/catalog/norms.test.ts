import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  signIn,
  tilingResources,
} from "../test.helper";

describe("norms", () => {
  afterEach(() => {
    setSystemTime();
  });

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

    // Checked by Devize, but only the producer confirms it as theirs.
    expect(published.confirmedAt).toBeUndefined();
    expect(published.canConfirm).toBe(true);
    const seenByAdmin = await admin.as.query(api.catalog.norms.get, {
      normId,
    });
    expect(seenByAdmin.canConfirm).toBe(false);
    await expect(
      admin.as.mutation(api.catalog.norms.confirm, { normId }),
    ).rejects.toThrow(/forbidden/);
    await producer.as.mutation(api.catalog.norms.confirm, { normId });
    const [found] = await producer.as.query(api.catalog.norms.search, {
      organizationId,
      text: "termosistem",
    });
    expect(found).toMatchObject({ verified: true, confirmed: true });

    const draftId = await producer.as.mutation(
      api.catalog.norms.createVersion,
      {
        normId,
      },
    );
    const draft = await producer.as.query(api.catalog.norms.get, {
      normId: draftId,
    });
    expect(draft.version).toBe(2);
    expect(draft.confirmedAt).toBeUndefined();
    expect(draft.verifiedAt).toBeUndefined();
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

  test("a firm copies a catalog norm into its own, to adjust it", async () => {
    const t = setup();
    const { normId } = await publishedBaseNorm(t);
    const ana = await firmOwner(t, "Ana");
    const copyId = await ana.as.mutation(api.catalog.norms.copyToOrganization, {
      normId,
      organizationId: ana.organizationId,
    });
    const copy = await ana.as.query(api.catalog.norms.get, { normId: copyId });
    expect(copy).toMatchObject({
      source: "organization",
      visibility: "private",
      organizationId: ana.organizationId,
      code: "DV-FAI-01",
      status: "draft",
      canEdit: true,
      canPublish: true,
    });
    expect(copy.copiedFrom).toMatchObject({ _id: normId, source: "base" });
    expect(copy.resources.map((row) => row.name)).toEqual(
      tilingResources.map((row) => row.name),
    );

    // A second copy needs a code of its own in the firm's catalog.
    const secondId = await ana.as.mutation(
      api.catalog.norms.copyToOrganization,
      { normId, organizationId: ana.organizationId },
    );
    const second = await ana.as.query(api.catalog.norms.get, {
      normId: secondId,
    });
    expect(second.code).toBe("DV-FAI-01-2");

    await ana.as.mutation(api.catalog.norms.update, {
      normId: copyId,
      title: "Placare cu faianță, cu echipa noastră",
      resources: tilingResources.map((row) =>
        row.name === "Faianțar" ? { ...row, quantity: 0.75 } : row,
      ),
    });
    await ana.as.mutation(api.catalog.norms.publish, { normId: copyId });

    const own = await ana.as.query(api.catalog.norms.listForOrganization, {
      organizationId: ana.organizationId,
    });
    expect(own.map((norm) => [norm.code, norm.status])).toEqual([
      ["DV-FAI-01", "published"],
      ["DV-FAI-01-2", "draft"],
    ]);
    const published = await ana.as.query(api.catalog.norms.get, {
      normId: copyId,
    });
    expect(
      published.resources.find((row) => row.name === "Faianțar")?.quantity,
    ).toBe(0.75);

    // The public catalog alone leaves the firm's own norms out.
    const everything = await ana.as.query(api.catalog.norms.search, {
      organizationId: ana.organizationId,
      text: "faianta",
    });
    expect(everything.map((norm) => norm.source)).toEqual([
      "organization",
      "base",
    ]);
    const publicOnly = await ana.as.query(api.catalog.norms.search, {
      organizationId: ana.organizationId,
      text: "faianta",
      scope: "public",
    });
    expect(publicOnly.map((norm) => norm.source)).toEqual(["base"]);
  });

  test("a firm may copy only norms it can read, into its own catalog", async () => {
    const t = setup();
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
    await expect(
      bogdan.as.mutation(api.catalog.norms.copyToOrganization, {
        normId: own,
        organizationId: bogdan.organizationId,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.mutation(api.catalog.norms.copyToOrganization, {
        normId: own,
        organizationId: ana.organizationId,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("show everyone the published versions and editors the drafts too", async () => {
    const t = setup();
    const { admin, normId } = await publishedBaseNorm(t);
    const v2 = await admin.as.mutation(api.catalog.norms.createVersion, {
      normId,
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId: v2 });
    const v3 = await admin.as.mutation(api.catalog.norms.createVersion, {
      normId: v2,
    });
    const ana = await firmOwner(t, "Ana");

    const forAna = await ana.as.query(api.catalog.norms.versions, {
      normId: v2,
    });
    expect(forAna.map((row) => [row.version, row.status])).toEqual([
      [2, "published"],
      [1, "superseded"],
    ]);
    const forAdmin = await admin.as.query(api.catalog.norms.versions, {
      normId,
    });
    expect(forAdmin.map((row) => row._id)).toEqual([v3, v2, normId]);
    await expect(
      ana.as.query(api.catalog.norms.versions, { normId: v3 }),
    ).rejects.toThrow(/not_found/);

    // Only a super admin publishes a public norm.
    const seen = await ana.as.query(api.catalog.norms.get, { normId: v2 });
    expect(seen).toMatchObject({
      canEdit: false,
      canPublish: false,
      canConfirm: false,
    });
    const draft = await admin.as.query(api.catalog.norms.get, { normId: v3 });
    expect(draft).toMatchObject({ canEdit: true, canPublish: true });
  });

  test("list the catalog by code, and a firm's archived norms last", async () => {
    const t = setup();
    const { admin } = await publishedBaseNorm(t);
    for (const code of ["DV-ZID-01", "DV-BET-01"]) {
      const normId = await admin.as.mutation(api.catalog.norms.create, {
        source: "base",
        code,
        title: "Lucrare de probă",
        unit: "m2",
        resources: tilingResources,
      });
      await admin.as.mutation(api.catalog.norms.publish, { normId });
    }
    const ana = await firmOwner(t, "Ana");
    const catalog = await ana.as.query(api.catalog.norms.listPublished, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(catalog.page.map((norm) => norm.code)).toEqual([
      "DV-BET-01",
      "DV-FAI-01",
      "DV-ZID-01",
    ]);

    // The archived norm changed last, and still comes after the draft.
    const start = Date.now();
    const create = (code: string) =>
      ana.as.mutation(api.catalog.norms.create, {
        source: "organization",
        organizationId: ana.organizationId,
        code,
        title: "Placare de probă",
        unit: "m2",
        resources: tilingResources,
      });
    setSystemTime(start + 1_000);
    const old = await create("A-VECHE");
    await ana.as.mutation(api.catalog.norms.publish, { normId: old });
    setSystemTime(start + 2_000);
    await create("A-NOUA");
    setSystemTime(start + 3_000);
    await ana.as.mutation(api.catalog.norms.archive, { normId: old });
    const own = await ana.as.query(api.catalog.norms.listForOrganization, {
      organizationId: ana.organizationId,
    });
    expect(own.map((norm) => [norm.code, norm.status])).toEqual([
      ["A-NOUA", "draft"],
      ["A-VECHE", "archived"],
    ]);
  });
});

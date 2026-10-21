import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { firmOwner, setup, signIn, tilingResources } from "../test.helper";
import { claimedProducer, publishedNorm } from "./test.helper";

const details = {
  about: "  Sisteme de termoizolație pentru fațade.  ",
  website: "termotest.ro",
  contactName: "Ana Pop",
  contactEmail: " Tehnic@TermoTest.ro ",
  contactPhone: "+40 721 000 000",
};

describe("what a producer says about itself", () => {
  test("the producer's owners write it and everyone sees it", async () => {
    const t = setup();
    const { manufacturerId, ana, organizationId } = await claimedProducer(t);
    await ana.as.mutation(api.producers.details.update, {
      manufacturerId,
      ...details,
    });

    const mihai = await firmOwner(t, "Mihai");
    const seen = await mihai.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(seen?.details).toEqual({
      about: "Sisteme de termoizolație pentru fațade.",
      website: "https://termotest.ro/",
      contactName: "Ana Pop",
      contactEmail: "tehnic@termotest.ro",
      contactPhone: "+40 721 000 000",
    });
    expect(seen?.viewer.canEditDetails).toBe(false);
    const own = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(own?.viewer.canEditDetails).toBe(true);

    // A plain member of the producer's firm can't, nor can anyone else.
    const dan = await signIn(t, { name: "Dan" });
    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", {
        organizationId,
        userId: dan.userId,
        role: "member",
        lastActiveAt: Date.now(),
      });
    });
    for (const someone of [dan, mihai]) {
      await expect(
        someone.as.mutation(api.producers.details.update, {
          manufacturerId,
          about: "Altceva",
        }),
      ).rejects.toThrow(/forbidden/);
    }
  });

  test("a bad site, address or phone number is refused", async () => {
    const t = setup();
    const { manufacturerId, ana } = await claimedProducer(t);
    for (const bad of [
      { website: "nu e un site" },
      { contactEmail: "tehnic" },
      { contactPhone: "sună-mă" },
      { contactPhone: "123" },
    ]) {
      await expect(
        ana.as.mutation(api.producers.details.update, {
          manufacturerId,
          ...bad,
        }),
      ).rejects.toThrow(/invalid/);
    }
  });

  test("an unclaimed profile has none, and they go with the firm", async () => {
    const t = setup();
    const { manufacturerId, ana, organizationId } = await claimedProducer(t);
    await ana.as.mutation(api.producers.details.update, {
      manufacturerId,
      ...details,
    });
    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});

    const mihai = await firmOwner(t, "Mihai");
    const seen = await mihai.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(seen?.claimed).toBe(false);
    expect(seen?.details).toBeNull();
    const rows = await t.run(
      async (ctx) => await ctx.db.query("producerDetails").collect(),
    );
    expect(rows).toEqual([]);
  });
});

describe("the producer's unpublished norms", () => {
  test("only its own firm and Devize staff see them", async () => {
    const t = setup();
    const { manufacturerId, ana, admin } = await claimedProducer(t);
    const fields = {
      source: "manufacturer" as const,
      manufacturerId,
      unit: "mp",
      resources: tilingResources,
    };
    await ana.as.mutation(api.catalog.norms.create, {
      ...fields,
      code: "TT-02A01",
      title: "Tencuială decorativă Test",
    });
    const submitted = await ana.as.mutation(api.catalog.norms.create, {
      ...fields,
      code: "TT-03A01",
      title: "Grund Test",
    });
    await ana.as.mutation(api.catalog.norms.submit, { normId: submitted });

    for (const insider of [ana, admin]) {
      const profile = await insider.as.query(api.producers.profiles.get, {
        manufacturerId,
      });
      expect(profile?.drafts.map((norm) => [norm.code, norm.status])).toEqual([
        ["TT-03A01", "review"],
        ["TT-02A01", "draft"],
      ]);
    }
    const mihai = await firmOwner(t, "Mihai");
    const seen = await mihai.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(seen?.drafts).toEqual([]);
    expect(seen?.norms.map((norm) => norm.code)).toEqual(["TT-01A01"]);
  });

  test("Devize sends one back with a note, until it's sent again", async () => {
    const t = setup();
    const { manufacturerId, ana, admin } = await claimedProducer(t);
    const normId = await ana.as.mutation(api.catalog.norms.create, {
      source: "manufacturer",
      manufacturerId,
      code: "TT-02A01",
      title: "Tencuială decorativă Test",
      unit: "mp",
      resources: tilingResources,
    });
    await ana.as.mutation(api.catalog.norms.submit, { normId });
    await expect(
      ana.as.mutation(api.catalog.norms.reject, { normId, note: "Nu" }),
    ).rejects.toThrow(/forbidden/);
    await expect(
      admin.as.mutation(api.catalog.norms.reject, {
        normId,
        note: "x".repeat(1001),
      }),
    ).rejects.toThrow(/invalid/);
    await admin.as.mutation(api.catalog.norms.reject, {
      normId,
      note: " Consumul de grund diferă de fișa tehnică. ",
    });

    const returned = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(returned?.drafts).toMatchObject([
      {
        code: "TT-02A01",
        status: "draft",
        reviewNote: "Consumul de grund diferă de fișa tehnică.",
      },
    ]);
    expect(await admin.as.query(api.catalog.norms.listForReview, {})).toEqual(
      [],
    );

    await ana.as.mutation(api.catalog.norms.submit, { normId });
    const again = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(again?.drafts.map((norm) => norm.status)).toEqual(["review"]);
    expect(again?.drafts[0]?.reviewNote).toBeUndefined();
  });
});

describe("searching the catalog", () => {
  test("norms their producer confirmed come first", async () => {
    const t = setup();
    const { manufacturerId, ana, admin, normId } = await claimedProducer(t);
    const confirmed = await publishedNorm(admin, manufacturerId, {
      code: "TT-01A02",
      title: "Termosistem Test, montare peste 8 m",
    });
    await ana.as.mutation(api.catalog.norms.confirm, { normId: confirmed });

    const mihai = await firmOwner(t, "Mihai");
    const found = await mihai.as.query(api.catalog.norms.search, {
      organizationId: mihai.organizationId,
      text: "termosistem",
      scope: "public",
    });
    expect(found.map((norm) => norm._id)).toEqual([confirmed, normId]);
    expect(found.map((norm) => norm.confirmed)).toEqual([true, false]);
  });
});

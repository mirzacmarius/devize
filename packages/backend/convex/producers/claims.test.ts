import { afterEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  firmOwner,
  setup,
  signIn,
  type TestConvex,
  tilingResources,
} from "../test.helper";
import { parseAnaf } from "./anaf";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.SITE_URL;
});

// A made-up CUI that passes the control digit check.
const CUI = "12345674";

/** A made-up producer, unclaimed, with no published norm yet. */
async function manufacturer(t: TestConvex, name = "Termo Test SA") {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const manufacturerId: Id<"manufacturers"> = await t.run(
    async (ctx) =>
      await ctx.db.insert("manufacturers", {
        name,
        nameKey: name.toLowerCase(),
        wave: 1,
        status: "norms_received",
        normsStatus: "received",
        claimStatus: "unclaimed",
        website: "https://www.termotest.ro",
        notes: "Contact: ion@termotest.ro, sună după 10",
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
  return { admin, manufacturerId };
}

/** Publishes one of the producer's norms, which makes its profile show. */
async function publishNorm(
  admin: Awaited<ReturnType<typeof signIn>>,
  manufacturerId: Id<"manufacturers">,
) {
  const normId = await admin.as.mutation(api.catalog.norms.create, {
    source: "manufacturer",
    manufacturerId,
    code: "TT-01A01",
    baseCode: "TT-01",
    title: "Termosistem Test, montare sub 8 m",
    unit: "mp",
    resources: tilingResources,
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId });
  return normId;
}

/** A producer whose profile shows, with one published norm. */
async function visibleProducer(t: TestConvex) {
  const { admin, manufacturerId } = await manufacturer(t);
  const normId = await publishNorm(admin, manufacturerId);
  return { admin, manufacturerId, normId };
}

async function manufacturerDoc(
  t: TestConvex,
  manufacturerId: Id<"manufacturers">,
) {
  return await t.run(
    async (ctx) => await ctx.db.get("manufacturers", manufacturerId),
  );
}

describe("claiming with a link", () => {
  test("the person it was sent to claims the profile for a new producer firm", async () => {
    process.env.SITE_URL = "https://app.devize.test/";
    const t = setup();
    const { admin, manufacturerId, normId } = await visibleProducer(t);
    const link = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: " Ana@TermoTest.ro ",
    });
    expect(link.url).toBe(`https://app.devize.test/claim/${link.token}`);

    const ana = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
      verified: true,
    });
    const seen = await ana.as.query(api.producers.claimLinks.get, {
      token: link.token,
    });
    expect(seen).toMatchObject({
      manufacturerName: "Termo Test SA",
      email: "ana@termotest.ro",
      forYou: true,
      used: false,
      claimed: false,
      firms: [],
    });

    const claimed = await ana.as.mutation(api.producers.claimLinks.claim, {
      token: link.token,
    });
    expect(claimed.manufacturerId).toBe(manufacturerId);
    const [firm] = await ana.as.query(api.accounts.organizations.listMine, {});
    expect(firm).toMatchObject({
      _id: claimed.organizationId,
      name: "Termo Test SA",
      kind: "manufacturer",
      manufacturerId,
      role: "owner",
    });
    expect((await manufacturerDoc(t, manufacturerId))?.claimStatus).toBe(
      "claimed",
    );
    const claims = await t.run(
      async (ctx) => await ctx.db.query("manufacturerClaims").collect(),
    );
    expect(claims).toMatchObject([
      { method: "link", status: "approved", email: "ana@termotest.ro" },
    ]);

    // The producer's own firm now confirms its norms.
    const norm = await ana.as.query(api.catalog.norms.get, { normId });
    expect(norm.canConfirm).toBe(true);
    // A link works once.
    await expect(
      ana.as.mutation(api.producers.claimLinks.claim, { token: link.token }),
    ).rejects.toThrow(/not_found/);
    const profile = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(profile?.claimed).toBe(true);
    expect(profile?.viewer).toMatchObject({
      isProducer: true,
      canClaim: false,
    });
  });

  test("anyone signed in with another address, or an unproven one, is told it doesn't exist", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const { token } = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    const bogdan = await signIn(t, { name: "Bogdan", verified: true });
    expect(
      await bogdan.as.query(api.producers.claimLinks.get, { token }),
    ).toMatchObject({ forYou: false, signedInAs: "bogdan@example.com" });
    await expect(
      bogdan.as.mutation(api.producers.claimLinks.claim, { token }),
    ).rejects.toThrow(/not_found/);
    const unproven = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
    });
    await expect(
      unproven.as.mutation(api.producers.claimLinks.claim, { token }),
    ).rejects.toThrow(/not_found/);
    expect((await manufacturerDoc(t, manufacturerId))?.claimStatus).toBe(
      "unclaimed",
    );
  });

  test("expires after 30 days, and asking again reuses a link with time left", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const first = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    const again = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    expect(again.token).toBe(first.token);

    // Ten days left: too little to send again, so a new link.
    await t.run(async (ctx) => {
      const link = await ctx.db
        .query("claimLinks")
        .withIndex("by_token", (q) => q.eq("token", first.token))
        .unique();
      if (link) {
        await ctx.db.patch("claimLinks", link._id, {
          expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000,
        });
      }
    });
    const fresh = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    expect(fresh.token).not.toBe(first.token);

    await t.run(async (ctx) => {
      const link = await ctx.db
        .query("claimLinks")
        .withIndex("by_token", (q) => q.eq("token", fresh.token))
        .unique();
      if (link) {
        await ctx.db.patch("claimLinks", link._id, { expiresAt: Date.now() });
      }
    });
    const ana = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
      verified: true,
    });
    await expect(
      ana.as.mutation(api.producers.claimLinks.claim, { token: fresh.token }),
    ).rejects.toThrow(/not_found/);
  });
});

describe("claiming with the producer's domain", () => {
  test("a verified address on it claims at once, for a producer firm of theirs", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    await admin.as.mutation(api.producers.admin.addDomain, {
      manufacturerId,
      domain: "@TermoTest.ro",
    });
    const ana = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
      verified: true,
    });
    const ownFirm = await ana.as.mutation(api.accounts.organizations.create, {
      name: "Termo Test România SRL",
      kind: "manufacturer",
    });
    await ana.as.mutation(api.accounts.organizations.create, {
      name: "Ana Construct SRL",
    });
    const profile = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(profile?.viewer).toMatchObject({
      canClaim: true,
      claimMethod: "domain",
      firms: [{ _id: ownFirm, name: "Termo Test România SRL" }],
    });

    const organizationId = await ana.as.mutation(
      api.producers.claims.claimWithDomain,
      { manufacturerId, organizationId: ownFirm },
    );
    expect(organizationId).toBe(ownFirm);
    const [first] = await ana.as.query(api.accounts.organizations.listMine, {});
    expect(first).toMatchObject({ _id: ownFirm, manufacturerId });
    expect((await manufacturerDoc(t, manufacturerId))?.claimStatus).toBe(
      "claimed",
    );
  });

  test("another domain can't, and the firm linked must be a producer firm the person owns", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    await admin.as.mutation(api.producers.admin.addDomain, {
      manufacturerId,
      domain: "termotest.ro",
    });
    const bogdan = await signIn(t, { name: "Bogdan", verified: true });
    await expect(
      bogdan.as.mutation(api.producers.claims.claimWithDomain, {
        manufacturerId,
      }),
    ).rejects.toThrow(/forbidden/);

    const ana = await firmOwner(t, "Ana");
    await t.run(async (ctx) => {
      await ctx.db.patch("users", ana.userId, {
        email: "ana@termotest.ro",
        emailVerificationTime: Date.now(),
      });
    });
    // Ana's firm is a contractor, so it can't hold the profile.
    await expect(
      ana.as.mutation(api.producers.claims.claimWithDomain, {
        manufacturerId,
        organizationId: ana.organizationId,
      }),
    ).rejects.toThrow(/invalid/);
    expect((await manufacturerDoc(t, manufacturerId))?.claimStatus).toBe(
      "unclaimed",
    );
  });

  test("refuses free mail services and a domain another producer has", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    for (const domain of ["gmail.com", "@yahoo.ro", "not a domain", "ro"]) {
      await expect(
        admin.as.mutation(api.producers.admin.addDomain, {
          manufacturerId,
          domain,
        }),
      ).rejects.toThrow(/invalid/);
    }
    await admin.as.mutation(api.producers.admin.addDomain, {
      manufacturerId,
      domain: "www.termotest.ro",
    });
    const other = await manufacturer(t, "Alt Producător SA");
    await expect(
      admin.as.mutation(api.producers.admin.addDomain, {
        manufacturerId: other.manufacturerId,
        domain: "termotest.ro",
      }),
    ).rejects.toThrow(/in_use/);
    const panel = await admin.as.query(api.producers.admin.forManufacturer, {
      manufacturerId,
    });
    expect(panel?.domains.map((row) => row.domain)).toEqual(["termotest.ro"]);
  });
});

describe("claiming by request", () => {
  test("a super admin checks the CUI with ANAF and approves", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const asked: unknown[] = [];
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      asked.push(JSON.parse(String(init?.body)));
      return Response.json({
        found: [
          {
            date_generale: {
              cui: Number(CUI),
              denumire: "TERMO TEST SA",
              adresa: "MUN. PLOIEŞTI, STR. EXEMPLU NR. 1",
              nrRegCom: "J29/1/2000",
              stare_inregistrare: "INREGISTRAT din data 01.02.2000",
            },
            inregistrare_scop_Tva: { scpTVA: true },
            stare_inactiv: { statusInactivi: false },
          },
        ],
        notFound: [],
      });
    }) as typeof fetch;

    const bogdan = await signIn(t, {
      name: "Bogdan",
      email: "bogdan@gmail.com",
      verified: true,
    });
    const profile = await bogdan.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(profile?.viewer.claimMethod).toBe("manual");
    await bogdan.as.mutation(api.producers.claims.request, {
      manufacturerId,
      message: "Sunt directorul tehnic al Termo Test.",
      cui: `RO ${CUI}`,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect(asked).toEqual([[{ cui: Number(CUI), data: expect.any(String) }]]);

    const queue = await admin.as.query(api.producers.admin.queue, {});
    expect(queue.claims).toMatchObject([
      {
        manufacturerName: "Termo Test SA",
        email: "bogdan@gmail.com",
        cui: CUI,
        anaf: {
          outcome: "found",
          name: "TERMO TEST SA",
          vatPayer: true,
          inactive: false,
        },
        signals: {
          emailMatchesWebsite: false,
          anafNameMatches: true,
          cuiMatches: null,
        },
      },
    ]);
    expect(await admin.as.query(api.producers.admin.pendingCount, {})).toBe(1);

    const [claim] = queue.claims;
    if (!claim) {
      throw new Error("The claim isn't in the queue");
    }
    const organizationId = await admin.as.mutation(
      api.producers.admin.approve,
      { claimId: claim._id },
    );
    const [firm] = await bogdan.as.query(
      api.accounts.organizations.listMine,
      {},
    );
    expect(firm).toMatchObject({
      _id: organizationId,
      kind: "manufacturer",
      manufacturerId,
      role: "owner",
    });
    const created = await t.run(
      async (ctx) => await ctx.db.get("organizations", organizationId),
    );
    expect(created?.cui).toBe(CUI);
    expect(await admin.as.query(api.producers.admin.pendingCount, {})).toBe(0);
  });

  test("a rejected claim tells the person why, and one waits at a time", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const bogdan = await signIn(t, { name: "Bogdan", verified: true });
    const claimId = await bogdan.as.mutation(api.producers.claims.request, {
      manufacturerId,
      message: "Lucrez la Termo Test.",
    });
    await expect(
      bogdan.as.mutation(api.producers.claims.request, {
        manufacturerId,
        message: "Încă o dată.",
      }),
    ).rejects.toThrow(/in_use/);
    await admin.as.mutation(api.producers.admin.reject, {
      claimId,
      reason: "Nu am putut confirma că lucrați la Termo Test.",
    });
    const profile = await bogdan.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(profile?.viewer.claim).toMatchObject({
      status: "rejected",
      reason: "Nu am putut confirma că lucrați la Termo Test.",
    });
    await expect(
      admin.as.mutation(api.producers.admin.approve, { claimId }),
    ).rejects.toThrow(/not_found/);

    // Asking again after a rejection is allowed, and so is withdrawing.
    const again = await bogdan.as.mutation(api.producers.claims.request, {
      manufacturerId,
      message: "Am atașat acum CUI-ul.",
      cui: CUI,
    });
    await bogdan.as.mutation(api.producers.claims.withdraw, { claimId: again });
    expect(await admin.as.query(api.producers.admin.queue, {})).toMatchObject({
      claims: [],
    });
  });

  test("needs a message and a valid CUI", async () => {
    const t = setup();
    const { manufacturerId } = await visibleProducer(t);
    const bogdan = await signIn(t, { name: "Bogdan", verified: true });
    await expect(
      bogdan.as.mutation(api.producers.claims.request, {
        manufacturerId,
        message: "  ",
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      bogdan.as.mutation(api.producers.claims.request, {
        manufacturerId,
        message: "Lucrez la Termo Test.",
        cui: "12345678",
      }),
    ).rejects.toThrow(/invalid/);
  });
});

describe("a claimed profile", () => {
  test("can't be claimed again, by any path", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const bogdan = await signIn(t, { name: "Bogdan", verified: true });
    const claimId = await bogdan.as.mutation(api.producers.claims.request, {
      manufacturerId,
      message: "Lucrez la Termo Test.",
    });
    const { token } = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    const ana = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
      verified: true,
    });
    await ana.as.mutation(api.producers.claimLinks.claim, { token });

    await expect(
      admin.as.mutation(api.producers.admin.approve, { claimId }),
    ).rejects.toThrow(/in_use/);
    await expect(
      admin.as.mutation(api.producers.admin.createLink, {
        manufacturerId,
        email: "ion@termotest.ro",
      }),
    ).rejects.toThrow(/in_use/);
    const cristi = await signIn(t, { name: "Cristi", verified: true });
    await expect(
      cristi.as.mutation(api.producers.claims.request, {
        manufacturerId,
        message: "Și eu lucrez acolo.",
      }),
    ).rejects.toThrow(/in_use/);
    const holders = await t.run(
      async (ctx) =>
        await ctx.db
          .query("organizations")
          .withIndex("by_manufacturerId", (q) =>
            q.eq("manufacturerId", manufacturerId),
          )
          .collect(),
    );
    expect(holders).toHaveLength(1);
  });

  test("can be claimed again once the producer's firm is deleted", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const { token } = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    const ana = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
      verified: true,
    });
    const { organizationId } = await ana.as.mutation(
      api.producers.claimLinks.claim,
      { token },
    );
    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect((await manufacturerDoc(t, manufacturerId))?.claimStatus).toBe(
      "unclaimed",
    );
  });
});

describe("the profile", () => {
  test("shows once Devize publishes a norm, with only what the producer would publish", async () => {
    const t = setup();
    const { admin, manufacturerId } = await manufacturer(t);
    const ana = await firmOwner(t, "Ana");
    expect(
      await ana.as.query(api.producers.profiles.get, { manufacturerId }),
    ).toBeNull();
    expect(await ana.as.query(api.producers.profiles.list, {})).toEqual([]);
    // Devize staff see it before it shows.
    expect(
      await admin.as.query(api.producers.profiles.get, { manufacturerId }),
    ).toMatchObject({ visible: false });

    await publishNorm(admin, manufacturerId);
    const profile = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(profile).toMatchObject({
      name: "Termo Test SA",
      claimed: false,
      visible: true,
      logoUrl: null,
      norms: [{ code: "TT-01A01", confirmed: false }],
    });
    expect(Object.keys(profile ?? {}).sort()).toEqual([
      "_id",
      "claimed",
      "details",
      "drafts",
      "editions",
      "logoUrl",
      "moreNorms",
      "name",
      "norms",
      "products",
      "viewer",
      "visible",
    ]);
    expect(JSON.stringify(profile)).not.toContain("termotest.ro");
    expect(await ana.as.query(api.producers.profiles.list, {})).toMatchObject([
      { _id: manufacturerId, name: "Termo Test SA", claimed: false },
    ]);
  });

  test("comes down when a super admin approves a removal request", async () => {
    const t = setup();
    const { admin, manufacturerId, normId } = await visibleProducer(t);
    const ana = await firmOwner(t, "Ana");
    await ana.as.mutation(api.producers.claims.requestRemoval, {
      manufacturerId,
      message: "Nu ne-am dat acordul pentru aceste norme.",
    });
    await expect(
      ana.as.mutation(api.producers.claims.requestRemoval, {
        manufacturerId,
        message: "Din nou.",
      }),
    ).rejects.toThrow(/in_use/);
    const {
      removals: [request],
    } = await admin.as.query(api.producers.admin.queue, {});
    if (!request) {
      throw new Error("The removal request isn't in the queue");
    }
    await admin.as.mutation(api.producers.admin.remove, {
      requestId: request._id,
    });
    await t.finishAllScheduledFunctions(() => {});

    expect(
      await ana.as.query(api.producers.profiles.get, { manufacturerId }),
    ).toBeNull();
    const [norm, producer] = await t.run(async (ctx) => [
      await ctx.db.get("norms", normId),
      await ctx.db.get("manufacturers", manufacturerId),
    ]);
    expect(norm?.status).toBe("archived");
    expect(producer?.status).toBe("excluded");
    expect(await admin.as.query(api.producers.admin.pendingCount, {})).toBe(0);
  });
});

describe("managing claims", () => {
  test("is for super admins only", async () => {
    const t = setup();
    const { manufacturerId } = await visibleProducer(t);
    const ana = await firmOwner(t, "Ana");
    await expect(
      ana.as.mutation(api.producers.admin.createLink, {
        manufacturerId,
        email: "ana@example.com",
      }),
    ).rejects.toThrow(/forbidden/);
    await expect(
      ana.as.mutation(api.producers.admin.addDomain, {
        manufacturerId,
        domain: "example.com",
      }),
    ).rejects.toThrow(/forbidden/);
    await expect(ana.as.query(api.producers.admin.queue, {})).rejects.toThrow(
      /forbidden/,
    );
  });

  test("deleting the manufacturer deletes its links and domains", async () => {
    const t = setup();
    const { admin, manufacturerId } = await manufacturer(t);
    await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    await admin.as.mutation(api.producers.admin.addDomain, {
      manufacturerId,
      domain: "termotest.ro",
    });
    await admin.as.mutation(api.manufacturers.admin.remove, { manufacturerId });
    const left = await t.run(async (ctx) => [
      ...(await ctx.db.query("claimLinks").collect()),
      ...(await ctx.db.query("manufacturerDomains").collect()),
    ]);
    expect(left).toEqual([]);
  });
});

describe("when the claimant deletes their account", () => {
  test("their waiting requests go, and a decided claim keeps only how and when", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const { token } = await admin.as.mutation(api.producers.admin.createLink, {
      manufacturerId,
      email: "ana@termotest.ro",
    });
    const ana = await signIn(t, {
      name: "Ana",
      email: "ana@termotest.ro",
      verified: true,
    });
    const { organizationId } = await ana.as.mutation(
      api.producers.claimLinks.claim,
      { token },
    );
    // A colleague keeps the producer's firm going.
    const bogdan = await signIn(t, { name: "Bogdan" });
    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", {
        organizationId,
        userId: bogdan.userId,
        role: "admin",
        lastActiveAt: Date.now(),
      });
    });
    await ana.as.mutation(api.producers.details.update, {
      manufacturerId,
      about: "Producem termosisteme.",
      contactName: "Ana Ionescu",
      contactEmail: "Ana@TermoTest.ro",
      contactPhone: "0722 000 000",
    });
    // A claim and a removal request about another producer, still waiting.
    const other = await manufacturer(t, "Vata Test SRL");
    await publishNorm(other.admin, other.manufacturerId);
    await ana.as.mutation(api.producers.claims.request, {
      manufacturerId: other.manufacturerId,
      message: "Lucrez și la Vata Test.",
    });
    await ana.as.mutation(api.producers.claims.requestRemoval, {
      manufacturerId: other.manufacturerId,
      message: "Nu ne-am dat acordul.",
    });

    await ana.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});

    const left = await t.run(async (ctx) => ({
      claims: await ctx.db.query("manufacturerClaims").collect(),
      removals: await ctx.db.query("removalRequests").collect(),
      links: await ctx.db.query("claimLinks").collect(),
      details: await ctx.db.query("producerDetails").collect(),
      firm: await ctx.db.get("organizations", organizationId),
    }));
    expect(left.claims).toHaveLength(1);
    expect(left.claims[0]).toMatchObject({
      manufacturerId,
      method: "link",
      status: "approved",
      organizationId,
    });
    expect(left.claims[0]?.email).toBeUndefined();
    expect(left.removals).toEqual([]);
    expect(left.links).toEqual([]);
    expect(left.details).toHaveLength(1);
    expect(left.details[0]?.about).toBe("Producem termosisteme.");
    expect(left.details[0]?.contactName).toBeUndefined();
    expect(left.details[0]?.contactEmail).toBeUndefined();
    expect(left.details[0]?.contactPhone).toBeUndefined();
    // The profile stays with the producer's firm.
    expect(left.firm?.manufacturerId).toBe(manufacturerId);
    const seen = await admin.as.query(api.producers.admin.forManufacturer, {
      manufacturerId,
    });
    expect(seen?.claims).toEqual([
      expect.objectContaining({
        method: "link",
        status: "approved",
        name: null,
      }),
    ]);
    expect(JSON.stringify(seen)).not.toContain("ana@termotest.ro");
  });

  test("a decided request loses their address, words and the reason given", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const bogdan = await signIn(t, { name: "Bogdan", verified: true });
    const claimId = await bogdan.as.mutation(api.producers.claims.request, {
      manufacturerId,
      message: "Sunt Bogdan, de la Termo Test.",
    });
    await admin.as.mutation(api.producers.admin.reject, {
      claimId,
      reason: "Nu am putut confirma că lucrați la Termo Test.",
    });
    const requestId = await bogdan.as.mutation(
      api.producers.claims.requestRemoval,
      { manufacturerId, message: "Nu ne-am dat acordul." },
    );
    await admin.as.mutation(api.producers.admin.dismiss, { requestId });
    // Details with his address on a profile no firm of his holds stay.
    await t.run(async (ctx) => {
      await ctx.db.insert("producerDetails", {
        manufacturerId,
        contactName: "Ion",
        contactEmail: "bogdan@example.com",
        updatedBy: admin.userId,
        updatedAt: Date.now(),
      });
    });

    await bogdan.as.mutation(api.users.deleteCurrentUserAccount, {});

    const left = await t.run(async (ctx) => ({
      claim: await ctx.db.get("manufacturerClaims", claimId),
      request: await ctx.db.get("removalRequests", requestId),
      details: await ctx.db.query("producerDetails").collect(),
    }));
    expect(left.claim).toMatchObject({ method: "manual", status: "rejected" });
    expect(left.claim?.email).toBeUndefined();
    expect(left.claim?.message).toBeUndefined();
    expect(left.claim?.reason).toBeUndefined();
    expect(left.claim?.decidedAt).toBeNumber();
    expect(left.request).toMatchObject({ status: "dismissed" });
    expect(left.request?.email).toBeUndefined();
    expect(left.request?.message).toBeUndefined();
    expect(left.details[0]?.contactEmail).toBe("bogdan@example.com");
  });
});

describe("claim links", () => {
  test("go a month after they expire, used or not", async () => {
    const t = setup();
    const { admin, manufacturerId } = await visibleProducer(t);
    const day = 24 * 60 * 60 * 1000;
    const tokens: Record<string, string> = {};
    for (const email of [
      "vechi@termotest.ro",
      "folosit@termotest.ro",
      "recent@termotest.ro",
      "nou@termotest.ro",
    ]) {
      const link = await admin.as.mutation(api.producers.admin.createLink, {
        manufacturerId,
        email,
      });
      tokens[email] = link.token;
    }
    const expire = async (email: string, daysAgo: number, used = false) => {
      await t.run(async (ctx) => {
        const link = await ctx.db
          .query("claimLinks")
          .withIndex("by_token", (q) => q.eq("token", tokens[email] ?? ""))
          .unique();
        if (link) {
          await ctx.db.patch("claimLinks", link._id, {
            expiresAt: Date.now() - daysAgo * day,
            ...(used ? { usedAt: Date.now() - (daysAgo + 20) * day } : {}),
          });
        }
      });
    };
    await expire("vechi@termotest.ro", 31);
    await expire("folosit@termotest.ro", 45, true);
    await expire("recent@termotest.ro", 29);

    await t.mutation(internal.producers.claimLinks.deleteExpired, {});
    const left = await t.run(
      async (ctx) => await ctx.db.query("claimLinks").collect(),
    );
    expect(left.map((link) => link.email).sort()).toEqual([
      "nou@termotest.ro",
      "recent@termotest.ro",
    ]);
  });
});

describe("ANAF's answer", () => {
  test("is read for a firm found, one not found, and an answer it can't read", () => {
    expect(
      parseAnaf(
        {
          found: [
            {
              date_generale: { denumire: " FIRMA SRL ", adresa: "BUCUREȘTI" },
              stare_inactiv: { statusInactivi: true },
              inregistrare_scop_Tva: { scpTVA: false },
            },
          ],
        },
        1,
      ),
    ).toEqual({
      outcome: "found",
      checkedAt: 1,
      name: "FIRMA SRL",
      address: "BUCUREȘTI",
      tradeRegister: undefined,
      registration: undefined,
      inactive: true,
      vatPayer: false,
    });
    expect(parseAnaf({ found: [], notFound: [123] }, 2)).toEqual({
      outcome: "not_found",
      checkedAt: 2,
    });
    expect(parseAnaf("<html>", 3)).toEqual({
      outcome: "unavailable",
      checkedAt: 3,
    });
  });
});

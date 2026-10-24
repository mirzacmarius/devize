import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { firmOwner, setup, signIn, type TestConvex } from "../test.helper";
import { TERMS_VERSION } from "./terms";

// A firm accepts the Termeni de utilizare and the Acord de prelucrare a
// datelor when it is created, or later from an owner or admin (ADR 0051).

/** Someone who joined the firm with `role`, as an invitation would. */
async function colleague(
  t: TestConvex,
  organizationId: Id<"organizations">,
  name: string,
  role: "admin" | "member",
) {
  const person = await signIn(t, { name });
  await t.run(async (ctx) => {
    await ctx.db.insert("memberships", {
      organizationId,
      userId: person.userId,
      role,
      lastActiveAt: Date.now(),
    });
  });
  return person;
}

async function acceptances(t: TestConvex) {
  return await t.run(
    async (ctx) => await ctx.db.query("termsAcceptances").collect(),
  );
}

describe("accepting the terms", () => {
  test("at the firm step, for the version the page showed", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Construct Plus SRL", termsVersion: TERMS_VERSION },
    );
    expect(await acceptances(t)).toMatchObject([
      { organizationId, version: TERMS_VERSION, acceptedBy: ana.userId },
    ]);
    const [firm] = await ana.as.query(api.accounts.organizations.listMine, {});
    expect(firm?.termsVersion).toBe(TERMS_VERSION);
    const details = await ana.as.query(api.accounts.organizations.get, {
      organizationId,
    });
    expect(details.terms).toMatchObject({
      version: TERMS_VERSION,
      acceptedBy: "Ana",
    });
  });

  test("terms that changed since the page loaded make no firm", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    await expect(
      ana.as.mutation(api.accounts.organizations.create, {
        name: "Construct Plus SRL",
        termsVersion: "2020-01-01",
      }),
    ).rejects.toThrow(/terms/);
    expect(
      await ana.as.query(api.accounts.organizations.listMine, {}),
    ).toEqual([]);
  });

  test("a firm made without them is asked for them, and an admin accepts once", async () => {
    const t = setup();
    // As a firm made by claiming a producer's profile, or before ADR 0051.
    const ana = await firmOwner(t, "Ana");
    const [firm] = await ana.as.query(api.accounts.organizations.listMine, {});
    expect(firm?.termsVersion).toBeNull();
    expect(
      (
        await ana.as.query(api.accounts.organizations.get, {
          organizationId: ana.organizationId,
        })
      ).terms,
    ).toBeNull();

    const ion = await colleague(t, ana.organizationId, "Ion", "member");
    await expect(
      ion.as.mutation(api.accounts.organizations.acceptTerms, {
        organizationId: ana.organizationId,
        version: TERMS_VERSION,
      }),
    ).rejects.toThrow(/forbidden/);

    const maria = await colleague(t, ana.organizationId, "Maria", "admin");
    await expect(
      maria.as.mutation(api.accounts.organizations.acceptTerms, {
        organizationId: ana.organizationId,
        version: "2020-01-01",
      }),
    ).rejects.toThrow(/terms/);
    for (let i = 0; i < 2; i++) {
      await maria.as.mutation(api.accounts.organizations.acceptTerms, {
        organizationId: ana.organizationId,
        version: TERMS_VERSION,
      });
    }
    expect(await acceptances(t)).toMatchObject([
      { version: TERMS_VERSION, acceptedBy: maria.userId },
    ]);
    const [accepted] = await ion.as.query(
      api.accounts.organizations.listMine,
      {},
    );
    expect(accepted?.termsVersion).toBe(TERMS_VERSION);
  });

  test("an earlier version stays on record; the newest is the firm's", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    await t.run(async (ctx) => {
      await ctx.db.insert("termsAcceptances", {
        organizationId: ana.organizationId,
        version: "2026-01-15",
        acceptedBy: ana.userId,
      });
    });
    const [before] = await ana.as.query(
      api.accounts.organizations.listMine,
      {},
    );
    expect(before?.termsVersion).toBe("2026-01-15");
    await ana.as.mutation(api.accounts.organizations.acceptTerms, {
      organizationId: ana.organizationId,
      version: TERMS_VERSION,
    });
    const [after] = await ana.as.query(api.accounts.organizations.listMine, {});
    expect(after?.termsVersion).toBe(TERMS_VERSION);
    expect((await acceptances(t)).map((row) => row.version)).toEqual([
      "2026-01-15",
      TERMS_VERSION,
    ]);
  });

  test("another firm's member can't accept for it", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.mutation(api.accounts.organizations.acceptTerms, {
        organizationId: ana.organizationId,
        version: TERMS_VERSION,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("the record names no one once the person who accepted is gone", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const maria = await colleague(t, ana.organizationId, "Maria", "admin");
    await maria.as.mutation(api.accounts.organizations.acceptTerms, {
      organizationId: ana.organizationId,
      version: TERMS_VERSION,
    });
    await maria.as.mutation(api.users.deleteCurrentUserAccount, {});
    const details = await ana.as.query(api.accounts.organizations.get, {
      organizationId: ana.organizationId,
    });
    expect(details.terms).toMatchObject({
      version: TERMS_VERSION,
      acceptedBy: null,
    });
  });

  test("they go with the firm", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Construct Plus SRL", termsVersion: TERMS_VERSION },
    );
    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect(await acceptances(t)).toEqual([]);
  });
});

import { describe, expect, test } from "bun:test";
import { api } from "./_generated/api";
import { firmOwner, publishedBaseNorm, setup, signIn } from "./test.helper";

describe("deleteCurrentUserAccount", () => {
  test("deletes a firm whose last member leaves, with all its data", async () => {
    const t = setup();
    const { normId } = await publishedBaseNorm(t);
    const ana = await firmOwner(t, "Ana");
    const clientId = await ana.as.mutation(api.accounts.clients.create, {
      organizationId: ana.organizationId,
      kind: "person",
      name: "Ion Popescu",
    });
    const estimateId = await ana.as.mutation(api.estimates.estimates.create, {
      organizationId: ana.organizationId,
      title: "Baie",
      clientId,
    });
    await ana.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId,
      quantity: 12,
    });

    await ana.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});

    const left = await t.run(async (ctx) => ({
      firm: await ctx.db.get("organizations", ana.organizationId),
      estimates: await ctx.db.query("estimates").collect(),
      lineItems: await ctx.db.query("lineItems").collect(),
      clients: await ctx.db.query("clients").collect(),
      memberships: await ctx.db.query("memberships").collect(),
      // The shared catalog stays.
      norms: await ctx.db.query("norms").collect(),
    }));
    expect(left.firm).toBeNull();
    expect(left.estimates).toHaveLength(0);
    expect(left.lineItems).toHaveLength(0);
    expect(left.clients).toHaveLength(0);
    expect(left.memberships).toHaveLength(0);
    expect(left.norms).toHaveLength(1);
  });

  test("hands the firm to a colleague when its only owner leaves", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const bogdan = await signIn(t, { name: "Bogdan" });
    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", {
        organizationId: ana.organizationId,
        userId: bogdan.userId,
        role: "member",
        lastActiveAt: Date.now(),
      });
    });

    await ana.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});

    const firms = await bogdan.as.query(
      api.accounts.organizations.listMine,
      {},
    );
    expect(firms.map((firm) => [firm._id, firm.role])).toEqual([
      [ana.organizationId, "owner"],
    ]);
  });
});

import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup, signIn } from "../test.helper";

describe("organizations", () => {
  test("a new firm has its creator as owner and standard markups", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Construct Plus SRL", cui: "RO 2816464" },
    );
    const firms = await ana.as.query(api.accounts.organizations.listMine, {});
    expect(firms).toHaveLength(1);
    expect(firms[0]?.role).toBe("owner");
    const firm = await ana.as.query(api.accounts.organizations.get, {
      organizationId,
    });
    expect(firm.cui).toBe("2816464");
    expect(firm.defaultMarkups).toEqual({
      cam: 2.25,
      indirect: 10,
      profit: 5,
      vat: 21,
    });
  });

  test("a firm that doesn't charge VAT starts with a VAT rate of 0, and gets 21% once it does", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Ana Renovări PFA", vatPayer: false },
    );
    const firm = () =>
      ana.as.query(api.accounts.organizations.get, { organizationId });
    expect((await firm()).defaultMarkups.vat).toBe(0);

    await ana.as.mutation(api.accounts.organizations.update, {
      organizationId,
      vatPayer: true,
    });
    expect((await firm()).defaultMarkups).toEqual({
      cam: 2.25,
      indirect: 10,
      profit: 5,
      vat: 21,
    });
    const estimateId = await ana.as.mutation(api.estimates.estimates.create, {
      organizationId,
      title: "Renovare baie",
    });
    expect(
      (await ana.as.query(api.estimates.estimates.get, { estimateId })).markups
        .vat,
    ).toBe(21);
  });

  test("rejects a CUI with a wrong control digit", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    await expect(
      ana.as.mutation(api.accounts.organizations.create, {
        name: "Firmă",
        cui: "2816465",
      }),
    ).rejects.toThrow();
  });

  test("another user can't see the firm or its clients", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const bogdan = await signIn(t, { name: "Bogdan" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Construct Plus SRL" },
    );
    await ana.as.mutation(api.accounts.clients.create, {
      organizationId,
      kind: "person",
      name: "Ion Popescu",
    });
    await expect(
      bogdan.as.query(api.accounts.organizations.get, { organizationId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.query(api.accounts.clients.list, { organizationId }),
    ).rejects.toThrow(/not_found/);
    expect(
      await bogdan.as.query(api.accounts.organizations.listMine, {}),
    ).toHaveLength(0);
  });

  test("a logo is a PNG, JPEG or WebP picture, and replacing it deletes the old one", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const store = (type: string) =>
      t.run(async (ctx) => await ctx.storage.store(new Blob(["x"], { type })));
    const pdf = await store("application/pdf");
    await expect(
      ana.as.mutation(api.accounts.organizations.setLogo, {
        organizationId: ana.organizationId,
        storageId: pdf,
      }),
    ).rejects.toThrow(/invalid/);

    const first = await store("image/png");
    const second = await store("image/jpeg");
    for (const storageId of [first, second]) {
      await ana.as.mutation(api.accounts.organizations.setLogo, {
        organizationId: ana.organizationId,
        storageId,
      });
    }
    const firm = await ana.as.query(api.accounts.organizations.get, {
      organizationId: ana.organizationId,
    });
    expect(firm.logoId).toBe(second);
    expect(firm.logoUrl).toBeString();
    expect(
      await t.run(async (ctx) => await ctx.db.system.get("_storage", first)),
    ).toBeNull();
  });

  test("the last owner can't leave or be demoted", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Construct Plus SRL" },
    );
    await expect(
      ana.as.mutation(api.accounts.organizations.removeMember, {
        organizationId,
        userId: ana.userId,
      }),
    ).rejects.toThrow(/in_use/);
    await expect(
      ana.as.mutation(api.accounts.organizations.setMemberRole, {
        organizationId,
        userId: ana.userId,
        role: "member",
      }),
    ).rejects.toThrow(/in_use/);
  });
});

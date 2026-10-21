import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { setup, signIn } from "../test.helper";

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

  test("a firm that doesn't charge VAT starts with a VAT rate of 0", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const organizationId = await ana.as.mutation(
      api.accounts.organizations.create,
      { name: "Ana Renovări PFA", vatPayer: false },
    );
    const firm = await ana.as.query(api.accounts.organizations.get, {
      organizationId,
    });
    expect(firm.defaultMarkups.vat).toBe(0);
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

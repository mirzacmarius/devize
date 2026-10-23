import { describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { firmOwner, setup, signIn, type TestConvex } from "../test.helper";

function upload(t: TestConvex, type = "application/pdf") {
  return t.run(
    async (ctx): Promise<Id<"_storage">> =>
      await ctx.storage.store(new Blob(["x"], { type })),
  );
}

function stored(t: TestConvex, storageId: Id<"_storage">) {
  return t.run(async (ctx) => await ctx.db.system.get("_storage", storageId));
}

/** Runs `action` as if `minutes` had passed since now. */
async function later<T>(minutes: number, action: () => Promise<T>) {
  setSystemTime(new Date(Date.now() + minutes * 60 * 1000));
  try {
    return await action();
  } finally {
    setSystemTime();
  }
}

describe("files", () => {
  test("a file is registered once, right after its upload", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    const register = (
      owner: typeof ana,
      storageId: Id<"_storage">,
    ): Promise<Id<"files">> =>
      owner.as.mutation(api.accounts.files.register, {
        organizationId: owner.organizationId,
        storageId,
        name: "caiet de sarcini.pdf",
        purpose: "tender",
      });

    const fresh = await upload(t);
    await register(ana, fresh);
    await expect(register(bogdan, fresh)).rejects.toThrow(/in_use/);

    const old = await upload(t);
    await expect(later(11, () => register(ana, old))).rejects.toThrow(
      /not_found/,
    );
  });

  test("nobody takes another firm's file, logo or photo by its id", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    // Bogdan left Ana's firm, keeping the storage ids he saw there.
    const bogdan = await firmOwner(t, "Bogdan");
    const document = await upload(t);
    await ana.as.mutation(api.accounts.files.register, {
      organizationId: ana.organizationId,
      storageId: document,
      name: "contract.pdf",
      purpose: "other",
    });
    const logo = await upload(t, "image/png");
    await ana.as.mutation(api.accounts.organizations.setLogo, {
      organizationId: ana.organizationId,
      storageId: logo,
    });

    await expect(
      bogdan.as.mutation(api.users.updateUserImage, { imageId: document }),
    ).rejects.toThrow(/in_use/);
    await later(11, async () => {
      for (const storageId of [document, logo]) {
        await expect(
          bogdan.as.mutation(api.users.updateUserImage, { imageId: storageId }),
        ).rejects.toThrow(/not_found/);
        await expect(
          bogdan.as.mutation(api.accounts.organizations.setLogo, {
            organizationId: bogdan.organizationId,
            storageId,
          }),
        ).rejects.toThrow(/not_found/);
      }
      await expect(
        bogdan.as.mutation(api.accounts.files.register, {
          organizationId: bogdan.organizationId,
          storageId: logo,
          name: "logo.png",
          purpose: "other",
        }),
      ).rejects.toThrow(/not_found/);
    });

    await bogdan.as.mutation(api.users.removeUserImage, {});
    expect(await stored(t, document)).not.toBeNull();
    expect(await stored(t, logo)).not.toBeNull();
  });

  test("a photo is a picture just uploaded, and a new one replaces it", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana" });
    const pdf = await upload(t, "application/pdf");
    await expect(
      ana.as.mutation(api.users.updateUserImage, { imageId: pdf }),
    ).rejects.toThrow(/invalid/);

    const first = await upload(t, "image/png");
    const second = await upload(t, "image/jpeg");
    for (const imageId of [first, second]) {
      await ana.as.mutation(api.users.updateUserImage, { imageId });
    }
    const me = await ana.as.query(api.users.getUser, {});
    expect(me?.imageId).toBe(second);
    expect(me?.avatarUrl).toBeString();
    expect(await stored(t, first)).toBeNull();
    // Setting the same photo again keeps it.
    await later(11, () =>
      ana.as.mutation(api.users.updateUserImage, { imageId: second }),
    );
    expect(await stored(t, second)).not.toBeNull();
  });
});

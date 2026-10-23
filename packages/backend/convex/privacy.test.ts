import { afterEach, describe, expect, test } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { insertManufacturer } from "./manufacturers/test.helper";
import { setup, signIn, type TestConvex } from "./test.helper";

afterEach(() => {
  delete process.env.SITE_URL;
});

const outreach = api.manufacturers.outreach;

// A made-up operator of Devize, as Admin → Setări saves it.
const privacy = {
  controllerName: "Devize Test SRL",
  controllerRegistration: "RO12345678, J40/1/2026",
  controllerAddress: "Str. Exemplu 1, București",
  controllerEmail: " Date@Devize.TEST ",
  privacyUrl: "",
};

/**
 * A super admin who filled in the signature but not the privacy page, and a
 * made-up Producător to thank for its norms.
 */
async function senderWithoutPrivacy(t: TestConvex) {
  process.env.SITE_URL = "https://app.devize.test/";
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  await admin.as.mutation(outreach.updateSettings, {
    firstName: "Ana",
    lastName: "Pop",
    phone: "0700 000 000",
  });
  const manufacturerId = await insertManufacturer(t, admin.userId, {
    website: "https://termotest.example",
  });
  return { admin, manufacturerId };
}

async function messageOf(t: TestConvex, messageId: Id<"outreachMessages">) {
  return await t.run(
    async (ctx) => await ctx.db.get("outreachMessages", messageId),
  );
}

describe("privacy page", () => {
  test("emails link Devize's page, which has to name its controller first", async () => {
    const t = setup();
    const { admin, manufacturerId } = await senderWithoutPrivacy(t);
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });
    const draft = await messageOf(t, messageId);
    expect(draft?.body).toContain(
      "Cum folosim datele de contact: https://app.devize.test/confidentialitate.",
    );
    expect(draft?.issues).toEqual([
      { code: "missing_controller", level: "error" },
    ]);
    await expect(
      admin.as.mutation(outreach.approve, { messageId }),
    ).rejects.toThrow(/blocked/);

    // A draft someone edited is checked again too.
    await admin.as.mutation(outreach.updateMessage, {
      messageId,
      subject: "Mulțumesc pentru normele Termo Test",
    });
    await admin.as.mutation(outreach.updatePrivacy, privacy);
    expect((await messageOf(t, messageId))?.issues).toEqual([]);
    await admin.as.mutation(outreach.approve, { messageId });
  });

  test("another privacy page needs nothing from Devize's", async () => {
    const t = setup();
    const { admin, manufacturerId } = await senderWithoutPrivacy(t);
    await admin.as.mutation(outreach.updatePrivacy, {
      controllerName: "",
      controllerRegistration: "",
      controllerAddress: "",
      controllerEmail: "",
      privacyUrl: " https://firma.example/confidentialitate ",
    });
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });

    const draft = await messageOf(t, messageId);
    expect(draft?.body).toContain(
      "Cum folosim datele de contact: https://firma.example/confidentialitate.",
    );
    expect(draft?.issues).toEqual([]);
  });

  test("anyone can read who the controller is, and nothing else", async () => {
    const t = setup();
    const { admin } = await senderWithoutPrivacy(t);
    expect(await t.query(api.privacy.controller, {})).toEqual({});

    await admin.as.mutation(outreach.updatePrivacy, privacy);
    expect(await t.query(api.privacy.controller, {})).toEqual({
      name: "Devize Test SRL",
      registration: "RO12345678, J40/1/2026",
      address: "Str. Exemplu 1, București",
      email: "date@devize.test",
    });
  });

  test("only a super admin changes it, with a real address and page", async () => {
    const t = setup();
    const { admin } = await senderWithoutPrivacy(t);
    const contractor = await signIn(t, { name: "Ion" });
    await expect(
      contractor.as.mutation(outreach.updatePrivacy, privacy),
    ).rejects.toThrow(/forbidden/);
    await expect(
      admin.as.mutation(outreach.updatePrivacy, {
        ...privacy,
        controllerEmail: "date",
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      admin.as.mutation(outreach.updatePrivacy, {
        ...privacy,
        privacyUrl: "pagina noastră",
      }),
    ).rejects.toThrow(/invalid/);
    expect(await t.query(api.privacy.controller, {})).toEqual({});
  });

  test("the signature and the privacy details are saved apart", async () => {
    const t = setup();
    const { admin } = await senderWithoutPrivacy(t);
    await admin.as.mutation(outreach.updatePrivacy, privacy);
    await admin.as.mutation(outreach.updateSettings, {
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
    });

    expect(await admin.as.query(outreach.getSettings, {})).toEqual({
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
      privacyUrl: undefined,
      privacyPage: "https://app.devize.test/confidentialitate",
      controller: {
        name: "Devize Test SRL",
        registration: "RO12345678, J40/1/2026",
        address: "Str. Exemplu 1, București",
        email: "date@devize.test",
      },
    });
  });
});

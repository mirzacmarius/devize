import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { setup, signIn, type TestConvex } from "../test.helper";
import { insertManufacturer, insertNormImport } from "./test.helper";

afterEach(() => {
  delete process.env.SITE_URL;
});

const outreach = api.manufacturers.outreach;

/**
 * A made-up producer whose norms we extracted (two articles, three variants),
 * and a complete signature for the emails.
 */
async function producerWithNorms(
  t: TestConvex,
  fields: Partial<Doc<"manufacturers">> = {},
) {
  process.env.SITE_URL = "https://app.devize.test";
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const manufacturerId = await insertManufacturer(t, admin.userId, {
    website: "https://termotest.example",
    ...fields,
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("outreachSettings", {
      firstName: "Ana",
      lastName: "Pop",
      phone: "0700 000 000",
      privacyUrl: "https://devize.example/confidentialitate",
      updatedBy: admin.userId,
    });
  });
  const normImportId = await insertNormImport(t, admin.userId, manufacturerId, {
    articles: [
      {
        baseCode: "TT-01",
        title: "Termosistem Test",
        unit: "mp",
        variantCodes: ["TT-01A01", "TT-01A02"],
        pages: [3],
      },
      {
        baseCode: "TT-02",
        title: "Termosistem Test, soclu",
        unit: "mp",
        variantCodes: ["TT-02A01"],
        pages: [4],
      },
    ],
  });
  return { admin, manufacturerId, normImportId };
}

async function messageOf(t: TestConvex, messageId: Id<"outreachMessages">) {
  return await t.run(
    async (ctx) => await ctx.db.get("outreachMessages", messageId),
  );
}

async function claimLinksOf(
  t: TestConvex,
  manufacturerId: Id<"manufacturers">,
) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query("claimLinks")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", manufacturerId),
        )
        .collect(),
  );
}

describe("draftThanks", () => {
  test("thanks the sender with a claim link for their address", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    const contractor = await signIn(t, { name: "Ion" });
    await expect(
      contractor.as.mutation(outreach.draftThanks, {
        manufacturerId,
        to: "tehnic@termotest.example",
      }),
    ).rejects.toThrow(/forbidden/);

    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: " Tehnic@TermoTest.example ",
    });
    const [link] = await claimLinksOf(t, manufacturerId);
    expect(link?.email).toBe("tehnic@termotest.example");
    const message = await messageOf(t, messageId);
    expect(message).toMatchObject({
      step: "thanks",
      status: "draft",
      to: "tehnic@termotest.example",
      edited: false,
      issues: [],
    });
    expect(message?.variant).toBeUndefined();
    expect(message?.body).toContain(
      "Le-am digitizat deja în Devize: 2 articole și 3 variante.",
    );
    expect(message?.body).toContain("vă rog să-mi confirmați");
    expect(message?.body).toContain(
      `https://app.devize.test/claim/${link?.token}`,
    );

    // Drafting again keeps the one message and the link already out.
    expect(
      await admin.as.mutation(outreach.draftThanks, {
        manufacturerId,
        to: "tehnic@termotest.example",
      }),
    ).toBe(messageId);
    expect(await claimLinksOf(t, manufacturerId)).toHaveLength(1);
  });

  test("a new recipient needs the email rendered again, with a link for them", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });

    await admin.as.mutation(outreach.updateMessage, {
      messageId,
      to: "ana@termotest.example",
    });
    expect((await messageOf(t, messageId))?.issues).toContainEqual({
      code: "claim_link_mismatch",
      level: "error",
      detail: "tehnic@termotest.example",
    });
    await expect(
      admin.as.mutation(outreach.approve, { messageId }),
    ).rejects.toThrow(/blocked/);

    await admin.as.mutation(outreach.rerender, { messageId });
    const links = await claimLinksOf(t, manufacturerId);
    const link = links.find((row) => row.email === "ana@termotest.example");
    const message = await messageOf(t, messageId);
    expect(message?.issues).toEqual([]);
    expect(message?.body).toContain(
      `cu adresa ana@termotest.example:\nhttps://app.devize.test/claim/${link?.token}`,
    );
    await admin.as.mutation(outreach.approve, { messageId });
  });

  test("sending it leaves the manufacturer's status alone", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t, {
      status: "review",
    });
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });
    await admin.as.mutation(outreach.approve, { messageId });
    await admin.as.mutation(outreach.markSent, { messageId });

    expect((await messageOf(t, messageId))?.status).toBe("sent");
    const manufacturer = await t.run(
      async (ctx) => await ctx.db.get("manufacturers", manufacturerId),
    );
    expect(manufacturer?.status).toBe("review");
  });

  test("leaves out the consent request once consent is on record", async () => {
    const t = setup();
    const { admin, manufacturerId, normImportId } = await producerWithNorms(t);
    await admin.as.mutation(api.manufacturers.normImports.recordConsent, {
      normImportId,
      note: "Emailul biroului tehnic din 21.10.2026",
    });
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });

    const message = await messageOf(t, messageId);
    expect(message?.vars.thanks?.consentRecorded).toBe(true);
    expect(message?.body).not.toContain("să-mi confirmați");
    expect(message?.issues).toEqual([]);
  });

  test("gives no link to a suppressed address or for a claimed profile", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    await admin.as.mutation(outreach.suppress, {
      value: "tehnic@termotest.example",
    });

    await expect(
      admin.as.mutation(outreach.draftThanks, {
        manufacturerId,
        to: "tehnic@termotest.example",
      }),
    ).rejects.toThrow(/suppressed/);
    await expect(
      admin.as.mutation(outreach.draftThanks, {
        manufacturerId,
        to: "tehnic",
      }),
    ).rejects.toThrow(/invalid/);
    await t.run(async (ctx) => {
      await ctx.db.patch("manufacturers", manufacturerId, {
        claimStatus: "claimed",
      });
    });
    await expect(
      admin.as.mutation(outreach.draftThanks, {
        manufacturerId,
        to: "ana@termotest.example",
      }),
    ).rejects.toThrow(/already_claimed/);
    expect(await claimLinksOf(t, manufacturerId)).toEqual([]);
  });

  test("a profile claimed after drafting blocks approval", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });
    await t.run(async (ctx) => {
      await ctx.db.patch("manufacturers", manufacturerId, {
        claimStatus: "claimed",
      });
    });

    await admin.as.mutation(outreach.rerender, { messageId });
    expect((await messageOf(t, messageId))?.issues).toContainEqual({
      code: "already_claimed",
      level: "error",
    });
    await expect(
      admin.as.mutation(outreach.approve, { messageId }),
    ).rejects.toThrow(/blocked/);
  });

  test("a new signature renders the draft again with the same link", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });

    await admin.as.mutation(outreach.updateSettings, {
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
    });
    expect((await messageOf(t, messageId))?.body).toContain(
      "Ioana Pop\nFondator, Devize · 0711 111 111",
    );
    expect(await claimLinksOf(t, manufacturerId)).toHaveLength(1);
  });
});

describe("the signer deleting their account", () => {
  async function settingsOf(t: TestConvex) {
    return await t.run(
      async (ctx) => await ctx.db.query("outreachSettings").first(),
    );
  }

  test("takes the signature out of the settings and the drafts", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    await admin.as.mutation(outreach.updateSettings, {
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
    });
    await admin.as.mutation(outreach.updatePrivacy, {
      controllerName: "Exemplu SRL",
      controllerRegistration: "",
      controllerAddress: "",
      controllerEmail: "date@exemplu.example",
      privacyUrl: "",
    });
    const rendered = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });
    const edited = await t.run(
      async (ctx) =>
        await ctx.db.insert("outreachMessages", {
          manufacturerId,
          step: "initial",
          status: "draft",
          to: "office@termotest.example",
          subject: "Normele de deviz Termo Test",
          body: "Bună ziua,\n\nScris de mână.\n\nIoana Pop\nFondator, Devize · 0711 111 111",
          vars: { firm: "Termo Test" },
          issues: [],
          edited: true,
          updatedAt: Date.now(),
        }),
    );

    await admin.as.mutation(api.users.deleteCurrentUserAccount, {});

    expect(await settingsOf(t)).toMatchObject({
      controllerName: "Exemplu SRL",
      controllerEmail: "date@exemplu.example",
    });
    const settings = await settingsOf(t);
    expect(settings?.firstName).toBeUndefined();
    expect(settings?.lastName).toBeUndefined();
    expect(settings?.phone).toBeUndefined();
    expect(settings?.signedBy).toBeUndefined();

    const thanks = await messageOf(t, rendered);
    expect(thanks?.body).not.toContain("Ioana");
    expect(thanks?.body).not.toContain("0711 111 111");
    expect(thanks?.issues.map((issue) => issue.code)).toContain("placeholder");
    // No new claim link is made in the name of someone who left.
    expect(await claimLinksOf(t, manufacturerId)).toHaveLength(1);

    const handWritten = await messageOf(t, edited);
    expect(handWritten?.body).toBe(
      "Bună ziua,\n\nScris de mână.\n\n{Prenume} {Nume}\nFondator, Devize · {telefon}",
    );
    expect(handWritten?.edited).toBe(true);
    expect(handWritten?.issues.map((issue) => issue.code)).toContain(
      "placeholder",
    );
  });

  test("another admin's account going leaves the signature", async () => {
    const t = setup();
    const { admin } = await producerWithNorms(t);
    await admin.as.mutation(outreach.updateSettings, {
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
    });
    const other = await signIn(t, { name: "Mihai", superadmin: true });
    // Saving the privacy details doesn't make the signature theirs.
    await other.as.mutation(outreach.updatePrivacy, {
      controllerName: "Exemplu SRL",
      controllerRegistration: "",
      controllerAddress: "",
      controllerEmail: "date@exemplu.example",
      privacyUrl: "",
    });
    await other.as.mutation(api.users.deleteCurrentUserAccount, {});

    expect(await settingsOf(t)).toMatchObject({
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
      signedBy: admin.userId,
    });
  });

  test("a signature saved before goes with whoever saved the settings last", async () => {
    const t = setup();
    // producerWithNorms saves its signature without a signer.
    const { admin } = await producerWithNorms(t);
    await admin.as.mutation(api.users.deleteCurrentUserAccount, {});
    expect((await settingsOf(t))?.firstName).toBeUndefined();
  });
});

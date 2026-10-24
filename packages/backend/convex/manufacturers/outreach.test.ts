import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { setup, signIn, type TestConvex } from "../test.helper";
import { draftInitialEmail } from "./drafts";
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

  test("points out printed totals only when most don't add up", async () => {
    const t = setup();
    const { admin, manufacturerId, normImportId } = await producerWithNorms(t);
    // 1.05 m² at 60 lei is 63 lei; the document printed other totals.
    const addVariant = (
      code: string,
      totalPrice: number,
      status: Doc<"importedNorms">["status"] = "approved",
    ) =>
      t.run(async (ctx) => {
        await ctx.db.insert("importedNorms", {
          normImportId,
          manufacturerId,
          baseCode: "TT-02",
          code,
          title: "Termosistem Test, soclu",
          unit: "mp",
          unitRaw: "mp",
          pages: [4],
          resources: [
            {
              kind: "material",
              name: "Placă termoizolantă Test 100 mm",
              unit: "mp",
              unitRaw: "mp",
              quantity: 1.05,
              unitPrice: 60,
            },
          ],
          totalPrice,
          checks: [],
          status,
        });
      });
    await addVariant("TT-02A01", 63);
    await addVariant("TT-02A02", 70);

    // One of two differs: possibly a misread row, not the document's doing.
    const messageId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });
    let message = await messageOf(t, messageId);
    expect(message?.vars.thanks?.totals).toBeUndefined();
    expect(message?.body).not.toContain("Am verificat și calculele");

    // A rejected row doesn't count.
    await addVariant("TT-02A03", 71);
    await addVariant("TT-02A04", 90, "rejected");
    await admin.as.mutation(outreach.rerender, { messageId });
    message = await messageOf(t, messageId);
    expect(message?.vars.thanks?.totals).toEqual({ compared: 3, differing: 2 });
    expect(message?.body).toContain(
      "Am verificat și calculele: la 2 din cele 3 variante cu prețuri unitare",
    );
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

  async function signAs(
    admin: Awaited<ReturnType<typeof signIn>>,
    firstName = "Ioana",
  ) {
    await admin.as.mutation(outreach.updateSettings, {
      firstName,
      lastName: "Pop",
      phone: "0711 111 111",
    });
  }

  test("takes the signature out of the settings and the drafts", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    await signAs(admin);
    await admin.as.mutation(outreach.updatePrivacy, {
      controllerName: "Exemplu SRL",
      controllerRegistration: "",
      controllerAddress: "",
      controllerEmail: "date@exemplu.example",
      privacyUrl: "",
    });
    const thanksId = await admin.as.mutation(outreach.draftThanks, {
      manufacturerId,
      to: "tehnic@termotest.example",
    });
    // A first email someone edited by hand.
    const initialId = await t.run(async (ctx) => {
      const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
      if (!manufacturer) {
        throw new Error("The manufacturer is missing");
      }
      return await draftInitialEmail(
        ctx,
        manufacturer,
        "office@termotest.example",
      );
    });
    if (!initialId) {
      throw new Error("No first email was drafted");
    }
    const rendered = await messageOf(t, initialId);
    expect(rendered?.body).toContain("Sunt Ioana, fondatorul Devize");
    expect(rendered?.body).toContain("Ioana Pop");
    await admin.as.mutation(outreach.updateMessage, {
      messageId: initialId,
      body: `${rendered?.body}\n\nP.S. Ne puteți suna la 0711-111-111.`,
    });

    await admin.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});

    const settings = await settingsOf(t);
    expect(settings).toMatchObject({
      controllerName: "Exemplu SRL",
      controllerEmail: "date@exemplu.example",
    });
    for (const field of [
      "firstName",
      "lastName",
      "phone",
      "signedBy",
      "forgetting",
    ] as const) {
      expect(settings?.[field]).toBeUndefined();
    }

    const thanks = await messageOf(t, thanksId);
    expect(thanks?.body).not.toContain("Ioana");
    expect(thanks?.body).not.toContain("0711 111 111");
    expect(thanks?.issues.map((issue) => issue.code)).toContain("placeholder");
    // No new claim link is made in the name of someone who left.
    expect(await claimLinksOf(t, manufacturerId)).toHaveLength(1);

    const edited = await messageOf(t, initialId);
    expect(edited?.edited).toBe(true);
    expect(edited?.body).not.toContain("Ioana");
    expect(edited?.body).not.toContain("Pop\n");
    expect(edited?.body).not.toContain("0711");
    expect(edited?.body).toContain("Sunt {Prenume}, fondatorul Devize");
    expect(edited?.body).toContain("{Prenume} {Nume}");
    expect(edited?.body).toContain("Ne puteți suna la {telefon}.");
    expect(edited?.issues.map((issue) => issue.code)).toContain("placeholder");
  });

  test("clears every draft, a page at a time", async () => {
    const t = setup();
    const { admin, manufacturerId } = await producerWithNorms(t);
    await signAs(admin);
    await t.run(async (ctx) => {
      for (let index = 0; index < 120; index++) {
        await ctx.db.insert("outreachMessages", {
          manufacturerId,
          step: "initial",
          status: "draft",
          to: "office@termotest.example",
          subject: "Normele de deviz Termo Test",
          body: `Ciorna ${index}.\n\nIoana Pop\nFondator, Devize · 0711 111 111`,
          vars: { firm: "Termo Test" },
          issues: [],
          edited: true,
          updatedAt: Date.now(),
        });
      }
    });

    await admin.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});

    const drafts = await t.run(
      async (ctx) => await ctx.db.query("outreachMessages").collect(),
    );
    expect(drafts).toHaveLength(120);
    expect(drafts.filter((draft) => draft.body.includes("Ioana"))).toEqual([]);
    expect((await settingsOf(t))?.forgetting).toBeUndefined();
  });

  test("another admin's account going leaves the signature", async () => {
    const t = setup();
    const { admin } = await producerWithNorms(t);
    await signAs(admin);
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
    await t.finishAllScheduledFunctions(() => {});

    expect(await settingsOf(t)).toMatchObject({
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
      signedBy: admin.userId,
    });
  });

  test("takes the mailbox with the signature", async () => {
    const t = setup();
    const { admin } = await producerWithNorms(t);
    await admin.as.mutation(outreach.updateSettings, {
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
      senderEmail: "ioana@devize.example",
    });
    await admin.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});
    expect((await settingsOf(t))?.senderEmail).toBeUndefined();
  });

  test("a signature saved before goes with whoever saved the settings last", async () => {
    const t = setup();
    // producerWithNorms saves its signature without a signer.
    const { admin } = await producerWithNorms(t);
    await admin.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});
    expect((await settingsOf(t))?.firstName).toBeUndefined();
  });
});

describe("the sending mailbox", () => {
  test("is saved in lower case, and kept when left out", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const sign = (senderEmail?: string) =>
      admin.as.mutation(outreach.updateSettings, {
        firstName: "Ioana",
        lastName: "Pop",
        phone: "0711 111 111",
        ...(senderEmail === undefined ? {} : { senderEmail }),
      });
    await sign(" Ioana@Devize.example ");
    expect((await admin.as.query(outreach.getSettings, {})).senderEmail).toBe(
      "ioana@devize.example",
    );
    await sign();
    expect((await admin.as.query(outreach.getSettings, {})).senderEmail).toBe(
      "ioana@devize.example",
    );
    await sign("");
    expect(
      (await admin.as.query(outreach.getSettings, {})).senderEmail,
    ).toBeUndefined();
    await expect(sign("ioana")).rejects.toThrow();
  });
});

describe("readiness", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("says what is missing before the first email, until one is sent", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    expect(await admin.as.query(outreach.readiness, {})).toEqual({
      hasApiKey: false,
      signature: false,
      controller: false,
      senderEmail: undefined,
      manufacturers: 0,
      researched: 0,
      drafts: 0,
      approved: 0,
      sent: false,
    });

    process.env.ANTHROPIC_API_KEY = "test-key";
    await admin.as.mutation(outreach.updateSettings, {
      firstName: "Ioana",
      lastName: "Pop",
      phone: "0711 111 111",
      senderEmail: "ioana@devize.example",
    });
    await admin.as.mutation(outreach.updatePrivacy, {
      controllerName: "Exemplu SRL",
      controllerRegistration: "",
      controllerAddress: "",
      controllerEmail: "date@exemplu.example",
      privacyUrl: "",
    });
    const manufacturerId = await insertManufacturer(t, admin.userId, {
      status: "review",
      normsStatus: "unknown",
      researchedAt: Date.now(),
    });
    await insertManufacturer(t, admin.userId, {
      name: "Alt Test SA",
      nameKey: "alt test",
      status: "new",
      normsStatus: "unknown",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("outreachMessages", {
        manufacturerId,
        step: "initial",
        status: "draft",
        to: "office@termotest.example",
        subject: "Normele de deviz Termo Test în Devize",
        body: "Bună ziua,",
        vars: { firm: "Termo Test" },
        issues: [],
        edited: false,
        updatedAt: Date.now(),
      });
    });
    expect(await admin.as.query(outreach.readiness, {})).toEqual({
      hasApiKey: true,
      signature: true,
      controller: true,
      senderEmail: "ioana@devize.example",
      manufacturers: 2,
      researched: 1,
      drafts: 1,
      approved: 0,
      sent: false,
    });
  });

  test("is only for super admins", async () => {
    const t = setup();
    const user = await signIn(t, { name: "Ion" });
    await expect(user.as.query(outreach.readiness, {})).rejects.toThrow();
  });
});

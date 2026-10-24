import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { setup, signIn, type TestConvex } from "../test.helper";
import { DAY_MS, ERASED } from "./lib/retention";
import { insertManufacturer, insertNormImport } from "./test.helper";

// Made-up producers and people only.

afterEach(() => {
  setSystemTime();
});

const T = Date.UTC(2026, 10, 2, 10);

function at(time: number) {
  setSystemTime(new Date(time));
}

async function runSweep(t: TestConvex) {
  await t.mutation(internal.manufacturers.retention.sweep, {});
  await t.finishAllScheduledFunctions(() => {});
}

/** A producer we wrote to that hasn't answered. */
async function contactedProducer(
  t: TestConvex,
  fields: Partial<Doc<"manufacturers">> = {},
) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const manufacturerId = await insertManufacturer(t, admin.userId, {
    website: "https://termotest.example",
    status: "contacted",
    normsStatus: "existing",
    ...fields,
  });
  return { admin, manufacturerId };
}

async function insertContact(
  t: TestConvex,
  manufacturerId: Id<"manufacturers">,
  email: string,
  fields: Partial<Doc<"manufacturerContacts">> = {},
) {
  const now = Date.now();
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("manufacturerContacts", {
        manufacturerId,
        kind: "person",
        email,
        sourceUrl: "https://termotest.example/contact",
        sourceVerified: true,
        origin: "research",
        foundAt: now,
        ...fields,
      }),
  );
}

async function insertMessage(
  t: TestConvex,
  manufacturerId: Id<"manufacturers">,
  to: string | undefined,
  fields: Partial<Doc<"outreachMessages">> = {},
) {
  const now = Date.now();
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("outreachMessages", {
        manufacturerId,
        step: "initial",
        variant: "A",
        status: "sent",
        to,
        subject: "Normele de deviz Termo Test în Devize",
        body: `Bună ziua,\n\nAm găsit adresa ${to} pe https://termotest.example/contact. Dacă nu doriți alte mesaje de la Devize, răspundeți „stop”.\n\nFondator, Devize`,
        vars: {
          firm: "Termo Test",
          address: to,
          addressSourceUrl: "https://termotest.example/contact",
        },
        issues: [],
        edited: false,
        updatedAt: now,
        toSetAt: now,
        sentAt: now,
        ...fields,
      }),
  );
}

async function rows(t: TestConvex, manufacturerId: Id<"manufacturers">) {
  return await t.run(async (ctx) => ({
    manufacturer: await ctx.db.get("manufacturers", manufacturerId),
    contacts: await ctx.db
      .query("manufacturerContacts")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .collect(),
    messages: await ctx.db
      .query("outreachMessages")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .collect(),
    erasures: await ctx.db
      .query("outreachErasures")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .collect(),
    claimLinks: await ctx.db
      .query("claimLinks")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturerId),
      )
      .collect(),
  }));
}

type FoundContact = {
  kind: Doc<"manufacturerContacts">["kind"];
  email?: string;
  role?: string;
  sourceUrl?: string;
  sourceVerified: boolean;
};

/** What a research job found, saved as research saves it. */
async function saveResearch(
  t: TestConvex,
  manufacturerId: Id<"manufacturers">,
  contacts: FoundContact[],
) {
  const jobId = await t.run(
    async (ctx) =>
      await ctx.db.insert("aiJobs", {
        kind: "manufacturer_research",
        status: "running",
        manufacturerId,
      }),
  );
  await t.mutation(internal.manufacturers.research.save, {
    jobId,
    usage: {
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      webSearches: 0,
      webFetches: 0,
    },
    report: `Contacte: ${contacts.map((contact) => contact.email).join(", ")}.`,
    sources: [{ url: "https://termotest.example/contact" }],
    findings: {
      displayName: "Termo Test",
      website: "https://termotest.example",
      brands: [],
      categories: [],
      mainProducts: [],
      retailers: [],
      contacts,
      existingNorms: [],
      technicalDocs: [],
      declaredConsumption: [],
      recommendedEmail: contacts[0]?.email,
      confidence: "high",
    },
  });
  await t.finishAllScheduledFunctions(() => {});
  return jobId;
}

const ion = "ion.popescu@termotest.example";
const office = "office@termotest.example";

describe("people at a producer that never answered", () => {
  test("go 175 days after the last email; the email stays without them", async () => {
    at(T);
    const t = setup();
    const { manufacturerId } = await contactedProducer(t, {
      notes: `Vorbit cu ${ion} la târg.`,
    });
    await insertContact(t, manufacturerId, ion);
    await insertContact(t, manufacturerId, office, { kind: "generic" });
    const messageId = await insertMessage(t, manufacturerId, ion);

    at(T + 174 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).contacts).toHaveLength(2);

    at(T + 175 * DAY_MS + 60_000);
    await runSweep(t);
    const after = await rows(t, manufacturerId);
    expect(after.contacts.map((contact) => contact.email)).toEqual([office]);
    const message = after.messages.find((row) => row._id === messageId);
    expect(message?.to).toBeUndefined();
    expect(message?.vars.address).toBeUndefined();
    expect(message?.vars.addressSourceUrl).toBe(
      "https://termotest.example/contact",
    );
    expect(message?.body).toContain(ERASED);
    expect(message?.body).not.toContain("ion.popescu");
    expect(message?.status).toBe("sent");
    expect(message?.sentAt).toBe(T);
    expect(message?.recipientErasedAt).toBeGreaterThanOrEqual(T + 175 * DAY_MS);
    expect(after.manufacturer?.notes).toBe(`Vorbit cu ${ERASED} la târg.`);
    expect(after.erasures).toHaveLength(1);
    expect(after.erasures[0]).toMatchObject({
      rule: "no_answer",
      addresses: 1,
      subjects: ["Normele de deviz Termo Test în Devize"],
    });
    expect(after.erasures[0]?.mailboxClearedAt).toBeUndefined();
    expect(JSON.stringify(after.erasures)).not.toContain("@");

    // Nothing more to do the next day.
    at(T + 176 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).erasures).toHaveLength(1);
  });

  test("an address nobody wrote to goes 25 days after research first found it", async () => {
    at(T);
    const t = setup();
    const { manufacturerId } = await contactedProducer(t, {
      status: "review",
    });
    const save = () =>
      saveResearch(t, manufacturerId, [
        {
          kind: "person",
          email: ion,
          role: "Director tehnic",
          sourceUrl: "https://termotest.example/contact",
          sourceVerified: true,
        },
        {
          kind: "generic",
          email: office,
          sourceUrl: "https://termotest.example/contact",
          sourceVerified: true,
        },
      ]);
    const firstJob = await save();
    at(T + 20 * DAY_MS);
    await save();
    let current = await rows(t, manufacturerId);
    expect(current.messages).toHaveLength(1);
    expect(current.messages[0]?.to).toBe(ion);

    at(T + 25 * DAY_MS + 60_000);
    await runSweep(t);
    current = await rows(t, manufacturerId);
    expect(current.contacts.map((contact) => contact.email)).toEqual([office]);
    // The draft nobody edited goes to the next contact.
    expect(current.messages).toHaveLength(1);
    expect(current.messages[0]?.to).toBe(office);
    expect(current.messages[0]?.status).toBe("draft");
    expect(current.messages[0]?.body).not.toContain("ion.popescu");
    expect(current.erasures[0]).toMatchObject({
      rule: "not_written",
      addresses: 1,
      subjects: [],
    });
    expect(current.erasures[0]?.mailboxClearedAt).toBeDefined();
    // Both reports named him; the jobs stay for their cost.
    const jobs = await t.run(
      async (ctx) =>
        await ctx.db
          .query("aiJobs")
          .withIndex("by_manufacturerId", (q) =>
            q.eq("manufacturerId", manufacturerId),
          )
          .collect(),
    );
    expect(jobs).toHaveLength(2);
    expect(jobs.every((job) => job.result === undefined)).toBe(true);
    expect(jobs.find((job) => job._id === firstJob)?.status).toBe("succeeded");
  });

  test("an edited draft waits for a new recipient", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t, {
      status: "review",
    });
    await insertContact(t, manufacturerId, ion);
    const messageId = await insertMessage(t, manufacturerId, ion, {
      status: "draft",
      edited: true,
      sentAt: undefined,
    });

    at(T + 26 * DAY_MS);
    await runSweep(t);
    const message = (await rows(t, manufacturerId)).messages[0];
    expect(message?.to).toBeUndefined();
    expect(message?.body).toContain("{adresa}");
    expect(message?.issues.map((issue) => issue.code)).toContain(
      "recipient_erased",
    );
    expect(message?.issues.map((issue) => issue.code)).toContain("placeholder");
    await expect(
      admin.as.mutation(api.manufacturers.outreach.approve, { messageId }),
    ).rejects.toThrow(/blocked/);
  });

  test("unused claim links for the address go", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t);
    await insertMessage(t, manufacturerId, ion);
    await t.run(async (ctx) => {
      for (const email of [ion, "maria@altafirma.example"]) {
        await ctx.db.insert("claimLinks", {
          manufacturerId,
          email,
          token: `token-${email}`,
          expiresAt: T + 30 * DAY_MS,
          createdBy: admin.userId,
        });
      }
    });
    at(T + 176 * DAY_MS);
    await runSweep(t);
    expect(
      (await rows(t, manufacturerId)).claimLinks.map((link) => link.email),
    ).toEqual(["maria@altafirma.example"]);
  });
});

describe("people at a producer in touch", () => {
  test("stay after an answer, even when the status goes back", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t);
    await insertContact(t, manufacturerId, ion);
    await insertMessage(t, manufacturerId, ion);
    for (const status of ["replied", "contacted"] as const) {
      await admin.as.mutation(api.manufacturers.admin.update, {
        manufacturerId,
        status,
      });
    }
    at(T + 400 * DAY_MS);
    await runSweep(t);
    const after = await rows(t, manufacturerId);
    expect(after.manufacturer?.answeredAt).toBeGreaterThanOrEqual(T);
    expect(after.manufacturer?.answeredAt).toBeLessThan(T + DAY_MS);
    expect(after.contacts).toHaveLength(1);
    expect(after.messages[0]?.to).toBe(ion);
    expect(after.erasures).toHaveLength(0);
  });
});

describe("people at a producer in touch, after 2 years", () => {
  test("go 2 years after the last answer; the email stays without them", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t);
    await insertContact(t, manufacturerId, ion);
    await insertContact(t, manufacturerId, office, { kind: "generic" });
    await insertMessage(t, manufacturerId, ion);
    await admin.as.mutation(api.manufacturers.admin.update, {
      manufacturerId,
      status: "replied",
    });

    at(T + 724 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).contacts).toHaveLength(2);

    at(T + 726 * DAY_MS);
    await runSweep(t);
    const after = await rows(t, manufacturerId);
    expect(after.contacts.map((contact) => contact.email)).toEqual([office]);
    expect(after.messages[0]?.to).toBeUndefined();
    expect(after.messages[0]?.body).toContain(ERASED);
    expect(after.erasures).toMatchObject([{ rule: "inactive", addresses: 1 }]);
  });

  test("„Încă discutăm” and new norms start the 2 years again", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t, {
      status: "replied",
      answeredAt: T,
    });
    await insertContact(t, manufacturerId, ion);

    // Saving the details with the same status isn't an answer.
    at(T + 600 * DAY_MS);
    await admin.as.mutation(api.manufacturers.admin.update, {
      manufacturerId,
      status: "replied",
      notes: "Revin în ianuarie.",
    });
    expect((await rows(t, manufacturerId)).manufacturer?.lastAnsweredAt).toBe(
      undefined,
    );
    at(T + 700 * DAY_MS);
    await admin.as.mutation(api.manufacturers.admin.stillInTouch, {
      manufacturerId,
    });
    at(T + 726 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).contacts).toHaveLength(1);

    at(T + 1400 * DAY_MS);
    await insertNormImport(t, admin.userId, manufacturerId);
    at(T + 1426 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).contacts).toHaveLength(1);

    at(T + 2126 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).contacts).toHaveLength(0);
  });

  test("a firm in touch from before starts its 2 years at the next run", async () => {
    at(T);
    const t = setup();
    // Claimed without ever writing to us, before ADR 0049.
    const { manufacturerId } = await contactedProducer(t, {
      claimStatus: "claimed",
    });
    await insertContact(t, manufacturerId, ion);
    await runSweep(t);
    const lastAnsweredAt = (await rows(t, manufacturerId)).manufacturer
      ?.lastAnsweredAt;
    expect(lastAnsweredAt).toBeGreaterThanOrEqual(T);
    expect(lastAnsweredAt).toBeLessThan(T + DAY_MS);
    at(T + 726 * DAY_MS);
    await runSweep(t);
    expect((await rows(t, manufacturerId)).contacts).toHaveLength(0);
  });

  test("„Încă discutăm” is for a firm in touch, and for super admins", async () => {
    const t = setup();
    const { manufacturerId } = await contactedProducer(t);
    const admin = await signIn(t, { name: "Ana", superadmin: true });
    await expect(
      admin.as.mutation(api.manufacturers.admin.stillInTouch, {
        manufacturerId,
      }),
    ).rejects.toThrow();
    const user = await signIn(t, { name: "Ion" });
    await expect(
      user.as.mutation(api.manufacturers.admin.stillInTouch, {
        manufacturerId,
      }),
    ).rejects.toThrow();
  });
});

describe("stop", () => {
  test("erases the address at every producer at once and keeps it on the list", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t, {
      status: "norms_received",
      normsStatus: "received",
    });
    const other = await insertManufacturer(t, admin.userId, {
      name: "Grup Test SRL",
      nameKey: "grup test",
      status: "contacted",
      normsStatus: "existing",
    });
    await insertContact(t, manufacturerId, ion);
    await insertContact(t, other, ion, { kind: "generic" });
    const approved = await insertMessage(t, other, ion, {
      status: "approved",
      sentAt: undefined,
      approvedAt: T,
      approvedBy: admin.userId,
    });

    await admin.as.mutation(api.manufacturers.outreach.suppress, {
      value: ion,
      reason: "A cerut să nu-i mai scriem",
    });
    await t.finishAllScheduledFunctions(() => {});

    for (const id of [manufacturerId, other]) {
      const after = await rows(t, id);
      expect(after.contacts).toHaveLength(0);
      expect(after.erasures.map((row) => row.rule)).toEqual(["opt_out"]);
    }
    const message = (await rows(t, other)).messages[0];
    expect(message?._id).toBe(approved);
    expect(message?.status).toBe("rejected");
    expect(message?.to).toBeUndefined();
    const list = await admin.as.query(
      api.manufacturers.outreach.listSuppressed,
      {},
    );
    expect(list.map((row) => row.value)).toEqual([ion]);

    // Research doesn't write him down again.
    await saveResearch(t, other, [
      { kind: "person", email: ion, sourceVerified: true },
    ]);
    expect((await rows(t, other)).contacts).toHaveLength(0);
    const reports = await t.run(
      async (ctx) =>
        await ctx.db
          .query("aiJobs")
          .withIndex("by_manufacturerId", (q) => q.eq("manufacturerId", other))
          .collect(),
    );
    expect(JSON.stringify(reports)).not.toContain(ion);

    const pending = await admin.as.query(
      api.manufacturers.retention.mailboxPending,
      {},
    );
    expect(pending.map((row) => row.manufacturerName)).toEqual([
      "Grup Test SRL",
    ]);
    await admin.as.mutation(api.manufacturers.retention.markMailboxCleared, {
      erasureId: pending[0]!._id,
    });
    expect(
      await admin.as.query(api.manufacturers.retention.mailboxPending, {}),
    ).toEqual([]);
  });

  test("a whole domain erases its people and keeps its company addresses", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t);
    await insertContact(t, manufacturerId, ion);
    await insertContact(t, manufacturerId, office, { kind: "generic" });
    await admin.as.mutation(api.manufacturers.outreach.suppress, {
      value: "@termotest.example",
      manufacturerId,
    });
    await t.finishAllScheduledFunctions(() => {});
    const after = await rows(t, manufacturerId);
    expect(after.manufacturer?.status).toBe("excluded");
    expect(after.contacts.map((contact) => contact.email)).toEqual([office]);
  });
});

describe("research reports", () => {
  test("go 25 days after research, and the job keeps its cost", async () => {
    at(T);
    const t = setup();
    const { manufacturerId } = await contactedProducer(t, {
      answeredAt: T,
    });
    const jobId = await t.run(
      async (ctx) =>
        await ctx.db.insert("aiJobs", {
          kind: "manufacturer_research",
          status: "succeeded",
          manufacturerId,
          costUsd: 0.8,
          finishedAt: T,
          result: { report: "Raport", sources: [] },
        }),
    );
    at(T + 10 * DAY_MS);
    await runSweep(t);
    expect(
      (await t.run(async (ctx) => await ctx.db.get("aiJobs", jobId)))?.result,
    ).toBeDefined();
    expect((await rows(t, manufacturerId)).manufacturer?.reportsUntil).toBe(
      T + 25 * DAY_MS,
    );

    at(T + 25 * DAY_MS);
    await runSweep(t);
    const job = await t.run(async (ctx) => await ctx.db.get("aiJobs", jobId));
    expect(job?.result).toBeUndefined();
    expect(job?.costUsd).toBe(0.8);
    expect((await rows(t, manufacturerId)).manufacturer?.reportsUntil).toBe(0);
  });

  test("go with the producer when it is deleted", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t);
    await insertMessage(t, manufacturerId, ion);
    const jobId = await t.run(async (ctx) => {
      await ctx.db.insert("outreachErasures", {
        manufacturerId,
        rule: "no_answer",
        erasedAt: T,
        addresses: 1,
        subjects: [],
      });
      return await ctx.db.insert("aiJobs", {
        kind: "manufacturer_research",
        status: "succeeded",
        manufacturerId,
        costUsd: 0.8,
        finishedAt: T,
        result: { report: `Contact: ${ion}`, sources: [] },
      });
    });
    await admin.as.mutation(api.manufacturers.admin.remove, { manufacturerId });
    const job = await t.run(async (ctx) => await ctx.db.get("aiJobs", jobId));
    expect(job?.result).toBeUndefined();
    expect(job?.costUsd).toBe(0.8);
    expect((await rows(t, manufacturerId)).erasures).toHaveLength(0);
  });
});

describe("access", () => {
  test("only super admins see and clear the mailbox list", async () => {
    const t = setup();
    const member = await signIn(t, { name: "Membru" });
    await expect(
      member.as.query(api.manufacturers.retention.mailboxPending, {}),
    ).rejects.toThrow();
    const { manufacturerId } = await contactedProducer(t);
    const erasureId = await t.run(
      async (ctx) =>
        await ctx.db.insert("outreachErasures", {
          manufacturerId,
          rule: "no_answer",
          erasedAt: T,
          addresses: 1,
          subjects: ["Normele de deviz Termo Test în Devize"],
        }),
    );
    await expect(
      member.as.mutation(api.manufacturers.retention.markMailboxCleared, {
        erasureId,
      }),
    ).rejects.toThrow();
  });
});

describe("the admin page", () => {
  test("shows when each person's address goes", async () => {
    at(T);
    const t = setup();
    const { admin, manufacturerId } = await contactedProducer(t);
    await insertContact(t, manufacturerId, ion);
    await insertContact(t, manufacturerId, office, { kind: "generic" });
    await insertMessage(t, manufacturerId, ion);
    const data = await admin.as.query(api.manufacturers.admin.get, {
      manufacturerId,
    });
    const byEmail = Object.fromEntries(
      (data?.contacts ?? []).map((contact) => [
        contact.email,
        contact.retention,
      ]),
    );
    expect(byEmail[ion]).toEqual({ at: T + 175 * DAY_MS, rule: "no_answer" });
    expect(byEmail[office]).toBeNull();
  });
});

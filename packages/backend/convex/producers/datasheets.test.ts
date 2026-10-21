import { describe, expect, setSystemTime, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { defaultModel } from "../ai/models";
import { firmOwner, setup, type TestConvex } from "../test.helper";
import type { DatasheetNorm } from "./lib/datasheet";
import { claimedProducer } from "./test.helper";

// The tests never reach the Claude API: without a key, a reading fails
// before its first request. What the model reads is played here through the
// reading's internal steps, from a made-up data sheet.
delete process.env.ANTHROPIC_API_KEY;

type Producer = Awaited<ReturnType<typeof claimedProducer>>;
type Uploader = { organizationId: Id<"organizations">; userId: Id<"users"> };

const usage = {
  inputTokens: 1000,
  outputTokens: 2000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  webSearches: 0,
  webFetches: 0,
};

function producerFirm(producer: Producer): Uploader {
  return {
    organizationId: producer.organizationId,
    userId: producer.ana.userId,
  };
}

/** One of the firm's files: a made-up data sheet, unless it says otherwise. */
function uploadFile(
  t: TestConvex,
  owner: Uploader,
  fields: { name?: string; contentType?: string; size?: number } = {},
) {
  return t.run(async (ctx) => {
    const contentType = fields.contentType ?? "application/pdf";
    const storageId = await ctx.storage.store(
      new Blob(["%PDF-1.4 Fișă tehnică Adeziv Test Flex"], {
        type: contentType,
      }),
    );
    return await ctx.db.insert("files", {
      organizationId: owner.organizationId,
      storageId,
      name: fields.name ?? "fisa-tehnica-adeziv-test.pdf",
      contentType,
      size: fields.size ?? 2048,
      purpose: "datasheet",
      uploadedBy: owner.userId,
    });
  });
}

/** A reading whose job is queued, as `start` leaves it, but never run. */
async function queuedReading(
  t: TestConvex,
  producer: Producer,
  fileId: Id<"files">,
) {
  return await t.run(async (ctx) => {
    const aiJobId = await ctx.db.insert("aiJobs", {
      kind: "datasheet_norm",
      status: "queued",
      model: defaultModel,
      organizationId: producer.organizationId,
      manufacturerId: producer.manufacturerId,
      createdBy: producer.ana.userId,
    });
    return await ctx.db.insert("datasheetImports", {
      manufacturerId: producer.manufacturerId,
      organizationId: producer.organizationId,
      fileId,
      aiJobId,
      status: "reading",
      createdBy: producer.ana.userId,
    });
  });
}

// What the model read from the made-up sheet, once checked. The producer's
// published norm already has its code.
const draft: DatasheetNorm = {
  product: { name: "Adeziv Test Flex", packaging: "sac 25 kg" },
  norm: {
    code: "TT-01A01",
    title: "Lipirea plăcilor termoizolante cu Adeziv Test Flex",
    unit: "mp",
    category: "Termoizolații",
    includes: "Amorsarea suportului și lipirea plăcilor.",
  },
  resources: [
    {
      kind: "material",
      name: "Adeziv Test Flex",
      unit: "kg",
      quantity: 4.5,
      note: "Fișa tehnică, p. 2: „Consum: 4–5 kg/m²”. media intervalului 4–5 kg/mp",
    },
    {
      kind: "labor",
      name: "Montator termosisteme",
      unit: "ora",
      quantity: 0.35,
      note: "Estimare Devize AI: estimare uzuală, fișa nu dă manopera",
    },
  ],
  sourcePages: [1, 2],
  conditions: [{ text: "Temperatura aerului între +5 °C și +30 °C.", page: 2 }],
  checks: ["Manopera e estimată."],
};

/** A producer's draft norm, read from a made-up data sheet. */
async function readDraft(t: TestConvex) {
  const producer = await claimedProducer(t);
  const fileId = await uploadFile(t, producerFirm(producer));
  const importId = await queuedReading(t, producer, fileId);
  const state = await t.mutation(internal.producers.datasheets.begin, {
    importId,
  });
  if (!state) {
    throw new Error("missing reading");
  }
  await t.mutation(internal.producers.datasheets.save, {
    importId,
    jobId: state.jobId,
    usage,
    draft,
  });
  const [reading] = await producer.ana.as.query(api.producers.datasheets.list, {
    manufacturerId: producer.manufacturerId,
  });
  const normId = reading?.norm?._id;
  if (!normId) {
    throw new Error("missing draft");
  }
  return { ...producer, fileId, importId, jobId: state.jobId, normId };
}

describe("a norm read from a data sheet", () => {
  test("only a producer's own firm can have one read", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const { ana, organizationId } = producer;
    const mihai = await firmOwner(t, "Mihai");

    // A contractor's firm writes no producer's norms.
    await expect(
      mihai.as.mutation(api.producers.datasheets.start, {
        organizationId: mihai.organizationId,
        fileId: await uploadFile(t, mihai),
      }),
    ).rejects.toThrow(/forbidden/);
    // Nor starts a reading for the producer, and the producer can't read
    // another firm's file.
    const fileId = await uploadFile(t, producerFirm(producer));
    await expect(
      mihai.as.mutation(api.producers.datasheets.start, {
        organizationId,
        fileId,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      ana.as.mutation(api.producers.datasheets.start, {
        organizationId,
        fileId: await uploadFile(t, mihai),
      }),
    ).rejects.toThrow(/not_found/);

    // A PDF of at most 20 MB, with a few words about the work.
    await expect(
      ana.as.mutation(api.producers.datasheets.start, {
        organizationId,
        fileId: await uploadFile(t, producerFirm(producer), {
          name: "fisa-tehnica.docx",
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      }),
    ).rejects.toThrow(/fileType/);
    await expect(
      ana.as.mutation(api.producers.datasheets.start, {
        organizationId,
        fileId: await uploadFile(t, producerFirm(producer), {
          size: 21 * 1024 * 1024,
        }),
      }),
    ).rejects.toThrow(/size/);
    await expect(
      ana.as.mutation(api.producers.datasheets.start, {
        organizationId,
        fileId,
        work: "x".repeat(501),
      }),
    ).rejects.toThrow(/length/);
    expect(
      await t.run(async (ctx) => ctx.db.query("datasheetImports").collect()),
    ).toEqual([]);
  });

  test("runs in the background, and fails without the API key", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const { ana, organizationId, manufacturerId } = producer;
    const importId = await ana.as.mutation(api.producers.datasheets.start, {
      organizationId,
      fileId: await uploadFile(t, producerFirm(producer)),
      work: "  Lipirea plăcilor termoizolante pe fațadă ",
    });
    await t.finishAllScheduledFunctions(() => {});

    const readings = await ana.as.query(api.producers.datasheets.list, {
      manufacturerId,
    });
    expect(readings).toMatchObject([
      {
        _id: importId,
        fileName: "fisa-tehnica-adeziv-test.pdf",
        work: "Lipirea plăcilor termoizolante pe fațadă",
        status: "failed",
        error: "missing_api_key",
        norm: null,
      },
    ]);
    const jobs = await t.run(async (ctx) => ctx.db.query("aiJobs").collect());
    expect(jobs).toMatchObject([
      {
        kind: "datasheet_norm",
        status: "failed",
        error: "missing_api_key",
        organizationId,
        manufacturerId,
      },
    ]);

    // Devize staff see the readings too; a contractor doesn't.
    expect(
      await producer.admin.as.query(api.producers.datasheets.list, {
        manufacturerId,
      }),
    ).toHaveLength(1);
    const mihai = await firmOwner(t, "Mihai");
    expect(
      await mihai.as.query(api.producers.datasheets.list, { manufacturerId }),
    ).toEqual([]);
  });

  test("becomes the producer's draft, with where each figure comes from", async () => {
    const t = setup();
    const { ana, admin, manufacturerId, normId, jobId, importId } =
      await readDraft(t);

    const norm = await ana.as.query(api.catalog.norms.get, { normId });
    expect(norm).toMatchObject({
      source: "manufacturer",
      manufacturerId,
      // The producer's published norm already has the code the AI proposed.
      code: "TT-01A01-2",
      title: "Lipirea plăcilor termoizolante cu Adeziv Test Flex",
      unit: "mp",
      status: "draft",
      sourcePages: [1, 2],
      canEdit: true,
    });
    expect(norm.resources.map((row) => [row.name, row.note])).toEqual(
      draft.resources.map((row) => [row.name, row.note]),
    );
    expect(norm.datasheet).toMatchObject({
      fileName: "fisa-tehnica-adeziv-test.pdf",
      product: { name: "Adeziv Test Flex", packaging: "sac 25 kg" },
      conditions: draft.conditions,
      checks: draft.checks,
    });
    expect(norm.datasheet?.url).toEqual(expect.any(String));

    // The profile lists it with the producer's other drafts.
    const profile = await ana.as.query(api.producers.profiles.get, {
      manufacturerId,
    });
    expect(profile?.drafts).toMatchObject([
      { _id: normId, status: "draft", fromDatasheet: true },
    ]);
    const [reading] = await ana.as.query(api.producers.datasheets.list, {
      manufacturerId,
    });
    expect(reading).toMatchObject({
      status: "done",
      norm: { _id: normId, code: "TT-01A01-2", status: "draft" },
    });
    const job = await t.run(async (ctx) => ctx.db.get("aiJobs", jobId));
    expect(job).toMatchObject({ status: "succeeded", usage });

    // A late second answer for the same job saves nothing.
    await t.mutation(internal.producers.datasheets.save, {
      importId,
      jobId,
      usage,
      draft,
    });
    const drafts = await t.run(async (ctx) =>
      ctx.db
        .query("norms")
        .filter((q) => q.eq(q.field("datasheetImportId"), importId))
        .collect(),
    );
    expect(drafts).toHaveLength(1);

    // The producer sends it for review; Devize publishes it.
    await ana.as.mutation(api.catalog.norms.submit, { normId });
    await admin.as.mutation(api.catalog.norms.publish, { normId });
    expect((await ana.as.query(api.catalog.norms.get, { normId })).status).toBe(
      "published",
    );
  });

  test("the data sheet stays with the producer and Devize staff", async () => {
    const t = setup();
    const { ana, admin, normId } = await readDraft(t);
    await ana.as.mutation(api.catalog.norms.submit, { normId });
    await admin.as.mutation(api.catalog.norms.publish, { normId });

    for (const insider of [ana, admin]) {
      const norm = await insider.as.query(api.catalog.norms.get, { normId });
      expect(norm.datasheet?.fileName).toBe("fisa-tehnica-adeziv-test.pdf");
    }
    // A contractor sees the published norm, and its notes, but not the file;
    // nor does the firm's own copy of it.
    const mihai = await firmOwner(t, "Mihai");
    const seen = await mihai.as.query(api.catalog.norms.get, { normId });
    expect(seen.datasheet).toBeNull();
    expect(seen.resources[0]?.note).toBe(draft.resources[0]?.note);
    const copyId = await mihai.as.mutation(
      api.catalog.norms.copyToOrganization,
      {
        normId,
        organizationId: mihai.organizationId,
      },
    );
    const copy = await mihai.as.query(api.catalog.norms.get, {
      normId: copyId,
    });
    expect(copy.datasheetImportId).toBeUndefined();
    expect(copy.datasheet).toBeNull();
  });

  test("a failed one is read again, or let go with its file", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const { ana, organizationId, manufacturerId } = producer;
    const fileId = await uploadFile(t, producerFirm(producer));

    // While it's being read, it can't be read again or let go.
    const queued = await queuedReading(t, producer, fileId);
    await expect(
      ana.as.mutation(api.producers.datasheets.retry, { importId: queued }),
    ).rejects.toThrow(/in_use/);
    await expect(
      ana.as.mutation(api.producers.datasheets.dismiss, { importId: queued }),
    ).rejects.toThrow(/in_use/);

    const importId = await ana.as.mutation(api.producers.datasheets.start, {
      organizationId,
      fileId,
    });
    await t.finishAllScheduledFunctions(() => {});
    const failedJob = (
      await t.run(async (ctx) => ctx.db.get("datasheetImports", importId))
    )?.aiJobId;

    // Another firm can do neither.
    const mihai = await firmOwner(t, "Mihai");
    await expect(
      mihai.as.mutation(api.producers.datasheets.retry, { importId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      mihai.as.mutation(api.producers.datasheets.dismiss, { importId }),
    ).rejects.toThrow(/not_found/);

    // Reading it again takes a new job, which fails the same way here.
    await ana.as.mutation(api.producers.datasheets.retry, { importId });
    await t.finishAllScheduledFunctions(() => {});
    const row = await t.run(async (ctx) =>
      ctx.db.get("datasheetImports", importId),
    );
    expect(row?.aiJobId).not.toBe(failedJob);
    expect(row).toMatchObject({ status: "failed", error: "missing_api_key" });

    // Letting it go keeps the file while the other reading uses it.
    await ana.as.mutation(api.producers.datasheets.dismiss, { importId });
    expect(await t.run(async (ctx) => ctx.db.get("files", fileId))).not.toBe(
      null,
    );
    const other = await t.run(async (ctx) =>
      ctx.db.get("datasheetImports", queued),
    );
    if (!other) {
      throw new Error("missing reading");
    }
    await t.mutation(internal.ai.jobs.expire, { jobId: other.aiJobId });
    await ana.as.mutation(api.producers.datasheets.dismiss, {
      importId: queued,
    });
    expect(
      await ana.as.query(api.producers.datasheets.list, { manufacturerId }),
    ).toEqual([]);
    const left = await t.run(async (ctx) => ({
      file: await ctx.db.get("files", fileId),
      readings: await ctx.db.query("datasheetImports").collect(),
    }));
    expect(left).toEqual({ file: null, readings: [] });
  });

  test("one whose job died counts as failed", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const fileId = await uploadFile(t, producerFirm(producer));
    const importId = await queuedReading(t, producer, fileId);
    const row = await t.run(async (ctx) =>
      ctx.db.get("datasheetImports", importId),
    );
    if (!row) {
      throw new Error("missing reading");
    }
    // The watchdog fails a job that never ended; the reading still says
    // it's being read.
    await t.mutation(internal.ai.jobs.expire, { jobId: row.aiJobId });

    const [reading] = await producer.ana.as.query(
      api.producers.datasheets.list,
      { manufacturerId: producer.manufacturerId },
    );
    expect(reading).toMatchObject({ status: "failed", error: "timeout" });
    // And an answer that comes after that saves nothing.
    await t.mutation(internal.producers.datasheets.save, {
      importId,
      jobId: row.aiJobId,
      usage,
      draft,
    });
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("norms")
          .filter((q) => q.eq(q.field("datasheetImportId"), importId))
          .collect(),
      ),
    ).toEqual([]);
  });

  test("a firm has at most ten read an hour", async () => {
    const t = setup();
    const producer = await claimedProducer(t);
    const fileId = await uploadFile(t, producerFirm(producer));
    for (let i = 0; i < 10; i++) {
      await queuedReading(t, producer, fileId);
    }
    const start = () =>
      producer.ana.as.mutation(api.producers.datasheets.start, {
        organizationId: producer.organizationId,
        fileId,
      });
    await expect(start()).rejects.toThrow(/rate_limited/);

    setSystemTime(new Date(Date.now() + 60 * 60 * 1000 + 1000));
    try {
      await start();
    } finally {
      setSystemTime();
    }
    await t.finishAllScheduledFunctions(() => {});
  });

  test("a firm's readings go with it", async () => {
    const t = setup();
    const { organizationId, importId } = await readDraft(t);
    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});
    const left = await t.run(async (ctx) => ({
      reading: await ctx.db.get("datasheetImports", importId),
      files: await ctx.db.query("files").collect(),
    }));
    expect(left).toEqual({ reading: null, files: [] });
  });
});

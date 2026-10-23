import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { defaultModel } from "../ai/models";
import { firmOwner, setup, type TestConvex } from "../test.helper";
import type { AiNorm } from "./lib/aiNorm";

// The tests never reach the Claude API: without a key, a request fails before
// its first call. What the model writes is played here through the request's
// internal steps, from a made-up norm.
delete process.env.ANTHROPIC_API_KEY;

type Firm = Awaited<ReturnType<typeof firmOwner>>;

const usage = {
  inputTokens: 800,
  outputTokens: 1500,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  webSearches: 0,
  webFetches: 0,
};

const description =
  "Hidroizolație la terasă cu membrană bituminoasă autoadezivă, două straturi, pe șapă existentă";

// What the model wrote, once checked.
const draft: AiNorm = {
  norm: {
    code: "HID-TER-01",
    title: "Hidroizolație la terase cu membrană bituminoasă, în două straturi",
    unit: "mp",
    category: "Hidroizolații",
    includes: "Amorsarea suportului și lipirea celor două straturi.",
  },
  resources: [
    {
      kind: "material",
      name: "Membrană bituminoasă autoadezivă 4 mm",
      unit: "mp",
      quantity: 2.3,
      referencePrice: 24.5,
      note: "Devize AI: două straturi cu suprapuneri. Prețul e orientativ, de verificat.",
    },
    {
      kind: "labor",
      name: "Izolator",
      unit: "ora",
      quantity: 0.6,
      note: "Devize AI: consum uzual",
    },
  ],
  assumptions: ["Suportul e o șapă existentă, curată și uscată."],
  checks: ["Prețul membranei e orientativ."],
};

async function newEstimate(firm: Firm, title = "Bloc A, terasă") {
  return await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title,
    county: "Cluj",
  });
}

/** A request whose job is queued, as `start` leaves it, but never run. */
async function queuedRequest(
  t: TestConvex,
  firm: Firm,
  estimateId?: Id<"estimates">,
) {
  return await t.run(async (ctx) => {
    const aiJobId = await ctx.db.insert("aiJobs", {
      kind: "norm_draft",
      status: "queued",
      model: defaultModel,
      organizationId: firm.organizationId,
      createdBy: firm.userId,
    });
    return await ctx.db.insert("normRequests", {
      organizationId: firm.organizationId,
      estimateId,
      description,
      aiJobId,
      status: "writing",
      createdBy: firm.userId,
    });
  });
}

/** A firm's draft norm, written from the made-up answer. */
async function writtenDraft(t: TestConvex, firm: Firm) {
  const estimateId = await newEstimate(firm);
  const requestId = await queuedRequest(t, firm, estimateId);
  const state = await t.mutation(internal.catalog.aiNorms.begin, {
    requestId,
  });
  if (!state) {
    throw new Error("missing request");
  }
  await t.mutation(internal.catalog.aiNorms.save, {
    requestId,
    jobId: state.jobId,
    usage,
    draft,
  });
  const request = await firm.as.query(api.catalog.aiNorms.get, { requestId });
  const normId = request.norm?._id;
  if (!normId) {
    throw new Error("missing draft");
  }
  return { estimateId, requestId, jobId: state.jobId, normId, state };
}

describe("a norm written by Devize AI from a description", () => {
  test("is asked for by a member, with a few sentences about the work", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    const estimateId = await newEstimate(ana);

    // A firm one isn't a member of is reported as missing.
    await expect(
      bogdan.as.mutation(api.catalog.aiNorms.start, {
        organizationId: ana.organizationId,
        description,
      }),
    ).rejects.toThrow(/not_found/);
    // Another firm's Deviz gives no context.
    await expect(
      bogdan.as.mutation(api.catalog.aiNorms.start, {
        organizationId: bogdan.organizationId,
        description,
        estimateId,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      ana.as.mutation(api.catalog.aiNorms.start, {
        organizationId: ana.organizationId,
        description: "   ",
      }),
    ).rejects.toThrow(/description/);
    await expect(
      ana.as.mutation(api.catalog.aiNorms.start, {
        organizationId: ana.organizationId,
        description: "x".repeat(601),
      }),
    ).rejects.toThrow(/length/);
    expect(
      await t.run(async (ctx) => ctx.db.query("normRequests").collect()),
    ).toEqual([]);
  });

  test("runs in the background, and fails without the API key", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const estimateId = await newEstimate(ana);
    const requestId = await ana.as.mutation(api.catalog.aiNorms.start, {
      organizationId: ana.organizationId,
      description: `  ${description}\n\n `,
      estimateId,
    });
    await t.finishAllScheduledFunctions(() => {});

    expect(
      await ana.as.query(api.catalog.aiNorms.get, { requestId }),
    ).toMatchObject({
      _id: requestId,
      description,
      status: "failed",
      error: "missing_api_key",
      assumptions: [],
      checks: [],
      norm: null,
    });
    const jobs = await t.run(async (ctx) => ctx.db.query("aiJobs").collect());
    expect(jobs).toMatchObject([
      {
        kind: "norm_draft",
        status: "failed",
        error: "missing_api_key",
        organizationId: ana.organizationId,
        createdBy: ana.userId,
      },
    ]);
    // Another firm doesn't see the request.
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.query(api.catalog.aiNorms.get, { requestId }),
    ).rejects.toThrow(/not_found/);
  });

  test("gives the model the firm's rates and the Deviz for context", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    await ana.as.mutation(api.accounts.rates.set, {
      organizationId: ana.organizationId,
      kind: "labor",
      name: "Izolator",
      unit: "ora",
      price: 45,
    });
    const estimateId = await newEstimate(ana);
    const requestId = await queuedRequest(t, ana, estimateId);
    const state = await t.mutation(internal.catalog.aiNorms.begin, {
      requestId,
    });
    expect(state).toMatchObject({
      model: defaultModel,
      firm: "Ana Construct SRL",
      description,
      estimate: { title: "Bloc A, terasă", county: "Cluj" },
      rates: [{ kind: "labor", name: "Izolator", unit: "ora" }],
    });
    // A job started once isn't started again.
    expect(
      await t.mutation(internal.catalog.aiNorms.begin, { requestId }),
    ).toBeNull();
  });

  test("becomes the firm's draft, with what the model assumed and what to check", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const { requestId, normId, jobId } = await writtenDraft(t, ana);

    expect(
      await ana.as.query(api.catalog.aiNorms.get, { requestId }),
    ).toMatchObject({
      status: "done",
      assumptions: draft.assumptions,
      checks: draft.checks,
      norm: {
        _id: normId,
        code: "HID-TER-01",
        unit: "mp",
        status: "draft",
      },
    });
    const norm = await ana.as.query(api.catalog.norms.get, { normId });
    expect(norm).toMatchObject({
      source: "organization",
      visibility: "private",
      organizationId: ana.organizationId,
      status: "draft",
      category: "Hidroizolații",
      createdBy: ana.userId,
      aiRequest: {
        description,
        assumptions: draft.assumptions,
        checks: draft.checks,
      },
    });
    expect(norm.resources.map((row) => [row.name, row.referencePrice])).toEqual(
      [
        ["Membrană bituminoasă autoadezivă 4 mm", 24.5],
        ["Izolator", undefined],
      ],
    );
    expect(norm.resources[0]?.note).toContain("Prețul e orientativ");
    const job = await t.run(async (ctx) => ctx.db.get("aiJobs", jobId));
    expect(job).toMatchObject({
      status: "succeeded",
      usage,
      result: { normId },
    });

    // A draft isn't found by the search until it is published.
    expect(
      await ana.as.query(api.catalog.norms.search, {
        organizationId: ana.organizationId,
        text: "hidroizolatie",
      }),
    ).toEqual([]);
  });

  test("takes the next free code when the firm already uses the model's", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    await ana.as.mutation(api.catalog.norms.create, {
      source: "organization",
      organizationId: ana.organizationId,
      code: "HID-TER-01",
      title: "Hidroizolație veche",
      unit: "mp",
      resources: draft.resources,
    });
    const { normId } = await writtenDraft(t, ana);
    const norm = await ana.as.query(api.catalog.norms.get, { normId });
    expect(norm.code).toBe("HID-TER-01-2");
  });

  test("goes into the Deviz once added, published among the firm's norms", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    const { estimateId, requestId, normId } = await writtenDraft(t, ana);

    await expect(
      bogdan.as.mutation(api.catalog.aiNorms.addToEstimate, {
        requestId,
        estimateId,
        quantity: 120,
      }),
    ).rejects.toThrow(/not_found/);
    // Nor into another firm's Deviz.
    const other = await newEstimate(bogdan, "Al lui Bogdan");
    await expect(
      ana.as.mutation(api.catalog.aiNorms.addToEstimate, {
        requestId,
        estimateId: other,
        quantity: 120,
      }),
    ).rejects.toThrow(/not_found/);

    const lineItemId = await ana.as.mutation(
      api.catalog.aiNorms.addToEstimate,
      {
        requestId,
        estimateId,
        quantity: 120,
      },
    );
    const estimate = await ana.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.lineItems).toMatchObject([
      {
        _id: lineItemId,
        origin: "norm",
        normId,
        code: "HID-TER-01",
        unit: "mp",
        quantity: 120,
        resources: [
          // The model's price, until the firm has one of its own.
          {
            name: "Membrană bituminoasă autoadezivă 4 mm",
            unitPrice: 24.5,
            priceSource: "reference",
          },
          { name: "Izolator", priceSource: "missing" },
        ],
      },
    ]);
    const norm = await ana.as.query(api.catalog.norms.get, { normId });
    expect(norm.status).toBe("published");
    expect(
      (
        await ana.as.query(api.catalog.norms.search, {
          organizationId: ana.organizationId,
          text: "hidroizolatie",
        })
      ).map((found) => found.code),
    ).toEqual(["HID-TER-01"]);

    // Added again, the published norm is only added.
    await ana.as.mutation(api.catalog.aiNorms.addToEstimate, {
      requestId,
      estimateId,
      quantity: 30,
    });
    const again = await ana.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(again.lineItems).toHaveLength(2);
  });

  test("is not added once the firm deleted the draft", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const { estimateId, requestId, normId } = await writtenDraft(t, ana);
    await ana.as.mutation(api.catalog.norms.removeDraft, { normId });
    expect(
      await ana.as.query(api.catalog.aiNorms.get, { requestId }),
    ).toMatchObject({ status: "done", norm: null });
    await expect(
      ana.as.mutation(api.catalog.aiNorms.addToEstimate, {
        requestId,
        estimateId,
        quantity: 10,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("saves nothing for a job that was failed in the meantime", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const requestId = await queuedRequest(t, ana);
    const state = await t.mutation(internal.catalog.aiNorms.begin, {
      requestId,
    });
    if (!state) {
      throw new Error("missing request");
    }
    await t.mutation(internal.catalog.aiNorms.fail, {
      requestId,
      jobId: state.jobId,
      error: "timeout",
      usage,
    });
    await t.mutation(internal.catalog.aiNorms.save, {
      requestId,
      jobId: state.jobId,
      usage,
      draft,
    });
    expect(
      await ana.as.query(api.catalog.aiNorms.get, { requestId }),
    ).toMatchObject({ status: "failed", error: "timeout", norm: null });
    expect(await t.run(async (ctx) => ctx.db.query("norms").collect())).toEqual(
      [],
    );
  });

  test("allows a firm ten requests an hour", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    for (let i = 0; i < 10; i++) {
      await ana.as.mutation(api.catalog.aiNorms.start, {
        organizationId: ana.organizationId,
        description: `${description} ${i}`,
      });
    }
    await expect(
      ana.as.mutation(api.catalog.aiNorms.start, {
        organizationId: ana.organizationId,
        description,
      }),
    ).rejects.toThrow(/rate_limited/);
  });
});

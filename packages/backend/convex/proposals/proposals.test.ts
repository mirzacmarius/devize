import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  signIn,
  type TestConvex,
} from "../test.helper";

// The tests never reach the Claude API: without a key, the drafting action
// fails before its first request. Drafting is played here through its
// internal steps, with made-up articles and norms.
delete process.env.ANTHROPIC_API_KEY;

type Firm = Awaited<ReturnType<typeof firmOwner>>;

async function estimateFor(t: TestConvex) {
  const { normId } = await publishedBaseNorm(t);
  const firm = await firmOwner(t, "Ana");
  await firm.as.mutation(api.accounts.rates.set, {
    organizationId: firm.organizationId,
    kind: "labor",
    name: "Manoperă",
    unit: "ora",
    price: 40,
  });
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie apartament Popescu",
  });
  return { firm, normId, estimateId };
}

/** A proposal whose job is queued, as `start` leaves it. */
async function workingProposal(
  t: TestConvex,
  firm: Firm,
  estimateId: Id<"estimates">,
) {
  return await t.run(async (ctx) => {
    const aiJobId = await ctx.db.insert("aiJobs", {
      kind: "estimate_proposal",
      status: "queued",
      model: "claude-opus-5-5",
      organizationId: firm.organizationId,
      createdBy: firm.userId,
    });
    return await ctx.db.insert("proposals", {
      organizationId: firm.organizationId,
      estimateId,
      aiJobId,
      source: "description",
      status: "working",
      text: "baie 2 × 3 m, scot faianța veche și pun faianță nouă până la tavan",
      fileIds: [],
      assumptions: [],
      questions: [],
      createdBy: firm.userId,
      updatedAt: Date.now(),
    });
  });
}

const wallRows = [
  { label: "Pereți lungi", count: 2, length: 3, height: 2.6, deduct: false },
  { label: "Pereți scurți", count: 2, length: 2, height: 2.6, deduct: false },
  { label: "Gol ușă", count: 1, length: 0.8, height: 2.1, deduct: true },
];

const articles = [
  {
    chapter: "Demontări",
    title: "Demontare faianță existentă",
    unit: "mp",
    measured: 24.32,
    takeoff: wallRows,
    confidence: "medium" as const,
    resources: [
      {
        kind: "labor" as const,
        name: "Muncitor necalificat",
        unit: "ora",
        quantity: 0.5,
      },
    ],
  },
  {
    chapter: "Placări ceramice",
    title: "Placare pereți cu faianță, lipită cu adeziv flexibil",
    unit: "mp",
    measured: 24.32,
    takeoff: wallRows,
    confidence: "high" as const,
    resources: [
      {
        kind: "material" as const,
        name: "Adeziv flexibil C2TE",
        unit: "kg",
        quantity: 4.5,
      },
      { kind: "labor" as const, name: "Faianțar", unit: "ora", quantity: 0.9 },
    ],
  },
  {
    chapter: "Diverse",
    title: "Evacuare moloz",
    unit: "t",
    measured: 1.5,
    takeoff: [{ label: "Moloz estimat", count: 1.5, deduct: false }],
    note: "Verifică dacă blocul are tobogan pentru moloz.",
    confidence: "low" as const,
    resources: [
      {
        kind: "labor" as const,
        name: "Muncitor necalificat",
        unit: "ora",
        quantity: 3,
      },
    ],
  },
];

/** Plays the drafting action: saves the articles, then matches the tiling. */
async function draftedProposal(t: TestConvex) {
  const { firm, normId, estimateId } = await estimateFor(t);
  const proposalId = await workingProposal(t, firm, estimateId);
  const state = await t.mutation(internal.proposals.drafting.begin, {
    proposalId,
  });
  expect(state?.estimate.title).toBe("Baie apartament Popescu");
  expect(
    await t.mutation(internal.proposals.drafting.saveDraft, {
      proposalId,
      summary: "Refacerea placajului de faianță dintr-o baie de 6 mp.",
      assumptions: ["Înălțimea 2,60 m"],
      questions: ["Se schimbă și gresia?"],
      articles,
    }),
  ).toBe(true);
  const found = await t.query(internal.proposals.drafting.candidates, {
    organizationId: firm.organizationId,
    articles: [{ position: 1, terms: ["placare faianta pereti"] }],
  });
  expect(found[0]?.norms.map((norm) => [norm.code, norm.scope])).toEqual([
    ["DV-FAI-01", "base"],
  ]);
  await t.mutation(internal.proposals.drafting.complete, {
    proposalId,
    usage: {
      inputTokens: 1000,
      outputTokens: 2000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      webSearches: 0,
      webFetches: 0,
    },
    matches: [
      {
        position: 0,
        candidateIds: [normId],
        quantity: 24.32,
        matchNote: "Norma e pentru placare, nu pentru demontare.",
      },
      {
        position: 1,
        normId,
        candidateIds: [normId],
        quantity: 24.32,
        matchNote: "Aceeași lucrare.",
      },
    ],
  });
  return { firm, normId, estimateId, proposalId };
}

describe("proposals", () => {
  test("show the articles while matching, then the norms for review", async () => {
    const t = setup();
    const { firm, estimateId } = await estimateFor(t);
    const proposalId = await workingProposal(t, firm, estimateId);
    await t.mutation(internal.proposals.drafting.begin, { proposalId });
    await t.mutation(internal.proposals.drafting.saveDraft, {
      proposalId,
      assumptions: [],
      questions: [],
      articles,
    });
    const working = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(working?.status).toBe("working");
    expect(working?.items.map((item) => item.title)).toEqual(
      articles.map((article) => article.title),
    );
  });

  test("are reviewed, then the items kept go into the Deviz", async () => {
    const t = setup();
    const { firm, normId, estimateId, proposalId } = await draftedProposal(t);
    // The Deviz already has the tiling chapter, written differently.
    await firm.as.mutation(api.estimates.sections.create, {
      estimateId,
      kind: "chapter",
      name: "PLACARI CERAMICE",
    });

    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(proposal?.status).toBe("ready");
    expect(proposal?.questions).toEqual(["Se schimbă și gresia?"]);
    const [removal, tiling, rubble] = proposal?.items ?? [];
    expect(tiling?.norm?.code).toBe("DV-FAI-01");
    expect(tiling?.unitMismatch).toBe(false);
    expect(removal?.norm).toBeNull();
    expect(removal?.candidates.map((norm) => norm._id)).toEqual([normId]);
    if (!removal || !tiling || !rubble) {
      throw new Error("missing items");
    }

    await firm.as.mutation(api.proposals.proposals.updateItem, {
      itemId: rubble._id,
      quantity: 2,
    });
    await firm.as.mutation(api.proposals.proposals.setAllSelected, {
      proposalId,
      selected: false,
    });
    await expect(
      firm.as.mutation(api.proposals.proposals.apply, { proposalId }),
    ).rejects.toThrow(/selection/);
    await firm.as.mutation(api.proposals.proposals.setAllSelected, {
      proposalId,
      selected: true,
    });

    expect(
      await firm.as.mutation(api.proposals.proposals.apply, { proposalId }),
    ).toBe(3);
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.sections.map((section) => section.name)).toEqual([
      "PLACARI CERAMICE",
      "Demontări",
      "Diverse",
    ]);
    const chapterOf = (sectionId: Id<"sections"> | undefined) =>
      estimate.sections.find((section) => section._id === sectionId)?.name;
    expect(
      estimate.lineItems.map((item) => [
        item.origin,
        item.code,
        item.title,
        item.quantity,
        chapterOf(item.sectionId),
        item.confidence,
      ]),
    ).toEqual([
      ["ai", "—", "Demontare faianță existentă", 24.32, "Demontări", "medium"],
      [
        "norm",
        "DV-FAI-01",
        "Placare cu faianță pe pereți",
        24.32,
        "PLACARI CERAMICE",
        "high",
      ],
      ["ai", "—", "Evacuare moloz", 2, "Diverse", "low"],
    ]);
    const removalItem = estimate.lineItems[0];
    // Labour gets the firm's rate.
    expect(
      removalItem?.resources.map((r) => [r.name, r.unitPrice, r.priceSource]),
    ).toEqual([["Muncitor necalificat", 40, "own"]]);
    expect(removalItem?.unitCost.labor).toBe(20);
    expect(estimate.lineItems[2]?.notes).toBe(
      "Verifică dacă blocul are tobogan pentru moloz.",
    );
    expect(estimate.lineItems.every((item) => item.aiJobId)).toBe(true);
    expect(estimate.totals.labor).toBeGreaterThan(0);

    const takeoffs = await t.run(
      async (ctx) => await ctx.db.query("takeoffs").collect(),
    );
    expect(
      takeoffs.map((takeoff) => [takeoff.method, takeoff.total, takeoff.unit]),
    ).toEqual([
      ["voice", 24.32, "mp"],
      ["voice", 24.32, "mp"],
      ["voice", 1.5, "t"],
    ]);
    expect(takeoffs[0]?.rows).toHaveLength(3);
    expect(takeoffs[0]?.lineItemId).toBe(removalItem?._id);

    const applied = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(applied?.status).toBe("applied");
    expect(applied?.items).toEqual([]);
    await expect(
      firm.as.mutation(api.proposals.proposals.updateItem, {
        itemId: tiling._id,
        selected: false,
      }),
    ).rejects.toThrow(/status/);
  });

  test("price the AI's materials when the firm's catalog knows them", async () => {
    const t = setup();
    const { firm, estimateId, proposalId } = await draftedProposal(t);
    await firm.as.mutation(api.catalog.resources.create, {
      organizationId: firm.organizationId,
      kind: "material",
      name: "Adeziv flexibil C2TE",
      unit: "kg",
      referencePrice: 3,
    });
    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    const tiling = proposal?.items[1];
    if (!tiling) {
      throw new Error("missing item");
    }
    // Back to the AI's own recipe instead of the norm.
    await firm.as.mutation(api.proposals.proposals.updateItem, {
      itemId: tiling._id,
      normId: null,
    });
    await firm.as.mutation(api.proposals.proposals.apply, { proposalId });
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const item = estimate.lineItems.find((row) => row.title === tiling.title);
    expect(item?.origin).toBe("ai");
    expect(
      item?.resources.map((r) => [r.name, r.unitPrice, r.priceSource]),
    ).toEqual([
      ["Adeziv flexibil C2TE", 3, "reference"],
      ["Faianțar", 40, "own"],
    ]);
  });

  test("a norm in another unit gets the quantity converted", async () => {
    const t = setup();
    const { firm, estimateId } = await draftedProposal(t);
    const admin = await signIn(t, { name: "Root", superadmin: true });
    const hundredId = await admin.as.mutation(api.catalog.norms.create, {
      source: "base",
      code: "DV-FAI-100",
      title: "Placare cu faianță, la 100 mp",
      unit: "100 mp",
      resources: [
        { kind: "labor", name: "Faianțar", unit: "ora", quantity: 90 },
      ],
    });
    await admin.as.mutation(api.catalog.norms.publish, { normId: hundredId });
    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    const tiling = proposal?.items[1];
    if (!tiling) {
      throw new Error("missing item");
    }
    await firm.as.mutation(api.proposals.proposals.updateItem, {
      itemId: tiling._id,
      normId: hundredId,
    });
    const updated = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(updated?.items[1]?.quantity).toBe(0.2432);
    expect(updated?.items[1]?.candidates.map((norm) => norm.code)).toEqual([
      "DV-FAI-01",
      "DV-FAI-100",
    ]);
  });

  test("start in the background, and show the AI's failure", async () => {
    const t = setup();
    const { firm, estimateId } = await estimateFor(t);
    await expect(
      firm.as.mutation(api.proposals.proposals.start, {
        estimateId,
        text: "   ",
        fileIds: [],
      }),
    ).rejects.toThrow(/description/);
    const proposalId = await firm.as.mutation(api.proposals.proposals.start, {
      estimateId,
      text: "baie 6 mp, faianță până la tavan",
      fileIds: [],
    });
    // One proposal at a time while the AI writes.
    await expect(
      firm.as.mutation(api.proposals.proposals.start, {
        estimateId,
        text: "altceva",
        fileIds: [],
      }),
    ).rejects.toThrow(/in_use/);
    expect(
      (await firm.as.query(api.proposals.proposals.latest, { estimateId }))
        ?.status,
    ).toBe("working");

    await t.finishAllScheduledFunctions(() => {});
    const failed = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(failed?._id).toBe(proposalId);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("missing_api_key");

    // Trying again sets the failed one aside.
    const againId = await firm.as.mutation(api.proposals.proposals.start, {
      estimateId,
      text: "baie 6 mp, faianță până la tavan",
      fileIds: [],
    });
    await t.finishAllScheduledFunctions(() => {});
    const statuses = await t.run(async (ctx) =>
      Promise.all(
        [proposalId, againId].map(
          async (id) => (await ctx.db.get("proposals", id))?.status,
        ),
      ),
    );
    expect(statuses).toEqual(["dismissed", "working"]);
  });

  test("read only the firm's own photos", async () => {
    const t = setup();
    const { firm, estimateId } = await estimateFor(t);
    const other = await firmOwner(t, "Bogdan");
    const fileOf = (owner: Firm, contentType: string) =>
      t.run(async (ctx) => {
        const storageId = await ctx.storage.store(
          new Blob(["poza"], { type: contentType }),
        );
        return await ctx.db.insert("files", {
          organizationId: owner.organizationId,
          storageId,
          name: "baie.jpg",
          contentType,
          size: 4,
          purpose: "photo",
          uploadedBy: owner.userId,
        });
      });
    const photoId = await fileOf(firm, "image/jpeg");
    await expect(
      firm.as.mutation(api.proposals.proposals.start, {
        estimateId,
        fileIds: [await fileOf(other, "image/jpeg")],
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      firm.as.mutation(api.proposals.proposals.start, {
        estimateId,
        fileIds: [await fileOf(firm, "application/pdf")],
      }),
    ).rejects.toThrow(/photo/);

    await firm.as.mutation(api.proposals.proposals.start, {
      estimateId,
      fileIds: [photoId],
    });
    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(proposal?.photos.map((photo) => photo._id)).toEqual([photoId]);
    // The photo is now one of the Deviz's files.
    const files = await firm.as.query(api.accounts.files.list, {
      organizationId: firm.organizationId,
      estimateId,
    });
    expect(files.map((file) => file._id)).toEqual([photoId]);
    await t.finishAllScheduledFunctions(() => {});
  });

  test("a firm may start only a few an hour", async () => {
    const t = setup();
    const { firm, estimateId } = await estimateFor(t);
    for (let i = 0; i < 6; i++) {
      const proposalId = await workingProposal(t, firm, estimateId);
      await t.run(async (ctx) => {
        await ctx.db.patch("proposals", proposalId, { status: "dismissed" });
      });
    }
    await expect(
      firm.as.mutation(api.proposals.proposals.start, {
        estimateId,
        text: "baie",
        fileIds: [],
      }),
    ).rejects.toThrow(/rate_limited/);
  });

  test("another firm can't see or change them", async () => {
    const t = setup();
    const { estimateId, proposalId } = await draftedProposal(t);
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.query(api.proposals.proposals.latest, { estimateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.mutation(api.proposals.proposals.apply, { proposalId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.mutation(api.proposals.proposals.dismiss, { proposalId }),
    ).rejects.toThrow(/not_found/);
  });

  test("are set aside, and deleted with their Deviz", async () => {
    const t = setup();
    const { firm, estimateId, proposalId } = await draftedProposal(t);
    await firm.as.mutation(api.proposals.proposals.dismiss, { proposalId });
    expect(
      (await firm.as.query(api.proposals.proposals.latest, { estimateId }))
        ?.status,
    ).toBe("dismissed");

    await firm.as.mutation(api.estimates.estimates.remove, { estimateId });
    await t.finishAllScheduledFunctions(() => {});
    const left = await t.run(async (ctx) => ({
      proposals: await ctx.db.query("proposals").collect(),
      items: await ctx.db.query("proposalItems").collect(),
    }));
    expect(left).toEqual({ proposals: [], items: [] });
  });
});

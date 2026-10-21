import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { defaultModel } from "../ai/models";
import { compatibilityFindings } from "../systems/check";
import {
  firmOwner,
  setup,
  signIn,
  type TestConvex,
  tilingResources,
} from "../test.helper";

// The tests never reach the Claude API: without a key, the check fails
// before its first request. It is played here through its internal steps,
// with a made-up Deviz and made-up norms.
delete process.env.ANTHROPIC_API_KEY;

type Firm = Awaited<ReturnType<typeof firmOwner>>;

const usage = {
  inputTokens: 1000,
  outputTokens: 2000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  webSearches: 0,
  webFetches: 0,
};

/**
 * A bathroom Deviz, added out of print order: a door in a chapter of the
 * flat, the new tiling in its own chapter, and the old tiles' removal loose.
 */
async function bathroom(t: TestConvex) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const tilingNormId = await admin.as.mutation(api.catalog.norms.create, {
    source: "base",
    code: "DV-FAI-01",
    title: "Placare cu faianță pe pereți",
    unit: "m2",
    includes: "adezivul și chitul de rosturi",
    resources: tilingResources,
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId: tilingNormId });
  const waterproofingNormId = await admin.as.mutation(
    api.catalog.norms.create,
    {
      source: "base",
      code: "DV-HID-01",
      title: "Hidroizolație sub placări ceramice",
      unit: "mp",
      resources: [
        {
          kind: "material",
          name: "Hidroizolație bicomponentă",
          unit: "kg",
          quantity: 1.5,
          referencePrice: 12,
        },
        {
          kind: "labor",
          name: "Faianțar",
          unit: "ora",
          quantity: 0.25,
          referencePrice: 30,
        },
      ],
    },
  );
  await admin.as.mutation(api.catalog.norms.publish, {
    normId: waterproofingNormId,
  });

  const firm = await firmOwner(t, "Ana");
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie apartament Popescu",
    description: "Refacere baie, duș la nivelul pardoselii",
    county: "Cluj",
  });
  const tilingChapterId = await firm.as.mutation(
    api.estimates.sections.create,
    { estimateId, kind: "chapter", name: "Placări ceramice" },
  );
  const flatId = await firm.as.mutation(api.estimates.sections.create, {
    estimateId,
    kind: "object",
    code: "OB1",
    name: "Apartament",
  });
  const doorsChapterId = await firm.as.mutation(api.estimates.sections.create, {
    estimateId,
    kind: "chapter",
    name: "Tâmplărie",
    parentId: flatId,
  });
  const doorId = await firm.as.mutation(api.estimates.lineItems.addCustom, {
    estimateId,
    sectionId: doorsChapterId,
    title: "Montare ușă interioară",
    unit: "buc",
    quantity: 1,
    resources: [
      {
        kind: "labor",
        name: "Tâmplar",
        unit: "ora",
        quantity: 2,
        unitPrice: 40,
      },
    ],
  });
  const tilingId = await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
    estimateId,
    normId: tilingNormId,
    quantity: 24.32,
    sectionId: tilingChapterId,
  });
  const removalId = await firm.as.mutation(api.estimates.lineItems.addCustom, {
    estimateId,
    title: "Demontare faianță existentă",
    unit: "mp",
    quantity: 24.32,
    resources: [
      {
        kind: "labor",
        name: "Muncitor necalificat",
        unit: "ora",
        quantity: 0.5,
        unitPrice: 25,
      },
    ],
  });
  return {
    admin,
    firm,
    estimateId,
    tilingNormId,
    waterproofingNormId,
    removalId,
    tilingId,
    doorId,
  };
}

type Bathroom = Awaited<ReturnType<typeof bathroom>>;

/** A proposal from `source` whose job is queued, as `start` leaves it. */
async function queuedProposal(
  t: TestConvex,
  firm: Firm,
  estimateId: Id<"estimates">,
  source: Doc<"proposals">["source"] = "omissions",
) {
  return await t.run(async (ctx) => {
    const aiJobId = await ctx.db.insert("aiJobs", {
      kind: source === "omissions" ? "omission_check" : "estimate_proposal",
      status: "queued",
      model: defaultModel,
      organizationId: firm.organizationId,
      createdBy: firm.userId,
    });
    return await ctx.db.insert("proposals", {
      organizationId: firm.organizationId,
      estimateId,
      aiJobId,
      source,
      status: "working",
      fileIds: [],
      assumptions: [],
      questions: [],
      createdBy: firm.userId,
      updatedAt: Date.now(),
    });
  });
}

const showerWalls = [
  {
    label: "Pereții dușului",
    count: 1,
    length: 2.5,
    height: 2.6,
    deduct: false,
  },
];

/** Plays the check on the bathroom: what the model found, then matched. */
async function checkedBathroom(t: TestConvex) {
  const deviz = await bathroom(t);
  const proposalId = await queuedProposal(t, deviz.firm, deviz.estimateId);
  await t.mutation(internal.proposals.omissions.begin, { proposalId });
  // The catalog publishes a newer version of the tiling's norm meanwhile.
  const tilingV2Id = await deviz.admin.as.mutation(
    api.catalog.norms.createVersion,
    { normId: deviz.tilingNormId },
  );
  await deviz.admin.as.mutation(api.catalog.norms.publish, {
    normId: tilingV2Id,
  });
  expect(
    await t.mutation(internal.proposals.omissions.saveFindings, {
      proposalId,
      summary:
        "Devizul reface placajul băii; lipsesc lucrările din zona dușului.",
      remarks: [
        "Demontarea are 24,32 mp, cât placarea nouă: verifică înălțimea placajului vechi.",
      ],
      questions: ["Dușul are rigolă sau sifon de pardoseală?"],
      articles: [
        {
          // As the request labels the chapter, in capitals.
          chapter: "PLACARI CERAMICE",
          title: "Hidroizolație sub placări ceramice, cu bandă la colțuri",
          unit: "mp",
          measured: 6.5,
          takeoff: showerWalls,
          note: "Faianța din duș se pune peste hidroizolație.",
          confidence: "high",
          resources: [
            {
              kind: "material",
              name: "Hidroizolație bicomponentă",
              unit: "kg",
              quantity: 1.5,
            },
          ],
          basis: [deviz.tilingId],
        },
        {
          chapter: "Diverse",
          title: "Evacuare moloz",
          unit: "t",
          measured: 0.6,
          takeoff: [{ label: "Faianță și adeziv", count: 0.6, deduct: false }],
          note: "Molozul din faianța demontată.",
          confidence: "low",
          resources: [
            {
              kind: "labor",
              name: "Muncitor necalificat",
              unit: "ora",
              quantity: 3,
            },
          ],
          basis: [deviz.removalId],
        },
        {
          chapter: "Placări ceramice",
          title: "Placare cu faianță în zona dușului",
          unit: "mp",
          measured: 6.5,
          takeoff: showerWalls,
          confidence: "medium",
          resources: [],
          basis: [deviz.tilingId],
        },
        {
          chapter: "Demontări",
          title: "DEMONTARE FAIANTA EXISTENTA",
          unit: "mp",
          measured: 24.32,
          takeoff: [{ label: "Pereți", count: 24.32, deduct: false }],
          confidence: "high",
          resources: [],
          basis: [],
        },
      ],
    }),
  ).toBe(true);
  await t.mutation(internal.proposals.drafting.complete, {
    proposalId,
    usage,
    matches: [
      {
        position: 0,
        normId: deviz.waterproofingNormId,
        candidateIds: [deviz.waterproofingNormId],
        quantity: 6.5,
        matchNote: "Aceeași lucrare.",
      },
      {
        position: 2,
        normId: tilingV2Id,
        candidateIds: [tilingV2Id],
        quantity: 6.5,
      },
    ],
  });
  return { ...deviz, proposalId };
}

async function statusOf(t: TestConvex, proposalId: Id<"proposals">) {
  return await t.run(
    async (ctx) => (await ctx.db.get("proposals", proposalId))?.status,
  );
}

describe("omissions", () => {
  test("read the Deviz as it prints, with what each norm includes", async () => {
    const t = setup();
    const deviz = await bathroom(t);
    const proposalId = await queuedProposal(t, deviz.firm, deviz.estimateId);
    const state = await t.mutation(internal.proposals.omissions.begin, {
      proposalId,
    });
    expect(state?.estimate).toEqual({
      title: "Baie apartament Popescu",
      kind: "private",
      description: "Refacere baie, duș la nivelul pardoselii",
      county: "Cluj",
    });
    expect(state?.more).toBe(0);
    // Loose articles first, then each section with its own chapters.
    expect(
      state?.lines.map((line) => [
        line.key,
        line.lineItemId,
        line.section,
        line.title,
      ]),
    ).toEqual([
      ["L1", deviz.removalId, undefined, "Demontare faianță existentă"],
      [
        "L2",
        deviz.tilingId,
        "Placări ceramice",
        "Placare cu faianță pe pereți",
      ],
      [
        "L3",
        deviz.doorId,
        "OB1 Apartament / Tâmplărie",
        "Montare ușă interioară",
      ],
    ]);
    expect(state?.lines[1]).toMatchObject({
      code: "DV-FAI-01",
      unit: "mp",
      quantity: 24.32,
      includes: "adezivul și chitul de rosturi",
      // A percentage names no material.
      materials: ["Adeziv flexibil C2TE", "Faianță", "Chit de rosturi"],
    });
    // The job runs once.
    expect(
      await t.mutation(internal.proposals.omissions.begin, { proposalId }),
    ).toBeNull();
    // Only an omissions check is read this way.
    const draftId = await queuedProposal(
      t,
      deviz.firm,
      deviz.estimateId,
      "description",
    );
    expect(
      await t.mutation(internal.proposals.omissions.begin, {
        proposalId: draftId,
      }),
    ).toBeNull();
  });

  test("read a tender's positions as the lists write them", async () => {
    const t = setup();
    const deviz = await bathroom(t);
    await t.run(async (ctx) => {
      await ctx.db.patch("estimates", deviz.estimateId, { kind: "tender" });
      await ctx.db.patch("lineItems", deviz.removalId, {
        tenderRef: {
          position: "3",
          code: "CZ0101A1",
          text: "Desfacere placaj din faianță",
          unit: "100 mp",
          quantity: 0.2432,
        },
      });
    });
    const proposalId = await queuedProposal(t, deviz.firm, deviz.estimateId);
    const state = await t.mutation(internal.proposals.omissions.begin, {
      proposalId,
    });
    expect(state?.estimate.kind).toBe("tender");
    expect(state?.lines[0]).toMatchObject({
      key: "L1",
      position: "3",
      title: "Desfacere placaj din faianță",
      unit: "100 mp",
      quantity: 0.2432,
    });
  });

  test("tell the model what the compatibility check flagged", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    // Made-up Norme de bază, with the codes of the check's systems.
    const baseNorm = async (code: string, title: string, material: string) => {
      const normId = await admin.as.mutation(api.catalog.norms.create, {
        source: "base",
        code,
        title,
        unit: "mp",
        category: "Pardoseli",
        resources: [
          {
            kind: "material",
            name: material,
            unit: "mp",
            quantity: 1.05,
            referencePrice: 50,
          },
          {
            kind: "labor",
            name: "Faianțar",
            unit: "ora",
            quantity: 0.5,
            referencePrice: 40,
          },
        ],
      });
      await admin.as.mutation(api.catalog.norms.publish, { normId });
      return normId;
    };
    const tilesNormId = await baseNorm(
      "DV-PRD-03",
      "Pardoseală din gresie de test",
      "Gresie porțelanată",
    );
    await baseNorm(
      "DV-HDR-03",
      "Hidroizolație de test sub placaje",
      "Mortar hidroizolant elastic",
    );
    const laminateNormId = await baseNorm(
      "DV-PRD-05",
      "Parchet laminat de test",
      "Parchet laminat, 8 mm",
    );
    const firm = await firmOwner(t, "Ana");
    const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Renovare baie",
    });
    const add = async (normId: Id<"norms">) =>
      await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
        estimateId,
        normId,
        quantity: 6,
      });
    const tilesId = await add(tilesNormId);
    const laminateId = await add(laminateNormId);

    const proposalId = await queuedProposal(t, firm, estimateId);
    const state = await t.mutation(internal.proposals.omissions.begin, {
      proposalId,
    });
    // The laminate in a bathroom, and the waterproofing its tiles lack.
    const found = await t.run(async (ctx) => {
      const estimate = await ctx.db.get("estimates", estimateId);
      return estimate ? await compatibilityFindings(ctx, estimate) : [];
    });
    expect(found).toHaveLength(2);
    const keys = new Map<string, string>([
      [tilesId, "L1"],
      [laminateId, "L2"],
    ]);
    expect(state?.flagged).toEqual(
      found.map((finding) => ({
        keys: finding.lineItemIds.flatMap((id) => keys.get(id) ?? []),
        sentence: finding.sentence,
      })),
    );
    const sentences = state?.flagged.map((finding) => finding.sentence);
    expect(sentences?.join("\n")).toContain("Parchet laminat de test");
    expect(sentences?.join("\n")).toContain(
      "Hidroizolație de test sub placaje",
    );
  });

  test("find the missing works, leaving out those the Deviz has", async () => {
    const t = setup();
    const { firm, estimateId, removalId } = await checkedBathroom(t);
    const check = await firm.as.query(api.proposals.omissions.latest, {
      estimateId,
    });
    expect(check?.status).toBe("ready");
    expect(check?.source).toBe("omissions");
    // Two of the four works the Deviz has after all.
    expect(check?.found).toBe(2);
    expect(check?.summary).toBe(
      "Devizul reface placajul băii; lipsesc lucrările din zona dușului.",
    );
    expect(check?.remarks).toEqual([
      "Demontarea are 24,32 mp, cât placarea nouă: verifică înălțimea placajului vechi.",
    ]);
    expect(check?.questions).toEqual([
      "Dușul are rigolă sau sifon de pardoseală?",
    ]);
    expect(
      check?.items.map((item) => [
        item.title,
        item.chapter,
        item.norm?.code ?? null,
        item.selected,
        item.basis.map((line) => line.title),
        item.duplicateOf,
      ]),
    ).toEqual([
      [
        "Hidroizolație sub placări ceramice, cu bandă la colțuri",
        // The Deviz's own chapter, however the model wrote it.
        "Placări ceramice",
        "DV-HID-01",
        true,
        ["Placare cu faianță pe pereți"],
        null,
      ],
      // Unsure: left out until a person keeps it.
      [
        "Evacuare moloz",
        "Diverse",
        null,
        false,
        ["Demontare faianță existentă"],
        null,
      ],
      // A newer version of the tiling's norm: the Deviz has the work.
      [
        "Placare cu faianță în zona dușului",
        "Placări ceramice",
        "DV-FAI-01",
        false,
        ["Placare cu faianță pe pereți"],
        "Placare cu faianță pe pereți",
      ],
      // Named as an article of the Deviz is.
      [
        "DEMONTARE FAIANTA EXISTENTA",
        "Demontări",
        null,
        false,
        [],
        "Demontare faianță existentă",
      ],
    ]);
    // Proposals from a description are a lane of their own.
    expect(
      await firm.as.query(api.proposals.proposals.latest, { estimateId }),
    ).toBeNull();

    // An article deleted since is left out.
    await firm.as.mutation(api.estimates.lineItems.remove, {
      lineItemId: removalId,
    });
    const after = await firm.as.query(api.proposals.omissions.latest, {
      estimateId,
    });
    expect(after?.items[1]?.basis).toEqual([]);
    expect(after?.items[3]?.duplicateOf).toBeNull();
  });

  test("add the works kept, with their reason and measuring", async () => {
    const t = setup();
    const { firm, estimateId, proposalId } = await checkedBathroom(t);
    expect(
      await firm.as.mutation(api.proposals.proposals.apply, { proposalId }),
    ).toBe(1);
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    // Into the tiling's chapter: no new one.
    expect(estimate.sections.map((section) => section.name)).toEqual([
      "Placări ceramice",
      "Apartament",
      "Tâmplărie",
    ]);
    const added = estimate.lineItems.find((item) => item.code === "DV-HID-01");
    const chapter = estimate.sections.find(
      (section) => section._id === added?.sectionId,
    );
    expect([
      added?.origin,
      added?.quantity,
      added?.notes,
      chapter?.name,
    ]).toEqual([
      "norm",
      6.5,
      "Faianța din duș se pune peste hidroizolație.",
      "Placări ceramice",
    ]);
    const takeoffs = await t.run(
      async (ctx) => await ctx.db.query("takeoffs").collect(),
    );
    expect(
      takeoffs.map((takeoff) => [
        takeoff.lineItemId,
        takeoff.method,
        takeoff.total,
      ]),
    ).toEqual([[added?._id, "derived", 6.5]]);

    const check = await firm.as.query(api.proposals.omissions.latest, {
      estimateId,
    });
    expect([
      check?.status,
      check?.appliedCount,
      check?.found,
      check?.items,
    ]).toEqual(["applied", 1, 2, []]);
    expect(check?.appliedAt).toBeNumber();
  });

  test("start in the background, beside a proposal from a description", async () => {
    const t = setup();
    const { firm, estimateId } = await bathroom(t);
    const emptyId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Deviz gol",
    });
    await expect(
      firm.as.mutation(api.proposals.omissions.start, { estimateId: emptyId }),
    ).rejects.toThrow(/items/);

    // A proposal from a description waits for review.
    const draftId = await queuedProposal(t, firm, estimateId, "description");
    await t.run(async (ctx) => {
      const draft = await ctx.db.get("proposals", draftId);
      if (draft) {
        await ctx.db.patch("aiJobs", draft.aiJobId, { status: "succeeded" });
        await ctx.db.patch("proposals", draftId, { status: "ready" });
      }
    });

    const checkId = await firm.as.mutation(api.proposals.omissions.start, {
      estimateId,
    });
    const job = await t.run(async (ctx) => {
      const check = await ctx.db.get("proposals", checkId);
      return check && (await ctx.db.get("aiJobs", check.aiJobId));
    });
    expect(job?.kind).toBe("omission_check");
    // One check at a time while the AI reads.
    await expect(
      firm.as.mutation(api.proposals.omissions.start, { estimateId }),
    ).rejects.toThrow(/in_use/);

    await t.finishAllScheduledFunctions(() => {});
    const failed = await firm.as.query(api.proposals.omissions.latest, {
      estimateId,
    });
    expect([failed?._id, failed?.status, failed?.error]).toEqual([
      checkId,
      "failed",
      "missing_api_key",
    ]);

    // Checking again sets the failed check aside, not the description's.
    const againId = await firm.as.mutation(api.proposals.omissions.start, {
      estimateId,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect([
      await statusOf(t, checkId),
      await statusOf(t, againId),
      await statusOf(t, draftId),
    ]).toEqual(["dismissed", "working", "ready"]);
    expect(
      (await firm.as.query(api.proposals.proposals.latest, { estimateId }))
        ?._id,
    ).toBe(draftId);

    // Not while a proposal is going into the Deviz.
    await t.run(async (ctx) => {
      await ctx.db.patch("proposals", draftId, { status: "applying" });
    });
    await expect(
      firm.as.mutation(api.proposals.omissions.start, { estimateId }),
    ).rejects.toThrow(/in_use/);
  });

  test("a check set aside meanwhile keeps nothing", async () => {
    const t = setup();
    const { firm, estimateId, tilingId } = await bathroom(t);
    const proposalId = await queuedProposal(t, firm, estimateId);
    await t.mutation(internal.proposals.omissions.begin, { proposalId });
    await firm.as.mutation(api.proposals.proposals.dismiss, { proposalId });
    expect(
      await t.mutation(internal.proposals.omissions.saveFindings, {
        proposalId,
        remarks: [],
        questions: [],
        articles: [
          {
            chapter: "Placări ceramice",
            title: "Hidroizolație",
            unit: "mp",
            measured: 6.5,
            takeoff: showerWalls,
            confidence: "high",
            resources: [],
            basis: [tilingId],
          },
        ],
      }),
    ).toBe(false);
    await t.mutation(internal.proposals.drafting.complete, {
      proposalId,
      usage,
      matches: [],
    });
    const left = await t.run(async (ctx) => ({
      status: (await ctx.db.get("proposals", proposalId))?.status,
      items: await ctx.db.query("proposalItems").collect(),
    }));
    expect(left).toEqual({ status: "dismissed", items: [] });
  });

  test("another firm can't check or see a Deviz; a sent one isn't checked", async () => {
    const t = setup();
    const { firm, estimateId }: Bathroom = await checkedBathroom(t);
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.mutation(api.proposals.omissions.start, { estimateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.query(api.proposals.omissions.latest, { estimateId }),
    ).rejects.toThrow(/not_found/);

    await t.run(async (ctx) => {
      await ctx.db.patch("estimates", estimateId, { lockedAt: Date.now() });
    });
    await expect(
      firm.as.mutation(api.proposals.omissions.start, { estimateId }),
    ).rejects.toThrow(/locked/);
  });
});

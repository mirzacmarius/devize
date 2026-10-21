import { describe, expect, jest, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { defaultModel } from "../ai/models";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  type TestConvex,
} from "../test.helper";
import { SPREADSHEET_TYPE } from "./lib/input";

// The tests never reach the Claude API: without a key, the import fails
// before its first request. Reading and matching are played here through
// the import's internal steps, with a made-up list and norms.
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

async function tenderEstimate(t: TestConvex) {
  const { normId, admin } = await publishedBaseNorm(t);
  const firm = await firmOwner(t, "Ana");
  await firm.as.mutation(api.accounts.rates.set, {
    organizationId: firm.organizationId,
    kind: "labor",
    name: "Zidar",
    unit: "ora",
    price: 45,
  });
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Atelier școală, licitație",
    kind: "tender",
  });
  return { firm, admin, normId, estimateId };
}

function fileOf(
  t: TestConvex,
  owner: Firm,
  name: string,
  contentType: string | undefined,
  size = 4,
) {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["F3"], { type: contentType }),
    );
    return await ctx.db.insert("files", {
      organizationId: owner.organizationId,
      storageId,
      name,
      contentType,
      size,
      purpose: "tender",
      uploadedBy: owner.userId,
    });
  });
}

/** A tender import whose job is queued, as `startTender` leaves it. */
async function tenderProposal(
  t: TestConvex,
  firm: Firm,
  estimateId: Id<"estimates">,
  fileIds: Id<"files">[],
) {
  return await t.run(async (ctx) => {
    const aiJobId = await ctx.db.insert("aiJobs", {
      kind: "tender_import",
      status: "queued",
      model: defaultModel,
      organizationId: firm.organizationId,
      createdBy: firm.userId,
    });
    return await ctx.db.insert("proposals", {
      organizationId: firm.organizationId,
      estimateId,
      aiJobId,
      source: "tender",
      status: "working",
      fileIds,
      assumptions: [],
      questions: [],
      progress: {
        stage: "reading",
        file: 0,
        sheet: 0,
        next: 0,
        read: 0,
        matched: 0,
        issues: [],
      },
      createdBy: firm.userId,
      updatedAt: Date.now(),
    });
  });
}

// A made-up quantity list: two objects, each with its Capitolul 1.
const atelier = { code: "01", name: "Clădire atelier" };
const annex = { code: "02", name: "Anexă" };
const finishes = { code: "1", name: "Finisaje" };
const positions = [
  {
    position: "1",
    code: "CZ0101A1",
    text: "Placare cu faianță a pereților, lipită cu adeziv",
    unit: "mp",
    quantity: 24.32,
    object: atelier,
    chapter: finishes,
    terms: ["placare faianta pereti"],
  },
  {
    position: "2",
    text: "Zidărie din blocuri ceramice de 25 cm",
    unit: "mc",
    quantity: 12.5,
    object: atelier,
    chapter: { code: "2", name: "Zidării" },
    terms: ["zidarie blocuri ceramice"],
  },
  {
    position: "1",
    text: "Glet de ipsos",
    unit: "mp",
    quantity: 120,
    object: annex,
    chapter: finishes,
    terms: ["glet ipsos"],
  },
];

/** Plays the import: reads the list, then matches all but the last. */
async function importedProposal(t: TestConvex) {
  const { firm, admin, normId, estimateId } = await tenderEstimate(t);
  const fileId = await fileOf(t, firm, "F3.xlsx", SPREADSHEET_TYPE);
  const proposalId = await tenderProposal(t, firm, estimateId, [fileId]);
  const state = await t.mutation(internal.proposals.importing.begin, {
    proposalId,
    resume: false,
  });
  expect(state?.files.map((file) => file?.name)).toEqual(["F3.xlsx"]);
  expect(
    await t.mutation(internal.proposals.importing.saveRead, {
      proposalId,
      positions,
      progress: {
        stage: "matching",
        file: 1,
        sheet: 0,
        next: 0,
        read: 0,
        matched: 0,
        issues: [{ kind: "no_quantity", file: "F3.xlsx", positions: ["4"] }],
      },
    }),
  ).toBe(true);

  // While it reads and matches, the review waits.
  const working = await firm.as.query(api.proposals.proposals.latest, {
    estimateId,
  });
  expect(working?.status).toBe("working");
  expect(working?.items).toEqual([]);
  expect(working?.files.map((file) => file.name)).toEqual(["F3.xlsx"]);
  expect(working?.progress).toEqual({
    stage: "matching",
    file: 1,
    read: 3,
    matched: 0,
    issues: [{ kind: "no_quantity", file: "F3.xlsx", positions: ["4"] }],
  });

  const items = await t.query(internal.proposals.importing.toMatch, {
    proposalId,
    after: 0,
    limit: 80,
  });
  expect(items[0]).toEqual({
    position: 0,
    text: "Placare cu faianță a pereților, lipită cu adeziv",
    unit: "mp",
    measured: 24.32,
    chapter: "Finisaje",
    object: "Clădire atelier",
    tenderPosition: "1",
    tenderCode: "CZ0101A1",
    terms: ["placare faianta pereti"],
  });
  const found = await t.query(internal.proposals.drafting.candidates, {
    organizationId: firm.organizationId,
    articles: [{ position: 0, terms: ["CZ0101A1", "placare faianta pereti"] }],
  });
  expect(found[0]?.norms.map((norm) => norm._id)).toEqual([normId]);
  expect(
    await t.mutation(internal.proposals.importing.saveMatches, {
      proposalId,
      matches: [
        {
          position: 0,
          normId,
          candidateIds: [normId],
          quantity: 24.32,
          matchNote: "Aceeași lucrare.",
          confidence: "high",
          resources: [],
        },
        {
          position: 1,
          candidateIds: [],
          quantity: 12.5,
          matchNote: "Nicio normă de zidărie în catalog.",
          confidence: "low",
          resources: [
            {
              kind: "material",
              name: "Bloc ceramic 25 cm",
              unit: "buc",
              quantity: 65,
            },
            { kind: "labor", name: "Zidar", unit: "ora", quantity: 4 },
          ],
        },
      ],
      // The last position's batch failed.
      matched: 3,
      matchError: "api_unavailable",
    }),
  ).toBe(true);
  await t.mutation(internal.proposals.importing.complete, {
    proposalId,
    usage,
  });
  return { firm, admin, normId, estimateId, proposalId };
}

describe("tender imports", () => {
  test("check the lists before reading them", async () => {
    const t = setup();
    const { firm, estimateId } = await tenderEstimate(t);
    const other = await firmOwner(t, "Bogdan");
    const start = (fileIds: Id<"files">[]) =>
      firm.as.mutation(api.proposals.proposals.startTender, {
        estimateId,
        fileIds,
      });
    const sheetId = await fileOf(t, firm, "Lista F3.xlsx", SPREADSHEET_TYPE);
    await expect(start([])).rejects.toThrow(/files/);
    await expect(start([sheetId, sheetId])).rejects.toThrow(/files/);
    await expect(
      start(Array.from({ length: 11 }, () => sheetId)),
    ).rejects.toThrow(/files/);
    await expect(
      start([await fileOf(t, other, "F3.xlsx", SPREADSHEET_TYPE)]),
    ).rejects.toThrow(/not_found/);
    await expect(
      start([await fileOf(t, firm, "F3.xls", "application/vnd.ms-excel")]),
    ).rejects.toThrow(/xls/);
    await expect(
      start([await fileOf(t, firm, "caiet de sarcini.docx", undefined)]),
    ).rejects.toThrow(/fileType/);
    await expect(
      start([
        await fileOf(t, firm, "F3.pdf", "application/pdf", 25 * 1024 * 1024),
      ]),
    ).rejects.toThrow(/size/);

    const pdfId = await fileOf(t, firm, "Anexa F3.pdf", "application/pdf");
    const pageId = await fileOf(t, firm, "pagina 3.jpg", "image/jpeg");
    const proposalId = await start([sheetId, pdfId, pageId]);
    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(proposal?._id).toBe(proposalId);
    expect(proposal?.source).toBe("tender");
    expect(proposal?.status).toBe("working");
    expect(proposal?.files.map((file) => file.name)).toEqual([
      "Lista F3.xlsx",
      "Anexa F3.pdf",
      "pagina 3.jpg",
    ]);
    expect(proposal?.photos).toEqual([]);
    expect(proposal?.progress).toEqual({
      stage: "reading",
      file: 0,
      read: 0,
      matched: 0,
      issues: [],
    });
    // The lists are now among the Deviz's files.
    const files = await firm.as.query(api.accounts.files.list, {
      organizationId: firm.organizationId,
      estimateId,
    });
    expect(files.map((file) => file._id).sort()).toEqual(
      [sheetId, pdfId, pageId].sort(),
    );

    // Without an API key the import fails before its first request.
    await t.finishAllScheduledFunctions(() => {});
    const failed = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect([failed?.status, failed?.error]).toEqual([
      "failed",
      "missing_api_key",
    ]);
    // Trying again with the same lists sets the failed one aside.
    const againId = await start([sheetId, pdfId, pageId]);
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

  test("show the positions read and matched for review", async () => {
    const t = setup();
    const { firm, normId, estimateId, proposalId } = await importedProposal(t);
    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(proposal?.status).toBe("ready");
    expect(proposal?.matchError).toBe("api_unavailable");
    expect(
      proposal?.items.map((item) => [
        item.tender?.position,
        item.tender?.object?.name,
        item.chapter,
        item.unit,
        item.measured,
        item.quantity,
        item.norm?._id ?? null,
        item.confidence,
      ]),
    ).toEqual([
      ["1", "Clădire atelier", "Finisaje", "mp", 24.32, 24.32, normId, "high"],
      ["2", "Clădire atelier", "Zidării", "mc", 12.5, 12.5, null, "low"],
      ["1", "Anexă", "Finisaje", "mp", 120, 120, null, "medium"],
    ]);
    const [tiling, masonry, plaster] = proposal?.items ?? [];
    if (!tiling || !masonry || !plaster) {
      throw new Error("missing items");
    }
    expect(tiling.tender).toEqual({
      position: "1",
      code: "CZ0101A1",
      object: atelier,
      chapter: finishes,
    });
    // The last one's batch failed: no norm and no recipe.
    expect([tiling.recipe, masonry.recipe, plaster.recipe]).toEqual([
      false,
      true,
      false,
    ]);
    const details = await firm.as.query(api.proposals.proposals.itemDetails, {
      itemId: masonry._id,
    });
    expect(details.text).toBe("Zidărie din blocuri ceramice de 25 cm");
    expect(details.resources.map((resource) => resource.name)).toEqual([
      "Bloc ceramic 25 cm",
      "Zidar",
    ]);

    const job = await t.run(async (ctx) => {
      const found = await ctx.db.get("proposals", proposalId);
      return found && (await ctx.db.get("aiJobs", found.aiJobId));
    });
    expect(job?.status).toBe("succeeded");
    expect(job?.result).toEqual({
      positions: 3,
      issues: 1,
      matchError: "api_unavailable",
    });
  });

  test("go into the Deviz in their objects and chapters", async () => {
    const t = setup();
    const { firm, normId, estimateId, proposalId } = await importedProposal(t);
    // The Deviz already has the atelier, written differently, and a
    // Capitolul 1 of its own outside any object.
    const atelierId = await firm.as.mutation(api.estimates.sections.create, {
      estimateId,
      kind: "object",
      code: "01",
      name: "CLADIRE ATELIER",
    });
    await firm.as.mutation(api.estimates.sections.create, {
      estimateId,
      kind: "chapter",
      code: "1",
      name: "Finisaje",
    });

    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    const [tiling, masonry, plaster] = proposal?.items ?? [];
    if (!tiling || !masonry || !plaster) {
      throw new Error("missing items");
    }
    // The person corrects a quantity read wrong; the Deviz follows.
    await firm.as.mutation(api.proposals.proposals.updateItem, {
      itemId: tiling._id,
      measured: 25,
    });
    await firm.as.mutation(api.proposals.proposals.updateItem, {
      itemId: masonry._id,
      measured: 13,
    });
    await expect(
      firm.as.mutation(api.proposals.proposals.updateItem, {
        itemId: plaster._id,
        measured: 0,
      }),
    ).rejects.toThrow(/quantity/);
    const corrected = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(
      corrected?.items.map((item) => [item.measured, item.quantity]),
    ).toEqual([
      [25, 25],
      [13, 13],
      [120, 120],
    ]);

    expect(
      await firm.as.mutation(api.proposals.proposals.apply, { proposalId }),
    ).toBe(3);
    await t.finishAllScheduledFunctions(() => {});
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const sections = estimate.sections.map((section) => ({
      id: section._id,
      label: [
        section.kind,
        section.code,
        section.name,
        estimate.sections.findIndex(
          (parent) => parent._id === section.parentId,
        ),
      ],
    }));
    expect(sections.map((section) => section.label)).toEqual([
      ["object", "01", "CLADIRE ATELIER", -1],
      ["chapter", "1", "Finisaje", -1],
      ["chapter", "1", "Finisaje", 0],
      ["chapter", "2", "Zidării", 0],
      ["object", "02", "Anexă", -1],
      ["chapter", "1", "Finisaje", 4],
    ]);
    expect(sections[0]?.id).toBe(atelierId);
    const sectionAt = (sectionId: Id<"sections"> | undefined) =>
      sections.findIndex((section) => section.id === sectionId);
    expect(
      estimate.lineItems.map((item) => [
        item.origin,
        item.code,
        item.unit,
        item.quantity,
        sectionAt(item.sectionId),
        item.confidence,
      ]),
    ).toEqual([
      ["norm", "DV-FAI-01", "mp", 25, 2, "high"],
      ["tender", "—", "mc", 13, 3, "low"],
      ["tender", "—", "mp", 120, 5, "medium"],
    ]);
    const [tiled, built, plastered] = estimate.lineItems;
    expect(tiled?.normId).toBe(normId);
    // The list's own position, text, unit and quantity, for the forms.
    expect(tiled?.tenderRef).toEqual({
      position: "1",
      code: "CZ0101A1",
      text: "Placare cu faianță a pereților, lipită cu adeziv",
      unit: "mp",
      quantity: 25,
    });
    expect(built?.title).toBe("Zidărie din blocuri ceramice de 25 cm");
    expect(built?.tenderRef?.quantity).toBe(13);
    // The AI's recipe, with the firm's rate for labour.
    expect(
      built?.resources.map((r) => [r.name, r.unitPrice, r.priceSource]),
    ).toEqual([
      ["Bloc ceramic 25 cm", 0, "missing"],
      ["Zidar", 45, "own"],
    ]);
    expect(plastered?.resources).toEqual([]);
    expect(estimate.lineItems.every((item) => item.aiJobId)).toBe(true);

    const applied = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(applied?.status).toBe("applied");
  });

  test("go into the Deviz in batches", async () => {
    const t = setup();
    const { firm, estimateId } = await tenderEstimate(t);
    const proposalId = await tenderProposal(t, firm, estimateId, []);
    await t.mutation(internal.proposals.importing.begin, {
      proposalId,
      resume: false,
    });
    await t.mutation(internal.proposals.importing.saveRead, {
      proposalId,
      positions: Array.from({ length: 230 }, (_, index) => ({
        position: String(index + 1),
        text: `Poziția ${index + 1}`,
        unit: "mp",
        quantity: index + 1,
        chapter: finishes,
        terms: [],
      })),
      progress: {
        stage: "matching",
        file: 1,
        sheet: 0,
        next: 0,
        read: 0,
        matched: 0,
        issues: [],
      },
    });
    await t.mutation(internal.proposals.importing.complete, {
      proposalId,
      usage,
    });
    const proposal = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    const left = proposal?.items[3];
    if (!left) {
      throw new Error("missing item");
    }
    await firm.as.mutation(api.proposals.proposals.updateItem, {
      itemId: left._id,
      selected: false,
    });

    jest.useFakeTimers();
    try {
      expect(
        await firm.as.mutation(api.proposals.proposals.apply, { proposalId }),
      ).toBe(229);
      const first = await firm.as.query(api.proposals.proposals.latest, {
        estimateId,
      });
      expect([first?.status, first?.applying]).toEqual([
        "applying",
        { applied: 100, total: 229 },
      ]);
      // Halfway in, it can't be set aside or replaced.
      await firm.as.mutation(api.proposals.proposals.dismiss, { proposalId });
      await expect(
        firm.as.mutation(api.proposals.proposals.startTender, {
          estimateId,
          fileIds: [await fileOf(t, firm, "F3.pdf", "application/pdf")],
        }),
      ).rejects.toThrow(/in_use/);
      await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    } finally {
      jest.useRealTimers();
    }
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.lineItems).toHaveLength(229);
    expect(estimate.lineItems.map((item) => item.tenderRef?.position)).toEqual(
      Array.from({ length: 230 }, (_, index) => String(index + 1)).filter(
        (position) => position !== "4",
      ),
    );
    expect(new Set(estimate.lineItems.map((item) => item.sectionId)).size).toBe(
      1,
    );
    const applied = await firm.as.query(api.proposals.proposals.latest, {
      estimateId,
    });
    expect(applied?.status).toBe("applied");
  });

  test("stop when set aside while they read", async () => {
    const t = setup();
    const { firm, estimateId } = await tenderEstimate(t);
    const proposalId = await tenderProposal(t, firm, estimateId, []);
    await t.mutation(internal.proposals.importing.begin, {
      proposalId,
      resume: false,
    });
    await firm.as.mutation(api.proposals.proposals.dismiss, { proposalId });
    expect(
      await t.mutation(internal.proposals.importing.saveRead, {
        proposalId,
        positions: positions.slice(0, 1),
        progress: {
          stage: "reading",
          file: 0,
          sheet: 0,
          next: 40,
          read: 0,
          matched: 0,
          issues: [],
        },
      }),
    ).toBe(false);
    // The next slice only closes the job.
    expect(
      await t.mutation(internal.proposals.importing.begin, {
        proposalId,
        resume: true,
      }),
    ).toBeNull();
    const job = await t.run(async (ctx) => {
      const found = await ctx.db.get("proposals", proposalId);
      return found && (await ctx.db.get("aiJobs", found.aiJobId));
    });
    expect([job?.status, job?.result]).toEqual([
      "succeeded",
      { dismissed: true },
    ]);
    const items = await t.run(
      async (ctx) => await ctx.db.query("proposalItems").collect(),
    );
    expect(items).toEqual([]);
  });
});

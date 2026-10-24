import {
  afterEach,
  describe,
  expect,
  setDefaultTimeout,
  setSystemTime,
  test,
} from "bun:test";
import { api } from "../_generated/api";
import { devizFor } from "../offers/test.helper";
import {
  firmOwner,
  publishBaseCatalog,
  publishedBaseNorm,
  setup,
  signIn,
} from "../test.helper";

// Publishing the base catalog's six hundred norms takes convex-test longer
// than bun's five seconds.
setDefaultTimeout(60_000);

afterEach(() => {
  setSystemTime();
});

describe("a firm's templates", () => {
  test("a Deviz saved as a template starts the next one, priced today", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const chapter = await firm.as.mutation(api.estimates.sections.create, {
      estimateId,
      kind: "chapter",
      name: "Finisaje",
    });
    const source = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const tiling = source.lineItems.find((item) => item.code === "DV-FAI-01");
    await firm.as.mutation(api.estimates.lineItems.move, {
      lineItemId: tiling?._id ?? source.lineItems[0]?._id,
      sectionId: chapter,
    });

    const templateId = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "  Baie   standard ",
      description: "Faianță, gresie și tavan fals.",
    });
    const listed = await firm.as.query(api.templates.templates.list, {
      organizationId: firm.organizationId,
    });
    expect(listed.templates).toMatchObject([
      {
        _id: templateId,
        name: "Baie standard",
        description: "Faianță, gresie și tavan fals.",
        itemCount: 2,
        sectionCount: 1,
        usedCount: 0,
      },
    ]);
    expect(listed.templates[0]?.total).toBe(source.totals.total);

    // Every trade at 40 lei/h from now on.
    await firm.as.mutation(api.accounts.rates.set, {
      organizationId: firm.organizationId,
      kind: "labor",
      name: "Manoperă",
      unit: "ora",
      price: 40,
    });
    const { estimateId: startedId, skipped } = await firm.as.mutation(
      api.templates.templates.start,
      {
        organizationId: firm.organizationId,
        title: "Baie Ionescu",
        templateId,
      },
    );
    expect(skipped).toEqual([]);
    const started = await firm.as.query(api.estimates.estimates.get, {
      estimateId: startedId,
    });
    expect(started).toMatchObject({
      title: "Baie Ionescu",
      status: "draft",
      number: source.number + 1,
    });
    expect(started.sections.map((section) => section.name)).toEqual([
      "Finisaje",
    ]);
    expect(
      started.lineItems.map((item) => [item.title, item.quantity]),
    ).toEqual(source.lineItems.map((item) => [item.title, item.quantity]));
    const startedTiling = started.lineItems.find(
      (item) => item.code === "DV-FAI-01",
    );
    expect(startedTiling?.sectionId).toBe(started.sections[0]?._id);
    expect(
      startedTiling?.resources.find((r) => r.name === "Faianțar"),
    ).toMatchObject({ unitPrice: 40, priceSource: "own" });
    expect(started.totals.total).toBeGreaterThan(source.totals.total);

    const after = await firm.as.query(api.templates.templates.list, {
      organizationId: firm.organizationId,
    });
    expect(after.templates[0]?.usedCount).toBe(1);
  });

  test("a name is taken once, unless the template is replaced", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const first = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie",
    });
    await expect(
      firm.as.mutation(api.templates.templates.save, {
        estimateId,
        name: "baie",
      }),
    ).rejects.toThrow(/in_use/);
    const replaced = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "baie",
      replace: true,
    });
    expect(replaced).toBe(first);

    const other = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Bucătărie",
    });
    await expect(
      firm.as.mutation(api.templates.templates.rename, {
        templateId: other,
        name: "BAIE",
      }),
    ).rejects.toThrow(/in_use/);
    await firm.as.mutation(api.templates.templates.rename, {
      templateId: other,
      name: "Bucătărie mică",
      description: "Fără mobilier.",
    });
    await firm.as.mutation(api.templates.templates.remove, {
      templateId: first,
    });
    const listed = await firm.as.query(api.templates.templates.list, {
      organizationId: firm.organizationId,
    });
    expect(listed.templates.map((template) => template.name)).toEqual([
      "Bucătărie mică",
    ]);
  });

  test("an empty Deviz can't be a template", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const estimateId = await ana.as.mutation(api.estimates.estimates.create, {
      organizationId: ana.organizationId,
      title: "Gol",
    });
    await expect(
      ana.as.mutation(api.templates.templates.save, {
        estimateId,
        name: "Gol",
      }),
    ).rejects.toThrow(/templateItems/);
  });

  test("a member changes only the templates they saved", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const owners = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie",
    });
    const cristi = await signIn(t, { name: "Cristi" });
    await t.run(async (ctx) => {
      await ctx.db.insert("memberships", {
        organizationId: firm.organizationId,
        userId: cristi.userId,
        role: "member",
        lastActiveAt: Date.now(),
      });
    });
    const mine = await cristi.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie mică",
    });
    const listed = await cristi.as.query(api.templates.templates.list, {
      organizationId: firm.organizationId,
    });
    expect(
      listed.templates.map((template) => [template.name, template.canChange]),
    ).toEqual([
      ["Baie", false],
      ["Baie mică", true],
    ]);
    await expect(
      cristi.as.mutation(api.templates.templates.remove, {
        templateId: owners,
      }),
    ).rejects.toThrow(/forbidden/);
    // Someone else's name is taken, not offered for replacing.
    for (const replace of [false, true]) {
      await expect(
        cristi.as.mutation(api.templates.templates.save, {
          estimateId,
          name: "baie",
          replace,
        }),
      ).rejects.toThrow(/templateNameTaken/);
    }
    await cristi.as.mutation(api.templates.templates.rename, {
      templateId: mine,
      name: "Baie de serviciu",
    });
    await cristi.as.mutation(api.templates.templates.remove, {
      templateId: mine,
    });
    // The owner, an admin, changes anyone's.
    await firm.as.mutation(api.templates.templates.remove, {
      templateId: owners,
    });
  });

  test("keeps its works apart from the list, and deletes them with it", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const templateId = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie",
    });
    const rows = () =>
      t.run(async (ctx) => {
        const template = await ctx.db.get("estimateTemplates", templateId);
        const contents = await ctx.db
          .query("estimateTemplateContents")
          .collect();
        return { template, contents };
      });
    const saved = await rows();
    expect(saved.template?.lineItems).toBeUndefined();
    expect(saved.template?.itemCount).toBe(2);
    expect(saved.contents).toHaveLength(1);
    expect(saved.contents[0]?.lineItems).toHaveLength(2);

    await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie",
      replace: true,
    });
    expect((await rows()).contents).toHaveLength(1);
    await firm.as.mutation(api.templates.templates.remove, { templateId });
    expect(await rows()).toEqual({ template: null, contents: [] });
  });

  test("a template saved with its works inline still starts a Deviz", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const templateId = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie",
    });
    // As the first templates were written, before the contents table.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("estimateTemplateContents")
        .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
        .unique();
      if (!row) {
        throw new Error("no contents");
      }
      await ctx.db.patch("estimateTemplates", templateId, {
        sections: row.sections,
        lineItems: row.lineItems,
        itemCount: undefined,
        sectionCount: undefined,
      });
      await ctx.db.delete("estimateTemplateContents", row._id);
    });
    const listed = await firm.as.query(api.templates.templates.list, {
      organizationId: firm.organizationId,
    });
    expect(listed.templates[0]?.itemCount).toBe(2);
    const { estimateId: started } = await firm.as.mutation(
      api.templates.templates.start,
      { organizationId: firm.organizationId, title: "Baie 2", templateId },
    );
    const deviz = await firm.as.query(api.estimates.estimates.get, {
      estimateId: started,
    });
    expect(deviz.lineItems).toHaveLength(2);
  });

  test("another firm's template is not found", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const templateId = await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie",
    });
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.mutation(api.templates.templates.start, {
        organizationId: bogdan.organizationId,
        title: "Furat",
        templateId,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.mutation(api.templates.templates.rename, {
        templateId,
        name: "Al meu",
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.mutation(api.templates.templates.remove, { templateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      bogdan.as.query(api.templates.templates.list, {
        organizationId: firm.organizationId,
      }),
    ).rejects.toThrow(/not_found/);
  });
});

describe("Devize's starters", () => {
  test("wait for the base catalog to be published", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const listed = await ana.as.query(api.templates.templates.list, {
      organizationId: ana.organizationId,
    });
    expect(listed.starters.every((starter) => !starter.available)).toBe(true);
    await expect(
      ana.as.mutation(api.templates.templates.start, {
        organizationId: ana.organizationId,
        title: "Baie",
        starter: { key: "bathroom", values: {} },
      }),
    ).rejects.toThrow(/baseCatalog/);
    // Nothing was made: the Deviz went with the failed start.
    const home = await ana.as.query(api.home.overview, {
      organizationId: ana.organizationId,
    });
    expect(home.recent).toEqual([]);
  });

  test("start with the works whose norms are published, naming the rest", async () => {
    const t = setup();
    await publishedBaseNorm(t, { code: "DV-PLC-01", title: "Faianță" });
    const ana = await firmOwner(t, "Ana");
    const listed = await ana.as.query(api.templates.templates.list, {
      organizationId: ana.organizationId,
    });
    const available = Object.fromEntries(
      listed.starters.map((starter) => [starter.key, starter.available]),
    );
    expect(available).toMatchObject({
      bathroom: true,
      kitchen: true,
      apartment: false,
    });
    const { estimateId, skipped } = await ana.as.mutation(
      api.templates.templates.start,
      {
        organizationId: ana.organizationId,
        title: "Baie",
        starter: {
          key: "bathroom",
          values: { length: 2.5, width: 2, tileHeight: 2.4 },
        },
      },
    );
    expect(skipped).toHaveLength(15);
    expect(skipped).not.toContain("DV-PLC-01");
    const deviz = await ana.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(deviz.lineItems.map((item) => [item.code, item.quantity])).toEqual([
      ["DV-PLC-01", 20],
    ]);
  });

  test("measure a bathroom into a Deviz by chapters", async () => {
    const t = setup();
    await publishBaseCatalog(t);
    const ana = await firmOwner(t, "Ana");
    const listed = await ana.as.query(api.templates.templates.list, {
      organizationId: ana.organizationId,
    });
    expect(listed.starters.map((starter) => starter.key)).toEqual([
      "bathroom",
      "kitchen",
      "apartment",
      "facade",
      "roof",
    ]);
    expect(listed.starters.every((starter) => starter.available)).toBe(true);

    await expect(
      ana.as.mutation(api.templates.templates.start, {
        organizationId: ana.organizationId,
        title: "Baie",
        starter: { key: "bathroom", values: { length: 50 } },
      }),
    ).rejects.toThrow(/starterValues/);
    await expect(
      ana.as.mutation(api.templates.templates.start, {
        organizationId: ana.organizationId,
        title: "Baie",
      }),
    ).rejects.toThrow(/template/);

    const { estimateId, skipped } = await ana.as.mutation(
      api.templates.templates.start,
      {
        organizationId: ana.organizationId,
        title: "Baie Popescu",
        starter: {
          key: "bathroom",
          values: { length: 2.5, width: 2, tileHeight: 2.4 },
        },
      },
    );
    expect(skipped).toEqual([]);
    const estimate = await ana.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(estimate.sections.map((section) => section.name)).toEqual([
      "Demolări",
      "Instalații",
      "Finisaje",
      "Obiecte sanitare",
    ]);
    const quantity = (code: string) =>
      estimate.lineItems.find((item) => item.code === code)?.quantity;
    expect(quantity("DV-PLC-01")).toBe(20);
    expect(quantity("DV-PRD-03")).toBe(5);
    expect(estimate.lineItems).toHaveLength(16);
    expect(estimate.lineItems.every((item) => item.origin === "norm")).toBe(
      true,
    );
    expect(estimate.totals.total).toBeGreaterThan(0);
  });
});

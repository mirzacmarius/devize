import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { api } from "../_generated/api";
import { isKnownUnit, isPercentUnit, normalizeUnit } from "../lib/text";
import { firmOwner, setup, signIn, type TestConvex } from "../test.helper";
import { BASE_EDITION, baseCategories, baseNorms } from "./baseNorms";
import { validateResources } from "./resourceRows";

// Publishing six hundred norms in batches, then reading their status, takes
// convex-test longer than bun's five seconds.
setDefaultTimeout(60_000);

// Each category's codes share a prefix, so a code says where its norm sits.
const prefixes = new Map(
  baseCategories.map((category) => [category.name, category.prefix]),
);

describe("the base catalog's data", () => {
  test("gives every norm a unique code in its category's series", () => {
    const codes = baseNorms.map((norm) => norm.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const norm of baseNorms) {
      expect(norm.code).toMatch(
        new RegExp(`^DV-${prefixes.get(norm.category)}-\\d{2}$`),
      );
    }
    expect(new Set(baseNorms.map((norm) => norm.category))).toEqual(
      new Set(baseCategories.map((category) => category.name)),
    );
  });

  // A withdrawn norm leaves a gap in its series (ADR 0012), so the numbers
  // only have to climb within each category's file.
  test("numbers each category's series in rising order, under 100", () => {
    for (const category of baseCategories) {
      const numbers = baseNorms
        .filter((norm) => norm.category === category.name)
        .map((norm) => Number(norm.code.slice(-2)));
      expect(numbers.length).toBeGreaterThan(0);
      expect(numbers.length).toBeLessThan(100);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
      expect(new Set(numbers).size).toBe(numbers.length);
    }
    expect(baseNorms.length).toBeGreaterThanOrEqual(500);
  });

  // Convex deploys every file under convex/, and a module path may hold only
  // letters, digits, underscores and periods: a hyphen fails the deploy.
  test("names each category's file the way Convex accepts a module", () => {
    const files = readdirSync(join(import.meta.dir, "base"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/^[A-Za-z0-9_.]+$/);
    }
  });

  test("writes each norm the way the catalog stores it", () => {
    for (const norm of baseNorms) {
      for (const text of [norm.title, norm.includes, norm.measurement]) {
        expect(text.trim()).toBe(text);
        expect(text.length).toBeGreaterThan(0);
      }
      expect(norm.title.length).toBeLessThanOrEqual(500);
      expect(normalizeUnit(norm.unit)).toBe(norm.unit);
      expect(isKnownUnit(norm.unit)).toBe(true);
      expect(isPercentUnit(norm.unit)).toBe(false);
      expect(norm.resources.length).toBeGreaterThan(0);
      expect(() => validateResources(norm.resources)).not.toThrow();
    }
  });

  test("consumes known units in positive quantities, priced unless a percentage", () => {
    for (const norm of baseNorms) {
      const names = norm.resources.map((resource) => resource.name);
      expect(new Set(names).size).toBe(names.length);
      for (const resource of norm.resources) {
        expect(normalizeUnit(resource.unit)).toBe(resource.unit);
        expect(isKnownUnit(resource.unit)).toBe(true);
        expect(resource.quantity).toBeGreaterThan(0);
        if (isPercentUnit(resource.unit)) {
          expect(resource.referencePrice).toBeUndefined();
        } else {
          expect(resource.referencePrice).toBeGreaterThan(0);
        }
        if (resource.kind === "labor") {
          expect(resource.unit).toBe("ora");
        }
      }
    }
  });

  test("gives a resource the same unit and price in every norm", () => {
    const seen = new Map<string, string>();
    for (const norm of baseNorms) {
      for (const resource of norm.resources) {
        const key = `${resource.kind}:${resource.name}`;
        const value = `${resource.unit}:${resource.referencePrice}`;
        expect(`${key} ${seen.get(key) ?? value}`).toBe(`${key} ${value}`);
        seen.set(key, value);
      }
    }
  });

  test("writes Romanian with comma-below diacritics", () => {
    const text = JSON.stringify(baseNorms);
    expect(text).not.toMatch(/[şţŞŢ]/);
  });
});

async function publishAll(t: TestConvex) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  await publishCatalog(t, admin);
  return admin;
}

// Each batch of norms schedules the next one, and convex-test can come back
// from draining the scheduler between two batches, so the catalog is drained
// until its status shows nothing left to publish.
async function publishCatalog(
  t: TestConvex,
  admin: Awaited<ReturnType<typeof signIn>>,
) {
  await admin.as.mutation(api.catalog.baseCatalog.publish, {});
  for (let round = 0; round < 50; round++) {
    await t.finishAllScheduledFunctions(() => {});
    const pending = await t.run(async (ctx) => {
      const jobs = await ctx.db.system.query("_scheduled_functions").collect();
      return jobs.filter(
        (job) =>
          job.state.kind === "pending" || job.state.kind === "inProgress",
      ).length;
    });
    if (pending === 0) {
      return;
    }
  }
  throw new Error("publishing the base catalog did not finish");
}

async function normWithCode(t: TestConvex, code: string) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query("norms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .collect(),
  );
}

describe("publishing the base catalog", () => {
  test("publishes every norm as a verified base norm of this edition", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const before = await admin.as.query(api.catalog.baseCatalog.status, {});
    expect(before.edition).toBe(BASE_EDITION);
    expect(before.norms.map((norm) => norm.state)).toEqual(
      baseNorms.map(() => "new"),
    );

    await publishCatalog(t, admin);

    const after = await admin.as.query(api.catalog.baseCatalog.status, {});
    expect(after.norms.every((norm) => norm.state === "unchanged")).toBe(true);
    expect(after.norms.every((norm) => norm.version === 1)).toBe(true);
    const [masonry] = await normWithCode(t, "DV-ZID-03");
    if (!masonry) {
      throw new Error("DV-ZID-03 was not published");
    }
    expect(masonry).toMatchObject({
      source: "base",
      visibility: "public",
      status: "published",
      version: 1,
      lineageId: masonry._id,
      category: "Zidărie",
      unit: "mc",
      edition: BASE_EDITION,
      verifiedBy: admin.userId,
    });
    const norm = await admin.as.query(api.catalog.norms.get, {
      normId: masonry._id,
    });
    const expected = baseNorms.find((row) => row.code === "DV-ZID-03");
    expect(
      norm.resources.map((row) => [row.name, row.quantity, row.referencePrice]),
    ).toEqual(
      (expected?.resources ?? []).map((row) => [
        row.name,
        row.quantity,
        row.referencePrice,
      ]),
    );
  });

  test("shares one catalog resource among the norms that consume it", async () => {
    const t = setup();
    await publishAll(t);
    const resources = await t.run(
      async (ctx) =>
        await ctx.db
          .query("resources")
          .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
            q
              .eq("organizationId", undefined)
              .eq("kind", "labor")
              .eq("nameKey", "muncitor necalificat"),
          )
          .collect(),
    );
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      unit: "ora",
      referencePrice: 28,
      visibility: "public",
    });
  });

  test("lets firms find the base norms and price them in a Deviz", async () => {
    const t = setup();
    await publishAll(t);
    const ana = await firmOwner(t, "Ana");
    const found = await ana.as.query(api.catalog.norms.search, {
      organizationId: ana.organizationId,
      text: "faianta",
      limit: 50,
    });
    const tiling = found.find((norm) => norm.code === "DV-PLC-01");
    if (!tiling) {
      throw new Error("The search did not find DV-PLC-01");
    }
    expect(tiling).toMatchObject({ source: "base", verified: true });

    const estimateId = await ana.as.mutation(api.estimates.estimates.create, {
      organizationId: ana.organizationId,
      title: "Baie",
    });
    const lineItemId = await ana.as.mutation(
      api.estimates.lineItems.addFromNorm,
      { estimateId, normId: tiling._id, quantity: 20 },
    );
    const lineItem = await t.run(
      async (ctx) => await ctx.db.get("lineItems", lineItemId),
    );
    expect(
      lineItem?.resources.every((row) => row.priceSource === "reference"),
    ).toBe(true);
    // 1.07 mp of tiles at 45 lei, 4.5 kg of adhesive at 1.6, 0.4 kg of grout
    // at 6 and 0.3 m of trim at 4, plus 2% small materials.
    expect(lineItem?.unitCost.material).toBe(60.13);
    expect(lineItem?.laborHours).toBe(1.25);
  });

  test("lists one category's published norms by code, from the codes alone", async () => {
    const t = setup();
    await publishAll(t);
    const ana = await firmOwner(t, "Ana");
    const masonry = await ana.as.query(api.catalog.norms.listBaseCategory, {
      category: "zid",
    });
    expect(masonry.length).toBe(
      baseNorms.filter((norm) => norm.category === "Zidărie").length,
    );
    expect(masonry.map((norm) => norm.code)).toEqual(
      baseNorms
        .filter((norm) => norm.category === "Zidărie")
        .map((norm) => norm.code),
    );
    expect(masonry.every((norm) => norm.source === "base")).toBe(true);
    const byName = await ana.as.query(api.catalog.norms.listBaseCategory, {
      category: "Schele",
    });
    expect(byName.map((norm) => norm.code)).toContain("DV-SCH-01");
    await expect(
      ana.as.query(api.catalog.norms.listBaseCategory, { category: "nope" }),
    ).rejects.toThrow();
  });

  test("leaves unchanged norms alone when published again", async () => {
    const t = setup();
    const admin = await publishAll(t);
    await publishCatalog(t, admin);

    const norms = await t.run(
      async (ctx) => await ctx.db.query("norms").collect(),
    );
    expect(norms).toHaveLength(baseNorms.length);
    expect(norms.every((norm) => norm.version === 1)).toBe(true);
  });

  test("publishes a changed norm as a new version that supersedes the old one", async () => {
    const t = setup();
    const admin = await publishAll(t);
    // Someone changed the published version, so the code now differs from it.
    const [published] = await normWithCode(t, "DV-ZUG-01");
    await t.run(async (ctx) => {
      if (!published) {
        throw new Error("DV-ZUG-01 was not published");
      }
      await ctx.db.patch("norms", published._id, { title: "Zugrăveli" });
    });
    const status = await admin.as.query(api.catalog.baseCatalog.status, {});
    expect(
      status.norms.filter((norm) => norm.state !== "unchanged"),
    ).toMatchObject([{ code: "DV-ZUG-01", state: "changed", version: 1 }]);

    await publishCatalog(t, admin);

    const versions = await normWithCode(t, "DV-ZUG-01");
    expect(
      versions.map((norm) => [norm.version, norm.status, norm.lineageId]),
    ).toEqual([
      [1, "superseded", published?._id],
      [2, "published", published?._id],
    ]);
    const painting = baseNorms.find((norm) => norm.code === "DV-ZUG-01");
    expect(versions[1]?.title).toBe(painting?.title ?? "");
  });

  test("brings back a norm archived in the app while the code still has it", async () => {
    const t = setup();
    const admin = await publishAll(t);
    const [scaffolding] = await normWithCode(t, "DV-SCH-01");
    if (!scaffolding) {
      throw new Error("DV-SCH-01 was not published");
    }
    await admin.as.mutation(api.catalog.norms.archive, {
      normId: scaffolding._id,
    });
    const status = await admin.as.query(api.catalog.baseCatalog.status, {});
    expect(
      status.norms.filter((norm) => norm.state !== "unchanged"),
    ).toMatchObject([{ code: "DV-SCH-01", state: "new" }]);

    await publishCatalog(t, admin);

    const versions = await normWithCode(t, "DV-SCH-01");
    expect(
      versions.map((norm) => [norm.version, norm.status, norm.lineageId]),
    ).toEqual([
      [1, "archived", scaffolding._id],
      [2, "published", scaffolding._id],
    ]);
  });

  test("keeps the reference price a shared resource already has", async () => {
    const t = setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("resources", {
        kind: "labor",
        name: "Zidar",
        nameKey: "zidar",
        unit: "ora",
        visibility: "public",
      });
      await ctx.db.insert("resources", {
        kind: "labor",
        name: "Faianțar",
        nameKey: "faiantar",
        unit: "ora",
        visibility: "public",
        referencePrice: 45,
      });
    });
    await publishAll(t);
    const prices = await t.run(async (ctx) => {
      const rows = await ctx.db.query("resources").collect();
      return rows
        .filter((row) => row.name === "Zidar" || row.name === "Faianțar")
        .map((row) => [row.name, row.referencePrice]);
    });
    expect(prices).toEqual([
      ["Zidar", 35],
      ["Faianțar", 45],
    ]);
  });

  test("is for super admins only", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    await expect(
      ana.as.query(api.catalog.baseCatalog.status, {}),
    ).rejects.toThrow(/forbidden/);
    await expect(
      ana.as.mutation(api.catalog.baseCatalog.publish, {}),
    ).rejects.toThrow(/forbidden/);
    const norms = await t.run(
      async (ctx) => await ctx.db.query("norms").collect(),
    );
    expect(norms).toHaveLength(0);
  });
});

import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { issuedAdvance } from "../invoices/test.helper";
import { firmOwner, setup } from "../test.helper";

describe("deleting a firm", () => {
  test("deletes its templates, invoice settings, series and draft invoices", async () => {
    const t = setup();
    const { firm, estimateId, organizationId, advanceId } =
      await issuedAdvance(t);
    await firm.as.mutation(api.templates.templates.save, {
      estimateId,
      name: "Baie standard",
    });
    await firm.as.mutation(api.invoices.settings.addSeries, {
      organizationId,
      code: "FACT",
    });
    const draftId = await firm.as.mutation(api.invoices.invoices.createFinal, {
      estimateId,
    });

    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});

    const left = await t.run(async (ctx) => ({
      firm: await ctx.db.get("organizations", organizationId),
      templates: await ctx.db.query("estimateTemplates").collect(),
      contents: await ctx.db.query("estimateTemplateContents").collect(),
      settings: await ctx.db.query("invoiceSettings").collect(),
      series: await ctx.db.query("invoiceSeries").collect(),
      draft: await ctx.db.get("invoices", draftId),
      issued: await ctx.db.get("invoices", advanceId),
    }));
    expect(left.firm).toBeNull();
    expect(left.templates).toEqual([]);
    expect(left.contents).toEqual([]);
    expect(left.settings).toEqual([]);
    expect(left.series).toEqual([]);
    expect(left.draft).toBeNull();
    // An issued invoice carries its own copy of the seller and its number.
    expect(left.issued).toMatchObject({ series: "DVZ", number: 1 });
  });

  test("deletes its own prices with their whole history, a batch at a time", async () => {
    // A run that deleted a listing's whole history at once goes past this.
    const t = setup({ transactionLimits: { documentsWritten: 250 } });
    const { organizationId } = await issuedAdvance(t);
    const listing = {
      source: "own" as const,
      title: "Adeziv flexibil, sac 25 kg",
      price: 60,
      includedVat: 21,
      saleUnit: "sac",
      unitsPerSale: 25,
      status: "active" as const,
      checkedAt: Date.now(),
    };
    const { own, store } = await t.run(async (ctx) => {
      const own = await ctx.db.insert("listings", {
        ...listing,
        organizationId,
      });
      const another = await ctx.db.insert("listings", {
        ...listing,
        organizationId,
        title: "Grund, bidon 5 l",
      });
      const store = await ctx.db.insert("listings", {
        ...listing,
        source: "retailer",
        store: "dedeman",
      });
      for (const listingId of [another, store]) {
        await ctx.db.insert("priceHistory", {
          listingId,
          price: 60,
          includedVat: 21,
          at: 0,
        });
      }
      return { own, store };
    });
    // More history than the old take(1000) reached, 150 rows at a time.
    for (let from = 0; from < 1050; from += 150) {
      await t.run(async (ctx) => {
        for (let day = from; day < from + 150; day++) {
          await ctx.db.insert("priceHistory", {
            listingId: own,
            price: 50 + (day % 10),
            includedVat: 21,
            at: day,
          });
        }
      });
    }

    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});

    const left = await t.run(async (ctx) => ({
      listings: await ctx.db.query("listings").collect(),
      history: await ctx.db.query("priceHistory").collect(),
    }));
    // The store's price is everyone's and stays.
    expect(left.listings.map((row) => row._id)).toEqual([store]);
    expect(left.history.map((row) => row.listingId)).toEqual([store]);
  });

  test("deletes large templates in batches that fit what a run may read", async () => {
    const t = setup({ transactionLimits: true });
    const ana = await firmOwner(t, "Ana");
    // 25 templates of about 700 KB each: 17 MB, more than one run may read.
    for (let index = 0; index < 25; index++) {
      await t.run(async (ctx) => {
        const templateId = await ctx.db.insert("estimateTemplates", {
          organizationId: ana.organizationId,
          name: `Șablon ${index}`,
          nameKey: `sablon ${index}`,
          total: 0,
          createdBy: ana.userId,
          updatedAt: Date.now(),
          usedCount: 0,
        });
        await ctx.db.insert("estimateTemplateContents", {
          templateId,
          sections: [],
          lineItems: [
            {
              position: 0,
              origin: "custom",
              code: "AN-01",
              title: "Lucrare cu multe note",
              unit: "buc",
              quantity: 1,
              resources: [],
              unitCost: { material: 0, labor: 0, equipment: 0, transport: 0 },
              laborHours: 0,
              notes: "x".repeat(700_000),
            },
          ],
        });
      });
    }

    await t.mutation(internal.accounts.cleanup.deleteOrganization, {
      organizationId: ana.organizationId,
    });
    await t.finishAllScheduledFunctions(() => {});

    const left = await t.run(async (ctx) => ({
      firm: await ctx.db.get("organizations", ana.organizationId),
      templates: await ctx.db.query("estimateTemplates").collect(),
      contents: await ctx.db.query("estimateTemplateContents").take(1),
    }));
    expect(left.firm).toBeNull();
    expect(left.templates).toEqual([]);
    expect(left.contents).toEqual([]);
  });
});

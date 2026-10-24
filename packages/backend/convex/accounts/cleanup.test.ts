import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { issuedAdvance } from "../invoices/test.helper";
import { setup } from "../test.helper";

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
    const t = setup();
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
    const store = await t.run(async (ctx) => {
      const own = await ctx.db.insert("listings", {
        ...listing,
        organizationId,
      });
      const another = await ctx.db.insert("listings", {
        ...listing,
        organizationId,
        title: "Grund, bidon 5 l",
      });
      const retailer = await ctx.db.insert("listings", {
        ...listing,
        source: "retailer",
        store: "dedeman",
      });
      // More history than one batch deletes.
      for (let day = 0; day < 450; day++) {
        await ctx.db.insert("priceHistory", {
          listingId: own,
          price: 50 + (day % 10),
          includedVat: 21,
          at: day,
        });
      }
      for (const listingId of [another, retailer]) {
        await ctx.db.insert("priceHistory", {
          listingId,
          price: 60,
          includedVat: 21,
          at: 0,
        });
      }
      return retailer;
    });

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
});

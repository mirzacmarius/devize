import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { romanianDate } from "../lib/dates";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  signIn,
  type TestConvex,
} from "../test.helper";
import { REFRESH_MS } from "./materials";
import { FIRM_READS_PER_DAY, READ_SPACING_MS } from "./reading";
import { REFRESH_READS_PER_DAY } from "./refresh";

// Made-up store pages: nothing here copies a real store's markup or prices.

const realFetch = globalThis.fetch;
let requests: { url: string; agent: string | null }[] = [];
let pages: Record<string, { status: number; body: string }> = {};

function productHtml(fields: {
  name: string;
  price: string | number;
  gtin13?: string;
  sku?: string;
}) {
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: fields.name,
    sku: fields.sku,
    gtin13: fields.gtin13,
    offers: {
      "@type": "Offer",
      price: fields.price,
      priceCurrency: "RON",
      availability: "https://schema.org/InStock",
    },
  };
  return `<html><head><script type="application/ld+json">${JSON.stringify(product)}</script></head><body></body></html>`;
}

beforeEach(() => {
  requests = [];
  pages = {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    requests.push({ url, agent: headers.get("user-agent") });
    const page = pages[url] ?? { status: 404, body: "" };
    return new Response(page.body, {
      status: page.status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const adhesivePage = "https://www.dedeman.ro/ro/adeziv-flexibil/p/100200";

/** The shared catalog resource a published base norm consumes. */
async function adhesive(t: TestConvex) {
  const { normId } = await publishedBaseNorm(t);
  const resource = await t.run(
    async (ctx) =>
      await ctx.db
        .query("resources")
        .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
          q
            .eq("organizationId", undefined)
            .eq("kind", "material")
            .eq("nameKey", "adeziv flexibil c2te"),
        )
        .unique(),
  );
  if (!resource) {
    throw new Error("no adhesive resource");
  }
  return { normId, resourceId: resource._id };
}

async function readAndWait(
  t: TestConvex,
  as: Awaited<ReturnType<typeof firmOwner>>["as"],
  args: {
    organizationId: Id<"organizations">;
    url: string;
    resourceId?: Id<"resources">;
    productId?: Id<"products">;
  },
) {
  const readId = await as.mutation(api.prices.reading.request, args);
  await t.finishAllScheduledFunctions(() => {});
  return await as.query(api.prices.reading.get, { readId });
}

describe("reading a store's product page", () => {
  test("saves the price, keeps its history and links it to the material", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const firm = await firmOwner(t, "Ana");
    pages["https://www.dedeman.ro/robots.txt"] = {
      status: 200,
      body: "User-agent: *\nDisallow: /cos",
    };
    pages[adhesivePage] = {
      status: 200,
      body: productHtml({
        name: "Adeziv flexibil C2TE, 25 kg",
        price: "45.90",
        sku: "100200",
      }),
    };
    const read = await readAndWait(t, firm.as, {
      organizationId: firm.organizationId,
      url: `${adhesivePage}?utm_source=x#detalii`,
      resourceId,
    });
    expect(read.status).toBe("done");
    expect(read.listing).toMatchObject({
      title: "Adeziv flexibil C2TE, 25 kg",
      url: adhesivePage,
      price: 45.9,
      includedVat: 21,
      inStock: true,
    });
    // 25 kg a bag, read from the title; a person still has to confirm it.
    expect(read.choice).toMatchObject({
      unitsPerSale: 25,
      unitsChecked: false,
    });
    expect(requests.map((r) => r.url)).toEqual([
      "https://www.dedeman.ro/robots.txt",
      adhesivePage,
    ]);
    expect(requests[1]?.agent).toContain("DevizeBot");

    const history = await t.run(async (ctx) => {
      const listing = await ctx.db.get(
        "listings",
        read.listing?._id as Id<"listings">,
      );
      const rows = await ctx.db
        .query("priceHistory")
        .withIndex("by_listingId_and_at", (q) =>
          q.eq("listingId", read.listing?._id as Id<"listings">),
        )
        .collect();
      return { listing, rows };
    });
    // A store's price read from its page is for every firm.
    expect(history.listing?.organizationId).toBeUndefined();
    expect(history.listing?.externalId).toBe("100200");
    expect(history.rows.map((row) => row.price)).toEqual([45.9]);
  });

  test("prices the firm's devize with its chosen store product", async () => {
    const t = setup();
    const { normId, resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    pages["https://www.dedeman.ro/robots.txt"] = { status: 404, body: "" };
    pages[adhesivePage] = {
      status: 200,
      body: productHtml({ name: "Adeziv flexibil C2TE 25 kg", price: 45.9 }),
    };
    await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: adhesivePage,
      resourceId,
    });

    const adhesivePrice = async (firm: typeof ana) => {
      const estimateId = await firm.as.mutation(
        api.estimates.estimates.create,
        {
          organizationId: firm.organizationId,
          title: "Baie",
        },
      );
      await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
        estimateId,
        normId,
        quantity: 10,
      });
      const estimate = await firm.as.query(api.estimates.estimates.get, {
        estimateId,
      });
      return estimate.lineItems[0]?.resources.find(
        (r) => r.name === "Adeziv flexibil C2TE",
      );
    };
    // 45.90 lei with VAT for 25 kg: 1.5174 lei/kg without VAT.
    expect(await adhesivePrice(ana)).toMatchObject({
      unitPrice: 1.5174,
      priceSource: "listing",
      store: "dedeman",
    });
    // Another firm didn't choose it, so the norm's reference price stays.
    expect(await adhesivePrice(bogdan)).toMatchObject({
      unitPrice: 2.4,
      priceSource: "reference",
    });
  });

  test("answers from a recent read without reading the page again", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    pages["https://www.dedeman.ro/robots.txt"] = { status: 200, body: "" };
    pages[adhesivePage] = {
      status: 200,
      body: productHtml({ name: "Adeziv 25 kg", price: 45.9 }),
    };
    await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: adhesivePage,
      resourceId,
    });
    requests = [];
    const read = await readAndWait(t, bogdan.as, {
      organizationId: bogdan.organizationId,
      url: adhesivePage,
      resourceId,
    });
    expect(read).toMatchObject({ status: "done", fromStore: false });
    expect(read.choice?.unitsPerSale).toBe(25);
    expect(requests).toEqual([]);
  });

  test("matches a catalog product by its EAN", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const productId = await t.run(async (ctx) => {
      const manufacturerId = await ctx.db.insert("manufacturers", {
        name: "Adezivi Test SA",
        nameKey: "adezivi test",
        wave: 1,
        status: "norms_received",
        normsStatus: "received",
        claimStatus: "unclaimed",
        brands: [],
        categories: [],
        mainProducts: [],
        retailers: [],
        existingNorms: [],
        technicalDocs: [],
        declaredConsumption: [],
        createdBy: admin.userId,
      });
      return await ctx.db.insert("products", {
        manufacturerId,
        name: "Adeziv Test Flex",
        nameKey: "adeziv test flex",
        ean: "5940000000016",
        unit: "kg",
        packageSize: 25,
        attributes: [],
        status: "published",
        createdBy: admin.userId,
      });
    });
    const ana = await firmOwner(t, "Ana");
    const url = "https://www.hornbach.ro/p/adeziv-test-flex/555/";
    pages["https://www.hornbach.ro/robots.txt"] = { status: 200, body: "" };
    pages[url] = {
      status: 200,
      body: productHtml({
        name: "Adeziv Test Flex",
        price: 52,
        gtin13: "5940000000016",
      }),
    };
    const read = await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url,
      productId,
    });
    expect(read.choice?.unitsPerSale).toBe(25);
    const listing = await t.run(
      async (ctx) =>
        await ctx.db.get("listings", read.listing?._id as Id<"listings">),
    );
    expect(listing).toMatchObject({
      productId,
      matchMethod: "ean",
      unitsPerSale: 25,
      store: "hornbach",
    });
  });

  test("respects robots.txt and stops after a store refuses", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    pages["https://www.leroymerlin.ro/robots.txt"] = {
      status: 200,
      body: "User-agent: *\nDisallow: /produse/",
    };
    const disallowed = await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: "https://www.leroymerlin.ro/produse/adeziv-123",
      resourceId,
    });
    expect(disallowed.status).toBe("disallowed");
    expect(requests.map((r) => r.url)).toEqual([
      "https://www.leroymerlin.ro/robots.txt",
    ]);

    pages["https://bricostore.ro/robots.txt"] = { status: 200, body: "" };
    pages["https://bricostore.ro/adeziv-123"] = { status: 403, body: "" };
    const blocked = await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: "https://bricostore.ro/adeziv-123",
      resourceId,
    });
    expect(blocked.status).toBe("blocked");
    // The store said no: the next read is refused without asking it again.
    requests = [];
    const readId = await ana.as.mutation(api.prices.reading.request, {
      organizationId: ana.organizationId,
      url: "https://bricostore.ro/alt-adeziv-456",
      resourceId,
    });
    const refused = await ana.as.query(api.prices.reading.get, { readId });
    expect(refused).toMatchObject({ status: "blocked", fromStore: false });
    expect(requests).toEqual([]);

    // A store that refuses even its robots.txt isn't read either.
    pages["https://www.hornbach.ro/robots.txt"] = { status: 429, body: "" };
    const robotsRefused = await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: "https://www.hornbach.ro/p/adeziv-789",
      resourceId,
    });
    expect(robotsRefused.status).toBe("blocked");
    expect(requests.map((r) => r.url)).toEqual([
      "https://www.hornbach.ro/robots.txt",
    ]);
  });

  test("spaces reads of one store and caps a firm's reads per day", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    const first = await ana.as.mutation(api.prices.reading.request, {
      organizationId: ana.organizationId,
      url: "https://www.dedeman.ro/ro/a/p/1",
      resourceId,
    });
    const second = await ana.as.mutation(api.prices.reading.request, {
      organizationId: ana.organizationId,
      url: "https://www.dedeman.ro/ro/b/p/2",
      resourceId,
    });
    const [a, b] = await t.run(async (ctx) => [
      await ctx.db.get("storeReads", first),
      await ctx.db.get("storeReads", second),
    ]);
    expect((b?.scheduledFor ?? 0) - (a?.scheduledFor ?? 0)).toBe(
      READ_SPACING_MS,
    );

    await t.run(async (ctx) => {
      const now = Date.now();
      for (let i = 0; i < FIRM_READS_PER_DAY; i++) {
        await ctx.db.insert("storeReads", {
          store: "hornbach",
          url: `https://www.hornbach.ro/p/x/${i}/`,
          organizationId: ana.organizationId,
          status: "done",
          fromStore: true,
          requestedAt: now - 1000,
          scheduledFor: now - 1000,
        });
      }
    });
    const readId = await ana.as.mutation(api.prices.reading.request, {
      organizationId: ana.organizationId,
      url: "https://www.hornbach.ro/p/y/1/",
      resourceId,
    });
    expect(
      (await ana.as.query(api.prices.reading.get, { readId })).status,
    ).toBe("limited");
  });

  test("only reads the four stores' pages, for the firm's own members", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      ana.as.mutation(api.prices.reading.request, {
        organizationId: ana.organizationId,
        url: "https://www.example.com/p/1",
        resourceId,
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      bogdan.as.mutation(api.prices.reading.request, {
        organizationId: ana.organizationId,
        url: adhesivePage,
        resourceId,
      }),
    ).rejects.toThrow(/not_found/);
    const readId = await ana.as.mutation(api.prices.reading.request, {
      organizationId: ana.organizationId,
      url: adhesivePage,
      resourceId,
    });
    await expect(
      bogdan.as.query(api.prices.reading.get, { readId }),
    ).rejects.toThrow(/not_found/);
  });
});

describe("typed store prices", () => {
  test("stay with the firm that typed them", async () => {
    const t = setup();
    const { normId, resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    const bogdan = await firmOwner(t, "Bogdan");
    await ana.as.mutation(api.prices.choices.typePrice, {
      organizationId: ana.organizationId,
      store: "brico_depot",
      resourceId,
      title: "Adeziv flexibil 25 kg",
      price: 60.5,
      unitsPerSale: 25,
      url: "https://bricostore.ro/adeziv-flexibil",
    });
    const choices = await ana.as.query(api.prices.choices.forMaterial, {
      organizationId: ana.organizationId,
      resourceId,
    });
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      store: "brico_depot",
      unitsPerSale: 25,
      unitsChecked: true,
      unitPrice: 2,
      listing: { typed: true, price: 60.5 },
    });
    expect(
      await bogdan.as.query(api.prices.choices.forMaterial, {
        organizationId: bogdan.organizationId,
        resourceId,
      }),
    ).toEqual([]);
    await expect(
      bogdan.as.mutation(api.prices.choices.remove, {
        choiceId: choices[0]?._id as Id<"storeChoices">,
      }),
    ).rejects.toThrow(/not_found/);

    // Bogdan's devize never see Ana's typed price.
    const estimateId = await bogdan.as.mutation(
      api.estimates.estimates.create,
      { organizationId: bogdan.organizationId, title: "Baie" },
    );
    await bogdan.as.mutation(api.estimates.lineItems.addFromNorm, {
      estimateId,
      normId,
      quantity: 1,
    });
    const estimate = await bogdan.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(
      estimate.lineItems[0]?.resources.find(
        (r) => r.name === "Adeziv flexibil C2TE",
      )?.priceSource,
    ).toBe("reference");
  });
});

describe("deleting a firm", () => {
  test("deletes its choices, reads and typed prices, not the stores' prices", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    pages["https://www.dedeman.ro/robots.txt"] = { status: 200, body: "" };
    pages[adhesivePage] = {
      status: 200,
      body: productHtml({ name: "Adeziv 25 kg", price: 45.9 }),
    };
    await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: adhesivePage,
      resourceId,
    });
    await ana.as.mutation(api.prices.choices.typePrice, {
      organizationId: ana.organizationId,
      store: "hornbach",
      resourceId,
      title: "Adeziv 25 kg",
      price: 50,
      unitsPerSale: 25,
    });

    await ana.as.mutation(api.users.deleteCurrentUserAccount, {});
    await t.finishAllScheduledFunctions(() => {});

    const left = await t.run(async (ctx) => ({
      choices: await ctx.db.query("storeChoices").collect(),
      reads: await ctx.db.query("storeReads").collect(),
      listings: await ctx.db.query("listings").collect(),
    }));
    expect(left.choices).toHaveLength(0);
    expect(left.reads).toHaveLength(0);
    expect(left.listings.map((l) => [l.store, l.organizationId])).toEqual([
      ["dedeman", undefined],
    ]);
  });
});

describe("refreshing chosen store products", () => {
  /** Reads Ana chose a product from, with its page and robots.txt set up. */
  async function chosenProduct(t: TestConvex) {
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    pages["https://www.dedeman.ro/robots.txt"] = { status: 200, body: "" };
    pages[adhesivePage] = {
      status: 200,
      body: productHtml({ name: "Adeziv 25 kg", price: 45.9 }),
    };
    const read = await readAndWait(t, ana.as, {
      organizationId: ana.organizationId,
      url: adhesivePage,
      resourceId,
    });
    return {
      ana,
      resourceId,
      listingId: read.listing?._id as Id<"listings">,
    };
  }

  /** Makes the listing due and the store free, then runs the job. */
  async function refreshNow(t: TestConvex, listingId: Id<"listings">) {
    await t.run(async (ctx) => {
      await ctx.db.patch("listings", listingId, {
        refreshAfter: Date.now() - 1,
      });
      for (const state of await ctx.db.query("storeStates").collect()) {
        await ctx.db.patch("storeStates", state._id, {
          nextReadAt: Date.now() - 1,
        });
      }
    });
    requests = [];
    await t.mutation(internal.prices.refresh.refreshDue, {});
    await t.finishAllScheduledFunctions(() => {});
  }

  test("reads a chosen product's page again after a day", async () => {
    const t = setup();
    const { listingId } = await chosenProduct(t);
    const listing = await t.run(
      async (ctx) => await ctx.db.get("listings", listingId),
    );
    expect(listing?.refreshAfter).toBe((listing?.checkedAt ?? 0) + REFRESH_MS);

    // Not due yet: nothing is read.
    requests = [];
    await t.mutation(internal.prices.refresh.refreshDue, {});
    await t.finishAllScheduledFunctions(() => {});
    expect(requests).toEqual([]);

    pages[adhesivePage] = {
      status: 200,
      body: productHtml({ name: "Adeziv 25 kg", price: 49.9 }),
    };
    await refreshNow(t, listingId);
    expect(requests.map((r) => r.url)).toEqual([adhesivePage]);
    const after = await t.run(async (ctx) => ({
      listing: await ctx.db.get("listings", listingId),
      history: await ctx.db
        .query("priceHistory")
        .withIndex("by_listingId_and_at", (q) => q.eq("listingId", listingId))
        .collect(),
      reads: await ctx.db.query("storeReads").collect(),
    }));
    expect(after.listing?.price).toBe(49.9);
    expect(after.listing?.refreshAfter).toBe(
      (after.listing?.checkedAt ?? 0) + REFRESH_MS,
    );
    expect(after.history.map((row) => row.price)).toEqual([45.9, 49.9]);
    // Devize's own read: no firm asked for it, so none pays for it.
    expect(
      after.reads.filter((read) => read.organizationId === undefined),
    ).toMatchObject([{ status: "done", fromStore: true, url: adhesivePage }]);
  });

  test("stops for a product no firm chose anymore", async () => {
    const t = setup();
    const { ana, resourceId, listingId } = await chosenProduct(t);
    const [choice] = await ana.as.query(api.prices.choices.forMaterial, {
      organizationId: ana.organizationId,
      resourceId,
    });
    await ana.as.mutation(api.prices.choices.remove, {
      choiceId: choice?._id as Id<"storeChoices">,
    });
    await refreshNow(t, listingId);
    expect(requests).toEqual([]);
    const listing = await t.run(
      async (ctx) => await ctx.db.get("listings", listingId),
    );
    expect(listing?.refreshAfter).toBeUndefined();
  });

  test("schedules a product chosen from an older read", async () => {
    const t = setup();
    const { resourceId } = await adhesive(t);
    const ana = await firmOwner(t, "Ana");
    const checkedAt = Date.now() - 3 * REFRESH_MS;
    const listingId = await t.run(
      async (ctx) =>
        await ctx.db.insert("listings", {
          source: "retailer",
          store: "hornbach",
          resourceId,
          title: "Adeziv flexibil 25 kg",
          url: "https://www.hornbach.ro/p/adeziv-flexibil/42/",
          price: 52,
          includedVat: 21,
          saleUnit: "buc",
          unitsPerSale: 1,
          status: "active",
          checkedAt,
        }),
    );
    await ana.as.mutation(api.prices.choices.pick, {
      organizationId: ana.organizationId,
      listingId,
      resourceId,
      unitsPerSale: 25,
    });
    const listing = await t.run(
      async (ctx) => await ctx.db.get("listings", listingId),
    );
    // Already due: the next run reads it.
    expect(listing?.refreshAfter).toBe(checkedAt + REFRESH_MS);
  });

  test("leaves a paused store alone and keeps reads for the firms", async () => {
    const t = setup();
    const { listingId } = await chosenProduct(t);
    const setState = async (fields: {
      pausedUntil?: number;
      readsOnDay?: number;
    }) =>
      await t.run(async (ctx) => {
        const state = await ctx.db
          .query("storeStates")
          .withIndex("by_store", (q) => q.eq("store", "dedeman"))
          .unique();
        if (state) {
          await ctx.db.patch("storeStates", state._id, {
            day: romanianDate(Date.now()),
            ...fields,
          });
        }
      });

    await setState({ pausedUntil: Date.now() + 60 * 60_000 });
    await refreshNow(t, listingId);
    expect(requests).toEqual([]);

    await setState({
      pausedUntil: undefined,
      readsOnDay: REFRESH_READS_PER_DAY,
    });
    await refreshNow(t, listingId);
    expect(requests).toEqual([]);

    await setState({ readsOnDay: 0 });
    await refreshNow(t, listingId);
    expect(requests.map((r) => r.url)).toEqual([adhesivePage]);
  });
});

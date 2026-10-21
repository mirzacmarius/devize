import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireFirmDoc, requireMember } from "../lib/access";
import { romanianDate } from "../lib/dates";
import { invalid } from "../lib/errors";
import {
  choicesFor,
  choose,
  guessUnits,
  materialOf,
  REFRESH_MS,
  requireMaterial,
} from "./materials";
import type { Store } from "./resolve";
import { productPage, retailVat } from "./stores";
import { unitsPerSale } from "./units";
import { readStatus, store } from "./validators";

// Citirea la cerere (docs/adr/0003, 0008): Devize reads one product page of a
// store when a firm links the product to a material, never a whole catalog.
// A page read in the last hours answers without a new read; reads of one
// store are spaced out and capped per day, and a firm's reads per day too.
// While a firm uses the product, `refresh.ts` reads its page again daily
// (docs/adr/0009).

const CACHE_MS = 12 * 60 * 60_000;
export const READ_SPACING_MS = 4_000;
const MAX_WAIT_MS = 2 * 60_000;
export const STORE_READS_PER_DAY = 500;
export const FIRM_READS_PER_DAY = 100;
const DAY_MS = 24 * 60 * 60_000;
const ROBOTS_MS = DAY_MS;
// After a store refuses a read, Devize leaves it alone this long, or as long
// as its Retry-After asks, within a day.
const PAUSE_MS = 60 * 60_000;
const READS_KEPT_MS = 7 * DAY_MS;

async function storeState(ctx: MutationCtx, store: Store, now: number) {
  const state = await ctx.db
    .query("storeStates")
    .withIndex("by_store", (q) => q.eq("store", store))
    .unique();
  if (state) {
    return state;
  }
  const stateId = await ctx.db.insert("storeStates", {
    store,
    nextReadAt: now,
    day: romanianDate(now),
    readsOnDay: 0,
  });
  const created = await ctx.db.get("storeStates", stateId);
  if (!created) {
    throw new Error("storeStates row vanished");
  }
  return created;
}

/** A fresh enough listing read from this page, if there is one. */
async function cachedListing(
  ctx: MutationCtx,
  url: string,
  now: number,
): Promise<Doc<"listings"> | null> {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_url", (q) => q.eq("url", url))
    .take(20);
  return (
    listings.find(
      (listing) =>
        listing.source === "retailer" &&
        listing.organizationId === undefined &&
        listing.status === "active" &&
        now - listing.checkedAt < CACHE_MS,
    ) ?? null
  );
}

/** How many pages the firm had read from the stores' sites in a day. */
async function firmReadsToday(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  now: number,
): Promise<number> {
  let count = 0;
  const reads = ctx.db
    .query("storeReads")
    .withIndex("by_organizationId_and_requestedAt", (q) =>
      q.eq("organizationId", organizationId).gt("requestedAt", now - DAY_MS),
    );
  for await (const read of reads) {
    if (read.fromStore) {
      count++;
    }
    if (count >= FIRM_READS_PER_DAY) {
      break;
    }
  }
  return count;
}

export async function deleteOldReads(ctx: MutationCtx, now: number) {
  const old = await ctx.db
    .query("storeReads")
    .withIndex("by_requestedAt", (q) =>
      q.lt("requestedAt", now - READS_KEPT_MS),
    )
    .take(20);
  for (const read of old) {
    await ctx.db.delete("storeReads", read._id);
  }
}

/** The store's next free moment for a read, and how busy its day is. */
export async function nextTurn(ctx: MutationCtx, store: Store, now: number) {
  const state = await storeState(ctx, store, now);
  const day = romanianDate(now);
  return {
    stateId: state._id,
    day,
    readsOnDay: state.day === day ? state.readsOnDay : 0,
    scheduledFor: Math.max(now, state.nextReadAt),
    paused: state.pausedUntil !== undefined && state.pausedUntil > now,
  };
}

export type Turn = Awaited<ReturnType<typeof nextTurn>>;

/**
 * Gives a read the store's turn: the store's next read waits a few seconds
 * after it, and the read is logged and scheduled.
 */
export async function queueRead(
  ctx: MutationCtx,
  turn: Turn,
  read: {
    store: Store;
    url: string;
    organizationId?: Id<"organizations">;
    requestedBy?: Id<"users">;
    productId?: Id<"products">;
    resourceId?: Id<"resources">;
    requestedAt: number;
  },
): Promise<Id<"storeReads">> {
  await ctx.db.patch("storeStates", turn.stateId, {
    nextReadAt: turn.scheduledFor + READ_SPACING_MS,
    day: turn.day,
    readsOnDay: turn.readsOnDay + 1,
  });
  const readId = await ctx.db.insert("storeReads", {
    ...read,
    status: "pending",
    fromStore: true,
    scheduledFor: turn.scheduledFor,
  });
  await ctx.scheduler.runAfter(
    turn.scheduledFor - read.requestedAt,
    internal.prices.readPage.run,
    { readId },
  );
  return readId;
}

/**
 * Starts a read of a store's product page for a material of the firm: the
 * product is linked to the material once read. A page read in the last hours
 * answers at once; otherwise the read waits for the store's turn. The firm
 * watches the result with `get`.
 */
export const request = mutation({
  args: {
    organizationId: v.id("organizations"),
    url: v.string(),
    productId: v.optional(v.id("products")),
    resourceId: v.optional(v.id("resources")),
  },
  returns: v.id("storeReads"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const page = productPage(args.url);
    if (!page) {
      throw invalid("url");
    }
    const material = materialOf(args);
    const { unit } = await requireMaterial(ctx, args.organizationId, material);
    const now = Date.now();
    await deleteOldReads(ctx, now);
    const base = {
      store: page.store,
      url: page.url,
      organizationId: args.organizationId,
      requestedBy: userId,
      productId: material.productId,
      resourceId: material.resourceId,
      requestedAt: now,
    };

    const cached = await cachedListing(ctx, page.url, now);
    if (cached) {
      await choose(ctx, {
        organizationId: args.organizationId,
        material,
        listing: cached,
        unitsPerSale: guessUnits(cached, material, unit),
        unitsChecked: false,
        userId,
      });
      return await ctx.db.insert("storeReads", {
        ...base,
        status: "done",
        fromStore: false,
        listingId: cached._id,
        scheduledFor: now,
        finishedAt: now,
      });
    }

    const turn = await nextTurn(ctx, page.store, now);
    let refused: Doc<"storeReads">["status"] | null = null;
    if (turn.paused) {
      refused = "blocked";
    } else if (
      turn.readsOnDay >= STORE_READS_PER_DAY ||
      turn.scheduledFor - now > MAX_WAIT_MS ||
      (await firmReadsToday(ctx, args.organizationId, now)) >=
        FIRM_READS_PER_DAY
    ) {
      refused = "limited";
    }
    if (refused) {
      return await ctx.db.insert("storeReads", {
        ...base,
        status: refused,
        fromStore: false,
        scheduledFor: now,
        finishedAt: now,
      });
    }
    return await queueRead(ctx, turn, base);
  },
});

/** A read the firm asked for, with the product it found and the choice made. */
export const get = query({
  args: { readId: v.id("storeReads") },
  handler: async (ctx, args) => {
    const { doc: read } = await requireFirmDoc(ctx, "storeReads", args.readId);
    const listing = read.listingId
      ? await ctx.db.get("listings", read.listingId)
      : null;
    const material =
      read.organizationId && (read.productId || read.resourceId)
        ? materialOf(read)
        : null;
    const choice =
      material && read.organizationId
        ? ((await choicesFor(ctx, read.organizationId, material)).find(
            (c) => c.store === read.store,
          ) ?? null)
        : null;
    return {
      _id: read._id,
      store: read.store,
      url: read.url,
      status: read.status,
      fromStore: read.fromStore,
      scheduledFor: read.scheduledFor,
      finishedAt: read.finishedAt,
      listing: listing && {
        _id: listing._id,
        title: listing.title,
        url: listing.url,
        price: listing.price,
        includedVat: listing.includedVat,
        ean: listing.ean,
        inStock: listing.inStock,
        checkedAt: listing.checkedAt,
      },
      choice:
        choice && choice.listingId === listing?._id
          ? {
              _id: choice._id,
              unitsPerSale: choice.unitsPerSale,
              unitsChecked: choice.unitsChecked,
            }
          : null,
    };
  },
});

/** What the read needs: the page, and the store's robots.txt if still fresh. */
export const load = internalQuery({
  args: { readId: v.id("storeReads") },
  returns: v.union(
    v.null(),
    v.object({
      store,
      url: v.string(),
      robotsTxt: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const read = await ctx.db.get("storeReads", args.readId);
    if (read?.status !== "pending") {
      return null;
    }
    const state = await ctx.db
      .query("storeStates")
      .withIndex("by_store", (q) => q.eq("store", read.store))
      .unique();
    const fresh =
      state?.robotsCheckedAt !== undefined &&
      Date.now() - state.robotsCheckedAt < ROBOTS_MS;
    return {
      store: read.store,
      url: read.url,
      robotsTxt: fresh ? state?.robotsTxt : undefined,
    };
  },
});

const pageFields = v.object({
  title: v.string(),
  price: v.number(),
  ean: v.optional(v.string()),
  sku: v.optional(v.string()),
  inStock: v.optional(v.boolean()),
});

/** The public listing for a store page: the one at its address or code. */
async function findListing(
  ctx: MutationCtx,
  store: Store,
  url: string,
  sku: string | undefined,
): Promise<Doc<"listings"> | null> {
  const isPublic = (listing: Doc<"listings">) =>
    listing.source === "retailer" &&
    listing.store === store &&
    listing.organizationId === undefined;
  const byUrl = await ctx.db
    .query("listings")
    .withIndex("by_url", (q) => q.eq("url", url))
    .take(20);
  const found = byUrl.find(isPublic);
  if (found || !sku) {
    return found ?? null;
  }
  const byCode = await ctx.db
    .query("listings")
    .withIndex("by_store_and_externalId", (q) =>
      q.eq("store", store).eq("externalId", sku),
    )
    .take(20);
  return byCode.find(isPublic) ?? null;
}

/** The published catalog product with this EAN, as GTIN-13 or GTIN-14. */
async function productByEan(ctx: MutationCtx, ean: string | undefined) {
  if (!ean) {
    return null;
  }
  const codes = new Set([ean, ean.replace(/^0+(?=\d{13}$)/, "")]);
  if (ean.length === 12) {
    codes.add(`0${ean}`);
  }
  for (const code of codes) {
    const products = await ctx.db
      .query("products")
      .withIndex("by_ean", (q) => q.eq("ean", code))
      .take(5);
    const product = products.find((p) => p.status === "published");
    if (product) {
      return product;
    }
  }
  return null;
}

/**
 * Saves how a read went. A price updates the store's public listing, adds to
 * its history when it changed, matches it to a catalog product by EAN and
 * links it to the material the firm asked about.
 */
export const finish = internalMutation({
  args: {
    readId: v.id("storeReads"),
    status: readStatus,
    page: v.optional(pageFields),
    robotsTxt: v.optional(v.string()),
    pausedUntil: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const read = await ctx.db.get("storeReads", args.readId);
    if (read?.status !== "pending") {
      return null;
    }
    const now = Date.now();
    const state = await storeState(ctx, read.store, now);
    if (args.robotsTxt !== undefined) {
      await ctx.db.patch("storeStates", state._id, {
        robotsTxt: args.robotsTxt.slice(0, 200_000),
        robotsCheckedAt: now,
      });
    }
    if (args.status === "blocked") {
      await ctx.db.patch("storeStates", state._id, {
        pausedUntil: Math.min(
          Math.max(args.pausedUntil ?? 0, now + PAUSE_MS),
          now + DAY_MS,
        ),
      });
    }
    const { page } = args;
    if (args.status !== "done" || !page) {
      if (args.status === "not_found") {
        const gone = await findListing(ctx, read.store, read.url, undefined);
        if (gone) {
          await ctx.db.patch("listings", gone._id, {
            status: "unavailable",
            checkedAt: now,
            refreshAfter: undefined,
          });
        }
      }
      await ctx.db.patch("storeReads", read._id, {
        status: args.status === "done" ? "no_price" : args.status,
        finishedAt: now,
      });
      return null;
    }

    const existing = await findListing(ctx, read.store, read.url, page.sku);
    const product = await productByEan(ctx, page.ean);
    const match = product
      ? {
          productId: product._id,
          matchMethod: "ean" as const,
          unitsPerSale:
            unitsPerSale(page.title, product.unit) ?? product.packageSize ?? 1,
        }
      : existing?.productId
        ? {}
        : { unitsPerSale: 1 };
    const fields = {
      title: page.title,
      url: read.url,
      externalId: page.sku ?? existing?.externalId,
      ean: page.ean ?? existing?.ean,
      price: page.price,
      includedVat: retailVat,
      inStock: page.inStock,
      status: "active" as const,
      checkedAt: now,
      ...match,
    };
    let listingId: Id<"listings">;
    if (existing) {
      listingId = existing._id;
      await ctx.db.patch("listings", existing._id, fields);
    } else {
      listingId = await ctx.db.insert("listings", {
        source: "retailer",
        store: read.store,
        saleUnit: "buc",
        unitsPerSale: 1,
        ...fields,
      });
    }
    if (
      !existing ||
      existing.price !== page.price ||
      existing.includedVat !== retailVat
    ) {
      await ctx.db.insert("priceHistory", {
        listingId,
        price: page.price,
        includedVat: retailVat,
        at: now,
      });
    }

    const listing = await ctx.db.get("listings", listingId);
    if (
      listing &&
      read.organizationId &&
      read.requestedBy &&
      (read.productId || read.resourceId)
    ) {
      const material = materialOf(read);
      const unit = material.productId
        ? (await ctx.db.get("products", material.productId))?.unit
        : material.resourceId
          ? (await ctx.db.get("resources", material.resourceId))?.unit
          : undefined;
      if (unit) {
        await choose(ctx, {
          organizationId: read.organizationId,
          material,
          listing,
          unitsPerSale: guessUnits(listing, material, unit),
          unitsChecked: false,
          userId: read.requestedBy,
        });
      }
    }
    // A product a firm chose is read again in a day; one nobody chose isn't.
    const chosen = await ctx.db
      .query("storeChoices")
      .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
      .first();
    await ctx.db.patch("listings", listingId, {
      refreshAfter: chosen ? now + REFRESH_MS : undefined,
    });
    await ctx.db.patch("storeReads", read._id, {
      status: "done",
      listingId,
      finishedAt: now,
    });
    return null;
  },
});

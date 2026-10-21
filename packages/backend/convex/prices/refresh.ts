import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { canRefresh, REFRESH_MS } from "./materials";
import { deleteOldReads, nextTurn, queueRead } from "./reading";
import type { Store } from "./resolve";
import { storeKeys } from "./stores";

// Devize reads the page of every store product a firm chose again once a
// day, so devize, the Coș and price alerts work with fresh prices
// (docs/adr/0009). The job runs every few minutes and starts at most one read
// per store, only while the store isn't busy with firms' own reads.

// Background reads stop for the day once a store had this many reads, so
// the firms keep the rest of the store's daily limit (STORE_READS_PER_DAY).
export const REFRESH_READS_PER_DAY = 300;
// A store whose next read waits longer is busy with firms' reads: skipped.
const MAX_WAIT_MS = 30_000;
// Due listings looked at per store and run, past those nobody uses anymore.
const CANDIDATES = 10;

/** The listing of a store due for a new read that a firm still uses. */
async function dueListing(
  ctx: MutationCtx,
  store: Store,
  now: number,
): Promise<(Doc<"listings"> & { url: string }) | null> {
  const due = await ctx.db
    .query("listings")
    .withIndex("by_store_and_refreshAfter", (q) =>
      q.eq("store", store).gt("refreshAfter", 0).lte("refreshAfter", now),
    )
    .take(CANDIDATES);
  for (const listing of due) {
    const chosen =
      canRefresh(listing) &&
      (await ctx.db
        .query("storeChoices")
        .withIndex("by_listingId", (q) => q.eq("listingId", listing._id))
        .first());
    if (chosen && listing.url !== undefined) {
      return { ...listing, url: listing.url };
    }
    // No firm buys it anymore, or its page can't be read again.
    await ctx.db.patch("listings", listing._id, { refreshAfter: undefined });
  }
  return null;
}

/** Starts the next due read at each store whose turn and limits allow it. */
export const refreshDue = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    await deleteOldReads(ctx, now);
    for (const store of storeKeys) {
      const turn = await nextTurn(ctx, store, now);
      if (
        turn.paused ||
        turn.readsOnDay >= REFRESH_READS_PER_DAY ||
        turn.scheduledFor - now > MAX_WAIT_MS
      ) {
        continue;
      }
      const listing = await dueListing(ctx, store, now);
      if (!listing) {
        continue;
      }
      // Read again in a day, whatever this read finds.
      await ctx.db.patch("listings", listing._id, {
        refreshAfter: now + REFRESH_MS,
      });
      await queueRead(ctx, turn, { store, url: listing.url, requestedAt: now });
    }
    return null;
  },
});

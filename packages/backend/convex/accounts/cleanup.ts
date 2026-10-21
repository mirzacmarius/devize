import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";

const BATCH = 200;

/**
 * Deletes the next batch of a firm's rows, one table at a time, and returns
 * how many it deleted; 0 means nothing is left.
 */
async function deleteSome(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  limit: number,
): Promise<number> {
  let deleted = 0;
  const estimates = await ctx.db
    .query("estimates")
    .withIndex("by_organizationId_and_updatedAt", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(Math.min(limit, 20));
  for (const estimate of estimates) {
    await ctx.db.delete("estimates", estimate._id);
    await ctx.scheduler.runAfter(0, internal.estimates.estimates.deleteRows, {
      estimateId: estimate._id,
    });
    deleted++;
  }
  if (deleted > 0) {
    return deleted;
  }
  const clients = await ctx.db
    .query("clients")
    .withIndex("by_organizationId_and_nameKey", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of clients) {
    await ctx.db.delete("clients", row._id);
  }
  if (clients.length > 0) {
    return clients.length;
  }
  const rates = await ctx.db
    .query("companyRates")
    .withIndex("by_organizationId_and_kind", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of rates) {
    await ctx.db.delete("companyRates", row._id);
  }
  if (rates.length > 0) {
    return rates.length;
  }
  const files = await ctx.db
    .query("files")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const file of files) {
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete("files", file._id);
  }
  if (files.length > 0) {
    return files.length;
  }
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_organizationId_and_productId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const listing of listings) {
    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_listingId_and_at", (q) => q.eq("listingId", listing._id))
      .take(1000);
    for (const row of history) {
      await ctx.db.delete("priceHistory", row._id);
    }
    await ctx.db.delete("listings", listing._id);
  }
  if (listings.length > 0) {
    return listings.length;
  }
  const choices = await ctx.db
    .query("storeChoices")
    .withIndex("by_organizationId_and_productId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of choices) {
    await ctx.db.delete("storeChoices", row._id);
  }
  if (choices.length > 0) {
    return choices.length;
  }
  const reads = await ctx.db
    .query("storeReads")
    .withIndex("by_organizationId_and_requestedAt", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of reads) {
    await ctx.db.delete("storeReads", row._id);
  }
  if (reads.length > 0) {
    return reads.length;
  }
  for (const status of [
    "draft",
    "review",
    "published",
    "superseded",
    "archived",
  ] as const) {
    const norms = await ctx.db
      .query("norms")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", status),
      )
      .take(Math.min(limit, 50));
    for (const norm of norms) {
      const rows = await ctx.db
        .query("normResources")
        .withIndex("by_normId_and_position", (q) => q.eq("normId", norm._id))
        .take(200);
      for (const row of rows) {
        await ctx.db.delete("normResources", row._id);
      }
      await ctx.db.delete("norms", norm._id);
    }
    if (norms.length > 0) {
      return norms.length;
    }
  }
  const resources = await ctx.db
    .query("resources")
    .withIndex("by_organizationId_and_kind_and_nameKey", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of resources) {
    await ctx.db.delete("resources", row._id);
  }
  if (resources.length > 0) {
    return resources.length;
  }
  const events = await ctx.db
    .query("usageEvents")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of events) {
    await ctx.db.delete("usageEvents", row._id);
  }
  if (events.length > 0) {
    return events.length;
  }
  const jobs = await ctx.db
    .query("aiJobs")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of jobs) {
    await ctx.db.delete("aiJobs", row._id);
  }
  if (jobs.length > 0) {
    return jobs.length;
  }
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(limit);
  for (const row of memberships) {
    await ctx.db.delete("memberships", row._id);
  }
  return memberships.length;
}

/**
 * Deletes a firm and everything it owns, memberships last, one batch per run,
 * scheduling itself until nothing is left. Runs when a firm's last member
 * deletes their account.
 */
export const deleteOrganization = internalMutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deleted = await deleteSome(ctx, args.organizationId, BATCH);
    if (deleted > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.accounts.cleanup.deleteOrganization,
        args,
      );
      return null;
    }
    const firm = await ctx.db.get("organizations", args.organizationId);
    if (firm) {
      if (firm.logoId) {
        await ctx.storage.delete(firm.logoId);
      }
      await ctx.db.delete("organizations", firm._id);
    }
    return null;
  },
});

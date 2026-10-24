import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";

// An upload is claimed within minutes or never (`unclaimedUpload` in
// files.ts): as a firm's file, its logo or someone's photo, or by a super
// admin as a norms import. An hourly cleanup deletes the ones nobody claimed
// (docs/adr/0045). It looks only at the files stored in the hours before it
// runs, so nothing kept from before is ever at risk.

// Long after the 10 minutes a fresh upload may be claimed in.
const GRACE_MS = 60 * 60 * 1000;
// Each run looks this far back, so the next one makes up for a run that
// failed.
const LOOKBACK_MS = 3 * 60 * 60 * 1000;
const BATCH = 100;
// More norms imports than super admins start in a few hours.
const MAX_IMPORTS = 500;

/**
 * Every field that keeps a stored file, and how the cleanup sees a fresh
 * upload kept there. A test compares this list with the schema: a field
 * added later needs a check in `isKept` first, or its new files are deleted
 * within hours. So do new places that make files: an upload URL, a claim
 * with `unclaimedUpload` or `ctx.storage.store` (the test lists them too).
 */
export const STORAGE_FIELDS = {
  "files.storageId": "kept: by_storageId",
  "users.imageId": "kept: by_imageId",
  "organizations.logoId": "kept: by_logoId",
  "normImports.fileId": "kept: among the imports started since the file",
  "aiJobs.fileId": "a firm's file or a norms import's",
  "products.datasheetId": "no longer written",
  "takeoffs.fileId": "never written",
  "offers.signature.imageId": "never written",
  "invoices.efactura.responseStorageId": "never written",
} as const;

/**
 * Whether a stored file is a firm's file, logo, someone's photo or a norms
 * import; `imports` holds the files of the imports started since it was.
 */
async function isKept(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  imports: Set<Id<"_storage">>,
) {
  if (imports.has(storageId)) {
    return true;
  }
  const file = await ctx.db
    .query("files")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .first();
  const photo = await ctx.db
    .query("users")
    .withIndex("by_imageId", (q) => q.eq("imageId", storageId))
    .first();
  const logo = await ctx.db
    .query("organizations")
    .withIndex("by_logoId", (q) => q.eq("logoId", storageId))
    .first();
  return file !== null || photo !== null || logo !== null;
}

/** Every hour: starts deleting the uploads nobody claimed. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    await ctx.scheduler.runAfter(0, internal.accounts.uploads.deleteUnclaimed, {
      from: now - LOOKBACK_MS,
      to: now - GRACE_MS,
      cursor: null,
    });
    return null;
  },
});

/**
 * Deletes the files stored between `from` and `to` that nobody claimed, a
 * batch at a time.
 */
export const deleteUnclaimed = internalMutation({
  args: {
    from: v.number(),
    to: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) =>
        q.gte("_creationTime", args.from).lt("_creationTime", args.to),
      )
      .paginate({ numItems: BATCH, cursor: args.cursor });
    // An import starts right after its file is uploaded.
    const imports = await ctx.db
      .query("normImports")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.from))
      .take(MAX_IMPORTS);
    const importFiles = new Set(imports.map((normImport) => normImport.fileId));
    // Had it found as many as it reads, some might be missing: it deletes
    // nothing then.
    if (imports.length < MAX_IMPORTS) {
      for (const stored of batch.page) {
        if (!(await isKept(ctx, stored._id, importFiles))) {
          await ctx.storage.delete(stored._id);
        }
      }
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.accounts.uploads.deleteUnclaimed,
        {
          ...args,
          cursor: batch.continueCursor,
        },
      );
    }
    return null;
  },
});

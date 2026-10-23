import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireFirmDoc, requireMember } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { filePurpose } from "./validators";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
// The app claims an upload right after it ends: as a firm's file, its logo or
// someone's photo.
const CLAIM_WINDOW_MS = 10 * 60 * 1000;

/**
 * A file uploaded in the last few minutes that isn't one of a firm's files
 * yet, for the upload that just ended to claim. Members read their firm's
 * storage ids, so an older file counts as not found: nobody, not even a
 * former member, can take a firm's file, logo or someone's photo by its id.
 */
export async function unclaimedUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
) {
  const stored = await ctx.db.system.get("_storage", storageId);
  if (!stored || Date.now() - stored._creationTime > CLAIM_WINDOW_MS) {
    throw notFound("file");
  }
  const taken = await ctx.db
    .query("files")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .first();
  if (taken) {
    throw appError("in_use", "file");
  }
  return stored;
}

/** An upload URL for a firm's file. Register the upload with `register`. */
export const generateUploadUrl = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Records a file just uploaded as the firm's. A stored file can be registered
 * once, right after its upload, so nobody can claim another firm's file by
 * its id.
 */
export const register = mutation({
  args: {
    organizationId: v.id("organizations"),
    storageId: v.id("_storage"),
    name: v.string(),
    purpose: filePurpose,
    estimateId: v.optional(v.id("estimates")),
  },
  returns: v.id("files"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const stored = await unclaimedUpload(ctx, args.storageId);
    if (stored.size > MAX_FILE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw invalid("size");
    }
    if (args.estimateId) {
      const estimate = await ctx.db.get("estimates", args.estimateId);
      if (!estimate || estimate.organizationId !== args.organizationId) {
        throw notFound("estimate");
      }
    }
    const name = args.name.trim().slice(0, 255) || "fisier";
    return await ctx.db.insert("files", {
      organizationId: args.organizationId,
      storageId: args.storageId,
      name,
      contentType: stored.contentType,
      size: stored.size,
      purpose: args.purpose,
      estimateId: args.estimateId,
      uploadedBy: userId,
    });
  },
});

/** A firm's files, or one Deviz's, newest first. */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    estimateId: v.optional(v.id("estimates")),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const estimateId = args.estimateId;
    const files = estimateId
      ? await ctx.db
          .query("files")
          .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
          .order("desc")
          .take(200)
      : await ctx.db
          .query("files")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", args.organizationId),
          )
          .order("desc")
          .take(200);
    return files.filter((file) => file.organizationId === args.organizationId);
  },
});

export const getUrl = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(ctx, "files", args.fileId);
    return await ctx.storage.getUrl(doc.storageId);
  },
});

export const remove = mutation({
  args: { fileId: v.id("files") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(ctx, "files", args.fileId);
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete("files", doc._id);
    return null;
  },
});

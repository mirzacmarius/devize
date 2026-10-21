import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireFirmDoc, requireMember } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { filePurpose } from "./validators";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

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
 * Records an uploaded file as the firm's. A stored file can be registered
 * once, so nobody can claim another firm's upload by its id.
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
    const stored = await ctx.db.system.get("_storage", args.storageId);
    if (!stored) {
      throw notFound("file");
    }
    if (stored.size > MAX_FILE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw invalid("size");
    }
    const taken = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (taken) {
      throw appError("in_use", "file");
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

import { getAuthUserId } from "@convex-dev/auth/server";
import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { markups } from "../estimates/validators";
import { getMembership, requireMember, requireUserId } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import { cleanCui, optionalText } from "./identifiers";
import { memberRole, organizationKind } from "./validators";

// CAM 2.25% on labour; 10% indirect costs and 5% profit are common starting
// points; VAT is 21% since August 2025.
export const standardMarkups: Infer<typeof markups> = {
  cam: 2.25,
  indirect: 10,
  profit: 5,
  vat: 21,
};

export const MAX_FIRMS_PER_USER = 20;
// A logo goes on offers and forms: a picture those can show, and not a big one.
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function cleanName(name: string): string {
  const result = name.trim();
  if (!result || result.length > 200) {
    throw invalid("name");
  }
  return result;
}

export function checkMarkups(value: Infer<typeof markups>) {
  for (const [name, rate] of Object.entries(value)) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw invalid(`markups.${name}`);
    }
  }
}

/**
 * Creates a firm owned by `userId`, which opens first for them. A Producător's
 * firm is created this way when someone claims its profile.
 */
export async function insertFirm(
  ctx: MutationCtx,
  userId: Id<"users">,
  fields: {
    name: string;
    kind?: Doc<"organizations">["kind"];
    cui?: string;
    county?: string;
    vatPayer?: boolean;
    manufacturerId?: Id<"manufacturers">;
  },
): Promise<Id<"organizations">> {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(MAX_FIRMS_PER_USER);
  if (memberships.length >= MAX_FIRMS_PER_USER) {
    throw invalid("organizations");
  }
  const vatPayer = fields.vatPayer ?? true;
  const cui = optionalText(fields.cui);
  const organizationId = await ctx.db.insert("organizations", {
    name: cleanName(fields.name),
    kind: fields.kind ?? "contractor",
    cui: cui ? cleanCui(cui) : undefined,
    county: optionalText(fields.county, 50),
    vatPayer,
    defaultMarkups: { ...standardMarkups, vat: vatPayer ? 21 : 0 },
    manufacturerId: fields.manufacturerId,
    lastEstimateNumber: 0,
    createdBy: userId,
  });
  await ctx.db.insert("memberships", {
    organizationId,
    userId,
    role: "owner",
    lastActiveAt: Date.now(),
  });
  return organizationId;
}

/** Creates a firm with the signed-in user as its owner. */
export const create = mutation({
  args: {
    name: v.string(),
    kind: v.optional(organizationKind),
    cui: v.optional(v.string()),
    county: v.optional(v.string()),
    vatPayer: v.optional(v.boolean()),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await insertFirm(ctx, userId, args);
  },
});

/** The signed-in user's firms, the one they used last first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(MAX_FIRMS_PER_USER);
    const firms = [];
    for (const membership of memberships) {
      const firm = await ctx.db.get("organizations", membership.organizationId);
      if (firm) {
        firms.push({ firm, membership });
      }
    }
    // The firm used last comes first. Two can be used in the same millisecond,
    // such as a firm created and another joined right after: the membership
    // made later wins.
    firms.sort(
      (a, b) =>
        b.membership.lastActiveAt - a.membership.lastActiveAt ||
        b.membership._creationTime - a.membership._creationTime,
    );
    return firms.map(({ firm, membership }) => ({
      _id: firm._id,
      name: firm.name,
      kind: firm.kind,
      // The Producător whose profile the firm holds.
      manufacturerId: firm.manufacturerId,
      role: membership.role,
      lastActiveAt: membership.lastActiveAt,
    }));
  },
});

export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { membership } = await requireMember(ctx, args.organizationId);
    const firm = await ctx.db.get("organizations", args.organizationId);
    if (!firm) {
      throw notFound("organization");
    }
    return {
      ...firm,
      role: membership.role,
      logoUrl: firm.logoId ? await ctx.storage.getUrl(firm.logoId) : null,
    };
  },
});

/** Marks the firm the user works in now, so it opens first next time. */
export const setActive = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { membership } = await requireMember(ctx, args.organizationId);
    await ctx.db.patch("memberships", membership._id, {
      lastActiveAt: Date.now(),
    });
    return null;
  },
});

export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    cui: v.optional(v.string()),
    tradeRegister: v.optional(v.string()),
    address: v.optional(v.string()),
    county: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    vatPayer: v.optional(v.boolean()),
    defaultMarkups: v.optional(markups),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    const firm = await ctx.db.get("organizations", args.organizationId);
    if (!firm) {
      throw notFound("organization");
    }
    const patch: Partial<Doc<"organizations">> = {};
    if (args.name !== undefined) {
      patch.name = cleanName(args.name);
    }
    if (args.cui !== undefined) {
      const cui = optionalText(args.cui);
      patch.cui = cui ? cleanCui(cui) : undefined;
    }
    if (args.tradeRegister !== undefined) {
      patch.tradeRegister = optionalText(args.tradeRegister, 50);
    }
    if (args.address !== undefined) {
      patch.address = optionalText(args.address);
    }
    if (args.county !== undefined) {
      patch.county = optionalText(args.county, 50);
    }
    if (args.email !== undefined) {
      patch.email = optionalText(args.email, 200);
    }
    if (args.phone !== undefined) {
      patch.phone = optionalText(args.phone, 50);
    }
    if (args.vatPayer !== undefined) {
      patch.vatPayer = args.vatPayer;
    }
    if (args.defaultMarkups) {
      checkMarkups(args.defaultMarkups);
      patch.defaultMarkups = args.defaultMarkups;
    } else if (
      args.vatPayer &&
      !firm.vatPayer &&
      firm.defaultMarkups.vat === 0
    ) {
      // A firm that starts charging VAT charges it on its new devize too.
      patch.defaultMarkups = {
        ...firm.defaultMarkups,
        vat: standardMarkups.vat,
      };
    }
    await ctx.db.patch("organizations", firm._id, patch);
    return null;
  },
});

/**
 * Sets the firm's logo to an uploaded PNG, JPEG or WebP picture, or removes
 * it, deleting the logo it replaces. A file registered as one of the firm's
 * documents can't become the logo, since replacing the logo deletes it.
 */
export const setLogo = mutation({
  args: {
    organizationId: v.id("organizations"),
    storageId: v.union(v.id("_storage"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    const firm = await ctx.db.get("organizations", args.organizationId);
    if (!firm) {
      throw notFound("organization");
    }
    const storageId = args.storageId;
    if (storageId && storageId !== firm.logoId) {
      const stored = await ctx.db.system.get("_storage", storageId);
      if (!stored) {
        throw notFound("file");
      }
      const registered = await ctx.db
        .query("files")
        .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
        .first();
      if (registered) {
        throw appError("in_use", "file");
      }
      if (
        !LOGO_TYPES.includes(stored.contentType ?? "") ||
        stored.size > MAX_LOGO_BYTES
      ) {
        throw invalid("logo");
      }
    }
    if (firm.logoId && firm.logoId !== args.storageId) {
      await ctx.storage.delete(firm.logoId);
    }
    await ctx.db.patch("organizations", firm._id, {
      logoId: args.storageId ?? undefined,
    });
    return null;
  },
});

export const listMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organizationId_and_userId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(200);
    const members = [];
    for (const membership of memberships) {
      const user = await ctx.db.get("users", membership.userId);
      if (user) {
        members.push({
          userId: user._id,
          name: user.username || user.name,
          email: user.email,
          avatarUrl: user.imageId
            ? await ctx.storage.getUrl(user.imageId)
            : user.image,
          role: membership.role,
        });
      }
    }
    return members;
  },
});

async function owners(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(200);
  return memberships.filter((membership) => membership.role === "owner");
}

/** Changes a member's role. Only owners do this, and a firm keeps one owner. */
export const setMemberRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: memberRole,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "owner");
    const membership = await getMembership(
      ctx,
      args.organizationId,
      args.userId,
    );
    if (!membership) {
      throw notFound("member");
    }
    if (
      membership.role === "owner" &&
      args.role !== "owner" &&
      (await owners(ctx, args.organizationId)).length === 1
    ) {
      throw appError("in_use", "last_owner");
    }
    await ctx.db.patch("memberships", membership._id, { role: args.role });
    return null;
  },
});

/**
 * Removes a member, or lets a member leave. Admins remove members, only owners
 * remove other owners, and the last owner can't leave.
 */
export const removeMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, membership: own } = await requireMember(
      ctx,
      args.organizationId,
    );
    const membership =
      args.userId === userId
        ? own
        : await getMembership(ctx, args.organizationId, args.userId);
    if (!membership) {
      throw notFound("member");
    }
    if (args.userId !== userId) {
      await requireMember(
        ctx,
        args.organizationId,
        membership.role === "owner" ? "owner" : "admin",
      );
    }
    if (
      membership.role === "owner" &&
      (await owners(ctx, args.organizationId)).length === 1
    ) {
      throw appError("in_use", "last_owner");
    }
    await ctx.db.delete("memberships", membership._id);
    return null;
  },
});

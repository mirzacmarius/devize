import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { appError, invalid, notFound } from "../lib/errors";
import { requireSuperAdmin } from "../lib/roles";
import { normalizeText } from "../lib/text";
import { isVisible } from "./access";
import { claimUrl, createClaimLink } from "./claimLinks";
import { cleanDomain, domainOf } from "./domains";
import { grantClaim } from "./handover";

// Domains one producer can have.
const MAX_DOMAINS = 10;
// Norms withdrawn per run when a profile is taken down.
const WITHDRAW_BATCH = 100;

async function userName(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get("users", userId);
  return user?.name || user?.username || null;
}

/** The host of a website as typed, such as "producator.ro", or null. */
function websiteDomain(website: string | undefined): string | null {
  if (!website) {
    return null;
  }
  try {
    const url = new URL(
      website.includes("://") ? website : `https://${website}`,
    );
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Hints for checking a manual claim by hand. Neither proves anything alone:
 * an address can sit on a look-alike domain, and CUIs are public.
 */
function signals(
  claim: Doc<"manufacturerClaims">,
  manufacturer: Doc<"manufacturers">,
) {
  const site = websiteDomain(manufacturer.website);
  const domain = domainOf(claim.email);
  const anafName = claim.anaf?.name ? normalizeText(claim.anaf.name) : null;
  // The first word of each of the producer's names, after a leading "SC".
  const names = [
    manufacturer.name,
    manufacturer.legalName,
    manufacturer.displayName,
  ]
    .filter((name): name is string => Boolean(name))
    .map(
      (name) =>
        normalizeText(name)
          .replace(/^s c |^sc /, "")
          .split(" ")[0],
    )
    .filter((word): word is string => word !== undefined && word.length >= 3);
  return {
    // The address is on the producer's website's domain or a subdomain of it.
    emailMatchesWebsite:
      site !== null && (domain === site || domain.endsWith(`.${site}`)),
    // ANAF's name for the CUI starts with a word of the producer's name.
    anafNameMatches:
      anafName === null ? null : names.some((word) => anafName.includes(word)),
    cuiMatches:
      claim.cui !== undefined && manufacturer.cui !== undefined
        ? claim.cui === manufacturer.cui.replace(/^RO/i, "").trim()
        : null,
  };
}

/**
 * Who holds a Producător's profile and how it can be claimed: its domains,
 * the claim links out, and the claims and removal requests about it.
 */
export const forManufacturer = query({
  args: { manufacturerId: v.id("manufacturers") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      return null;
    }
    const holder = await ctx.db
      .query("organizations")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .first();
    const domains = await ctx.db
      .query("manufacturerDomains")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .take(MAX_DOMAINS);
    const links = await ctx.db
      .query("claimLinks")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .order("desc")
      .take(50);
    const claims = await ctx.db
      .query("manufacturerClaims")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .order("desc")
      .take(50);
    const removals = await ctx.db
      .query("removalRequests")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .order("desc")
      .take(50);
    return {
      claimStatus: manufacturer.claimStatus,
      visible: await isVisible(ctx, manufacturer),
      holder: holder ? { _id: holder._id, name: holder.name } : null,
      domains: domains.map((row) => ({ _id: row._id, domain: row.domain })),
      links: links.map((link) => ({
        _id: link._id,
        email: link.email,
        token: link.token,
        url: claimUrl(link.token),
        expiresAt: link.expiresAt,
        usedAt: link.usedAt,
        createdAt: link._creationTime,
      })),
      claims: await Promise.all(
        claims.map(async (claim) => ({
          _id: claim._id,
          method: claim.method,
          status: claim.status,
          email: claim.email,
          name: await userName(ctx, claim.userId),
          createdAt: claim._creationTime,
          decidedAt: claim.decidedAt,
        })),
      ),
      removals: removals.map((request) => ({
        _id: request._id,
        status: request.status,
        email: request.email,
        createdAt: request._creationTime,
      })),
    };
  },
});

/**
 * Claims and removal requests waiting for a super admin, oldest first, each
 * with what helps to decide it.
 */
export const queue = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const claims = await ctx.db
      .query("manufacturerClaims")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    const removals = await ctx.db
      .query("removalRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    const manufacturers = new Map<Id<"manufacturers">, Doc<"manufacturers">>();
    const manufacturerOf = async (manufacturerId: Id<"manufacturers">) => {
      const known = manufacturers.get(manufacturerId);
      if (known) {
        return known;
      }
      const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
      if (manufacturer) {
        manufacturers.set(manufacturerId, manufacturer);
      }
      return manufacturer;
    };
    const claimRows = [];
    for (const claim of claims) {
      const manufacturer = await manufacturerOf(claim.manufacturerId);
      if (!manufacturer) {
        continue;
      }
      const firm = claim.organizationId
        ? await ctx.db.get("organizations", claim.organizationId)
        : null;
      claimRows.push({
        _id: claim._id,
        manufacturerId: manufacturer._id,
        manufacturerName: manufacturer.name,
        website: manufacturer.website,
        claimed: manufacturer.claimStatus === "claimed",
        name: await userName(ctx, claim.userId),
        email: claim.email,
        message: claim.message,
        cui: claim.cui,
        anaf: claim.anaf,
        firmName: firm?.name,
        createdAt: claim._creationTime,
        signals: signals(claim, manufacturer),
      });
    }
    const removalRows = [];
    for (const request of removals) {
      const manufacturer = await manufacturerOf(request.manufacturerId);
      if (!manufacturer) {
        continue;
      }
      removalRows.push({
        _id: request._id,
        manufacturerId: manufacturer._id,
        manufacturerName: manufacturer.name,
        name: await userName(ctx, request.userId),
        email: request.email,
        message: request.message,
        createdAt: request._creationTime,
      });
    }
    return { claims: claimRows, removals: removalRows };
  },
});

/** How many claims and removal requests wait, for the admin menu. */
export const pendingCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const claims = await ctx.db
      .query("manufacturerClaims")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    const removals = await ctx.db
      .query("removalRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    return claims.length + removals.length;
  },
});

/**
 * A claim link for the address the producer wrote from, to paste into the
 * thank-you email. The same address gets the link already out while it has
 * two weeks left.
 */
export const createLink = mutation({
  args: { manufacturerId: v.id("manufacturers"), email: v.string() },
  returns: v.object({
    token: v.string(),
    url: v.union(v.string(), v.null()),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    return await createClaimLink(ctx, { ...args, createdBy: admin._id });
  },
});

/** Revokes a claim link, used or not. */
export const revokeLink = mutation({
  args: { linkId: v.id("claimLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    if (await ctx.db.get("claimLinks", args.linkId)) {
      await ctx.db.delete("claimLinks", args.linkId);
    }
    return null;
  },
});

/**
 * Adds an email domain of the producer's, typed by a super admin from the
 * producer's own site or emails. Free mail services are refused, and a domain
 * belongs to one producer.
 */
export const addDomain = mutation({
  args: { manufacturerId: v.id("manufacturers"), domain: v.string() },
  returns: v.id("manufacturerDomains"),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    if (!(await ctx.db.get("manufacturers", args.manufacturerId))) {
      throw notFound("manufacturer");
    }
    const domain = cleanDomain(args.domain);
    const existing = await ctx.db
      .query("manufacturerDomains")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .unique();
    if (existing) {
      if (existing.manufacturerId !== args.manufacturerId) {
        throw appError("in_use", "domain");
      }
      return existing._id;
    }
    const domains = await ctx.db
      .query("manufacturerDomains")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", args.manufacturerId),
      )
      .take(MAX_DOMAINS);
    if (domains.length >= MAX_DOMAINS) {
      throw invalid("domains");
    }
    return await ctx.db.insert("manufacturerDomains", {
      manufacturerId: args.manufacturerId,
      domain,
      addedBy: admin._id,
    });
  },
});

export const removeDomain = mutation({
  args: { domainId: v.id("manufacturerDomains") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    if (await ctx.db.get("manufacturerDomains", args.domainId)) {
      await ctx.db.delete("manufacturerDomains", args.domainId);
    }
    return null;
  },
});

async function pendingClaim(
  ctx: QueryCtx,
  claimId: Id<"manufacturerClaims">,
): Promise<Doc<"manufacturerClaims">> {
  const claim = await ctx.db.get("manufacturerClaims", claimId);
  if (claim?.status !== "pending") {
    throw notFound("claim");
  }
  return claim;
}

/**
 * Approves a manual claim: the profile goes to the firm the person chose, or
 * to a new firm with them as its owner.
 */
export const approve = mutation({
  args: { claimId: v.id("manufacturerClaims") },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const claim = await pendingClaim(ctx, args.claimId);
    const manufacturer = await ctx.db.get(
      "manufacturers",
      claim.manufacturerId,
    );
    if (!manufacturer || !(await ctx.db.get("users", claim.userId))) {
      throw notFound("claim");
    }
    return await grantClaim(ctx, {
      manufacturer,
      claimant: { userId: claim.userId, email: claim.email },
      method: "manual",
      organizationId: claim.organizationId,
      claim,
      decidedBy: admin._id,
    });
  },
});

/** Turns a claim down, with a reason the person sees. */
export const reject = mutation({
  args: { claimId: v.id("manufacturerClaims"), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const claim = await pendingClaim(ctx, args.claimId);
    await ctx.db.patch("manufacturerClaims", claim._id, {
      status: "rejected",
      reason: optionalText(args.reason),
      decidedBy: admin._id,
      decidedAt: Date.now(),
    });
    return null;
  },
});

/** Asks ANAF about a claim's CUI again. */
export const checkAnaf = mutation({
  args: { claimId: v.id("manufacturerClaims") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const claim = await pendingClaim(ctx, args.claimId);
    if (!claim.cui) {
      throw invalid("cui");
    }
    await ctx.scheduler.runAfter(0, internal.producers.anaf.lookup, {
      claimId: claim._id,
    });
    return null;
  },
});

async function pendingRemoval(
  ctx: QueryCtx,
  requestId: Id<"removalRequests">,
): Promise<Doc<"removalRequests">> {
  const request = await ctx.db.get("removalRequests", requestId);
  if (request?.status !== "pending") {
    throw notFound("removal");
  }
  return request;
}

/**
 * Takes a profile down as asked: the producer is excluded, which hides the
 * profile and stops outreach, and its published norms leave the catalog.
 * Devize that used them keep their copies. Answers every waiting request
 * about the same producer.
 */
export const remove = mutation({
  args: { requestId: v.id("removalRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const request = await pendingRemoval(ctx, args.requestId);
    const manufacturer = await ctx.db.get(
      "manufacturers",
      request.manufacturerId,
    );
    if (!manufacturer) {
      throw notFound("manufacturer");
    }
    await ctx.db.patch("manufacturers", manufacturer._id, {
      status: "excluded",
    });
    await ctx.scheduler.runAfter(0, internal.producers.admin.withdrawNorms, {
      manufacturerId: manufacturer._id,
    });
    const now = Date.now();
    const waiting = ctx.db
      .query("removalRequests")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      );
    for await (const other of waiting) {
      if (other.status === "pending") {
        await ctx.db.patch("removalRequests", other._id, {
          status: "removed",
          decidedBy: admin._id,
          decidedAt: now,
        });
      }
    }
    return null;
  },
});

/** Leaves a profile up despite a removal request. */
export const dismiss = mutation({
  args: { requestId: v.id("removalRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const request = await pendingRemoval(ctx, args.requestId);
    await ctx.db.patch("removalRequests", request._id, {
      status: "dismissed",
      decidedBy: admin._id,
      decidedAt: Date.now(),
    });
    return null;
  },
});

/** Archives a removed producer's published norms, a batch per run. */
export const withdrawNorms = internalMutation({
  args: { manufacturerId: v.id("manufacturers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const norms = await ctx.db
      .query("norms")
      .withIndex("by_manufacturerId_and_status_and_code", (q) =>
        q.eq("manufacturerId", args.manufacturerId).eq("status", "published"),
      )
      .take(WITHDRAW_BATCH);
    const now = Date.now();
    for (const norm of norms) {
      await ctx.db.patch("norms", norm._id, {
        status: "archived",
        updatedAt: now,
      });
    }
    if (norms.length === WITHDRAW_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.producers.admin.withdrawNorms,
        args,
      );
    }
    return null;
  },
});

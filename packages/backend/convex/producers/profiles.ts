import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { isProducer, requireUserId } from "../lib/access";
import { getSuperAdmin } from "../lib/roles";
import { isVisible, viewerEmail } from "./access";
import { canWriteDetails, detailsOf } from "./details";
import { domainOf } from "./domains";
import { linkableFirms } from "./handover";

// Norms and products a profile lists; the catalog has the rest.
const MAX_LISTED = 500;
// Producers the directory lists.
const MAX_PRODUCERS = 300;

function displayName(manufacturer: Doc<"manufacturers">): string {
  return manufacturer.displayName ?? manufacturer.name;
}

/**
 * A Producător's profile: its name, published norms and products, and how
 * the signed-in user can claim it. Only what the producer would publish
 * itself: never contacts, notes or research. Null for a profile that isn't
 * shown, except to Devize staff and the producer's own firm.
 */
export const get = query({
  args: { manufacturerId: v.id("manufacturers") },
  handler: async (ctx, args) => {
    const viewer = await viewerEmail(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      return null;
    }
    const producer = await isProducer(ctx, manufacturer._id, viewer.userId);
    const visible = await isVisible(ctx, manufacturer);
    const superAdmin = (await getSuperAdmin(ctx)) !== null;
    if (!visible && !producer && !superAdmin) {
      return null;
    }
    const claimed = manufacturer.claimStatus === "claimed";
    const norms = await ctx.db
      .query("norms")
      .withIndex("by_manufacturerId_and_status_and_code", (q) =>
        q.eq("manufacturerId", manufacturer._id).eq("status", "published"),
      )
      .take(MAX_LISTED);
    const products = await ctx.db
      .query("products")
      .withIndex("by_manufacturerId_and_status", (q) =>
        q.eq("manufacturerId", manufacturer._id).eq("status", "published"),
      )
      .take(MAX_LISTED);
    const holder = claimed
      ? await ctx.db
          .query("organizations")
          .withIndex("by_manufacturerId", (q) =>
            q.eq("manufacturerId", manufacturer._id),
          )
          .first()
      : null;

    // What the viewer can do about the profile.
    const domain = viewer.verified
      ? await ctx.db
          .query("manufacturerDomains")
          .withIndex("by_domain", (q) =>
            q.eq("domain", domainOf(viewer.verified ?? "")),
          )
          .unique()
      : null;
    const claims = await ctx.db
      .query("manufacturerClaims")
      .withIndex("by_userId", (q) => q.eq("userId", viewer.userId))
      .order("desc")
      .take(100);
    const ownClaim = claims.find(
      (claim) => claim.manufacturerId === manufacturer._id,
    );
    const removals = await ctx.db
      .query("removalRequests")
      .withIndex("by_userId", (q) => q.eq("userId", viewer.userId))
      .order("desc")
      .take(100);
    const canClaim =
      !claimed && visible && !producer && viewer.verified !== null;
    // The producer's norms still being written or checked, for its own firm
    // and Devize staff.
    const unpublished =
      producer || superAdmin
        ? [
            ...(await ctx.db
              .query("norms")
              .withIndex("by_manufacturerId_and_status_and_code", (q) =>
                q.eq("manufacturerId", manufacturer._id).eq("status", "review"),
              )
              .take(MAX_LISTED)),
            ...(await ctx.db
              .query("norms")
              .withIndex("by_manufacturerId_and_status_and_code", (q) =>
                q.eq("manufacturerId", manufacturer._id).eq("status", "draft"),
              )
              .take(MAX_LISTED)),
          ]
        : [];

    return {
      _id: manufacturer._id,
      name: displayName(manufacturer),
      claimed,
      visible,
      // A claimed profile shows the producer's own logo; an unclaimed one
      // never shows a logo.
      logoUrl: holder?.logoId ? await ctx.storage.getUrl(holder.logoId) : null,
      editions: [
        ...new Set(
          norms.flatMap((norm) => (norm.edition ? [norm.edition] : [])),
        ),
      ],
      norms: norms.map((norm) => ({
        _id: norm._id,
        code: norm.code,
        baseCode: norm.baseCode,
        title: norm.title,
        unit: norm.unit,
        category: norm.category,
        edition: norm.edition,
        confirmed: norm.confirmedAt !== undefined,
      })),
      moreNorms: norms.length === MAX_LISTED,
      drafts: unpublished.map((norm) => ({
        _id: norm._id,
        code: norm.code,
        title: norm.title,
        status: norm.status,
        reviewNote: norm.reviewNote,
        // Drafted by Devize AI from a data sheet, still to be checked.
        fromDatasheet: norm.datasheetImportId !== undefined,
        updatedAt: norm.updatedAt,
      })),
      // What the producer wrote about itself, once it claimed the profile.
      details: holder ? await detailsOf(ctx, manufacturer._id) : null,
      products: products.map((product) => ({
        _id: product._id,
        name: product.name,
        brand: product.brand,
        unit: product.unit,
        packageLabel: product.packageLabel,
      })),
      viewer: {
        isProducer: producer,
        canEditDetails:
          holder !== null &&
          (await canWriteDetails(ctx, manufacturer._id, viewer.userId)),
        email: viewer.verified,
        canClaim,
        // A verified address on one of the producer's domains claims at
        // once; anyone else asks and waits for review.
        claimMethod: canClaim
          ? domain?.manufacturerId === manufacturer._id
            ? ("domain" as const)
            : ("manual" as const)
          : null,
        firms: canClaim ? await linkableFirms(ctx, viewer.userId) : [],
        claim:
          ownClaim && ownClaim.status !== "approved"
            ? {
                _id: ownClaim._id,
                status: ownClaim.status,
                reason: ownClaim.reason,
                createdAt: ownClaim._creationTime,
                decidedAt: ownClaim.decidedAt,
              }
            : null,
        removalPending: removals.some(
          (request) =>
            request.manufacturerId === manufacturer._id &&
            request.status === "pending",
        ),
      },
    };
  },
});

/**
 * The producers whose profiles show in the app, by name, with whether they
 * claimed them and the edition of their norms.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const manufacturers = await ctx.db
      .query("manufacturers")
      .take(MAX_PRODUCERS);
    const rows = [];
    for (const manufacturer of manufacturers) {
      if (manufacturer.status === "excluded") {
        continue;
      }
      const norm = await ctx.db
        .query("norms")
        .withIndex("by_manufacturerId_and_status_and_code", (q) =>
          q.eq("manufacturerId", manufacturer._id).eq("status", "published"),
        )
        .first();
      if (norm) {
        rows.push({
          _id: manufacturer._id,
          name: displayName(manufacturer),
          claimed: manufacturer.claimStatus === "claimed",
          edition: norm.edition,
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ro"));
  },
});

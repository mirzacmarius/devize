import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { cleanEmail } from "../accounts/invitations";
import { getMembership, requireUserId } from "../lib/access";
import { forbidden, invalid, notFound } from "../lib/errors";

/** The firm that holds a Producător's profile, if one claimed it. */
export async function holderOf(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
) {
  return await ctx.db
    .query("organizations")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    )
    .first();
}

/** Whether the user is an owner or admin of the firm holding the profile. */
export async function canWriteDetails(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
  userId: Id<"users">,
): Promise<boolean> {
  const holder = await holderOf(ctx, manufacturerId);
  const membership = holder
    ? await getMembership(ctx, holder._id, userId)
    : null;
  return membership?.role === "owner" || membership?.role === "admin";
}

/** What the producer wrote about itself, for its profile. */
export async function detailsOf(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
) {
  const row = await ctx.db
    .query("producerDetails")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    )
    .unique();
  return row
    ? {
        about: row.about,
        website: row.website,
        contactName: row.contactName,
        contactEmail: row.contactEmail,
        contactPhone: row.contactPhone,
      }
    : null;
}

/** Deletes what a producer wrote, when its firm lets the profile go. */
export async function deleteDetails(
  ctx: MutationCtx,
  manufacturerId: Id<"manufacturers">,
) {
  const rows = ctx.db
    .query("producerDetails")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    );
  for await (const row of rows) {
    await ctx.db.delete("producerDetails", row._id);
  }
}

/** A site as typed, such as "producator.ro", as an https URL. */
function cleanWebsite(value: string | undefined): string | undefined {
  const text = optionalText(value, 200);
  if (!text) {
    return undefined;
  }
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!url.hostname.includes(".")) {
      throw invalid("website");
    }
    return url.toString();
  } catch {
    throw invalid("website");
  }
}

/** A phone number with at least six digits, as typed. */
function cleanPhone(value: string | undefined): string | undefined {
  const text = optionalText(value, 30);
  if (
    text &&
    (text.replace(/\D/g, "").length < 6 || /[^\d\s+().-]/.test(text))
  ) {
    throw invalid("phone");
  }
  return text;
}

/**
 * Writes what the producer says about itself on its profile. Only the owners
 * and admins of the firm holding the profile can.
 */
export const update = mutation({
  args: {
    manufacturerId: v.id("manufacturers"),
    about: v.optional(v.string()),
    website: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      throw notFound("manufacturer");
    }
    if (!(await canWriteDetails(ctx, manufacturer._id, userId))) {
      throw forbidden("manufacturer");
    }
    const email = optionalText(args.contactEmail, 200);
    const fields = {
      about: optionalText(args.about, 1000),
      website: cleanWebsite(args.website),
      contactName: optionalText(args.contactName, 100),
      contactEmail: email ? cleanEmail(email) : undefined,
      contactPhone: cleanPhone(args.contactPhone),
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("producerDetails")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      )
      .unique();
    if (existing) {
      await ctx.db.replace("producerDetails", existing._id, {
        manufacturerId: manufacturer._id,
        ...fields,
      });
    } else {
      await ctx.db.insert("producerDetails", {
        manufacturerId: manufacturer._id,
        ...fields,
      });
    }
    return null;
  },
});

import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireSuperAdmin } from "../lib/roles";
import {
  checkEmail,
  draftThanksEmail,
  getSender,
  rerenderDraft,
} from "./drafts";
import { hasBlockingIssue } from "./lib/emailTemplate";
import { isEmail, normalizeEmail } from "./lib/text";

// Statuses the pipeline moves past once a first email is approved or sent; a
// manufacturer further along (replied, norms received) keeps its status, and
// a thank-you for norms moves nothing.
const beforeApproval = new Set(["new", "review"]);
const beforeContact = new Set(["new", "review", "approved"]);

async function getMessage(ctx: MutationCtx, messageId: Id<"outreachMessages">) {
  const message = await ctx.db.get("outreachMessages", messageId);
  if (!message) {
    throw new ConvexError({ code: "not_found" });
  }
  return message;
}

/** Drafts waiting for approval and approved emails not sent yet. */
export const queue = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const messages: Doc<"outreachMessages">[] = [];
    for (const status of ["draft", "approved"] as const) {
      messages.push(
        ...(await ctx.db
          .query("outreachMessages")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(200)),
      );
    }
    return await Promise.all(
      messages.map(async (message) => {
        const manufacturer = await ctx.db.get(
          "manufacturers",
          message.manufacturerId,
        );
        return {
          ...message,
          manufacturerName: manufacturer?.name ?? "",
          confidence: manufacturer?.confidence,
        };
      }),
    );
  },
});

/** How many emails were marked sent since `since`, to keep to a daily pace. */
export const sentSince = query({
  args: { since: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const sent = await ctx.db
      .query("outreachMessages")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .order("desc")
      .take(500);
    return sent.filter((message) => (message.sentAt ?? 0) >= args.since).length;
  },
});

/**
 * Saves a person's changes to a draft. Editing an approved email takes it
 * back to draft, so it is approved again as it now reads.
 */
export const updateMessage = mutation({
  args: {
    messageId: v.id("outreachMessages"),
    to: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const message = await getMessage(ctx, args.messageId);
    if (message.status === "sent" || message.status === "rejected") {
      throw new ConvexError({ code: "not_editable" });
    }
    const to =
      args.to === undefined
        ? message.to
        : args.to.trim()
          ? normalizeEmail(args.to)
          : undefined;
    const email = {
      subject: args.subject ?? message.subject,
      body: args.body ?? message.body,
      to,
    };
    await ctx.db.patch("outreachMessages", message._id, {
      ...email,
      issues: await checkEmail(ctx, message.manufacturerId, {
        ...email,
        step: message.step,
        vars: message.vars,
      }),
      edited: true,
      status: "draft",
      approvedBy: undefined,
      approvedAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Sends the draft to one of the manufacturer's contacts instead. */
export const chooseContact = mutation({
  args: {
    messageId: v.id("outreachMessages"),
    contactId: v.id("manufacturerContacts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const message = await getMessage(ctx, args.messageId);
    const contact = await ctx.db.get("manufacturerContacts", args.contactId);
    if (!contact || contact.manufacturerId !== message.manufacturerId) {
      throw new ConvexError({ code: "not_found" });
    }
    if (message.status !== "draft") {
      throw new ConvexError({ code: "not_editable" });
    }
    const vars = {
      ...message.vars,
      address: contact.email,
      addressSourceUrl: contact.email
        ? contact.sourceUrl
        : (contact.url ?? contact.sourceUrl),
    };
    await ctx.db.patch("outreachMessages", message._id, {
      to: contact.email,
      vars,
    });
    await rerenderDraft(
      ctx,
      { ...message, to: contact.email, vars },
      admin._id,
    );
    return null;
  },
});

/** Renders the draft again from the template, dropping manual edits. */
export const rerender = mutation({
  args: { messageId: v.id("outreachMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const message = await getMessage(ctx, args.messageId);
    if (message.status !== "draft") {
      throw new ConvexError({ code: "not_editable" });
    }
    await rerenderDraft(ctx, message, admin._id);
    return null;
  },
});

/**
 * Drafts the thank-you to the person who sent the manufacturer's norms, with
 * a link that lets their address claim its profile in Devize (ADR 0018).
 */
export const draftThanks = mutation({
  args: { manufacturerId: v.id("manufacturers"), to: v.string() },
  returns: v.id("outreachMessages"),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const manufacturer = await ctx.db.get("manufacturers", args.manufacturerId);
    if (!manufacturer) {
      throw new ConvexError({ code: "not_found" });
    }
    return await draftThanksEmail(ctx, manufacturer, args.to, admin._id);
  },
});

/**
 * Approves a draft for sending. Refused while the draft breaks a rule: a
 * placeholder left, no opt-out line or signature, a banned phrase, or a
 * recipient on the suppression list.
 */
export const approve = mutation({
  args: { messageId: v.id("outreachMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const message = await getMessage(ctx, args.messageId);
    if (message.status !== "draft") {
      throw new ConvexError({ code: "not_editable" });
    }
    const issues = await checkEmail(ctx, message.manufacturerId, message);
    if (hasBlockingIssue(issues)) {
      await ctx.db.patch("outreachMessages", message._id, { issues });
      throw new ConvexError({ code: "blocked" });
    }
    await ctx.db.patch("outreachMessages", message._id, {
      status: "approved",
      issues,
      approvedBy: admin._id,
      approvedAt: Date.now(),
    });
    const manufacturer = await ctx.db.get(
      "manufacturers",
      message.manufacturerId,
    );
    if (
      message.step !== "thanks" &&
      manufacturer &&
      beforeApproval.has(manufacturer.status)
    ) {
      await ctx.db.patch("manufacturers", manufacturer._id, {
        status: "approved",
      });
    }
    return null;
  },
});

export const reject = mutation({
  args: { messageId: v.id("outreachMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const message = await getMessage(ctx, args.messageId);
    if (message.status === "sent") {
      throw new ConvexError({ code: "not_editable" });
    }
    await ctx.db.patch("outreachMessages", message._id, {
      status: "rejected",
      approvedBy: undefined,
      approvedAt: undefined,
    });
    return null;
  },
});

/**
 * Records that a person sent an approved email from their own mailbox. Devize
 * itself never sends outreach email.
 */
export const markSent = mutation({
  args: { messageId: v.id("outreachMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const message = await getMessage(ctx, args.messageId);
    if (message.status !== "approved") {
      throw new ConvexError({ code: "not_approved" });
    }
    const issues = await checkEmail(ctx, message.manufacturerId, message);
    if (issues.some((issue) => issue.code === "suppressed_recipient")) {
      await ctx.db.patch("outreachMessages", message._id, { issues });
      throw new ConvexError({ code: "blocked" });
    }
    await ctx.db.patch("outreachMessages", message._id, {
      status: "sent",
      sentBy: admin._id,
      sentAt: Date.now(),
    });
    const manufacturer = await ctx.db.get(
      "manufacturers",
      message.manufacturerId,
    );
    if (
      message.step !== "thanks" &&
      manufacturer &&
      beforeContact.has(manufacturer.status)
    ) {
      await ctx.db.patch("manufacturers", manufacturer._id, {
        status: "contacted",
      });
    }
    return null;
  },
});

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await getSender(ctx);
  },
});

/**
 * The sender's name, phone and privacy page for the signature. Drafts nobody
 * edited are rendered again with them.
 */
export const updateSettings = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    privacyUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const fields = {
      firstName: args.firstName.trim() || undefined,
      lastName: args.lastName.trim() || undefined,
      phone: args.phone.trim() || undefined,
      privacyUrl: args.privacyUrl.trim() || undefined,
      updatedBy: admin._id,
    };
    const existing = await ctx.db.query("outreachSettings").first();
    if (existing) {
      await ctx.db.replace("outreachSettings", existing._id, fields);
    } else {
      await ctx.db.insert("outreachSettings", fields);
    }
    const drafts = await ctx.db
      .query("outreachMessages")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .take(200);
    for (const draft of drafts) {
      if (!draft.edited) {
        await rerenderDraft(ctx, draft, admin._id);
      }
    }
    return null;
  },
});

export const listSuppressed = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.query("suppressionList").order("desc").take(500);
  },
});

/**
 * Stops all contact with an address, or with a whole domain written as
 * "@domain.ro". When the request came from a manufacturer, it is marked
 * excluded and its open drafts are rejected.
 */
export const suppress = mutation({
  args: {
    value: v.string(),
    reason: v.optional(v.string()),
    manufacturerId: v.optional(v.id("manufacturers")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const value = normalizeEmail(args.value);
    const valid = value.startsWith("@")
      ? /^@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(value)
      : isEmail(value);
    if (!valid) {
      throw new ConvexError({ code: "invalid", field: "value" });
    }
    const existing = await ctx.db
      .query("suppressionList")
      .withIndex("by_value", (q) => q.eq("value", value))
      .first();
    if (!existing) {
      await ctx.db.insert("suppressionList", {
        value,
        reason: args.reason?.trim() || undefined,
        manufacturerId: args.manufacturerId,
        addedBy: admin._id,
      });
    }
    if (args.manufacturerId) {
      await ctx.db.patch("manufacturers", args.manufacturerId, {
        status: "excluded",
      });
      const messages = ctx.db
        .query("outreachMessages")
        .withIndex("by_manufacturerId", (q) =>
          q.eq("manufacturerId", args.manufacturerId!),
        );
      for await (const message of messages) {
        if (message.status === "draft" || message.status === "approved") {
          await ctx.db.patch("outreachMessages", message._id, {
            status: "rejected",
          });
        }
      }
    }
    return null;
  },
});

export const unsuppress = mutation({
  args: { suppressionId: v.id("suppressionList") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.delete("suppressionList", args.suppressionId);
    return null;
  },
});

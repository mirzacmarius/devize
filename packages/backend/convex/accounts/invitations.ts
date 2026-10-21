import { getAuthUserId } from "@convex-dev/auth/server";
import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { getMembership, requireMember, requireUserId } from "../lib/access";
import { emailHtml, escapeHtml, sendEmail } from "../lib/email";
import { appError, invalid, notFound } from "../lib/errors";
import { MAX_FIRMS_PER_USER } from "./organizations";
import { invitedRole } from "./validators";

// An invitation lasts a week; after that, an admin invites again.
export const INVITATION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// Invitations a firm can have waiting at once.
const MAX_PENDING = 50;
// Inviting the same address again sends the email again at most this often.
const RESEND_INTERVAL_MS = 10 * 60 * 1000;
// Invitation emails one person can have sent in a day; past that, they share
// the links themselves, so nobody can use Devize to mail strangers in bulk.
export const EMAILS_PER_DAY = 20;

/** An address as people sign in with it: trimmed and lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cleanEmail(email: string): string {
  const result = normalizeEmail(email);
  if (result.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw invalid("email");
  }
  return result;
}

/** 24 random bytes in hex: the secret part of an invitation's link. */
function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function signInEmail(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get("users", userId);
  return user?.email ? normalizeEmail(user.email) : null;
}

async function userName(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get("users", userId);
  return user?.username || user?.name || null;
}

/**
 * Counts an invitation email `userId` has sent, unless they had
 * EMAILS_PER_DAY sent in the last day already; says whether it may go.
 */
async function countEmail(
  ctx: MutationCtx,
  userId: Id<"users">,
  now: number,
): Promise<boolean> {
  const lastDay = await ctx.db
    .query("invitationEmails")
    .withIndex("by_userId_and_sentAt", (q) =>
      q.eq("userId", userId).gt("sentAt", now - DAY_MS),
    )
    .take(EMAILS_PER_DAY);
  if (lastDay.length >= EMAILS_PER_DAY) {
    return false;
  }
  const older = await ctx.db
    .query("invitationEmails")
    .withIndex("by_userId_and_sentAt", (q) =>
      q.eq("userId", userId).lte("sentAt", now - DAY_MS),
    )
    .take(50);
  for (const row of older) {
    await ctx.db.delete("invitationEmails", row._id);
  }
  await ctx.db.insert("invitationEmails", { userId, sentAt: now });
  return true;
}

/**
 * Invites someone to a firm by email, or invites them again: another week,
 * the role given now and the email again, at most every 10 minutes. Admins
 * and owners invite, with up to 20 emails a day each. Returns the token of
 * the invitation's link.
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: invitedRole,
  },
  returns: v.object({ invitationId: v.id("invitations"), token: v.string() }),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId, "admin");
    const email = cleanEmail(args.email);
    const sameEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .take(10);
    for (const user of sameEmail) {
      if (await getMembership(ctx, args.organizationId, user._id)) {
        throw appError("in_use", "member");
      }
    }
    const now = Date.now();
    const expiresAt = now + INVITATION_DAYS * DAY_MS;
    // Without Resend, nobody gets an email: the admin shares the link.
    const canEmail = Boolean(env.AUTH_RESEND_KEY?.trim() && siteUrl());
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_organizationId_and_email", (q) =>
        q.eq("organizationId", args.organizationId).eq("email", email),
      )
      .unique();
    let invitationId: Id<"invitations">;
    let token: string;
    const send =
      canEmail &&
      (!existing || now - existing.sentAt >= RESEND_INTERVAL_MS) &&
      (await countEmail(ctx, userId, now));
    if (existing) {
      invitationId = existing._id;
      token = existing.token;
      await ctx.db.patch("invitations", existing._id, {
        role: args.role,
        invitedBy: userId,
        expiresAt,
        ...(send ? { sentAt: now, emailStatus: "sending" as const } : {}),
      });
    } else {
      const pending = await ctx.db
        .query("invitations")
        .withIndex("by_organizationId_and_email", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .take(MAX_PENDING);
      if (pending.length >= MAX_PENDING) {
        throw invalid("invitations");
      }
      token = newToken();
      invitationId = await ctx.db.insert("invitations", {
        organizationId: args.organizationId,
        email,
        role: args.role,
        token,
        invitedBy: userId,
        expiresAt,
        sentAt: now,
        emailStatus: send ? "sending" : "not_sent",
      });
    }
    await ctx.scheduler.runAt(expiresAt, internal.accounts.invitations.expire, {
      invitationId,
    });
    if (send) {
      await ctx.scheduler.runAfter(
        0,
        internal.accounts.invitations.emailInvitation,
        { invitationId },
      );
    }
    return { invitationId, token };
  },
});

/** A firm's waiting invitations, the latest first, for its admins. */
export const listForOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organizationId_and_email", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(MAX_PENDING);
    const result = [];
    for (const invitation of invitations) {
      result.push({
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        emailStatus: invitation.emailStatus,
        invitedByName: await userName(ctx, invitation.invitedBy),
      });
    }
    return result.sort((a, b) => b.expiresAt - a.expiresAt);
  },
});

/** Takes an invitation back, so its link stops working. */
export const revoke = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get("invitations", args.invitationId);
    if (!invitation) {
      throw notFound("invitation");
    }
    await requireMember(ctx, invitation.organizationId, "admin");
    await ctx.db.delete("invitations", invitation._id);
    return null;
  },
});

/** Invitations to the signed-in user's address, from firms they're not in. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const email = userId ? await signInEmail(ctx, userId) : null;
    if (!userId || !email) {
      return [];
    }
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(20);
    const result = [];
    for (const invitation of invitations) {
      const firm = await ctx.db.get("organizations", invitation.organizationId);
      if (!firm || (await getMembership(ctx, firm._id, userId))) {
        continue;
      }
      result.push({
        _id: invitation._id,
        token: invitation.token,
        organizationName: firm.name,
        role: invitation.role,
        invitedByName: await userName(ctx, invitation.invitedBy),
      });
    }
    return result;
  },
});

/**
 * The invitation behind a link, for the page that accepts it, or null once
 * it was accepted, declined or revoked, or expired.
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    const firm = invitation
      ? await ctx.db.get("organizations", invitation.organizationId)
      : null;
    if (!invitation || !firm) {
      return null;
    }
    const email = await signInEmail(ctx, userId);
    return {
      _id: invitation._id,
      organizationId: firm._id,
      organizationName: firm.name,
      logoUrl: firm.logoId ? await ctx.storage.getUrl(firm.logoId) : null,
      role: invitation.role,
      email: invitation.email,
      invitedByName: await userName(ctx, invitation.invitedBy),
      signedInAs: email,
      forYou: email === invitation.email,
      isMember: (await getMembership(ctx, firm._id, userId)) !== null,
    };
  },
});

/**
 * Joins the firm an invitation is for, which then opens first. Only the
 * person invited accepts, signed in with the address invited; anyone else is
 * told the invitation doesn't exist.
 */
export const accept = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await ctx.db.get("invitations", args.invitationId);
    const now = Date.now();
    if (
      !invitation ||
      invitation.expiresAt <= now ||
      (await signInEmail(ctx, userId)) !== invitation.email
    ) {
      throw notFound("invitation");
    }
    const organizationId = invitation.organizationId;
    if (!(await ctx.db.get("organizations", organizationId))) {
      throw notFound("organization");
    }
    const membership = await getMembership(ctx, organizationId, userId);
    if (membership) {
      await ctx.db.patch("memberships", membership._id, { lastActiveAt: now });
    } else {
      const firms = await ctx.db
        .query("memberships")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(MAX_FIRMS_PER_USER);
      if (firms.length >= MAX_FIRMS_PER_USER) {
        throw invalid("organizations");
      }
      await ctx.db.insert("memberships", {
        organizationId,
        userId,
        role: invitation.role,
        lastActiveAt: now,
      });
    }
    await ctx.db.delete("invitations", invitation._id);
    return organizationId;
  },
});

/** Turns an invitation down. Only the person invited does this. */
export const decline = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await ctx.db.get("invitations", args.invitationId);
    if (!invitation || (await signInEmail(ctx, userId)) !== invitation.email) {
      throw notFound("invitation");
    }
    await ctx.db.delete("invitations", invitation._id);
    return null;
  },
});

/** Deletes an invitation once its week is up; inviting again extends it. */
export const expire = internalMutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get("invitations", args.invitationId);
    if (invitation && invitation.expiresAt <= Date.now()) {
      await ctx.db.delete("invitations", invitation._id);
    }
    return null;
  },
});

/** The address the app is served at, which links in emails go to. */
function siteUrl() {
  return env.SITE_URL?.trim().replace(/\/+$/, "") || null;
}

const emailDetailsValidator = v.object({
  email: v.string(),
  token: v.string(),
  role: invitedRole,
  organizationName: v.string(),
  invitedByName: v.union(v.string(), v.null()),
});
type EmailDetails = Infer<typeof emailDetailsValidator>;

export const emailDetails = internalQuery({
  args: { invitationId: v.id("invitations") },
  returns: v.union(emailDetailsValidator, v.null()),
  handler: async (ctx, args): Promise<EmailDetails | null> => {
    const invitation = await ctx.db.get("invitations", args.invitationId);
    const firm = invitation
      ? await ctx.db.get("organizations", invitation.organizationId)
      : null;
    if (!invitation || !firm) {
      return null;
    }
    return {
      email: invitation.email,
      token: invitation.token,
      role: invitation.role,
      organizationName: firm.name,
      invitedByName: await userName(ctx, invitation.invitedBy),
    };
  },
});

export const recordEmail = internalMutation({
  args: { invitationId: v.id("invitations"), sent: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get("invitations", args.invitationId);
    if (invitation) {
      await ctx.db.patch("invitations", invitation._id, {
        emailStatus: args.sent ? "sent" : "not_sent",
      });
    }
    return null;
  },
});

/**
 * Emails an invitation's link. When Resend refuses it (its test sender only
 * reaches its own account), the invitation stays and shows the email as not
 * sent, so the admin shares the link another way.
 */
export const emailInvitation = internalAction({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const details: EmailDetails | null = await ctx.runQuery(
      internal.accounts.invitations.emailDetails,
      args,
    );
    if (!details) {
      return null;
    }
    let sent = false;
    try {
      const site = siteUrl();
      if (!site) {
        throw new Error("SITE_URL is not set, so the email has no link.");
      }
      await sendEmail(
        details.email,
        invitationEmail({
          ...details,
          link: `${site}/invite/${details.token}`,
        }),
      );
      sent = true;
    } catch (error) {
      // Resend says why, such as a sender whose domain isn't verified.
      console.error(`The invitation was not emailed: ${String(error)}`);
    }
    await ctx.runMutation(internal.accounts.invitations.recordEmail, {
      invitationId: args.invitationId,
      sent,
    });
    return null;
  },
});

const roleNames = { admin: "administrator", member: "membru" } as const;

/** The email with an invitation's link, in Romanian with an English line. */
export function invitationEmail(invitation: {
  organizationName: string;
  invitedByName: string | null;
  role: Infer<typeof invitedRole>;
  email: string;
  link: string;
}) {
  const who = (invitation.invitedByName ?? "Un coleg").slice(0, 80);
  const firm = invitation.organizationName.slice(0, 80);
  const role = roleNames[invitation.role];
  return {
    subject: `${who} te invită în ${firm} pe Devize`,
    text: [
      `${who} te-a invitat în firma ${firm} pe Devize, ca ${role}.`,
      "",
      `Acceptă invitația: ${invitation.link}`,
      "",
      `Intră în Devize cu adresa ${invitation.email}. Invitația expiră în ${INVITATION_DAYS} zile. Dacă nu te așteptai la ea, ignoră acest email.`,
      "",
      `${who} invited you to join ${firm} on Devize: ${invitation.link}`,
    ].join("\n"),
    html: emailHtml(`                <p style="margin:0 0 20px;font-size:15px"><strong>${escapeHtml(who)}</strong> te-a invitat în firma <strong>${escapeHtml(firm)}</strong> pe Devize, ca ${role}.</p>
                <p style="margin:0 0 20px"><a href="${escapeHtml(invitation.link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1a1a18;color:#ffffff;font-size:15px;text-decoration:none">Acceptă invitația</a></p>
                <p style="margin:0 0 8px;font-size:14px;color:#55554f">Intră în Devize cu adresa ${escapeHtml(invitation.email)}. Invitația expiră în ${INVITATION_DAYS} zile. Dacă nu te așteptai la ea, ignoră acest email.</p>
                <p style="margin:16px 0 0;font-size:13px;color:#8a8a82">${escapeHtml(who)} invited you to join ${escapeHtml(firm)} on Devize.</p>`),
  };
}

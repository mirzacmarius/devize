import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Email } from "@convex-dev/auth/providers/Email";
import { createAccount, signInViaProvider } from "@convex-dev/auth/server";
import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { env } from "./_generated/server";
import { emailHtml, sendEmail } from "./lib/email";
import { appError, forbidden, invalid } from "./lib/errors";

// Sign-in with a code sent by email. The person types the code into the page
// they asked from, so it works on every address the app is served at, unlike
// a link in the email or Google's redirect, which go back to SITE_URL.

export const EMAIL_CODE_PROVIDER = "email-code";
// The Email provider inside it, which sends and checks the codes. Clients
// can't call it, so every code they ask for goes through EmailCode's checks.
export const CODE_SENDER = "email-code-sender";
export const CODE_LENGTH = 8;
export const CODE_MINUTES = 15;

// A code goes out only for a request Vercel BotID let through (docs/adr/0052).
// The app's /api/sign-in-code asks BotID about the page's request, then passes
// on the OIDC token Vercel gives that function, which nobody outside the app's
// functions on Vercel can have. BOTID_CHECK=off turns the check off, for a
// development deployment whose sign-in page runs on a laptop.
const VERCEL_TEAM = "orvibo";
const VERCEL_PROJECT = "devize";
// Vercel signs as the team, or as itself under the "global" issuer mode.
const VERCEL_ISSUERS = [
  `https://oidc.vercel.com/${VERCEL_TEAM}`,
  "https://oidc.vercel.com",
];
const VERCEL_AUDIENCE = `https://vercel.com/${VERCEL_TEAM}`;
// The app's production and preview functions; a laptop's `vercel env pull`
// gets a token for "development".
const VERCEL_SUBJECTS = ["production", "preview"].map(
  (environment) =>
    `owner:${VERCEL_TEAM}:project:${VERCEL_PROJECT}:environment:${environment}`,
);
const MAX_OIDC_TOKEN = 8192;

// At most one code every 30 seconds and five an hour per address, so nobody
// can flood an inbox from the sign-in page.
const SEND_INTERVAL_MS = 30 * 1000;
const SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

/** `length` random digits, each equally likely. */
export function randomDigits(length: number): string {
  let result = "";
  const bytes = new Uint8Array(16);
  while (result.length < length) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      // 250 is the largest multiple of 10 below 256: skipping 250–255 keeps
      // every digit equally likely.
      if (byte < 250 && result.length < length) {
        result += String(byte % 10);
      }
    }
  }
  return result;
}

/** The email with a sign-in code, in Romanian with an English line. */
export function codeEmail(code: string) {
  return {
    subject: `Codul tău Devize: ${code}`,
    text: [
      `Codul tău pentru intrarea în Devize: ${code}`,
      "",
      `Scrie-l în pagina de intrare. Expiră în ${CODE_MINUTES} minute.`,
      "Dacă nu l-ai cerut tu, ignoră acest email.",
      "",
      `Your Devize sign-in code: ${code}. It expires in ${CODE_MINUTES} minutes.`,
    ].join("\n"),
    html: emailHtml(`                <p style="margin:0 0 8px;font-size:15px">Codul tău pentru intrarea în Devize:</p>
                <p style="margin:0 0 20px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;letter-spacing:6px">${code}</p>
                <p style="margin:0 0 8px;font-size:14px;color:#55554f">Scrie-l în pagina de intrare. Expiră în ${CODE_MINUTES} minute. Dacă nu l-ai cerut tu, ignoră acest email.</p>
                <p style="margin:16px 0 0;font-size:13px;color:#8a8a82">Your Devize sign-in code. It expires in ${CODE_MINUTES} minutes.</p>`),
  };
}

/**
 * Counts a code about to be sent to an address, refusing one asked for too
 * soon or too often. Convex Auth calls it (see auth.ts) in the transaction
 * that stores the new code, so a refused request leaves the code already
 * sent working.
 */
export async function recordCodeSent(ctx: MutationCtx, address: string) {
  const email = address.trim().toLowerCase();
  const now = Date.now();
  const lastHour = await ctx.db
    .query("emailCodeSends")
    .withIndex("by_email_and_sentAt", (q) =>
      q.eq("email", email).gt("sentAt", now - HOUR_MS),
    )
    .order("desc")
    .take(SENDS_PER_HOUR);
  const latest = lastHour[0];
  if (
    lastHour.length >= SENDS_PER_HOUR ||
    (latest && now - latest.sentAt < SEND_INTERVAL_MS)
  ) {
    throw appError("rate_limited", "email");
  }
  const expired = await ctx.db
    .query("emailCodeSends")
    .withIndex("by_email_and_sentAt", (q) =>
      q.eq("email", email).lte("sentAt", now - HOUR_MS),
    )
    .take(50);
  for (const row of expired) {
    await ctx.db.delete("emailCodeSends", row._id);
  }
  await ctx.db.insert("emailCodeSends", { email, sentAt: now });
}

/**
 * Convex Auth creates a user as soon as someone asks for a code. When a code
 * never arrives (Resend's test sender only reaches its own account) and the
 * person signs in with Google instead, Google gets a user of its own. This
 * moves the code's account over to `userId`, who just signed in with a
 * verified `email`, and deletes the user who never signed in, so a later
 * code signs in to the same user as Google.
 */
export async function adoptUnverifiedUsers(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
) {
  const user = await ctx.db.get("users", userId);
  if (user?.emailVerificationTime === undefined) {
    return;
  }
  const sameEmail = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(10);
  for (const other of sameEmail) {
    if (other._id === userId || other.emailVerificationTime !== undefined) {
      continue;
    }
    // Verifying a code sets emailVerificationTime before the first session,
    // so this only skips users made some other way.
    const session = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", other._id))
      .first();
    if (session !== null) {
      continue;
    }
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", other._id))
      .collect();
    for (const account of accounts) {
      await ctx.db.patch("authAccounts", account._id, { userId });
    }
    // The only thing set on such a user without signing in, by
    // admin:grantSuperAdmin.
    if (other.role !== undefined && user.role === undefined) {
      await ctx.db.patch("users", userId, { role: other.role });
    }
    await ctx.db.delete("users", other._id);
  }
}

/**
 * Whether `token` is an OIDC token Vercel signed for the app's production or
 * preview functions, which pass one on only for a request BotID let through,
 * or true when the check is off.
 */
export async function passedBotId(token: unknown): Promise<boolean> {
  if (env.BOTID_CHECK?.trim() === "off") {
    return true;
  }
  if (typeof token !== "string" || !token || token.length > MAX_OIDC_TOKEN) {
    return false;
  }
  try {
    // Keys are only ever fetched from Vercel.
    const { iss } = decodeJwt(token);
    if (typeof iss !== "string" || !VERCEL_ISSUERS.includes(iss)) {
      return false;
    }
    const response = await fetch(`${iss}/.well-known/jwks`);
    if (!response.ok) {
      return false;
    }
    const { payload } = await jwtVerify(
      token,
      createLocalJWKSet(await response.json()),
      {
        issuer: iss,
        audience: VERCEL_AUDIENCE,
        algorithms: ["RS256"],
        clockTolerance: 60,
      },
    );
    return (
      typeof payload.sub === "string" && VERCEL_SUBJECTS.includes(payload.sub)
    );
  } catch {
    // A token that isn't Vercel's, or Vercel's keys out of reach: no code
    // goes out, and the page says to try again.
    return false;
  }
}

/** Sends the codes and checks them, for EmailCode only. */
const CodeSender = Email({
  id: CODE_SENDER,
  maxAge: CODE_MINUTES * 60,
  async generateVerificationToken() {
    return randomDigits(CODE_LENGTH);
  },
  async sendVerificationRequest({ identifier, token }) {
    await sendEmail(identifier, codeEmail(token));
  },
});

/**
 * The provider for `signIn("email-code", { email, oidcToken })`, which the
 * app's /api/sign-in-code sends, then `signIn("email-code", { email, code })`.
 * A code goes out only for a request Vercel BotID let through. The code only
 * works with the address it was sent to, and Convex Auth stops accepting
 * guesses for an address after 10 wrong ones in an hour. Accounts keep this
 * provider's id, so everyone who signed in with a code before signs in to the
 * same user.
 */
export const EmailCode = ConvexCredentials<DataModel>({
  id: EMAIL_CODE_PROVIDER,
  extraProviders: [CodeSender],
  async authorize(params, ctx) {
    const { email, code } = params;
    if (typeof email !== "string" || !email) {
      throw invalid("email");
    }
    if (code !== undefined) {
      if (typeof code !== "string") {
        throw invalid("code");
      }
      return await signInViaProvider(ctx, CodeSender, {
        params: { email, code },
      });
    }
    if (!(await passedBotId(params.oidcToken))) {
      throw forbidden("bot");
    }
    // A new address gets its user and account now, as asking for a code
    // always did.
    const { account } = await createAccount(ctx, {
      provider: EMAIL_CODE_PROVIDER,
      account: { id: email },
      profile: { email },
      shouldLinkViaEmail: true,
    });
    await signInViaProvider(ctx, CodeSender, {
      accountId: account._id,
      params: { email },
    });
    // Signed in once the code comes back.
    return null;
  },
});

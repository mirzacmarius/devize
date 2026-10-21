import { Email } from "@convex-dev/auth/providers/Email";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { env } from "./_generated/server";
import { appError } from "./lib/errors";

// Sign-in with a code sent by email. The person types the code into the page
// they asked from, so it works on every address the app is served at, unlike
// a link in the email or Google's redirect, which go back to SITE_URL.

export const EMAIL_CODE_PROVIDER = "email-code";
export const CODE_LENGTH = 8;
export const CODE_MINUTES = 15;

// Resend's test sender, which only delivers to the Resend account's own
// address. Set AUTH_EMAIL_FROM to a sender on a domain verified in Resend.
const DEFAULT_FROM = "Devize <onboarding@resend.dev>";

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
    html: `<!doctype html>
<html lang="ro">
  <body style="margin:0;padding:32px 16px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a18">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e4e4e0;border-radius:14px">
            <tr>
              <td style="padding:28px">
                <p style="margin:0 0 20px;font-size:17px;font-weight:600">Devize</p>
                <p style="margin:0 0 8px;font-size:15px">Codul tău pentru intrarea în Devize:</p>
                <p style="margin:0 0 20px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;letter-spacing:6px">${code}</p>
                <p style="margin:0 0 8px;font-size:14px;color:#55554f">Scrie-l în pagina de intrare. Expiră în ${CODE_MINUTES} minute. Dacă nu l-ai cerut tu, ignoră acest email.</p>
                <p style="margin:16px 0 0;font-size:13px;color:#8a8a82">Your Devize sign-in code. It expires in ${CODE_MINUTES} minutes.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

async function sendWithResend(
  to: string,
  message: { subject: string; text: string; html: string },
) {
  const apiKey = env.AUTH_RESEND_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing environment variable `AUTH_RESEND_KEY`: set it to a Resend API key to send sign-in codes.",
    );
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM?.trim() || DEFAULT_FROM,
      to: [to],
      ...message,
    }),
  });
  if (!response.ok) {
    // Resend says why, such as a sender whose domain isn't verified.
    throw new Error(
      `Resend did not send the sign-in code (${response.status}): ${await response.text()}`,
    );
  }
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
 * The provider for `signIn("email-code", { email })`, then
 * `signIn("email-code", { email, code })`. The code only works with the
 * address it was sent to, and Convex Auth stops accepting guesses for an
 * address after 10 wrong ones in an hour.
 */
export const EmailCode = Email({
  id: EMAIL_CODE_PROVIDER,
  maxAge: CODE_MINUTES * 60,
  async generateVerificationToken() {
    return randomDigits(CODE_LENGTH);
  },
  async sendVerificationRequest({ identifier, token }) {
    await sendWithResend(identifier, codeEmail(token));
  },
});

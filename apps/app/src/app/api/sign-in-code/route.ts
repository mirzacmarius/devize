import { api } from "@devize/backend/convex/_generated/api";
import * as Sentry from "@sentry/nextjs";
import { checkBotId } from "botid/server";
import { fetchAction } from "convex/nextjs";
import { appErrorOf } from "@/lib/errors";

// The longest address there can be (RFC 5321).
const MAX_EMAIL = 254;

/** An answer the sign-in page reads (components/email-sign-in.tsx). */
function refused(error: string, status: number) {
  return Response.json({ error }, { status });
}

/**
 * Emails a sign-in code (docs/adr/0052). Vercel BotID first tells a person
 * from a script, by the check the page's request carries
 * (instrumentation-client.ts). Convex then sends the code only with the OIDC
 * token Vercel gives this function, so asking Convex directly sends nothing.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const email =
    typeof body === "object" && body !== null && "email" in body
      ? body.email
      : undefined;
  if (typeof email !== "string" || !email || email.length > MAX_EMAIL) {
    return refused("invalid", 400);
  }
  try {
    const { isBot } = await checkBotId();
    if (isBot) {
      return refused("forbidden", 403);
    }
  } catch (error) {
    // Such as the project's OIDC turned off: no code goes out.
    Sentry.captureException(error);
    return refused("forbidden", 403);
  }
  // Vercel gives every request to the app's functions a token of its own; a
  // laptop has one only from `vercel env pull`.
  const oidcToken =
    request.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
  try {
    await fetchAction(api.auth.signIn, {
      provider: "email-code",
      params: oidcToken ? { email, oidcToken } : { email },
    });
  } catch (error) {
    const code = appErrorOf(error)?.code;
    if (code === "rate_limited") {
      return refused(code, 429);
    }
    if (code === "forbidden") {
      return refused(code, 403);
    }
    // Such as Resend refusing the address; Convex's logs say why.
    console.error("Sending a sign-in code failed:", error);
    return refused("send_failed", 502);
  }
  return Response.json({ sent: true });
}

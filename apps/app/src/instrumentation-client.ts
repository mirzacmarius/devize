import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { sentryOptions } from "@/lib/sentry";

Sentry.init(sentryOptions);

// Vercel BotID adds its check to every request for a sign-in code
// (app/api/sign-in-code, docs/adr/0052).
initBotId({ protect: [{ path: "/api/sign-in-code", method: "POST" }] });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

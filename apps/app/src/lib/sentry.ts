import type { BrowserOptions } from "@sentry/nextjs";
import { env } from "@/env.mjs";
import { scrubBreadcrumb, scrubEvent, scrubSpan } from "@/lib/sentry-scrub";

/**
 * Error reports and a sample of traces to Sentry, shared by the browser, Node
 * and edge runtimes. Without NEXT_PUBLIC_SENTRY_DSN, as in local runs and CI,
 * nothing is sent. Reports say what broke, never who it happened to: no user,
 * IP address, cookies, headers, bodies, local variables, query strings or
 * link tokens (sentry-scrub.ts).
 */
export const sentryOptions = {
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
  beforeSend: scrubEvent,
  beforeSendSpan: scrubSpan,
  beforeBreadcrumb: scrubBreadcrumb,
} satisfies BrowserOptions;

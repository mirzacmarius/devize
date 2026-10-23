import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    VERCEL_URL: z
      .string()
      .optional()
      .transform((v) => (v ? `https://${v}` : undefined)),
    PORT: z.coerce.number().default(3000),
  },
  server: {
    /** Set by Vercel: "production", "preview" or "development". */
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.url(),
    /** Where error reports go (lib/sentry.ts); unset, nothing is sent. */
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    /**
     * Cloudflare Turnstile's site key, for the check the sign-in page runs
     * before a code is emailed; the backend needs TURNSTILE_SECRET_KEY too.
     */
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
      .string()
      .optional()
      .transform((v) => v?.trim() || undefined),
  },
  runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    PORT: process.env.PORT,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
  // Skipping also skips the defaults above, so only skip when asked to.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

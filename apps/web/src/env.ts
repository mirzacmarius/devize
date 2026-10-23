import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    /**
     * Set by Vercel on every build: the site's production domain, without a
     * scheme. Canonical links and the sitemap use it when NEXT_PUBLIC_SITE_URL
     * isn't set (lib/site-url.ts).
     */
    VERCEL_PROJECT_PRODUCTION_URL: z
      .string()
      .optional()
      .transform((v) => v?.trim() || undefined),
  },
  client: {
    /** The product app, where "Intră în aplicație" leads. */
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    /** This site's own address, for canonical links and the sitemap. */
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
  // Skipping also skips the default above, so only skip when asked to.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

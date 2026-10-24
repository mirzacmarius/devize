import { env } from "@/env";

/**
 * The site's own address, for canonical links, the sitemap and structured
 * data. Server code only: it reads a server variable. NEXT_PUBLIC_SITE_URL
 * wins; on Vercel the project's production domain stands in for it.
 */
export const siteUrl =
  env.NEXT_PUBLIC_SITE_URL ??
  (env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3001");

/** An absolute address on the site, for structured data. */
export const absolute = (path: string) => new URL(path, siteUrl).toString();

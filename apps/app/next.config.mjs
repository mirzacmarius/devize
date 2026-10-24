import { withSentryConfig } from "@sentry/nextjs/config";
import "./src/env.mjs";

// Sections without a page of their own open their first one, with or without
// the language the proxy puts in front (src/locales/locale.ts). A redirect here
// answers before anything renders, which a page streaming into its shell can't.
const sections = [["/admin", "/admin/manufacturers"]];

// Sent with every page. No other site may show the app in a frame, where a
// hidden Ofertă could trick its client into signing; browsers take a file as
// the type it's served as; a link to another site tells it only where it came
// from, never the token in an address; and only the app itself may ask for
// the camera or microphone.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Instant navigations (ADR 0029): each <Link> prefetches its route's App
  // Shell, so a click shows the next page at once and its data streams in.
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return sections.flatMap(([source, destination]) => [
      { source, destination, permanent: false },
      {
        source: `/:locale(ro|en)${source === "/" ? "" : source}`,
        destination: `/:locale${destination}`,
        permanent: false,
      },
    ]);
  },
};

// Uploads source maps for readable stack traces when SENTRY_AUTH_TOKEN is set
// (with SENTRY_ORG and SENTRY_PROJECT), then deletes them so they aren't served.
export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});

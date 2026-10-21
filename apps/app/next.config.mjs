import { withSentryConfig } from "@sentry/nextjs/config";
import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

// Uploads source maps for readable stack traces when SENTRY_AUTH_TOKEN is set
// (with SENTRY_ORG and SENTRY_PROJECT), then deletes them so they aren't served.
export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});

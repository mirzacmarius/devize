# Build on the Convex v1 template

Devize is built from the Convex v1 template, like Marius's other projects: a Bun and Turborepo monorepo with two Next.js apps (the product in `apps/app`, the marketing site in `apps/web`), Convex for the database, server functions, file storage and scheduled jobs, and Convex Auth for sign-in. One TypeScript codebase with reactive queries suits a collaborative estimate editor, and Convex actions and scheduled jobs cover the AI calls and the price updates.

The template was brought up to the stack of the other projects: Next.js 16, React 19, Convex 1.47 with Convex Auth 0.0.96, zod 4, Biome 2 and Turborepo 2.11, with packages renamed `@devize/*`.

## Consequences

- Polar billing, Loops, OpenPanel, Resend with React Email and the logger package, which ship with v1, were removed rather than left unconfigured. Billing comes back with the business model's Freemium and Pro plans; email comes back with the first feature that sends one.
- Sentry stays, with reports scrubbed of users, cookies, headers and query strings (`apps/app/src/lib/sentry.ts`). Nothing is sent without `NEXT_PUBLIC_SENTRY_DSN`.
- Sign-in is Google only, as in v1, until the MVP adds more methods.
- The app is installable as a PWA (`apps/app/src/app/manifest.ts`); there is no separate mobile app.

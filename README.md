# Devize

Devize de construcții cu norme de la producători și prețuri la zi din magazine.

Devize is a web app, installable as a PWA, for construction estimates (devize) in Romania. Manufacturers publish deviz norms for their own products, material prices come from the big DIY retailers, and contractors build estimates and the official tender forms with AI help.

- Product spec and data model: [Devize – Specificație și model de date](https://claude.ai/artifact/SW88m78gjjRv75nTM6hH2Y)
- Domain terms: [GLOSSARY.md](GLOSSARY.md)
- Decisions: [docs/adr](docs/adr)

## Stack

- [Convex](https://convex.dev): database, server functions, file storage, scheduled jobs and sign-in with [Convex Auth](https://labs.convex.dev/auth)
- [Next.js 16](https://nextjs.org) with React 19, for the app and the marketing site
- [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components
- [next-international](https://next-international.vercel.app) for Romanian (default) and English
- The [Claude API](https://docs.claude.com) for the admin panel's manufacturer research and norm imports
- [Sentry](https://sentry.io) for error reports, optional
- [Turborepo](https://turbo.build), [Bun](https://bun.sh) and [Biome](https://biomejs.dev)

It started from the [Convex v1 template](https://github.com/get-convex/v1); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Directory structure

```
.
├── apps
│   ├── app              # The product (Next.js), on port 3000
│   └── web              # Marketing site (Next.js), on port 3001
├── packages
│   ├── backend          # Convex schema, functions and auth
│   └── ui               # Shared UI components and Tailwind config
├── tooling
│   └── typescript       # Shared TypeScript configs
└── docs
    └── adr              # Architecture decision records
```

## Getting started

You need [Bun](https://bun.sh/docs/installation) 1.4.2, a [Convex](https://dashboard.convex.dev) account and a [Resend](https://resend.com) account, which sends the sign-in codes. Google sign-in is optional.

1. Install dependencies:

   ```bash
   bun install
   ```

2. Create your Convex dev deployment and link the app to it:

   ```bash
   bun run setup
   ```

   This runs `convex dev --once` in `packages/backend`, which asks you to log in and pick a project the first time, then writes `NEXT_PUBLIC_CONVEX_URL` into `apps/app/.env.local`.

3. Set up Convex Auth's keys on the deployment, with `http://localhost:3000` as the site URL:

   ```bash
   cd packages/backend && bunx @convex-dev/auth
   ```

4. Set up email sign-in: people type the address, then the 8-digit code Devize emails them. Create an API key in Resend and store it on the deployment (the command asks for the key, so it stays out of your shell history):

   ```bash
   cd packages/backend
   bunx convex env set AUTH_RESEND_KEY
   ```

   Until you verify a domain in Resend, codes only reach the address of your Resend account. Once one is verified, set the sender, for example `bunx convex env set AUTH_EMAIL_FROM 'Devize <cont@devize.ro>'`.

5. Optionally, set up Google sign-in. In the Google Cloud console, create an OAuth client with `http://localhost:3000` as an authorized JavaScript origin and your deployment's HTTP Actions URL plus `/api/auth/callback/google` as the redirect URI, for example `https://happy-animal-123.convex.site/api/auth/callback/google`. Then store its credentials on the deployment:

   ```bash
   cd packages/backend
   bunx convex env set AUTH_GOOGLE_ID <client id>
   bunx convex env set AUTH_GOOGLE_SECRET <client secret>
   ```

6. Start everything:

   ```bash
   bun dev
   ```

   The app runs on http://localhost:3000 and the marketing site on http://localhost:3001. `bun dev:app`, `bun dev:web` and `bun dev:backend` start one part each.

7. To open the admin panel at `/admin`, sign in once, then make yourself a super admin. Manufacturer research and norm imports also need a Claude API key on the deployment:

   ```bash
   cd packages/backend
   bunx convex run admin:grantSuperAdmin '{"email":"you@example.com"}'
   bunx convex env set ANTHROPIC_API_KEY <key>
   ```

   `AI_MODEL` switches to another Claude model. The panel never sends email; see `docs/adr/0006`.

## Checks

CI runs these on every push; run them before you push:

```bash
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
```

## Deployment

Each app is its own Vercel project, with `apps/app` or `apps/web` as the root directory. The app's `vercel.json` deploys the Convex functions first (it needs a `CONVEX_DEPLOY_KEY`) and builds against the deployed URL. Set `SITE_URL`, the Convex Auth keys, `AUTH_RESEND_KEY` (and `AUTH_EMAIL_FROM`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and `ANTHROPIC_API_KEY` on the production Convex deployment, and `NEXT_PUBLIC_APP_URL` on the marketing site (plus `NEXT_PUBLIC_SITE_URL` once it has its own domain; until then its canonical links and sitemap use the Vercel production domain). For error reports, set `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` on the app. To send sign-in codes only after a Cloudflare Turnstile check (`docs/adr/0031`), create a Turnstile widget for the app's addresses, set its site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the app's Production environment and redeploy, then set its secret key with `bunx convex env set --prod TURNSTILE_SECRET_KEY`: in that order, since a secret without the widget stops every code. In `packages/backend`, `bunx @convex-dev/auth --prod --web-server-url <app URL>` sets `SITE_URL` and the keys, and `bunx convex env set --prod AUTH_RESEND_KEY` the Resend key.

### Preview deployments

With a preview deploy key as `CONVEX_DEPLOY_KEY` for Vercel's Preview environment, each branch gets its own Convex backend, with its own address. Google needs one fixed address to send people back to, so previews offer only the emailed code and the sign-in page hides Google there.

A new preview backend starts with the project's default variables for previews. Give them their own Convex Auth keys, never production's: a preview runs whatever a branch pushes, and with production's key it could sign production sessions. Convex Auth also needs a `SITE_URL`, which can be the production address, since codes don't redirect anywhere:

```bash
cd packages/backend
bun run auth:keys > preview.env
echo "SITE_URL=https://<production app URL>" >> preview.env
bunx convex env default set --type preview --from-file preview.env
bunx convex env default set --type preview AUTH_RESEND_KEY
rm preview.env
```

Defaults only reach preview backends created afterwards. For one that already exists, set the same variables on it in the Convex dashboard.

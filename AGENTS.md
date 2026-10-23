## About Devize

Devize builds construction estimates (devize) for the Romanian market: manufacturers publish deviz norms for their own products, material prices come from the big DIY retailers, and contractors build estimates and the official tender forms with AI help.

- Product spec and data model: [Devize – Specificație și model de date](https://claude.ai/artifact/SW88m78gjjRv75nTM6hH2Y)
- Domain terms: `GLOSSARY.md`. Use its words in code, UI and docs.
- Decisions: `docs/adr/`. Read the ones that touch the area you work in.

## Working here

- Work in your own git worktree or branch: another agent session may be using this checkout.
- Before pushing, run what CI runs: `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run test` and `bun run build`.
- The interface is Romanian first. Every string lives in `apps/app/src/locales/ro.ts`, with the English in `en.ts` under the same keys (typecheck fails otherwise). Write Romanian with comma-below diacritics (ș, ț), not cedillas (ş, ţ).
- Next.js 16: the proxy is `apps/app/src/proxy.ts`, `params` are promises, and translations come from `@/locales/server` in server components and `@/locales/client` in client components.
- Navigations are instant (ADR 0029): each link prefetches its page's shell. A page's server component doesn't await `params`; its client component reads the address with `useRouteParam` or `useSearchParams`. Server code that reads the request, the time or Convex goes in an async component under `<Suspense>`, with Convex's token from `convexToken()`. Next.js keeps the pages someone left mounted but hidden, so a link back to one shows it as it was left. `next dev` reports anything that would make a navigation wait.
- `packages/backend/convex/_generated` is committed. After changing Convex functions or the schema, regenerate it with `bunx convex dev` (or `bun run setup`) and commit the result.
- Every Convex function that touches a firm's data checks membership first, with `requireMember` or `requireFirmDoc` from `convex/lib/access.ts`, and reports another firm's rows as not found. Errors people see are `ConvexError`s with a `code` from `convex/lib/errors.ts`, which the interface translates.
- A function that takes a storage id from the client claims it with `unclaimedUpload` from `convex/accounts/files.ts`. Members see their firm's storage ids, so an id alone must never be enough to show, attach or delete a file.
- Convex functions are tested in memory with `convex-test` under `bun test`: start from `setup()` and `signIn()` in `convex/test.helper.ts`. Test files and helpers have two dots in their names, so Convex never deploys them.
- The repository is public and producers' norms are copyrighted. Never commit a producer's norm documents, data sheets or data extracted from them; they reach the database only through the app: the super-admin import, or the producer's own firm writing its norms. Tests use made-up norms.
- Bun installs one hoisted `node_modules` (see `bunfig.toml`). When something behaves differently than in CI, reinstall with `rm -rf node_modules && bun install`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend, in `packages/backend`.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

<!-- convex-ai-end -->

# Sign-in codes are sent after a Vercel BotID check

This replaces ADR 0031. The problem is the same: anyone can ask for a sign-in code for any address. Each address gets at most five codes an hour, but a script cycling through addresses could make Devize email thousands of strangers, which costs money and the domain's reputation. ADR 0031 checked for scripts with Cloudflare Turnstile, whose site key was never set on Vercel, so the page never showed it. Marius decided (24 October 2026) to use Vercel BotID instead. BotID runs where the app already runs, needs no account or keys elsewhere, and shows nothing on the page.

## The page asks the app, and the app asks BotID

The sign-in page no longer asks Convex for a code itself. It posts the address to the app's `/api/sign-in-code`, and BotID protects that route:

- `instrumentation-client.ts` starts BotID's client with that route, so the browser adds BotID's check to each request.
- `withBotId` in `next.config.mjs` serves BotID's script and its calls from the app's own address. The proxy leaves that path alone.
- The route calls `checkBotId()`. For a script, or when the check itself fails, it answers `forbidden` and no code goes out. The page then says the check failed. Typing the code still goes through Convex Auth as before: the code is the proof.

## Convex checks that the request came through BotID

BotID can only run on Vercel, but anyone can call Convex's `auth:signIn` without the app. So the route passes on the OIDC token that Vercel gives each request to the app's functions (`x-vercel-oidc-token`), and `email-code` sends a code only with such a token. A token counts when:

- it is signed with one of Vercel's keys, fetched from the issuer: `https://oidc.vercel.com/orvibo`, or `https://oidc.vercel.com` under the "global" issuer mode;
- its audience is `https://vercel.com/orvibo`;
- its subject is `owner:orvibo:project:devize:environment:production` or the same for `preview`.

Nobody outside the app's own functions on Vercel can get such a token, so a request that skipped BotID gets no code. The keys are only ever fetched from those two issuers, whatever a token says.

## Consequences

- It is on with nothing to set. It needs the project's OIDC Federation (Settings → Security), which Vercel turns on for new projects and which BotID needs anyway. With it off, `checkBotId()` fails and no code goes out.
- BotID Deep Analysis, on Pro plans, is turned on in the project's Firewall → Configure, with no code change.
- Preview functions' tokens count too, so previews work. A preview runs whatever a branch pushes, so it could ask for codes without BotID. That is no more than anyone could do before this check, and still five codes an hour per address.
- A development deployment, whose sign-in page runs on a laptop with no such token, sets `BOTID_CHECK=off`. The tests run with the check on, with a key of their own standing in for Vercel's.
- If Vercel's keys can't be fetched, no code goes out and the page asks to try again. Google sign-in still works.
- Renaming the Vercel team or project changes the subject, so the names in `emailSignIn.ts` change with it.
- Cloudflare no longer receives anything. The privacy page names the check under Vercel and says it may keep a technical cookie. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are no longer read.
- The rest of ADR 0031 stands: `email-code` is a credentials provider that asks `email-code-sender`, which clients can't call, to send and check the codes. A refused request stores nothing and counts nothing against the address.

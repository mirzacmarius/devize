# Sign-in codes are sent after a Cloudflare Turnstile check

Superseded by ADR 0052 (24 October 2026): a Vercel BotID check replaces Turnstile, whose site key was never set on Vercel.

Anyone can ask for a sign-in code for any address (ADR 0007). Each address gets at most five codes an hour, but a script cycling through addresses could make Devize send email to thousands of strangers, through Resend and from Devize's own domain, which costs money and the domain's reputation. The security audit of 23 October 2026 found this, and Marius asked to close it right away.

The sign-in page now shows Cloudflare Turnstile, which tells people from scripts and usually needs no click, and the backend sends a code only for a token Cloudflare confirms was issued for the sign-in page (action `sign-in`). A token works once, so each code, a new one included, needs a fresh challenge. Typing the code needs no challenge: the code is the proof.

The check has to happen in Convex, since anyone can call the backend without the page. Convex Auth's Email provider never sees the request's parameters before it stores and sends a code, so `email-code` is now a credentials provider that checks the token, then asks an Email provider inside it (`email-code-sender`), which clients can't call, to send the code and to check it. The accounts keep the `email-code` provider id, so everyone who signed in with a code before signs in to the same user.

## Consequences

- Turnstile is off until `TURNSTILE_SECRET_KEY` is set on the Convex deployment; the page shows the widget once `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set on the app. Set the site key first and redeploy the app, then the secret: a secret without the widget stops every code.
- The widget's hostnames in Cloudflare must include every address the app is served at. Preview deployments have neither key, so they work as before.
- A request without a valid token is refused before anything is stored: no user, no code, and nothing counted against the address.
- If Cloudflare can't be reached, no code is sent and the page asks to try again; Google sign-in still works.
- Asking for a code now answers with no tokens instead of "started", as Convex Auth's credentials providers do; the page never read that answer.

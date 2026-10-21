# Sign in with a code sent by email

Google sign-in sends people back to one fixed address, the deployment's `SITE_URL`, and needs every backend's callback registered with Google. Each Vercel preview has its own address and, with a preview deploy key, its own Convex backend, so Google can't work there, and a link in an email would have the same problem. On 21 October 2026 Marius asked for email sign-in, so that every deployment can be signed in to.

Devize emails an 8-digit code that people type into the page they asked from. It is Convex Auth's Email provider with our own code and email, sent through Resend's API. Google stays, except on previews.

## Consequences

- The backend needs `AUTH_RESEND_KEY`, and `AUTH_EMAIL_FROM` once a domain is verified in Resend. Until then, Resend only delivers to its own account's address.
- A code lasts 15 minutes. One address gets at most one code every 30 seconds and five an hour, checked in the transaction that stores the code, so a refused request doesn't replace the code already sent. Convex Auth stops accepting codes for an address after 10 wrong ones in an hour.
- Convex Auth creates the user when the code is asked for. If that person signs in with Google instead, the user who never signed in is merged into Google's, so the next code reaches the same account.
- Preview backends take their variables from the project's defaults for previews, including Convex Auth keys of their own. Production's key never goes there, because a preview runs any branch's code.

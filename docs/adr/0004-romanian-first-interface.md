# Romanian first, English second

Devize is for the Romanian market, so the interface is written in Romanian first, with English as the second language. Everyone sees Romanian until they pick English in the language menu; the browser's language is not used to choose. The URL never carries the language: the proxy rewrites each page to its `[locale]` path, and next-international keeps the choice in its cookie.

## Consequences

- `apps/app/src/locales/ro.ts` is the source of every text, and `en.ts` must have exactly the same keys, which typecheck enforces.
- The install manifest and the marketing site are in Romanian.
- The choice lasts for the browser session. Storing it on the user's profile can come later.

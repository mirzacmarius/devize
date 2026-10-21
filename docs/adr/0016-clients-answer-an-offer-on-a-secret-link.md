# Clients answer an Ofertă on a secret link, without an account

A Firmă's client, most often a private person on a phone, should read the Deviz in plain words, choose among its Variante and optional works, and accept or decline it, without making an account. Devize gives each Ofertă a link with a secret token, `/o/<token>`, that works while the Ofertă is open. The link is the key: whoever holds it can read the Ofertă and answer it, so it reaches only what the client needs.

## Consequences

- The token is 32 characters of 64, 192 random bits from `crypto.getRandomValues`, looked up through the `by_token` index; a token of another length isn't looked up. The page asks search engines not to index it and sends no referrer to the pages it links to.
- Everything the link reaches is in `convex/offers/public.ts`, built field by field: the firm's letterhead, the Deviz's sections and works with their quantities and prices, and the client's name. No notes, members, resource prices, price sources or store choices leave the firm.
- Making the link marks a draft Deviz sent, which locks it (ADR 0005), so what the client reads can't change. A Deviz has at most one live link. A revision's link withdraws the live link of the earlier revision, which then leads to the new one.
- The client's choice travels as ids: a Variantă, and the optional works left out. The server prices it every time, with the Recapitulație's arithmetic, and the page never sends a total. The choice is saved as the client changes it, so the firm sees what they lean towards.
- Accepting takes the client's name and a signature drawn in a 600 × 200 box, kept as SVG path data with only absolute moves and lines between whole pixels, at most 30 000 characters. Someone who can't draw signs with their typed name. Devize keeps who signed, when, the drawing, and exactly what was accepted: the choice and its totals are frozen.
- Accepting marks the Deviz accepted; declining, with an optional reason, marks it rejected. Both go through the helper the Deviz page uses to change status, and both are final.
- A link is valid for 30 days unless the firm picks another span, from a week to three months; a scheduled mutation marks it expired, and every answer checks the clock too. The firm can withdraw a live link. A closed link shows only whom to ask, or where the new one is.
- A visit counts once per half hour. Someone from the firm opening the link sees a preview: their visits and choices don't count, and they can't answer for the client.
- When the client answers, whoever made the link gets an email if Resend is set up (`AUTH_RESEND_KEY` and `SITE_URL` on Convex). The Deviz's page shows the answer either way.
- The client downloads the Deviz PDF the firm sends (ADR 0009), for their choice, made in their browser.

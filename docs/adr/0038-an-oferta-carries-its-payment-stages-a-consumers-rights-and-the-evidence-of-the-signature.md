# An Ofertă carries its payment stages, a consumer's rights and the evidence of the signature

A client accepted an Ofertă on its link with a name and a drawing (ADR 0016), and the only term beside the price was a deposit, a percentage. Nothing said when the rest was due. Nothing told a private person what accepting on a link means in law: a contract made at a distance (OUG 34/2014), which they may leave within 14 days and which the firm must confirm to them on a durable medium. And the signature stood on a name and a picture, with nothing to show later what was signed, or from where.

## Payment stages

An Ofertă may carry a schedule of one to eight stages (`offers.paymentSchedule`). Each has a name the firm writes, a moment it is due (la semnare, la începerea lucrărilor, pe situații de lucrări, la recepția lucrărilor, la recepția finală) and either a share of the total with VAT or a fixed sum in lei, never both; the shares add up to at most 100%, and may stop short, the rest staying as agreed. The dialog offers the usual arrangements as starting points and the firm edits them. The deposit the pages showed stays, derived from the stage due at signing. The same code (`offers/payments.ts`) prices the stages everywhere: the firm's card, the client's page, the PDF under the Recapitulație, the confirmation email and the assistant's prompt. The invoicing and the progress statements start their deposit and stage invoices from these stages, which is why they are data and not free text.

## Consumers

A link made for a client who is a person is a consumer's unless the firm unticks it (`offers.consumer`). On a consumer's link the page says, before and after accepting, that this is a distance contract, that they may withdraw without a reason within 14 days by an unequivocal statement, how the works begun at their express request in those days are paid (art. 14), that the right is lost once the works are done with their express consent (art. 16), and that new buildings and substantial conversions fall outside the ordinance (art. 3). The withdrawal form of Anexa B is a document of its own, filled with the firm, the Ofertă and the client, downloaded from the page and appended to a consumer's PDF. Accepting lets them ask expressly for an early start (art. 8), kept on the signature. After accepting, the client is emailed a confirmation with the terms, the stages, their rights and the deadline, and a link to the signed PDF: the durable medium of art. 8(7). The address and the moment it went are kept (`offers.confirmation`) and both pages show it, the client's with the address masked.

## Evidence of the signature

A client's signature is a simple electronic signature (Legea 214/2024); its worth is in what stands behind it. When the client accepts, the server hashes what they accepted (the Deviz's code and title, the Variantă, the works left out with each line's quantity and price, the totals, the stages, the name and the moment) with SHA-256 and keeps the hash with the signature, so a PDF produced later can be matched to it. The browser's self-description (user agent, language, time zone, screen) travels with the acceptance; the address comes from the page's server, which reads the request's headers under Suspense and hands it to the page, which sends it with the acceptance. Convex's functions don't see the request's address, so this is the nearest the server gets; a client who edits the page's request could send another, which is why it is kept as evidence beside the hash, not as proof on its own. The evidence prints on the client's Deviz under "Acceptare electronică" and shows on the firm's card.

## Consequences

- `offers` gains `paymentSchedule`, `consumer`, `confirmation` and, on the signature, `contentHash`, `evidence` and `earlyStart`. Older offers have none of them and read as before.
- The hash is computed in Convex's runtime by `lib/sha256.ts`, written out rather than taken from `crypto.subtle`, so it runs the same in mutations, in tests and in the browser.
- The confirmation goes through the same Resend account as the firm's notices and needs `AUTH_RESEND_KEY` and `SITE_URL`; without a client email it isn't sent, and the firm's card says so, pointing at the PDF to send by hand.
- Dates in emails and PDFs are written in Romania's time with a hand-written offset rule, because the runtime may have no time zone data.
- The address is evidence, not identity: behind a shared connection it names the connection. The PDF says what it is.

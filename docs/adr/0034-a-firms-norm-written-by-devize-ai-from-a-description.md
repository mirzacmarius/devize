# A firm's norm is written by Devize AI from a description of the work

When the search in "Adaugă din catalog" finds no Normă for a work, the firm had two ways out: an Articol propriu, a lump sum with resources priced by hand that no later Deviz can reuse, or writing a Normă proprie on the norm form, resource by resource. Devize's own catalog will never hold every work a Romanian contractor meets, so the gap is met where it appears.

The firm describes the work in a few sentences, prefilled with what it searched for, and Devize AI writes the norm: the work and its unit, what it includes, leaves out and how it is measured, and the resources one unit consumes, each with where its figure comes from. Materials, equipment and transport may carry an orientative market price in lei without VAT; labour never does, because the firm's Tarife price it. The model also says what it assumed where the description was silent, and what the firm should check.

The answer is saved as the firm's own draft Normă, private, under the code the model proposes or the next one free, with a note under every resource. The firm reads it in the same preview as a catalog norm, with the assumptions and the checks above the quantity; adding it to the Deviz publishes the draft in the firm's catalog, so the next search finds it first, and the line item takes the firm's prices of the day like any other. A draft the firm doesn't add stays among its own norms, to edit, publish or delete from the norm page, which shows the description it was written from.

## Consequences

- Each request is an AI job of kind `norm_draft`, of the firm and of the person who asked (ADR 0030): at most 10 an hour and 40 a day for either. The request is text only, so it runs within four minutes.
- The model is told the firm's Tarife names, so the labour it writes matches the trades the firm already prices, and the catalog's categories, so its norms sort with the others. The Deviz's title, description and county give it the context of the work.
- A reference price from the model is shown as a Preț de referință, the last step of the price order (ADR 0005): a firm price or a store price replaces it as soon as there is one, and the Deviz checks flag it as a reference price like any other.
- A description that isn't a construction work, or a norm no resource of which survives the checks (unknown units, zero quantities), fails with a code the sheet explains; the person can rephrase and ask again. A request whose job the watchdog failed counts as failed, whatever its row says.
- The norm's page tells the firm it was written by Devize AI from a description, with the assumptions and the checks, so a colleague doesn't take an estimate for a measured consumption. The provenance is kept with the request row (`normRequests`), deleted with the firm.
- Tests play the model's answer through the request's internal steps with made-up norms; nothing reaches the API.

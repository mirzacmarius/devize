# A Variantă puts other materials in the Deviz's works, priced when it's read

Before deciding, a client often wants to see the same work done cheaper or better, and a Firmă answers by changing materials: a cheaper tile, a thermostatic tap. The works and their quantities stay those of the Deviz. So a Variantă is the Deviz with some of its materials swapped, and the Firmă makes it on the Deviz's page, from the Ofertă's card, before sending the link.

## Consequences

- A Variantă has a name the client reads, unique in its Deviz, an optional tier (economy, standard, premium), a description of what the client gets, of at most 300 characters, and its swaps: for one material of one work, what goes in its place and its unit price without VAT. A Deviz has at most four Variante. Everything about making them is in `convex/offers/variants.ts`.
- Only materials swap, and only for one counted in the same unit, since the swap keeps the work's consumption. Labor, equipment, transport and the sundries counted in "%" stay as the Deviz has them.
- A swap takes a material from the catalog, priced the way the Deviz prices its own (the Firmă's price, a store's, or the reference price), or one typed by hand with its price. The Firmă can type a price over the catalog's. A material without a price can't go in, since it would make the Variantă look cheaper than it is. The picker lists other makes of the same material first, then what the catalog search finds, in the material's unit.
- A swap can go in every work with that material at once: the same product, the same catalog material, or, for a material typed in the Deviz, the same name and unit.
- A Variantă's total isn't kept: it's priced whenever it's read, with the Recapitulație's arithmetic (`convex/offers/choice.ts`), since editing the Deviz's works changes what it costs. A swap whose material left the Deviz no longer counts, and deleting a work deletes its swaps.
- Variante change only while the Deviz does. Once the Deviz is sent, and locked, they're read-only; a revision copies them with their swaps.
- Making the link, the Firmă picks which Variante the client sees and how the Deviz as built is called next to them: Standard, or Devizul de bază when an offered Variantă already has that name. The client reads each Variantă's description under its name, and the assistant (ADR 0019) reads it too.

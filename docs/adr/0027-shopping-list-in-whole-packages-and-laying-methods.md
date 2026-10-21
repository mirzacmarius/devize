# The Lista de cumpărături buys whole packages, and a Mod de montaj sets the losses

A Deviz prices its materials by the exact quantity, 110 kg of tile adhesive, but the contractor buys 25 kg bags, boxes of 1,44 mp and rolls of 10 mp. What the last package leaves over is money the Deviz doesn't show, and the store run is made with a list worked out by hand. The norm's own losses also assume the usual way of laying a covering, such as 1,06 mp of tiles for each mp laid straight; laid diagonally or in a herringbone, more goes to cuts and the work takes longer.

## The Lista de cumpărături

A Deviz's Lista de cumpărături is worked out when it's read, from its Articole: each material, keyed like the Coș keys it (its product, else its catalog resource, else its name and unit), summed over the whole Deviz and rounded up to whole packages. Buying for the whole Deviz rather than for each Articol saves packages, and the list says how many. Materials counted in "%" aren't bought. Nothing is stored but the Firmă's own packages.

A material's package comes from the first of these that has one:

1. The Firmă's own, set from the list for all its devize (`packagings`, by the material's key), with one or more sizes: 15 l and 5 l buckets.
2. The Produs ales for it, at the Deviz's preferred store first, else the one chosen last: one item sold, with the material's units it holds. Its title names the kind (sac, găleată) when it can.
3. The Producător's product: its package size and label.
4. What the material is usually sold in, from Devize's own table of common retail sizes (`materials/packages.ts`), shown as a package to check. The table holds generic sizes, never a producer's data.
5. A material counted in whole units (buc, set) is bought one by one.

A material with none of these, such as ready-mixed concrete, is bought by the quantity. With several sizes, the list buys the cheapest mix that covers the need, taking a package of size s to cost s^0.85, since bigger packages cost less per unit; at equal cost, the mix with less left over wins. The leftover is priced at the Deviz's own price for the material, and the totals give what the packages cost, the part left over and the Deviz's own figure for the same materials, all without VAT. A Deviz with more than 300 materials lists its most expensive 300.

## The Mod de montaj

An Articol lays a covering when one of its materials, counted in the Articol's own unit (mp of tiles per mp of floor), is a covering Devize knows by its name: tiles, planks or boards. Such an Articol can take a method: straight, as the norm has it; offset, diagonal or herringbone for tiles and planks; many cuts for boards. Each method comes with its usual losses and extra labour, never less than the norm's own losses, and the Firmă can change both before applying it (losses from 0 to 50 %, labour from 0 to 200 %).

Applying a method rewrites the Articol's consumptions: each covering takes its layers times one plus the losses, and the labour counted in hours grows by the extra labour. Both start from the consumptions before any method, which the Articol keeps with its method (`lineItems.layout`), so methods never add up, and straight gives the norm's consumptions back. The Deviz, the Recapitulație and the list follow at once, since the method changes the Articol itself.

## Consequences

- A consumption changed by hand after a method, or a newer version of the norm, shows the method as stale, to apply again; applying starts from the consumptions as they are now where they changed.
- An Articol whose title or notes name a method ("diagonal", "în spic") that isn't applied is pointed out on the list and on the Deviz's page.
- A sent Deviz keeps its methods; a revision copies them with its Articole. Switching an Articol to another norm drops its method.
- A Firmă's packages go with the Firmă when it's deleted.
- The Coș still prices each store's whole items for the exact quantity; the list is what to buy, the Coș where.

# A Deviz fits a target price through its profit or its labour, never below cost

A client says "I have 48.000 lei". The contractor then changes the profit rate in the Cote and looks at the total, or lowers prices one by one, until the total comes close, without seeing what margin is left or whether a labour price went under the legal minimum. Done by hand, it is slow and easy to get wrong in a way that costs money.

## Preț țintă

From the Recapitulație or the menu of a draft Deviz, "Preț țintă" takes the client's price, with VAT or without it (a tender's prices are without VAT, so a tender starts there), and one of two ways to reach it:

- **Profitul**: only the profit rate changes. It is worked out from the subtotal the target asks for and rounded to two decimals, as the Cote print, and the neighbouring rates are tried so the nearest total wins. The prices in the Deviz stay.
- **Manopera**: every labour price, the ones counted in hours and the ones per piece or per m², is multiplied by the same factor, rounded to bani. The factor is found by halving the interval, since the total only grows with it, and the nearer of the two totals either side of the target wins. The labour prices it changes count as typed by hand, so "Actualizează prețurile" keeps them. Materials, equipment, transport and the Cote stay.

Before anything is applied, the dialog shows labour, profit, the totals and the profit margin (profit over the total without VAT) now and after, how far the nearest total is from the target, and, for the labour, the cheapest hour of labour it leads to when that is under the legal minimum (the minimum in `lib/labor.ts` that the Tarife and the checks already use).

The arithmetic is pure (`estimates/target.ts`), so the dialog previews exactly what the mutation (`estimates/targetPrice.apply`) then computes again on the server from the stored Deviz. After a labour fit, the totals are recomputed from the stored line items, as after any change.

## What it won't do

- Go below cost: with no profit (or no labour) the Deviz has a floor, and the dialog names it rather than produce a loss. The firm can then change materials or remove works itself.
- Go past the limits the Cote already have: a profit over 100%, or labour more than ten times as dear.
- Hit the target to the ban when rounding can't: a step of 0,01% in the profit rate moves the total by a little, and the dialog says how far the nearest total is.
- Change a Deviz that was sent: the Deviz is locked, as for any change.

## Consequences

- A fit through the labour is a set of prices typed by hand; to undo it, the firm asks for the automatic price again on those resources, or fits again.
- Variante follow the Deviz, since they are worked out from its resources.
- Discounts as their own line, and spreading a cut over materials, are not part of this; they can come later as other methods of the same dialog.

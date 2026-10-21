# Devize copy their norms and prices

A Deviz that a client has seen must never change by itself, yet norms get new editions and prices move every week. So each Articol de deviz keeps its own copy of the norm's resources and of the prices on the Deviz's date, and Devize offers updates instead of applying them.

## Consequences

- `lineItems.resources` is a snapshot: every resource with its consumption, unit price and where the price came from (the firm's own rate or price, a Listare, the norm's reference price, a price typed by hand, or none). `estimates.checkUpdates` reports newer norm versions and changed prices with the totals they would give; `lineItems.upgradeNorm` and `lineItems.refreshPrices` apply them, keeping prices typed by hand.
- A published norm never changes. An edit opens a new draft version (`norms.createVersion`); publishing it supersedes the old version, which stays readable for the devize that used it. All versions share a `lineageId`, the id of the first one.
- Public norms (Devize's base catalog and producers' norms) are published by a super admin, which verifies them; a firm publishes its private norms itself.
- Prices resolve in a fixed order: for labour, equipment and transport, the firm's rate for that resource, then its default rate for the kind in the resource's unit (a day rate never prices a machine counted in hours); for a product, the firm's own price or a quotation, then the preferred retailer, then the cheapest public listing; for a generic material, the firm's own price; and for all of them, the norm's reference price.
- Money is summed in whole bani. Each kind's unit cost (material, labour, equipment, transport) is rounded to bani as the forms print it; a line's totals are unit cost times quantity, rounded; the Recapitulație adds CAM on labour to the direct costs, indirect costs on the direct costs, profit on direct plus indirect costs, and VAT on the total without VAT. The rates are the Deviz's `markups`, copied from the firm's defaults. `estimates/recap.ts` holds this arithmetic with no database access.
- A resource in "%" (such as "Material mărunt 3 %") is a share of the line's materials, or of its own kind for labour and equipment, not a priced quantity.
- Leaving draft locks a Deviz. Going back to draft is allowed only while no Ofertă is out; otherwise a change is a new revision with the same number (`estimates.duplicate` with `asRevision`).

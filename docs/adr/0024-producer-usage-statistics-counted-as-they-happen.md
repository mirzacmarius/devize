# A Producător's usage statistics are counted as they happen, a month at a time

A Producător publishes its norms in Devize to get its products into devize, so the first thing its Profil de producător gives back is what came of it: how often firms put its norms into a Deviz, how many of those devize went to clients and were accepted, how much of its products they hold, and where. These Statistici de utilizare are also what producers may later pay for.

Working them out from the devize each time the page opens would mean reading every firm's devize for every view, more than a Convex query may read once there are many firms. So Devize counts as things happen, into a Producător's totals for each month, in Romania's time:

- A Normă de producător added to a Deviz, from the catalog or with a Devize AI proposal (tender imports included), counts as an addition for its Producător, for the norm across its versions, and for the county of the site.
- A Deviz sent to its client, or accepted, counts once for each Producător whose norms or products it holds, however many times it is sent again or revised: a revision keeps its Deviz's number, and Devize keeps which numbers each firm had counted as sent and as accepted. A Deviz accepted without being marked as sent first counts as sent too. The count runs right after the status changes, so it never holds up the firm's click.
- Products count by quantity, from the resources of the Deviz's line items. A sent Deviz also counts the products its Variante offer instead. An accepted Deviz counts what the client accepted on its Ofertă: the chosen Variantă, without the optional works they left out. A product that the chosen Variantă replaced with another producer's, or with a generic one, counts as replaced for its producer, and the product that replaced it counts for its own.

The totals are rows for a Producător and a month: one for each county, one for each norm across its versions and one for each product. A row for each firm that used the Producător keeps only its county and the last month it did, for the count of firms and the county rule below. The statistics read at most a year of these rows.

We considered `@convex-dev/aggregate`, which keeps such totals as a Convex component. The project has no components yet, and a few rows behind unique indexes keep these counters just as well.

## Consequences

- The statistics count from the day this was deployed: nothing is worked out from the devize made before.
- Only the Firmă that holds the Profil and the Devize team see them, on the profile's Statistici tab. Anyone else sees nothing.
- They never name a firm or return its id. A county shows on its own only once at least 3 firms used the Producător's norms or products there in the year; the other counties, and the devize without a county, show together.
- Deleting a Firmă deletes what ties it to the counts: which producers it used, and which of its devize were counted. The totals it added stay, since they name no firm.
- Resources priced as a percentage, such as small materials, don't count as product quantities.
- The firm's events behind the additions (`usageEvents`) are kept as before, for statistics we may add later.

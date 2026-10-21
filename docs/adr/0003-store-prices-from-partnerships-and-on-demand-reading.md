# Retailer prices from partnerships and on-demand reading

Devize prices materials from four retailers first: Dedeman, Leroy Merlin, Hornbach and Brico Depot. None of them offers a public affiliate programme or product feed (checked 21 October 2026), and their terms usually forbid scraping, which also breaks whenever a site changes. Marius chose, on 21 October 2026, to pursue direct partnerships for feeds or APIs and, until a retailer has one, to read a product's public price only when a Deviz needs it.

## Consequences

- A price is read on demand for one product at a time: when a Constructor adds it to a Deviz or asks for a refresh. Reads are cached and rate-limited. Devize never crawls a retailer's catalog.
- A partnership feed replaces on-demand reading for that retailer as soon as it exists, and runs daily as a scheduled Convex job.
- Every price shows its source and date, and its history is kept.
- Producători's and Furnizori's own price lists, quotations and the Firmă's own prices are separate sources, prioritised per Firmă.

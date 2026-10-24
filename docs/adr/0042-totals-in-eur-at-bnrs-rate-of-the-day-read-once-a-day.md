# Totals in EUR at BNR's rate of the day, read once a day

Romanian clients compare renovation prices in euros: they ask "how much is that in euros?", and contractors work it out on their phones at whatever rate they find. A Deviz is in lei and stays in lei: the law sets the price in lei, the forms print lei and the client pays lei. What was missing was the comparison, done at the rate that counts.

## The rate

The reference rate is BNR's (Banca Națională a României), which it publishes each banking day around 13:00 at `https://www.bnr.ro/nbrfxrates.xml`. A cron (`crons.ts`) reads it at 11:15 and 14:15 UTC every day; the second run catches a late publication, and on weekends and holidays the document still holds the last banking day's rate, which is kept once. Each currency and day is one row in `exchangeRates`, with the day BNR set the rate for, not the day it was read. Only the euro is kept, since that is the currency clients compare in; the parser (`exchange/bnr.ts`) reads every currency, multipliers included (100 HUF), so another is one line away.

Nothing is fetched while someone waits: the pages read the newest row, through `exchange.rates.latest`, a public query because BNR's rates are public. If BNR can't be read, the pages keep showing the last rate with its date; if none was ever read, they show no euros.

## Where it shows

- On the Deviz, under the Recapitulație: "≈ 9.876,54 EUR la cursul BNR din 23 oct. 2026 (1 EUR = 4,9772 lei)", for the total with VAT.
- On the client's Ofertă link, under the price, with "Plata se face în lei", when the firm leaves "Arată prețul și în EUR" on as it sends the link (on by default, stored as `offers.showEur`). It shows while the client decides, at the rate of the day they open it; once they accept or decline, the link shows the price in lei only, because the euros were a comparison and the lei are what was agreed.

Amounts in euros are rounded to cents from the total in lei; nothing is stored in euros and nothing prints in euros on the forms or the PDFs.

## Consequences

- A new deployment shows no euros until the cron's first run, at most a few hours.
- The rate is the one BNR set for its day, so an Ofertă opened on Saturday shows Friday's rate, as the law uses it.
- Offers sent before this change show no euros (their `showEur` is unset).

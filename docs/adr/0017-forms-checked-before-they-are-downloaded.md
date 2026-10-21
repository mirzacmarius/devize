# The forms are checked before they are downloaded

A tender's financial offer is judged on its forms, and the mistakes that cost a bidder are rarely in the arithmetic: a position of the authority's list priced twice or dropped, a quantity that is no longer the list's, works under the wrong subchapter, a schedule that ignores the tender's duration, or an offer form whose price in words doesn't match F1. So the forms sheet checks the forms it is about to draw, from the same Deviz and the same choices (`packages/forms/src/checks.ts`), and shows above the download button what the offer is worth and what to look at.

## Consequences

- The offer's value is F1's: the categories' own closings, with VAT worked out on each object's subchapter. It shows without VAT, the VAT and the total, each in figures and in Romanian words, ready to copy into the offer form, and by how much rounding sets it apart from the Deviz's Recapitulație.
- The words follow Romanian usage: a number agrees with what it counts ("doi lei", "două mii", "un milion") and takes "de" from twenty on, unless it ends in 1 to 19 ("o sută de lei", "o sută doi lei").
- A line worth nothing and a position printed twice in one list of quantities fail. The other findings are warnings: a gap in the authority's numbering, lines that are not in the authority's lists, quantities that differ from the list's, works placed only by the fallback, F4 left out while works buy equipment, F6's duration still ours, and forms without a beneficiary.
- A gap is a number missing between two of the authority's positions in one list. A number whose own positions follow ("3" before "3.1") is a heading, a line of the bidder's that prints the number fills it, and more than 20 missing in a row is a list numbered with a jump.
- A quantity is compared in the line's own unit, as the import converted it, to four decimals. Units that don't convert, such as windows counted in pieces and priced by area, are the bidder's to count and aren't compared.
- Nothing blocks the download. Where the sheet can fix a finding, the check links to the field, adds the missing forms or keeps what is there: a placement or a duration the person confirms is kept with the other choices, even when it is the one we guessed or planned.

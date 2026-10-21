# A tender's quantity lists are read by reference to their cells

A Licitație is priced on the contracting authority's own Liste de cantități (formularul F3): their U.M. and quantities can't change, and the F3 a Constructor submits repeats them. Devize imports the lists into a Deviz with AI, because each authority lays them out differently. From a spreadsheet the model only says which rows hold an Obiect, a Capitol or a position, and which columns hold the number, code, text, U.M. and quantity; Devize takes every value from those cells. From a PDF or a photo of a page the model copies the values, and the review shows each one for a person to check.

## Consequences

- Devize reads .xlsx with its own reader of the zip and the sheet XML, without a new dependency, so it sees the cells as Excel stores them: numbers as numbers, shared and inline strings, visible sheets only. The binary .xls of Excel 97–2003 isn't read; the person saves it as .xlsx or PDF.
- The model reads a sheet 120 rows at a time: the first batch alone, to learn the columns, then four at once. A position whose text runs over several rows is joined from the text column, and a row an earlier batch took isn't read again.
- A PDF goes to Claude whole and cached, three pages per request; pages whose answer runs too long are read again one by one. A PDF of more than 100 pages is reported as unreadable, to be split.
- A position without a U.M. or a quantity doesn't go in: the review lists it by file, for the person to add by hand. An import takes at most 1000 positions.
- Each position is matched with the catalog's Norme, only by a Normă that describes the same work and whose U.M. converts. For the others the model writes the recipe, and the review marks them as estimated.
- The Articol keeps the list's position, code, text, U.M. and quantity in `tenderRef`, which the Formulare oficiale print. Its own quantity is in its Normă's U.M., such as 2,432 for 243,2 mp on a "100 mp" Normă.
- The lists' Obiecte become sections, with their Capitole inside them. An existing section is reused only when its kind, Obiect, code and name all match, so one Obiect's Capitolul 1 never takes another's positions.
- The positions kept go into the Deviz a hundred per mutation, the rest in scheduled ones, and no new proposal starts until they are all in. As with every proposal, nothing goes into the Deviz before a person keeps it.

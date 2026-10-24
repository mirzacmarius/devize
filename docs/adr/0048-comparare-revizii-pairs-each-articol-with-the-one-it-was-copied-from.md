# Comparare revizii pairs each Articol with the one it was copied from

A client who gets a Deviz usually asks for changes: cheaper tiles, one room less, a wall more. The firm makes a revision (Revizie nouă, in the Deviz's menu), DVZ-0142-R2, changes it and sends it again, and the client's first question is what changed and why the total moved. Devize listed the revisions with their totals and nothing else, so the firm compared the two PDFs by eye and wrote the explanation by hand.

## Pairing the Articole

A revision copies every Articol of the Deviz it was made from. Each copy now keeps `originId`, the Articol of the first revision it descends from (its source's own `originId`, or the source itself), so any two revisions of a number pair their Articole by it, whatever was renamed, re-priced or moved between Capitole since. A Copie, which gets a new number, starts afresh without it, as do Articole added later.

When two revisions share any recorded lineage, that is all the pairing there is: whatever `originId` leaves unpaired was added or removed, so tiles taken out of the bedroom and added in the hall show as one Articol removed and one added, not as a quantity changed. Only revisions that share no recorded lineage, such as those made before `originId` existed, pair by what their Articole say, most certain first: code, unit and words in the same Capitol, then anywhere; code and unit; words and unit. A custom Articol's code is "—", so it never pairs by its code alone. Each Articol pairs at most once, in the order the Deviz lists them, so the same Normă in two Capitole pairs with its own earlier self.

The pairing and the differences are a pure function (`estimates/diff.ts`), tested on its own. Two quantities are the same to the thousandth and two unit prices to the ban, as the forms print them, so float noise never shows as a change.

## What the page shows

`/estimates/<id>/compare?with=<id>` (the „Compară” link next to each revision on the Deviz) compares with the revision named, or with the one before. The earlier revision is always on the left, whichever page it was opened from. It shows:

- the total with VAT of each revision and the difference, in lei and percent, with how many Articole were added, removed, changed and left as they were, and which Cote changed;
- both Recapitulații side by side, line by line, with each line's difference;
- the Articole added, removed and changed, each with its quantity and unit price before and after and what it adds to or takes from the Deviz before its Cote.

The Articole's amounts are the Deviz's own, before CAM, indirect costs, profit and VAT, as the client's Deviz prints them. Spreading the Cote over each Articol would give amounts the client finds on no document. The page says so, and the Recapitulație shows where the rest of the difference comes from.

„Copiază rezumatul” copies the same as plain text, for an email to the client: the total before and after, then each Articol added, removed and changed, and the Cote, ending with the note about the amounts.

## Consequences

- The comparison reads both revisions' Articole in one query. A Licitație of several thousand Articole could near what a query may read; none is that large yet, and the Deviz page reads one revision the same way.
- The Antemăsurătoare isn't compared: its quantities land on the Articole, which are. Variante aren't compared either: their swaps live on the Variantă, not on the Articole, so a revision that changes only a Variantă's swaps shows no difference, and the totals shown are the Deviz's as built, without any Variantă.
- `originId` is set only by `estimates.duplicate`. A future path that copies Articole into a revision has to set it too, or those Articole fall back to pairing by what they say.

# The search menu (Ctrl+K) finds devize, clients, invoices and norms in one query

A contractor on the phone with a client wants that client's Deviz now, and the way there was the sidebar, the list of devize, then scrolling or searching on that page. Each list had its own search, and a norm, an invoice or a client each lived on another page.

## The menu

Ctrl+K (⌘K on a Mac), or "Caută…" in the sidebar, or the magnifier on a phone, opens one field from any page of the app. With nothing typed it shows the five devize changed last, the actions that start something (Deviz nou, Client nou, Normă nouă) and the app's pages. As someone types it shows, in this order:

- **Devize** whose title or number matches: "142", "0142" and "DVZ-0142" all find Devizul 142, as the list's search does.
- **Clienți** by name, without diacritics.
- **Facturi** by number: "17", "0017" or "DVZ-0017", in the series named (compared without its dashes, so a series saved as "FACT-" is found by "FACT--0017") or in each of the firm's series. Drafts have no number, so they aren't found.
- **Norme** the firm can use, as "Adaugă din catalog" finds them: its own published norms first, then the public ones, those their producer confirmed first among the 30 most relevant.
- **Acțiuni** and **Pagini** whose name, or one of a few other words for it ("adaugă", "creează"), starts with each word typed. The theme can be changed from here too, when asked for.

A Deviz, an invoice, a norm or a page opens at its address; a client opens in the sheet that edits it; Deviz nou and Client nou open the same dialog and sheet as their pages. The arrows choose, Enter opens and Esc closes, and closing without opening anything puts the focus back where it was. The field is a combobox and the results a listbox with groups, so a screen reader follows the choice; a status line says how many results there are, that the search is still running, or that nothing matches.

## How it reads

One query, `search.everywhere.find`, returns the four groups, five rows each, from the search indexes the lists already have (`estimates.search_searchText`, `clients.search_nameKey`, `norms.search_searchText`) and the invoices' index by series and number. One query means one subscription and one round trip for what is typed, not one per group, and it checks the membership once. Like the app's other searches, it asks again as the text changes (React's deferred value lets it skip some keystrokes while someone types fast). Punctuation alone finds nothing.

The menu keeps showing the last results until the next ones arrive, so the list doesn't empty and refill as someone types; their group names say which words they answer ("Devize recente" until a search comes back). An Enter pressed before the results for the words typed waits for them and opens the first, rather than an older result still on screen.

The entry chosen with the arrows has its page prefetched (ADR 0029), so Enter opens it at once.

## What it won't do

- Search inside a Deviz's line items, an invoice's lines or a client's notes: those are found from their own pages.
- Open from inside another dialog or sheet: Ctrl+K there would take the focus from a form being filled in, so the browser keeps the shortcut.
- Remember what someone searched for: the recent devize are the ones changed last, for the whole firm.

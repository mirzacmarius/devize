# The search menu (Ctrl+K) finds devize, clients, invoices and norms in one query

A contractor on the phone with a client wants that client's Deviz now, and the way there was the sidebar, the list of devize, then scrolling or searching on that page. Each list had its own search, and a norm, an invoice or a client each lived on another page.

## The menu

Ctrl+K (⌘K on a Mac), or "Caută…" in the sidebar, or the magnifier on a phone, opens one field from any page of the app. With nothing typed it shows the five devize changed last, the actions that start something (Deviz nou, Client nou, Normă nouă) and the app's pages. As someone types it shows, in this order:

- **Devize** whose title or number matches: "142", "0142" and "DVZ-0142" all find Devizul 142, as the list's search does.
- **Clienți** by name, without diacritics.
- **Facturi** by number: "17", "0017" or "DVZ-0017", in the series named or in each of the firm's series. Drafts have no number, so they aren't found.
- **Norme** the firm can use: its own published norms first, then the public ones, as "Adaugă din catalog" finds them.
- **Acțiuni** and **Pagini** whose name, or one of a few other words for it ("adaugă", "creează"), starts with each word typed. The theme can be changed from here too, when asked for.

A Deviz, an invoice, a norm or a page opens at its address; a client opens in the sheet that edits it; Deviz nou and Client nou open the same dialog and sheet as their pages. The arrows choose, Enter opens and Esc closes; the field is a combobox and the results a listbox with groups, so a screen reader follows the choice.

## How it reads

One query, `search.everywhere.find`, returns the four groups, five rows each, from the search indexes the lists already have (`estimates.search_searchText`, `clients.search_nameKey`, `norms.search_searchText`) and the invoices' index by series and number. One query means one subscription and one round trip per word typed, and it checks the membership once. The field waits for React's deferred value, and the menu keeps showing the last results until the next ones arrive, so the list doesn't empty and refill as someone types.

The entry chosen with the arrows has its page prefetched (ADR 0029), so Enter opens it at once.

## What it won't do

- Search inside a Deviz's line items, an invoice's lines or a client's notes: those are found from their own pages.
- Open over another dialog or sheet: Ctrl+K there would take the focus from a form being filled in.
- Remember what someone searched for: the recent devize are the ones changed last, for the whole firm.

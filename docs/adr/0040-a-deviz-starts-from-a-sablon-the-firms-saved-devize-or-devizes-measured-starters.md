# A Deviz starts from a Șablon: the firm's saved devize or Devize's measured starters

A firm that renovates bathrooms writes the same Deviz forty times a year: the same demolitions, the same plumbing points, the same tiles and waterproofing, with different dimensions. Every Deviz started empty. The nearest thing to a template was Copie on an old Deviz, which also copied its client, its site, its markups and its prices from the day it was written, so the firm had to clean it up before it could use it. A new firm, with no old devize, had nothing to start from at all.

## Șabloanele firmei

Any Deviz with at least one Articol can be saved as a Șablon (Salvează ca șablon, in the Deviz's menu). A Șablon is a row in `estimateTemplates` with its name, description, counts and total, and a row in `estimateTemplateContents` with a copy of the Deviz's Capitole and Obiecte and of its Articole: code, title, unit, quantity, Resurse with their consumptions, the Normă it came from, notes and Mod de montaj. It doesn't keep what belongs to one job: the client and site, the Cote (the new Deviz takes the firm's defaults of the day), the Variante, the Antemăsurătoare and Camere, a Licitație's positions and an AI proposal's confidence.

Names are unique in a firm, compared without case or diacritics; saving under a name already taken asks first, then replaces that Șablon. A firm keeps up to 200, each up to 300 Articole and 800 KB, which stays well under Convex's 1 MB a document. The works are kept apart from the list's row because Convex counts every byte a function reads: 200 Șabloane of that size, read whole for a list of names, would pass its 16 MB limit and lock the firm out of its own list. Any member saves and uses Șabloane; a member renames, replaces and deletes the ones they saved, and an admin any of them, as with devize. A member who saves under the name of a colleague's Șablon is told the name is taken, not offered to replace it.

Starting a Deviz from a Șablon (Deviz nou → Pornește de la, or Șabloane → Deviz nou) creates it with the dialog's details and copies the Capitole and Articole. Each Resursă is priced again as an Articol added from the catalog is, with the firm's Tarife and prices of the day, except the prices typed by hand, which stay: they are the firm's decision, such as a price agreed with a supplier. A Normă that has a newer version since is offered as an update, as in any Deviz. The Șablon counts how many devize started from it, which the list shows.

## Șabloanele Devize

Devize ships five starters in code (`templates/starters.ts`), the usual jobs of a private client: Baie, Bucătărie, Zugrăveli apartament, Termosistem and Acoperiș. Each is written with the Norme de bază by their codes, never with a Producător's norms, which are copyrighted and wouldn't suit every firm. Each asks for three to five measurements, with defaults and bounds (a bathroom's length, width and tiling height), and works out every quantity from them: the bathroom's floor tiles are its floor, its wall tiles are its perimeter to the tiling height without a door, its waterproofing is the floor, 20 cm up the walls and the shower's corner. Works counted in pieces, such as the plumbing points, start at a usual number.

A starter's Articole are added as from the catalog: the Normă de bază's published version, priced with the firm's Tarife and prices, grouped in its Capitole. A work whose Normă isn't published is left out and named when the Deviz opens, so a starter can be used once any of its Norme is published. Until then, as before the base catalog is published at all, it is listed but can't be used.

The starters are code, not data, because they are product content tied to the base catalog's codes: a test checks that every code they use exists in the base catalog and that their defaults are within their bounds, so a renamed Normă de bază fails the tests in CI rather than a firm's Deviz.

## Consequences

- The base catalog's codes are now an interface: changing one means changing the starters that use it.
- A Șablon doesn't follow the Deviz it was saved from; saving again under the same name replaces it.
- A starter's quantities are a first measure, not an Antemăsurătoare: the dialog says to correct them, and they write no rows or Camere. Writing a starter's dimensions as a Cameră is a possible follow-up.
- The list query checks every starter's codes against the published catalog on each read, about fifty indexed reads, which is cheap and keeps the availability exact.

# Sisteme compatibile: Devize's own rules check where materials go, and Producători declare their systems

Execution mistakes and complaints often start in the Deviz: a tile adhesive that isn't deformable on underfloor heating, wall tiles on a terrace, laminate in a bathroom, glass wool in an ETICS. So do systems left half done: tiles in a shower without the waterproofing under them, a floor without its skirting. The check reads a Deviz for both, when it's read, and shows them on the Deviz's page with why and the fix one click away.

## Where each Articol is done

Each Articol gets its contexts, any of underfloor heating, outdoors, a bathroom or shower, and a facade, from the words around it, the nearest winning: its own title and notes, then the names of its Capitol and Obiect, then the Deviz's title, and for underfloor heating, another Articol of the same Capitol, since the heating is a work of its own. Indoor words rule out outdoors. A Capitol or a Deviz's title that names a context among other rooms ("Renovare apartament: baie, bucătărie, living") says nothing about any one Articol, so it's ignored. A floor or a wall comes from the Articol's title and its norm's category. Each context keeps where it was read, so a finding says why it applies.

## Combinații greșite

Devize's own rules (`systems/rules.ts`), from the classes the standards give materials (SR EN 12004 for tile adhesives, SR EN 13888 for grouts) and current practice, name a material by its normalized name, the context and the surface it's wrong for, how serious it is and, when there is one, the fix: a generic Devize material with no brand, priced at a reference price until the Firmă prices it, or a Normă de bază to switch the Articol to. The check is deterministic and asks no AI. A context read from an Articol's own words gives an error; one read from the Deviz's title or a neighbouring Articol only ever gives something to check.

The server works the fix out again from the rule when it's applied, so the interface can't put an arbitrary material into the shared catalog. A swapped material keeps its place in the Articol and its consumption; a norm switch keeps the Articol's quantity and needs the same unit.

## Restul sistemului

A system is the works that go together. Devize's base systems are built from the Norme de bază's codes (`systems/baseSystems.ts`): tiles on a floor take the skirting, or in a bathroom the waterproofing under them; an ETICS takes the facade scaffolding and the outside sills; a window its sills inside and out. A part the Deviz lacks, by its code or by the words of its Articole's titles, is suggested with a quantity: the starting Articole's own, in the same unit, or for a skirting after floors in mp, the length around the floors their Antemăsurători measured. It goes in after the last of them, in its Capitol.

A Producător's own firm, or Devize staff, writes its systems on its profile, under Sisteme: its own norms and products that go together, and the contexts it says they suit and don't. A system is published only once all its norms and products are. A Deviz that uses part of a published system gets its other norms suggested, and a warning where the Producător says the system doesn't suit.

## Neutrality

Next to a wrong combination, the check offers the published systems meant for that context that have a norm in the Articol's category and unit, at most three, in the order of the Producători's names and then the systems'. Nobody pays for a place in Sisteme compatibile. When the business model brings paid promotion here, a promoted system will be marked as such, and promotion will change neither what the check finds nor any Deviz's calculation.

## Consequences

- A Firmă can hide a finding or a suggestion; it stays hidden in the Deviz's revisions, keyed by the rule, the Articol's title and the material's name, and can be shown again. Hiding isn't a change to the Deviz, so it works on a sent one too; fixing needs a draft.
- The Detector de omisiuni (ADR 0026) gets the open findings and suggestions as already flagged, from `compatibilityFindings` in `systems/check.ts`, so it doesn't repeat them.
- The rules can be wrong about a Deviz they can't see, which is why every finding says why and can be hidden. A rule never changes the Deviz on its own.
- Producers' systems hold only their own norms, by their first version, so a system follows its norms' new versions.

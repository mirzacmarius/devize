# Works placed in the Deviz general by their names

The Deviz general (HG 907/2016, Anexa 7, as HG 1116/2023 amended it) and each object's Deviz (Anexa 8) total an investment's costs by subchapter, and the forms of a financial offer, F1, F2 and F4, total the works the same way: 4.1.1 earthworks and outdoor works, 4.1.2 structure, 4.1.3 architecture, 4.1.4 building services, 4.2 installing equipment, 4.3 to 4.6 the equipment, furnishings and intangible assets bought, and, outside the base investment, 1.2 to 1.4 preparing the site, 2 its utilities and 5.1.1 site organisation. A Deviz does not say where its Capitole fall, and authorities place the same works differently. So Devize guesses each Capitol's subchapter from its code, its name and its Obiect's name (`packages/forms/src/subchapters.ts`), and the person changes any guess in the forms sheet before downloading. Nothing is stored in Convex: the sheet keeps what was chosen for each Deviz in the browser's local storage, with the forms, their names and who they are for, and the next export starts from it.

## Consequences

- A Capitol whose code is a subchapter's, such as "4.1.4", goes there. An Obiect named for site organisation or utilities takes all its Capitole with it. A name nothing recognises is Arhitectură, the commonest.
- Only the works are valued. The Deviz general prints chapters 1 to 7 in full, and leaves blank the rows its works do not fill, such as design, technical assistance and the budget margin, for the beneficiary.
- VAT is worked out on each object's subchapter and summed, so the Deviz general and F1 agree with the objects' Devize to the ban. F4 prices each piece of equipment with its own CAM, indirect costs and profit, and a line for rounding makes it add up to subchapters 4.3 to 4.6.
- Only the choices that differ from the guess are kept, so they still win when a later version guesses better. A placement the person confirms for works nothing recognises is kept too (ADR 0017).
- The choices stay on one device and in one browser. Keeping them with the Deviz, for every device and colleague, needs a field in the schema.

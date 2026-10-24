# A takedown deletes the producer's norm documents and keeps the proof of consent

A profile taken down after a removal request (ADR 0018) archived its published norms and stopped outreach, but the norm documents the producer had sent stayed: the PDF, the norms Claude extracted from it and the note of who agreed to their publication. Nothing used them any more. The PDF and the extracted norms are the producer's copyrighted work, and the note names a person. Separately, the signature on the outreach emails, a super admin's name and phone, stayed in the settings after that person deleted their account.

## Takedown

When `withdrawNorms` has archived the last batch of published norms, `dropImports` (`manufacturers/normImports.ts`) deletes the producer's documents one per run, each with its extracted norms and its stored PDF. It stops if the producer is no longer excluded.

## Proof of consent

`deleteNormImport` runs for a takedown, for a document deleted by hand and for a manufacturer deleted whole. When any of the document's norms reached the catalog, it first copies the agreement recorded on it (note, who recorded it and when), with the file name, edition and deletion date, to `manufacturers.keptConsents`. Devize made until then keep their copies of those norms (ADR 0005), so the proof that they were published with the producer's agreement stays as long as the manufacturer does. The privacy page says so. A document whose norms never reached the catalog leaves nothing behind. The admin page lists the kept agreements under „Norme primite”.

## Signature

`updateSettings` records who saved the signature (`outreachSettings.signedBy`); it is taken to be their own. When that person deletes their account, `forgetSender` clears the name and phone. Drafts nobody edited are rendered again without them and wait, blocked by their placeholders, for a new signature. A thank-you rendered this way keeps its claim link, since no one is there to issue a new one. In edited drafts, the exact name and phone become `{Prenume} {Nume}` and `{telefon}` again. Settings saved before `signedBy` existed go with whoever saved them last. Emails already approved or sent keep the signature they went out with, as the record of what we wrote.

## Consequences

- A producer that comes back after a takedown has to send its norms again.
- Kept agreements are never deleted while the manufacturer exists. The manufacturer can't be deleted while the catalog holds its norms, archived ones included.
- The signature only knows the account that saved it. A super admin who types someone else's details makes the signature go with their own account.

# A takedown deletes the producer's norm documents and keeps the proof of consent

A profile taken down after a removal request (ADR 0018) archived its published norms and stopped outreach, but the norm documents the producer had sent stayed: the PDF, the norms Claude extracted from it and the note of who agreed to their publication. Nothing used them any more. The PDF and the extracted norms are the producer's copyrighted work, and the note names a person. Separately, the signature on the outreach emails, a super admin's name and phone, stayed in the settings after that person deleted their account.

## Takedown

When `withdrawNorms` has archived the last batch of published norms, `dropImports` (`manufacturers/normImports.ts`) deletes the producer's documents one per run, each with its extracted norms and its stored PDF. It stops if the producer is no longer excluded.

## Proof of consent

`deleteNormImport` runs for a takedown, for a document deleted by hand and for a manufacturer deleted whole. When any of the document's norms reached the catalog, it first copies the agreement recorded on it (note, who recorded it and when), with the file name, edition and deletion date, to `manufacturers.keptConsents`. Publishing notes the first time on the document (`normImports.publishedAt`), because extracting it again replaces the rows the published norms point to; for documents published before that field, a row still linked from the catalog counts. Devize made until then keep their copies of those norms (ADR 0005), so the proof that they were published with the producer's agreement stays as long as the manufacturer does. The privacy page says so. A document whose norms never reached the catalog leaves nothing behind. The admin page lists the kept agreements under „Norme primite”.

## Signature

`updateSettings` records who saved the signature (`outreachSettings.signedBy`); it is taken to be their own. When that person deletes their account, `forgetSender` clears the name and phone from the settings and keeps them in `forgetting` only while `forgetSenderDrafts` goes through the drafts, 50 at a time, taking only a cursor (as in ADR 0043). Drafts nobody edited are rendered again without them and wait, blocked by their placeholders, for a new signature. A thank-you rendered this way keeps its claim link, since no one is there to issue a new one. In edited drafts, the first name, the last name and the phone become `{Prenume}`, `{Nume}` and `{telefon}` again wherever they stand (`scrubSender`): names as whole words in their letter case, so „Danubiu” stays when „Dan” goes, and the phone whatever spaces, dots or dashes split its digits. Settings saved before `signedBy` existed go with whoever saved them last. Emails already approved or sent keep the signature they went out with, as the record of what we wrote.

## Consequences

- A producer that comes back after a takedown has to send its norms again.
- Kept agreements are never deleted while the manufacturer exists. The manufacturer can't be deleted while the catalog holds its norms, archived ones included.
- The signature only knows the account that saved it. A super admin who types someone else's details makes the signature go with their own account.

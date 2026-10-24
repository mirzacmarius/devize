# The addresses of people at producers expire in a daily run

The privacy page promised that the addresses of people at producers who never answer go within six months of the last email, and nothing deleted them. Research also writes down people's addresses that nobody ever writes to, and its report names people in free text. GDPR asks that data obtained from someone other than the person be used to inform them within a month (art. 14(3)(a)) and kept no longer than its purpose needs (art. 5(1)(e)), and that someone who objects is no longer written to (art. 21(3)).

## Which addresses

Only people's addresses. A contact research labelled `person` is a person's; so is any other address whose local part has a word that is neither a role (office, tehnic, vanzari, export…) nor the firm's name, brands or site (`lib/retention.ts` `isPersonAddress`). ion.popescu@, andrei@ and tehnic.ion@ are people's; office@, vanzari.export@ and termotest@ are the firm's and stay. When unsure, it is a person's. The addresses are those of the firm's contacts and of its emails: the recipient, the address in the template's values and a thank-you's claim address.

## When

Each address keeps its own clock (`retentionPlan`):

- someone who asked us to stop (an address or its domain on the suppression list), or a firm we excluded: at once;
- while the firm is in touch with us (it answered, sent norms or claimed its profile): kept. `answeredAt` keeps the first answer when the status is set back later. A firm that declined is no longer in touch;
- written to: 175 days after the last email to that address, sent or opened to send. An approved email may already be in the outbox (ADR 0006), so it counts as written. The shortest six calendar months are 181 days, which leaves room for missed runs;
- never written to: 25 days after it was first found, so within the shortest month. `foundAt` is kept across research runs; an address typed into a draft by hand counts from `toSetAt`, when it was typed.

Research reports name people in free text that no exact match can clean, so each one is deleted 25 days after its research, at every firm (`reportsUntil` notes when the next one is due). What research found stays on the manufacturer.

## How

A cron at 03:15 UTC pages through the manufacturers and reviews each one in its own mutation (`manufacturers/retention.ts`), the way price alerts do (ADR 0010). Adding an address or a domain to the suppression list starts the same pass at once, so `suppress` stays cheap and the stop is always recorded. Research doesn't write down a person on the list again, and leaves their address out of its report. These functions take ids and cursors only: an address in the scheduler's arguments would outlive the erasure.

Erasing an address at a firm:

- deletes its contacts and its unused claim links;
- keeps an email sent or opened to send as the record that we wrote, with the address replaced by „[adresă ștearsă]” and `recipientErasedAt` set. An approved email to someone who asked us to stop, or to an excluded firm, is stopped;
- points a draft nobody edited at the next contact; an edited one gets „{adresa}” in place of the address, which blocks it until someone picks a recipient (warning `recipient_erased`); deletes a thank-you draft, whose claim link was theirs, and a rejected email;
- replaces the address in the notes, hints and research findings, and deletes any research report that names it.

One `outreachErasures` row per rule records when and how many, with the subjects of the emails sent to those addresses and no address, hash or domain. Devize can't reach the mailbox the emails went from, so the rows with subjects wait in „De șters și din căsuța de email” on the outreach page until someone deletes those emails there and presses the button.

## Consequences

- An address erased after no answer isn't remembered, not even as a hash, which would still be personal data. Research may find it again; it then starts a new clock and a new first email carries a new notice.
- A firm in touch has no end date beyond „cât discutăm cu firma”. If that needs one (say 24 months after the last message), it is a change here and on the page.
- Deleting a manufacturer now also deletes its erasure rows and the reports on its research jobs; the jobs stay for their cost. Manufacturers deleted before this change may have left reports behind; research jobs that failed have none.
- Notes and edited emails lose only exact addresses, not names, so the notes field asks not to hold names.
- Convex backups, if any are kept, hold erased rows until they expire on their own.

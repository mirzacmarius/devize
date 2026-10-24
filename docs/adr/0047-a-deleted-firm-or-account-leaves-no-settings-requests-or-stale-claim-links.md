# A deleted firm or account leaves no settings, requests or stale claim links

An audit of what outlives its purpose found rows that deleting a firm or an account left behind, and claim links nothing ever deleted. GDPR asks that personal data be kept no longer than its purpose needs (art. 5(1)(e)) and erased when the person asks (art. 17). ADR 0045 does the same for what signing in and uploads leave behind. Issued invoices and the evidence of an accepted Ofertă are left out here: how long they stay is the operator's decision, by the accounting law and the limitation periods, and gets its own ADR.

## Deleting a firm

`accounts/cleanup.ts` deletes a firm a batch at a time. It now also deletes:

- its Șabloane de deviz with their works (`deleteFirmTemplates`), ten at a time: one template's works can take 800 KB, so ten stay well under the 16 MiB a mutation may read;
- its invoice settings and series (`deleteFirmInvoiceSettings`). An issued invoice carries its own copy of the seller's details and its number, so it needs neither; draft invoices already went with their Deviz;
- its own prices with their whole history, at most one batch of history rows per run. A listing goes only once its history has, because nothing else leads to the history rows. Before, one run read up to 1000 history rows for each of 200 listings, past what a mutation may write.

## Deleting an account

`users.deleteCurrentUserAccount` now also forgets the person on producers' profiles:

- **Claims and removal requests** (`forgetClaimant`): those still waiting are deleted, as if withdrawn. A decided one stays as the record of what happened to the profile, with what was decided, the method, the firm and when, but without the person's address, what they wrote about themselves and the reason a super admin gave them. `email` and `message` became optional for this; pending rows always have them, and Admin shows „cont șters” in place of a name that is gone. The CUI and ANAF's answer are the producer's, not the person's, and stay.
- **Claim links** to the address they claimed with, on the profiles they claimed or asked to claim, go at once. A link to that address for another profile goes with the other expired links (below).
- **The profile's contact** (`forgetContact`): on every profile whose contact address is their account's, found by the `by_contactEmail` index, the contact's name, address and phone go; what the producer wrote about itself stays. It doesn't matter whether they still belong to the firm that holds the profile: they may have left it first, or a colleague may have typed their address.

## Claim links expire for good

A claim link works for 30 days. Admin keeps listing it, used or not, for a month after it expires, then a daily cron at 03:30 UTC deletes it (`producers/claimLinks.deleteExpired`, by the `by_expiresAt` index, a batch at a time). A used link's claim keeps how and when the profile was claimed.

## Consequences

- A decided claim of a deleted account names no one. If Devize ever needs to show who took a profile over after that person left, it has the firm and the date, not the person.
- The contact is matched by address only. A contact with the firm's general address (office@) stays when one of its members deletes their account, and so does a contact who is a person without an account.
- The privacy page says what goes when an account is deleted and when claim links go.
- Convex backups, if any are kept, hold deleted rows until they expire on their own.

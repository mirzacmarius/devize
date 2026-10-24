# A deleted firm takes its invoices, after offering their archive

A Firmă is deleted when its last member deletes their account (`users.deleteCurrentUserAccount`, then `accounts/cleanup.ts`). ADR 0047 left issued invoices out: they stayed behind with no firm and no member, so nobody could open them, yet they still held the clients' names, CNPs and addresses. Legea contabilității (Legea 82/1991, art. 25, as Legea 36/2023 words it) has the firm keep its supporting documents, invoices among them, 5 years from 1 July of the year after the financial year they were made in. That duty is the firm's, not Devize's, which processes the invoices on its behalf. The operator decided (Marius, 2026-10-24) that a deleted firm's invoices go with it, after a warning and an offer to export them.

## The warning

„Șterge contul” in Setări lists each firm the user is the only member of (`users.deletionPreview`), saying it goes with the account. A firm with numbered invoices (issued, paid or cancelled; counted up to 101, so "peste 100") also gets:

- how many there are, and that they are deleted for good;
- the accounting law's 5 years, and that once deleted they can't be recovered;
- „Descarcă arhiva facturilor”;
- a box to tick, „Înțeleg că facturile firmei se șterg definitiv din Devize și că păstrarea lor e obligația firmei”, without which the delete button stays off.

The mutation takes `deleteInvoices` and refuses with `in_use`/`firmInvoices` while any such firm has a numbered invoice and the flag is missing, so an open tab from before this change, or an invoice issued while the card was open, can't delete them unawares. A firm with colleagues left isn't deleted, so it isn't listed and its invoices stay.

## The archive

`invoices/archive.page` returns a firm's numbered invoices 10 at a time (an invoice of 200 lines makes an XML of some 200 KB), by series and number, which never change once issued, so a page can't skip or repeat an invoice paid while the archive is being made. Each comes with what its PDF prints, with "Întocmit de" naming who issued it, and its e-Factura XML; a cancelled invoice never went to ANAF, so it has no XML. Drafts aren't documents yet and are left out. Any member may download it, as any member may open each invoice.

The browser draws the PDFs, as it does for one invoice, and packs one .zip: `2026/Factura-DVZ-0001.pdf` and `.xml`, a folder per year of issue, the way the law counts the years, and `Registrul facturilor.xlsx`, which lists every invoice with its client, CUI or CNP, amounts, what was received and where it stands with e-Factura, with the sums of those not cancelled. Nothing is stored on the server. The same button is on `/invoices`, since the firm keeps its invoices whether or not it leaves.

## Deleting

`deleteFirmInvoices` deletes a firm's invoices 50 at a time, after its Devize and before its invoice settings and series. An invoice keeps its lines and payments in its own row, so 50 stay well under what a mutation may read. An invoice that holds ANAF's signed answer (`efactura.responseStorageId`, not written yet) takes the file with it.

## Consequences

- An invoice is still never deleted on its own (ADR 0037): only with its firm.
- What a firm downloads is its legal copy; Devize keeps none after the firm goes. The privacy page says invoices stay while the firm is on Devize and that the archive is offered first.
- ANAF's SPV keeps what reached e-Factura on its side; the archive's XML is the one Devize made, not ANAF's signed copy, until sending through SPV is built and the signed answer is added to the archive.
- The evidence of an accepted Ofertă goes with its Deviz, as before; whether to keep it longer, for a dispute over the contract, is still open.

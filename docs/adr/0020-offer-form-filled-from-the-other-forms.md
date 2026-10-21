# The offer form is filled from the other forms

A tender's financial offer opens with the offer form: the bidder's letter to the contracting authority, which states the price without VAT and the VAT "în litere și în cifre", the duration of the works and how long the offer stays valid. Its figures must be the ones the other forms total, and a bidder copying them by hand is where a price in words stops matching F1. So Devize draws the offer form in the standard wording of the form for works (`packages/forms/src/forms/offerForm.ts`), and fills each blank from what the Deviz and the forms sheet already know.

## Consequences

- The price without VAT and the VAT are F1's (ADR 0017), in figures and in Romanian words. A Deviz without VAT, as a firm that doesn't charge it makes one, offers its price alone.
- The duration is the one F6 prints (ADR 0015), in figures and in words, so the form agrees with the schedule it refers to. The sheet asks for the duration with the offer form even when F6 isn't chosen.
- The validity is the number of days the tender documentation asks for, typed in the sheet, and the last day is counted from the tender's deadline in the Deviz's details. Without a deadline, that date is left to write by hand.
- The form names who signs it and in what role. The sheet keeps them with the Deviz's other choices, and remembers the firm's last signer on that device for the firm's next Deviz.
- The form ticks that no alternative offer is submitted, since a Deviz is one offer.
- What neither the Deviz nor the sheet says stays a dotted blank with the standard hint. Without prices, the whole form is the blank one a tender's documentation publishes. Authorities that number it, as "Formularul nr. 1", rename it in the sheet like the other forms.
- The forms check asks for the duration, the validity and the signer until they are set.

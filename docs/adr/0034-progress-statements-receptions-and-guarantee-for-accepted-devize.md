# Situații de lucrări, Procese-verbale de recepție and the Garanție de bună execuție follow an accepted Deviz

Once a client accepts a Deviz, the works start and the Deviz stops being the whole story: the contractor is paid period by period for what was executed, the beneficiary confirms those quantities, the works are received at their end and again after the warranty, and part of the money stays with the beneficiary as a guarantee until then. Contractors did this in spreadsheets next to Devize, and the invoicing thread needed something to invoice. Marius's ask of 23 October 2026 to make Devize the best estimate app made execution part of it.

## The contract is the Deviz as accepted, frozen in each statement

A Situație de lucrări (`workStatements`) belongs to an accepted Deviz. Its rows (`workStatementRows`) are the contract as the client accepted it: the Deviz's Articole with the Variantă's swaps applied and the optional works the client left out dropped, each with its contract quantity, its unit cost by kind and its labour hours. The first statement copies them from the Deviz and the Ofertă's choice; every later one copies them from the statement before, so a Deviz revised or repriced afterwards changes no statement. Rows are in the Deviz's order, with their Obiect and Capitol as a `group` label, so the documents print as the Deviz does.

Each row holds two quantities: what was executed before this statement (`previousQuantity`, the sum of the earlier statements) and what was executed in its period (`quantity`). Everything else is worked out from them in `progress/arithmetic.ts`, with no database access: the cumulative and remaining quantities, the percentage done, the period's and the cumulative values, and the statement's Recapitulație with the Deviz's Cote, rounded exactly as `estimates/recap.ts` rounds the Deviz. Money follows the Deviz's rules, so a Deviz executed in one statement at its contract quantities comes to the Deviz's own total.

## One statement open at a time

Only the last statement changes, and only while it is a draft. It goes to the beneficiary (`sent`) and comes back confirmed (`approved`, with who confirmed it); a new statement can start only once the last is approved, from the day after its period. An approved statement can still go back to draft, but only while it is the last, so an invoiced statement never changes under its invoice. A Deviz with statements can't go back to draft either.

The Atașament is a list of measurements on a row (`attachment`): count × length × width × height, a side left out taken as 1, a line marked `deduct` subtracted. The person chooses whether its total becomes the row's quantity, since quantities are often agreed on site without a sheet. The Atașament prints as a document of its own after the statement.

## Receptions follow HG 343/2017, the guarantee HG 395/2016

A Deviz has at most two receptions (`receptions`): `completion`, la terminarea lucrărilor, and `final`, at the end of the warranty. Each is a form the firm fills in (the permit, the committee and when it sat, who else took part, the findings, the objections with their deadlines, the committee's proposal to admit, postpone or reject, the measures) and concludes; a concluded PV records the value of the works as the approved statements add up, and stops changing until reopened. The PDFs in `packages/forms/src/progress/reception.ts` follow the models in the annexes of the regulation approved by HG 273/1994 as replaced by HG 343/2017, written from the regulation's text; the wording should be checked against the Monitorul Oficial text before a firm relies on it, since the published PDFs couldn't be read from the build environment. A blank with a hint is left wherever the firm has not said something, so the printed form can be finished by hand.

The Garanție de bună execuție (`guarantees`) is a share of the contract without VAT, at most 10 % (HG 395/2016, art. 40), held either by retention from each statement (`retention`, worked out on the statement's value without VAT and refreshed whenever the guarantee or the open statement changes) or by an instrument (a bank guarantee or an insurance policy, with its issuer, reference, amount and validity). It comes back in two shares, 70 % after the reception at the end of the works and 30 % after the final reception, each due 14 days after an admitted PV (art. 42); the firm records what came back as releases, and the page shows what is still out. The shares are fixed in `releaseShares`, since the law fixes them; a contract that says otherwise is recorded as releases of other amounts.

## What invoicing reads

The invoicing module reads a statement through `readStatementForInvoice` in `progress/invoiceData.ts` (query `api.progress.statements.forInvoice`): the rows with their quantities, unit prices and values at direct cost, the period's Recapitulație, the retention kept back, and the cumulative and contract totals. Only approved statements should be invoiced, one invoice per statement, with the retention shown as a deduction on the payment side; the advance stays with invoicing. Progress stores nothing about invoices; the invoices table keeps the statement's id.

## Consequences

- Everything lives in `convex/progress/` and `packages/forms/src/progress/` (exported as `@devize/forms/progress`), with the page at `/estimates/[id]/progress` and one card on the Deviz's page for accepted devize. Estimates gained only the delete cascade and the rule that a Deviz with statements stays accepted.
- Later work on acte adiționale (changing the contract after acceptance), real cost against the Deviz and price adjustment under OUG 47/2022 builds on these tables and must keep their meaning: a row's `contractQuantity` and `unitCost` are the contract, and `previousQuantity + quantity` is what was executed.
- Statements, receptions and the guarantee go when their Deviz goes.
- Nothing is sent to the beneficiary from here; the statement and the PV are downloaded as PDF or Excel and sent as the firm sends its documents today.

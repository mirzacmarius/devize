# A firm accepts the terms and the data processing agreement, one version at a time

The privacy page (ADR 0043) says that Devize processes the personal data of a Firmă's clients on the firm's behalf, but nothing bound either side to that: Devize had no terms of use and no agreement under GDPR art. 28, which a processor needs with each controller it works for. Marius asked for both on 24 October 2026. The Devize team drafted them; a lawyer reviews them before launch.

## The documents

`/termeni` (Termeni de utilizare) and `/acord-prelucrare-date` (Acordul de prelucrare a datelor) are public pages in `apps/app`, beside `/confidentialitate`, and the three link to each other. Their text lives in the locales (`terms`, `dpa`); the Romanian one applies and the English says it is only a translation. Each is in numbered sections, with a table of contents, so a clause can be named by its number; the agreement ends with its annexes: the details of the processing, the security measures and the sub-processors. Who provides Devize is what a super admin wrote in Admin → Setări, the privacy page's controller, so the three documents always name the same company. Until a lawyer has read them, both pages open with a note that they are a draft (`draft` on `LegalPage`).

The terms are written for professionals only: companies, PFA, II and IF. A firm's client who opens an Ofertă link has no account and accepts nothing; their relationship is with the firm. The agreement covers the data a firm puts in Devize about other people than its members: its clients and their contacts, whoever opens or accepts an Ofertă, and the people named in the documents of the works. What Devize decides on its own, such as members' accounts and the emails to producers, stays in the privacy policy.

## Who accepts, and how

A Firmă accepts, not each person. Whoever creates a firm ticks a box that accepts both documents on its behalf, with a note under it naming the clauses a standard contract needs accepted expressly (art. 1203 of the Civil Code): liability, suspension and termination, changes to the terms, governing law and court. `organizations.create` takes the `termsVersion` the page showed and refuses any other (`invalid`/`terms`), so a page loaded before a change can't accept a text nobody saw. The sign-in page says that signing in accepts the terms, since they also bind each person who works for a firm.

A firm made without the box, before this change or by claiming a producer's profile (`producers/handover.ts`), sees a notice above every page until an owner or an admin accepts there (`organizations.acceptTerms`, which only they may call). Members see the notice too, asking them to tell one. Nothing else waits for it: the terms say a version applies once the firm accepts it, and a firm that doesn't can stop using Devize and download its data.

## Versions

`TERMS_VERSION` in `convex/accounts/terms.ts` is the date the text last changed in meaning, such as `2026-10-24`, and the pages print it as "Versiunea din 24 octombrie 2026". A new date asks every firm to accept again, through the same notice, which then says the terms changed. A fix that changes no meaning, such as a typo, keeps the date. Both documents share one version, since they are accepted together.

## The record

`termsAcceptances` keeps one row per firm and version: the version, who accepted it and, as the row's creation time, when. An earlier version's row stays after a newer one is accepted, so the firm's history is complete, and accepting the same version twice adds nothing. Setări → Firmă shows the last version accepted, by whom and when, and whether a newer one waits. The rows go with the firm (`accounts/cleanup.ts`, after its invoice settings and before its memberships). When the person who accepted deletes their account, the row stays and names no one: "un fost membru".

## Consequences

- Changing what the terms or the agreement mean needs a new `TERMS_VERSION`, and every firm sees the notice until an owner or admin accepts.
- The terms promise 30 days' notice by email of a new version, of a new sub-processor and of the end of the service. Devize doesn't send those emails yet; until it does, the team sends them by hand, to the firms' owners.
- Adding a sub-processor means updating Anexa 3 of the agreement and the privacy page's list together, after that notice.
- The note that the pages are a draft comes off when a lawyer has reviewed them, with whatever they change. The points to check are listed in the pull request that added the pages; among them are the 500-lei floor of the liability cap, the 48 hours to report a breach, the audit terms, the Data Act's rules on switching providers (Regulation (EU) 2023/2854), the information Legea 365/2002 asks of an online service, and how long backups keep deleted data.

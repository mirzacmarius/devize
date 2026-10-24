# What signing in and uploads leave behind is deleted

Bringing the privacy page up to date (ADR 0043) showed that Devize keeps for ever what signing in leaves behind. Convex Auth makes a user and an account for every address that asks for a code, even one that never signs in. The counts of codes sent (`emailCodeSends`) and of wrong codes typed (`authRateLimits`) stay, and deleting an account left them behind. So do sessions long ended with their refresh tokens, codes nobody typed, and Google sign-ins started and never finished (`authVerifiers`). The security audit of 23 October 2026 had also found that uploads nobody claims stay in storage, and that the tokens in the paths of Oferte, claim links and invitations reach Sentry. The privacy page keeps a person's data while they have an account (GDPR art. 5(1)(e)) and says error reports hold nothing that identifies anyone.

## Sign-in

A daily sweep at 03:45 UTC (`signInLeftovers.ts`) deletes:

- a user made more than a day ago who never signed in: no verified address, session, firm or role, only code accounts and no code still valid. Their accounts and codes go with them. Asking for a code later makes a new user, as for any new address;
- the records of codes sent, and the counts of wrong codes, an hour after the last one, when the limits that read them no longer would;
- codes and Google sign-in states a day old: a code works for 15 minutes, and Google comes back within minutes;
- sessions past their end, 30 days after signing in, with their refresh tokens.

Deleting an account now also deletes the records of the codes sent to its addresses and the count of wrong ones. Like ADR 0043's, these functions take times and cursors only, since a scheduled function's arguments outlive what it deletes.

## Uploads

An upload can be claimed only in its first 10 minutes (`unclaimedUpload`, from PR #44), as a firm's file, its logo or someone's photo, or by a super admin as a norms import. Every hour `accounts/uploads.ts` looks at the files stored between three hours and one hour before and deletes those that are none of these, found through `files.by_storageId`, `users.by_imageId`, `organizations.by_logoId` and the imports started since. Each file is looked at twice, so a failed run is made up for, and files from before the window are never looked at.

The check has to know every place a file can be kept. `STORAGE_FIELDS` lists every `v.id("_storage")` field in the schema with how the check sees it, and a test fails when the schema has another, or when another module makes an upload URL, claims an upload or stores a file. Whoever adds one adds its check first, or its new files go within hours.

## Sentry

Error reports, traces and breadcrumbs lose the token from the paths `/o/`, `/claim/` and `/invite/`, as well as every query string (`apps/app/src/lib/sentry-scrub.ts`). This covers the request path Next.js reports for an error on the server.

## Consequences

- Three new indexes: `users.by_emailVerificationTime`, `users.by_imageId` and `organizations.by_logoId`, agreed with the thread that owns the schema.
- Someone who asked for a code and came back after a day starts with a new user. Nothing could have been attached to the old one.
- Uploads left unclaimed before this change stay. A one-off pass over the whole storage could delete them, with the same check.
- A file the server stores itself, such as ANAF's answer to an invoice (`invoices.efactura.responseStorageId`, not written yet), needs its check before the code that stores it ships. The test stops it until then.
- Convex backups, if any are kept, hold the deleted rows and files until they expire on their own.

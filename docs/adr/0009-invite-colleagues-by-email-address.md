# Invite colleagues by email address

A Firmă is rarely one person: an owner, someone in the office who builds the devize, a site engineer. Until now only the person who created a firm could work in it.

Owners and admins invite a colleague by email address, as a member or an admin. The Invitație belongs to that address: only someone signed in with it can accept, so a forwarded link is no use to anyone else, and the token in the link only finds the invitation. Devize emails the link when Resend and `SITE_URL` are set up, and admins can always copy it to send another way, such as WhatsApp. The person invited also finds the invitation in the app: at the firm step after sign-up, and in the firm menu.

## Consequences

- An invitation lasts a week. Queries can't read the clock, so a job scheduled at its expiry deletes it, and accepting checks the time too. Inviting the same address again keeps its link, extends it and sets the new role.
- The same address gets the email at most every 10 minutes, and each person can have at most 20 invitation emails sent a day; past that, they share the links themselves. This keeps Devize from being used to mail strangers in bulk.
- Until `AUTH_EMAIL_FROM` is a sender on a domain verified in Resend (see 0007), Resend refuses most invitation emails. The invitation stays, its row says the email wasn't sent, and the admin shares the link.
- Signing in from an invitation's link comes back to it: the sign-in page takes a `next` path, and only a path on this site.

// Links that open an email ready to send from the sender's own mailbox.
// Devize itself never sends outreach email.

type Email = { to?: string; subject: string; body: string };

/**
 * A Gmail compose window with the email filled in, in the account of the
 * mailbox set in Admin → Setări when there is one, so it doesn't go from
 * whichever account the browser opened first.
 */
export function gmailComposeUrl(email: Email, from?: string) {
  const params = new URLSearchParams({
    ...(from ? { authuser: from } : {}),
    view: "cm",
    fs: "1",
    to: email.to ?? "",
    su: email.subject,
    body: email.body,
  });
  return `https://mail.google.com/mail/?${params}`;
}

/** The same email in whatever app handles mailto: links. */
export function mailtoUrl(email: Email) {
  return `mailto:${email.to ?? ""}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
}

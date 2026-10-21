import { env } from "../_generated/server";

// Resend's test sender, which only delivers to the Resend account's own
// address. Set AUTH_EMAIL_FROM to a sender on a domain verified in Resend.
const DEFAULT_FROM = "Devize <onboarding@resend.dev>";

export type EmailMessage = { subject: string; text: string; html: string };

/** Sends one email through Resend's API, and throws when Resend refuses it. */
export async function sendEmail(to: string, message: EmailMessage) {
  const apiKey = env.AUTH_RESEND_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing environment variable `AUTH_RESEND_KEY`: set it to a Resend API key to send email.",
    );
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM?.trim() || DEFAULT_FROM,
      to: [to],
      ...message,
    }),
  });
  if (!response.ok) {
    // Resend says why, such as a sender whose domain isn't verified.
    throw new Error(
      `Resend did not send the email (${response.status}): ${await response.text()}`,
    );
  }
}

/** Text as it may appear in an email's HTML, such as a firm's name. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** An email's HTML: Devize's name over `content`, on a card. */
export function emailHtml(content: string): string {
  return `<!doctype html>
<html lang="ro">
  <body style="margin:0;padding:32px 16px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a18">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e4e4e0;border-radius:14px">
            <tr>
              <td style="padding:28px">
                <p style="margin:0 0 20px;font-size:17px;font-weight:600">Devize</p>
${content}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

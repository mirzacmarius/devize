// Whether the mailbox the outreach emails go from can be trusted by the
// servers that receive them: SPF names the servers that send for its domain,
// DKIM signs each email, and DMARC says what to do with email that fails
// both. Without them a first email to a firm lands in spam.

/** Free mailboxes whose provider publishes all three for its own domain. */
export const PROVIDER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.ro",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "aol.com",
  "zoho.com",
]);

// The selectors DKIM keys usually sit under: Google Workspace, Microsoft 365,
// cPanel hosting and a few mail services. Another one can't be found by name.
export const DKIM_SELECTORS = [
  "google",
  "selector1",
  "selector2",
  "default",
  "dkim",
  "mail",
  "k1",
  "s1",
];

// DNS record type 16 is TXT.
const TXT = 16;

/**
 * The TXT records in a DNS-over-HTTPS JSON answer, each one's quoted strings
 * joined back together. An empty list when the name doesn't exist; null when
 * the answer can't be read, so the domain is reported as not checked.
 */
export function txtRecords(body: unknown): string[] | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const { Status, Answer } = body as { Status?: unknown; Answer?: unknown };
  // 0 is an answer, 3 a name that doesn't exist; anything else failed.
  if (Status === 3) {
    return [];
  }
  if (Status !== 0) {
    return null;
  }
  if (!Array.isArray(Answer)) {
    return [];
  }
  return Answer.flatMap((entry) => {
    const { type, data } = (entry ?? {}) as { type?: unknown; data?: unknown };
    if (type !== TXT || typeof data !== "string") {
      return [];
    }
    const parts = data.match(/"(?:[^"\\]|\\.)*"/g);
    return [
      parts ? parts.map((part) => part.slice(1, -1)).join("") : data.trim(),
    ];
  });
}

export function hasSpf(records: string[]): boolean {
  return records.some((record) => /^v=spf1(\s|$)/i.test(record.trim()));
}

export function hasDmarc(records: string[]): boolean {
  return records.some((record) => /^v=DMARC1\s*(;|$)/i.test(record.trim()));
}

/** A DKIM key that is published; an empty `p=` is a revoked one. */
export function hasDkim(records: string[]): boolean {
  return records.some((record) => /(^|;)\s*p=[A-Za-z0-9+/]/.test(record));
}

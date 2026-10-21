/**
 * A key that two spellings of the same company share: lower case, no
 * diacritics, punctuation, legal form or "România". "EXEMPLU România S.R.L."
 * and "Exemplu Romania" both give "exemplu".
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bs\.?\s*r\.?\s*l\b\.?/g, " ")
    .replace(/\bs\.?\s*a\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word && word !== "romania")
    .join(" ");
}

export type ManufacturerLine = { name: string; hints?: string };

/**
 * Reads a pasted list with one manufacturer per line, such as the outreach
 * list in the plan: "3. Exemplu Izolații: norme publice, 2015". A leading
 * number or bullet is dropped, and the text after the first colon becomes the
 * hints. Headings (lines ending in a colon) and notes in parentheses are
 * skipped, and so is a name already seen.
 */
export function parseManufacturerLines(text: string): ManufacturerLine[] {
  const seen = new Set<string>();
  const lines: ManufacturerLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      .trim()
      .replace(/^(\d+[.)]|[-*•])\s*/, "")
      .trim();
    if (!line || line.startsWith("(") || line.endsWith(":")) {
      continue;
    }
    const colon = line.indexOf(":");
    const name = (colon === -1 ? line : line.slice(0, colon)).trim();
    const hints = colon === -1 ? "" : line.slice(colon + 1).trim();
    const key = nameKey(name);
    if (!key || name.length > 120 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(hints ? { name, hints: hints.slice(0, 500) } : { name });
  }
  return lines;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  return at === -1 ? undefined : email.slice(at + 1).toLowerCase();
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The form of a URL used to compare two of them: no scheme, "www.", hash,
 * trailing slash or letter case in the host.
 */
export function urlKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.host.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${host}${path}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

// The name before the top-level domain: "firma" for www.firma.ro.
function siteName(host: string): string {
  const labels = host
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".");
  return labels[labels.length - 2] ?? labels[0] ?? "";
}

/**
 * Whether an address belongs to the company's own site, allowing another
 * top-level domain: office@firma.com matches www.firma.ro, but an address at
 * a distributor or at gmail.com does not.
 */
export function onCompanyDomain(email: string, website: string): boolean {
  const domain = emailDomain(email);
  if (!domain) {
    return false;
  }
  try {
    const url = website.includes("://") ? website : `https://${website}`;
    return siteName(domain) === siteName(new URL(url).hostname);
  } catch {
    return true;
  }
}

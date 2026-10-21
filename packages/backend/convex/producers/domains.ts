import { invalid } from "../lib/errors";

// Addresses anyone can open, so they never prove someone works for a
// producer: the big mail services and Romanian internet providers' mail.
const FREE_MAIL_DOMAINS = new Set([
  "aol.com",
  "clicknet.ro",
  "gmail.com",
  "gmx.com",
  "gmx.net",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "mail.ru",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "rdslink.ro",
  "rocketmail.com",
  "yahoo.co.uk",
  "yahoo.com",
  "yahoo.ro",
  "yandex.com",
  "yandex.ru",
  "ymail.com",
  "zoho.com",
]);

/** The part of an address after "@", lowercase. */
export function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function isFreeMail(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain);
}

/**
 * A producer's email domain as a super admin typed it, such as "@Producator.ro"
 * or "www.producator.ro", made lowercase without "@" or "www.". Throws `invalid`
 * for something that isn't a domain or is a free mail service.
 */
export function cleanDomain(value: string): string {
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^www\./, "");
  if (
    domain.length > 100 ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      domain,
    ) ||
    isFreeMail(domain)
  ) {
    throw invalid("domain");
  }
  return domain;
}

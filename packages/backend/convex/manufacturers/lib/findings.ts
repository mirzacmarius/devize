import type { Infer } from "convex/values";
import type { researchFindings } from "../validators";
import type { ResearchFindingsOutput } from "./schemas";
import { isEmail, normalizeEmail, urlKey } from "./text";

export type ResearchFindings = Infer<typeof researchFindings>;

/** What the research turn actually saw, to check the model's claims against. */
export type Evidence = {
  /** urlKey of every page fetched, search result shown or source cited. */
  urls: Set<string>;
  /** Addresses read on a fetched page or on the contact's source page. */
  emails: Set<string>;
};

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed || undefined;
}

function unique(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = text(value);
    if (cleaned && !seen.has(cleaned.toLowerCase())) {
      seen.add(cleaned.toLowerCase());
      result.push(cleaned);
    }
  }
  return result.slice(0, limit);
}

/**
 * Turns the model's findings into what Devize stores, keeping only facts
 * research can back. A norm, document, consumption or personalization whose
 * link the research never opened or saw is dropped: a made-up link would end
 * up in an email. A contact stays, but is verified only when its address was
 * read on a page.
 */
export function cleanFindings(
  output: ResearchFindingsOutput,
  evidence: Evidence,
): ResearchFindings {
  let dropped = 0;
  const opened = (url: string | null | undefined) => {
    const key = url?.trim() ? urlKey(url) : undefined;
    return key !== undefined && evidence.urls.has(key);
  };
  const keepOpened = <T>(
    items: T[],
    url: (item: T) => string,
    limit: number,
  ) => {
    const kept = items.filter((item) => opened(url(item)));
    dropped += items.length - kept.length;
    return kept.slice(0, limit);
  };

  const contacts: ResearchFindings["contacts"] = [];
  const seenContacts = new Set<string>();
  for (const contact of output.contacts) {
    const email = contact.email?.trim()
      ? normalizeEmail(contact.email)
      : undefined;
    const url = text(contact.url);
    if (email ? !isEmail(email) : contact.kind !== "form" || !url) {
      continue;
    }
    const key = email ?? urlKey(url ?? "");
    if (seenContacts.has(key)) {
      continue;
    }
    seenContacts.add(key);
    contacts.push({
      kind: email && contact.kind === "form" ? "generic" : contact.kind,
      email,
      url: email ? undefined : url,
      role: text(contact.role),
      sourceUrl: text(contact.sourceUrl),
      sourceVerified: email ? evidence.emails.has(email) : opened(url),
    });
  }

  const recommended = output.recommendedEmail?.trim()
    ? normalizeEmail(output.recommendedEmail)
    : undefined;
  const personalization =
    output.personalization &&
    text(output.personalization.sentence) &&
    opened(output.personalization.sourceUrl)
      ? {
          sentence: text(output.personalization.sentence) ?? "",
          sourceUrl: output.personalization.sourceUrl.trim(),
        }
      : undefined;
  if (output.personalization && !personalization) {
    dropped++;
  }

  const existingNorms = keepOpened(
    output.existingNorms,
    (norm) => norm.url,
    10,
  );
  const technicalDocs = keepOpened(output.technicalDocs, (doc) => doc.url, 10);
  const declaredConsumption = keepOpened(
    output.declaredConsumption,
    (item) => item.sourceUrl,
    5,
  );
  const notes = [
    text(output.needsReview),
    dropped > 0
      ? `Am eliminat ${dropped} ${dropped === 1 ? "fapt" : "fapte"} cu linkuri pe care cercetarea nu le-a deschis.`
      : undefined,
  ].filter(Boolean);

  return {
    displayName: text(output.displayName) ?? "",
    website: text(output.website),
    legalName: text(output.legalName),
    cui: text(output.cui),
    brands: unique(output.brands, 10),
    categories: unique(output.categories, 10),
    mainProducts: unique(output.mainProducts, 5),
    retailers: unique(output.retailers, 10),
    contacts: contacts.slice(0, 20),
    existingNorms: existingNorms.map((norm) => ({
      title: text(norm.title) ?? norm.url,
      edition: text(norm.edition),
      author: text(norm.author),
      url: norm.url.trim(),
      kind: norm.kind,
    })),
    technicalDocs: technicalDocs.map((doc) => ({
      title: text(doc.title) ?? doc.url,
      url: doc.url.trim(),
    })),
    declaredConsumption: declaredConsumption.map((item) => ({
      product: text(item.product) ?? "",
      value: text(item.value) ?? "",
      unit: text(item.unit) ?? "",
      sourceUrl: item.sourceUrl.trim(),
    })),
    personalization,
    mainProductsPhrase: text(output.mainProductsPhrase),
    recommendedEmail: contacts.some((contact) => contact.email === recommended)
      ? recommended
      : undefined,
    confidence: output.confidence,
    needsReview: notes.length > 0 ? notes.join(" ") : undefined,
  };
}

// Cloudflare's email protection writes an address as hex, XOR-ed with the
// first byte.
function decodeCloudflareEmail(hex: string): string {
  const key = Number.parseInt(hex.slice(0, 2), 16);
  let decoded = "";
  for (let index = 2; index + 1 < hex.length; index += 2) {
    decoded += String.fromCharCode(
      Number.parseInt(hex.slice(index, index + 2), 16) ^ key,
    );
  }
  return decoded;
}

/**
 * Every email address on a web page, including the usual ways sites hide
 * them from scrapers: HTML entities, "office [at] firma.ro" and Cloudflare's
 * email protection.
 */
export function emailsInPage(html: string): string[] {
  const protectedEmails = [
    ...html.matchAll(/data-cfemail="([0-9a-f]+)"/gi),
    ...html.matchAll(/email-protection#([0-9a-f]+)/gi),
  ].map((match) => decodeCloudflareEmail(match[1] ?? ""));
  const readable = html
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&commat;/gi, "@")
    .replace(/&period;/gi, ".")
    .replace(/%40/g, "@")
    .replace(/\s*[[({]\s*(?:at|@)\s*[\])}]\s*/gi, "@")
    .replace(/\s*[[({]\s*(?:dot|punct)\s*[\])}]\s*/gi, ".");
  const found = [
    ...protectedEmails,
    ...(readable.match(
      /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi,
    ) ?? []),
  ];
  return [...new Set(found.map(normalizeEmail).filter(isEmail))];
}

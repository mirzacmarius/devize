import type { Doc } from "../../_generated/dataModel";
import { nameKey, normalizeEmail } from "./text";

// How long Devize keeps the address of a person at a Producător (ADR 0043).
// The privacy page promises at most 6 months after the last email when the
// firm doesn't answer; the shortest 6 calendar months are 181 days, so 175
// leaves room for a missed daily run. An address nobody wrote to goes within
// a month of being found (GDPR art. 14(3)(a)): 25 days fit the shortest one.
export const DAY_MS = 24 * 60 * 60 * 1000;
export const NO_ANSWER_MS = 175 * DAY_MS;
export const NOT_WRITTEN_MS = 25 * DAY_MS;
// The research report names people in free text, so it goes after 25 days
// whatever the firm did; what research found stays on the manufacturer.
export const REPORT_MS = 25 * DAY_MS;

// What an erased address becomes in the emails kept as a record.
export const ERASED = "[adresă ștearsă]";

export type ErasureRule = "no_answer" | "not_written" | "opt_out" | "excluded";

// Words that make an address a company's rather than a person's: office@,
// vanzari.export@, tehnic-ro@.
const roleWords = new Set([
  "office",
  "info",
  "informatii",
  "contact",
  "contacts",
  "kontakt",
  "mail",
  "email",
  "admin",
  "administrator",
  "administratie",
  "secretariat",
  "receptie",
  "reception",
  "tehnic",
  "tehnica",
  "technical",
  "tech",
  "support",
  "suport",
  "service",
  "servicii",
  "customerservice",
  "clienti",
  "client",
  "customer",
  "customers",
  "relatii",
  "relatiiclienti",
  "sales",
  "vanzari",
  "vanzare",
  "comercial",
  "commercial",
  "comenzi",
  "comanda",
  "order",
  "orders",
  "oferte",
  "oferta",
  "offer",
  "export",
  "import",
  "achizitii",
  "aprovizionare",
  "procurement",
  "purchasing",
  "marketing",
  "pr",
  "presa",
  "press",
  "media",
  "hr",
  "resurse",
  "umane",
  "cariere",
  "careers",
  "jobs",
  "job",
  "recrutare",
  "juridic",
  "legal",
  "gdpr",
  "privacy",
  "dpo",
  "financiar",
  "finance",
  "contabilitate",
  "accounting",
  "facturare",
  "facturi",
  "billing",
  "invoice",
  "invoices",
  "logistica",
  "logistics",
  "depozit",
  "warehouse",
  "transport",
  "romania",
  "ro",
  "echipa",
  "team",
  "proiectare",
  "proiecte",
  "projects",
  "design",
  "calitate",
  "quality",
  "productie",
  "production",
  "fabrica",
  "noreply",
  "no",
  "reply",
  "donotreply",
  "webmaster",
  "web",
  "hello",
  "salut",
  "general",
  "birou",
  "dealer",
  "distributie",
  "distribution",
  "parteneri",
  "partners",
  "ofertare",
  "consultanta",
  "asistenta",
  "help",
  "helpdesk",
  "garantie",
  "reclamatii",
  "retail",
  "magazin",
  "shop",
  "store",
  "online",
  "bucuresti",
  "cluj",
  "timisoara",
  "iasi",
  "brasov",
  "constanta",
]);

/** The words that name a firm: its name, brands and website. */
export function firmWords(manufacturer: {
  name: string;
  displayName?: string;
  brands: string[];
  website?: string;
}): Set<string> {
  const words = new Set<string>();
  for (const name of [
    manufacturer.name,
    manufacturer.displayName ?? "",
    ...manufacturer.brands,
  ]) {
    const key = nameKey(name);
    for (const word of key.split(" ")) {
      if (word.length >= 2) {
        words.add(word);
      }
    }
    // "Termo Test" is also written "termotest".
    if (key.includes(" ")) {
      words.add(key.replaceAll(" ", ""));
    }
  }
  if (manufacturer.website) {
    try {
      const url = manufacturer.website.includes("://")
        ? manufacturer.website
        : `https://${manufacturer.website}`;
      const labels = new URL(url).hostname.replace(/^www\./, "").split(".");
      const site = labels[labels.length - 2] ?? labels[0];
      if (site) {
        words.add(site);
        for (const word of site.split("-")) {
          words.add(word);
        }
      }
    } catch {}
  }
  return words;
}

/**
 * Whether an address is a person's: kind "person", or any word of its local
 * part (split on . _ - +, digits dropped) that is neither a role nor the
 * firm's name, as in ion.popescu@ or andrei@. A research contact labelled
 * generic can still be a person's. When unsure, it is a person's.
 */
export function isPersonAddress(
  email: string,
  firm: Set<string>,
  kind?: Doc<"manufacturerContacts">["kind"],
): boolean {
  if (kind === "person") {
    return true;
  }
  const local = normalizeEmail(email).split("@")[0] ?? "";
  const words = local
    .split(/[._+-]+/)
    .map((word) => word.replace(/[0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  return words.some((word) => !roleWords.has(word) && !firm.has(word));
}

type RetentionManufacturer = Pick<
  Doc<"manufacturers">,
  | "name"
  | "displayName"
  | "brands"
  | "website"
  | "status"
  | "normsStatus"
  | "claimStatus"
  | "answeredAt"
>;

/**
 * Whether the firm is in touch with us, so its people's addresses stay: it
 * answered, sent norms or claimed its profile. A firm that declined is no
 * longer in touch.
 */
export function inTouch(manufacturer: RetentionManufacturer): boolean {
  if (manufacturer.status === "declined") {
    return false;
  }
  return (
    manufacturer.answeredAt !== undefined ||
    manufacturer.status === "replied" ||
    manufacturer.status === "norms_received" ||
    manufacturer.normsStatus === "received" ||
    manufacturer.claimStatus === "claimed"
  );
}

/** Every address an email holds: its recipient and its claim link's. */
export function messageAddresses(
  message: Pick<Doc<"outreachMessages">, "to" | "vars">,
): string[] {
  const addresses = [
    message.to,
    message.vars.address,
    message.vars.thanks?.claimEmail,
  ]
    .filter((value): value is string => !!value && value.includes("@"))
    .map(normalizeEmail);
  return [...new Set(addresses)];
}

// When an email went, or was opened to send: an approved email may already be
// in the outbox (ADR 0006), so it counts as written.
function writtenAt(message: Doc<"outreachMessages">): number | undefined {
  if (message.status === "sent") {
    return message.sentAt ?? message.approvedAt ?? message.updatedAt;
  }
  if (message.status === "approved") {
    return message.approvedAt ?? message.updatedAt;
  }
  return undefined;
}

export type AddressPlan = {
  address: string;
  // When it is erased: 0 for the next run, null while the firm is in touch.
  at: number | null;
  rule: ErasureRule | null;
};

/**
 * When each person's address the firm's records hold is erased:
 * - right away if they asked us to stop or the firm was excluded;
 * - never while the firm is in touch with us;
 * - 175 days after the last email written to that address;
 * - 25 days after it was found, if nobody wrote to it.
 * Company addresses (office@, vanzari@) are kept.
 */
export function retentionPlan(input: {
  manufacturer: RetentionManufacturer;
  contacts: Doc<"manufacturerContacts">[];
  messages: Doc<"outreachMessages">[];
  suppressed: Set<string>;
}): AddressPlan[] {
  const { manufacturer, contacts, messages, suppressed } = input;
  const firm = firmWords(manufacturer);
  const person = new Set<string>();
  const company = new Set<string>();
  // The earliest time each person's address was found, and the latest email
  // written to it.
  const found = new Map<string, number>();
  const written = new Map<string, number>();
  const noteFound = (address: string, at: number) =>
    found.set(address, Math.min(found.get(address) ?? at, at));

  for (const contact of contacts) {
    if (!contact.email) {
      continue;
    }
    const address = normalizeEmail(contact.email);
    if (isPersonAddress(address, firm, contact.kind)) {
      person.add(address);
      noteFound(address, contact.foundAt ?? contact._creationTime);
    } else {
      company.add(address);
    }
  }
  for (const message of messages) {
    const sent = writtenAt(message);
    // Only the recipient was written to; an older address left in the
    // email's values or text was not.
    const to = message.to ? normalizeEmail(message.to) : undefined;
    for (const address of messageAddresses(message)) {
      if (
        !person.has(address) &&
        (company.has(address) || !isPersonAddress(address, firm))
      ) {
        continue;
      }
      noteFound(address, message.toSetAt ?? message._creationTime);
      if (sent !== undefined && address === to) {
        written.set(address, Math.max(written.get(address) ?? sent, sent));
      }
    }
  }

  const keep = inTouch(manufacturer);
  return [...found.keys()].sort().map((address): AddressPlan => {
    if (suppressed.has(address)) {
      return { address, at: 0, rule: "opt_out" };
    }
    if (manufacturer.status === "excluded") {
      return { address, at: 0, rule: "excluded" };
    }
    if (keep) {
      return { address, at: null, rule: null };
    }
    const last = written.get(address);
    if (last !== undefined) {
      return { address, at: last + NO_ANSWER_MS, rule: "no_answer" };
    }
    return {
      address,
      at: (found.get(address) ?? 0) + NOT_WRITTEN_MS,
      rule: "not_written",
    };
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces the addresses in a text, in any letter case and also as
 * mailto:ion@… or ion%40…, with `marker`.
 */
export function scrubText(
  text: string,
  addresses: Iterable<string>,
  marker = ERASED,
): string {
  let result = text;
  for (const address of addresses) {
    const [local, domain] = address.split("@");
    if (!local || !domain) {
      continue;
    }
    const pattern = new RegExp(
      `(mailto:)?${escapeRegExp(local)}(@|%40)${escapeRegExp(domain)}`,
      "gi",
    );
    result = result.replace(pattern, marker);
  }
  return result;
}

/** Whether a text holds one of the addresses, in any of those forms. */
export function mentions(text: string, addresses: Iterable<string>): boolean {
  return scrubText(text, addresses, "\u0000") !== text;
}

import { romanianDate } from "../../lib/dates";
import { isEmail } from "./text";

// The first email to a Producător, from the outreach plan. Only the parts in
// braces change from one company to the next; whatever stays in braces blocks
// approval until someone fills it in.
const subjectTemplate = "Normele de deviz {Firma} în Devize";

const requestWithNorms =
  "Ne puteți trimite normele de deviz pe care le aveți deja, așa cum le-ați dat programelor de devize (PDF, Word sau Excel), și acordul să le folosim în Devize, cu {Firma} menționată ca sursă? Le digitizăm noi și vi le arătăm spre verificare înainte să apară în aplicație.";

const requestWithoutNorms =
  "Nu am găsit norme de deviz publice pentru {produsele principale}, așa că în devize ele apar de obicei prin articole generice din indicatoarele vechi. Dacă aveți norme sau consumuri specifice, chiar și interne, ne ajută mult să le primim. Dacă nu aveți, vi le propunem noi pornind de la fișele tehnice publice, iar echipa voastră tehnică doar le validează, fără costuri.";

const bodyTemplate = `Bună ziua,

Sunt {Prenume}, fondatorul Devize, o aplicație web în care constructorii și proiectanții își fac devizele cu norme puse la dispoziție de producători și cu prețuri actualizate din Dedeman, Leroy Merlin, Hornbach și Brico Depot.

{Fraza personalizată}

{Cererea}

În schimb, {Firma} primește gratuit un profil de producător: își administrează normele și produsele și vede în câte devize sunt folosite.

Dacă nu sunteți persoana potrivită, vă rog să-mi spuneți cui să scriu.

Mulțumesc,
{Prenume} {Nume}
Fondator, Devize · {telefon}

{Nota}`;

const noteForAddress =
  "Am găsit adresa {adresa} pe {pagina sursă}. Dacă nu doriți alte mesaje de la Devize, răspundeți „stop” și nu vă mai scriem. Cum folosim datele de contact: {link politica de confidențialitate}.";

const noteForForm =
  "Vă scriu prin formularul de contact de pe {pagina sursă}. Dacă nu doriți alte mesaje de la Devize, răspundeți „stop” și nu vă mai scriem. Cum folosim datele de contact: {link politica de confidențialitate}.";

export type EmailVariant = "A" | "B";

export type ThanksVars = {
  claimEmail: string;
  claimUrl?: string;
  claimExpiresAt?: number;
  articles?: number;
  variants?: number;
  consentRecorded: boolean;
};

export type TemplateVars = {
  firm: string;
  personalization?: string;
  mainProducts?: string;
  address?: string;
  addressSourceUrl?: string;
  thanks?: ThanksVars;
};

export type Sender = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  privacyUrl?: string;
};

function fill(template: string, values: Record<string, string | undefined>) {
  return template.replace(/\{([^{}]+)\}/g, (placeholder, name: string) => {
    const value = values[name]?.trim();
    return value ? value : placeholder;
  });
}

/**
 * Renders the first email. Variant A asks for norms the manufacturer already
 * has; variant B, for one without public norms, offers to write them.
 * `addressSourceUrl` without `address` means the message goes through the
 * contact form on that page.
 */
export function renderInitialEmail(
  variant: EmailVariant,
  vars: TemplateVars,
  sender: Sender,
): { subject: string; body: string } {
  const note =
    !vars.address && vars.addressSourceUrl ? noteForForm : noteForAddress;
  const body = bodyTemplate
    .replace(
      "{Cererea}",
      variant === "A" ? requestWithNorms : requestWithoutNorms,
    )
    .replace("{Nota}", note);
  const values = {
    Firma: vars.firm,
    "Fraza personalizată": vars.personalization,
    "produsele principale": vars.mainProducts,
    adresa: vars.address,
    "pagina sursă": vars.addressSourceUrl,
    Prenume: sender.firstName,
    Nume: sender.lastName,
    telefon: sender.phone,
    "link politica de confidențialitate": sender.privacyUrl,
  };
  return {
    subject: fill(subjectTemplate, values),
    body: fill(body, values),
  };
}

// The answer to a Producător that sent its norms, with the link that lets
// the person who sent them claim its profile (ADR 0018). Norms also come
// without our first email, so it doesn't pretend to be a reply.
const thanksSubjectTemplate = "Mulțumesc pentru normele de deviz {Firma}";

const thanksBodyTemplate = `Bună ziua,

Vă mulțumesc pentru normele de deviz {Firma}. {Stadiul normelor}

{Acordul}Vă invit și să revendicați profilul {Firma} din Devize: acolo confirmați normele, adăugați altele noi și vă invitați colegii. Linkul de mai jos funcționează o singură dată, până pe {data linkului}, pentru cine intră în Devize cu adresa {adresa}:
{link de revendicare}

Mulțumesc,
{Prenume} {Nume}
Fondator, Devize · {telefon}

Dacă nu doriți alte mesaje de la Devize, răspundeți „stop” și nu vă mai scriem. Cum folosim datele de contact: {link politica de confidențialitate}.`;

const askConsent =
  "Dacă nu mi-ați scris deja că sunteți de acord, vă rog să-mi confirmați printr-un răspuns că le putem publica în Devize, cu {Firma} menționată ca sursă.\n\n";

const months = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
];

/** A day as a letter writes it, "20 noiembrie 2026", by Romania's calendar. */
export function letterDate(timestamp: number): string {
  const [year, month, day] = romanianDate(timestamp).split("-").map(Number);
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

/**
 * A count with its noun: "1 articol", "12 articole", "51 de variante".
 * Romanian puts "de" after 20 or more, unless the last two digits are 1–19.
 */
export function countOf(count: number, one: string, many: string): string {
  if (count === 1) {
    return `1 ${one}`;
  }
  const lastTwo = count % 100;
  return count >= 20 && (lastTwo === 0 || lastTwo >= 20)
    ? `${count} de ${many}`
    : `${count} ${many}`;
}

/**
 * Renders the thank-you for the norms a manufacturer sent: what we extracted
 * from them, a request for their written consent unless it's on record, and
 * the claim link for the address they came from.
 */
export function renderThanksEmail(
  vars: TemplateVars,
  sender: Sender,
): { subject: string; body: string } {
  const thanks = vars.thanks;
  const extracted =
    thanks?.articles !== undefined && thanks.variants !== undefined
      ? `Le-am digitizat deja în Devize: ${countOf(thanks.articles, "articol", "articole")} și ${countOf(thanks.variants, "variantă", "variante")}.`
      : "Le digitizăm acum în Devize.";
  const body = thanksBodyTemplate
    .replace("{Stadiul normelor}", extracted)
    .replace("{Acordul}", thanks?.consentRecorded ? "" : askConsent);
  const values = {
    Firma: vars.firm,
    adresa: thanks?.claimEmail,
    "link de revendicare": thanks?.claimUrl,
    "data linkului":
      thanks?.claimExpiresAt === undefined
        ? undefined
        : letterDate(thanks.claimExpiresAt),
    Prenume: sender.firstName,
    Nume: sender.lastName,
    telefon: sender.phone,
    "link politica de confidențialitate": sender.privacyUrl,
  };
  return {
    subject: fill(thanksSubjectTemplate, values),
    body: fill(body, values),
  };
}

export type EmailIssue = {
  code:
    | "empty_subject"
    | "placeholder"
    | "missing_optout"
    | "missing_signature"
    | "banned_phrase"
    | "word_limit"
    | "cedilla"
    | "missing_recipient"
    | "invalid_recipient"
    | "suppressed_recipient"
    | "unverified_recipient"
    | "recipient_other_domain"
    | "claim_link_mismatch"
    | "already_claimed";
  level: "error" | "warning";
  detail?: string;
};

export const wordLimit = 160;

// Never in an outreach email: no claimed partnership, and no deviz software
// named, since their norms belong to the manufacturers and those vendors.
const bannedPhrases = [
  "partener oficial",
  "parteneriat oficial",
  "WinDoc",
  "WinDev",
  "eDevize",
  "Softmagazin",
];

function countWords(text: string) {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Checks a draft against the outreach rules. Errors block approval; warnings
 * are shown next to the draft.
 */
export function lintEmail(email: {
  subject: string;
  body: string;
  to?: string;
}): EmailIssue[] {
  const issues: EmailIssue[] = [];
  const text = `${email.subject}\n${email.body}`;
  if (!email.subject.trim()) {
    issues.push({ code: "empty_subject", level: "error" });
  }
  const placeholders = [...new Set(text.match(/\{[^{}]+\}/g) ?? [])];
  if (placeholders.length > 0) {
    issues.push({
      code: "placeholder",
      level: "error",
      detail: placeholders.join(", "),
    });
  }
  if (!/răspunde[țţ]i\s+["„“]?stop/i.test(email.body)) {
    issues.push({ code: "missing_optout", level: "error" });
  }
  if (!email.body.includes("Fondator, Devize")) {
    issues.push({ code: "missing_signature", level: "error" });
  }
  for (const phrase of bannedPhrases) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      issues.push({ code: "banned_phrase", level: "error", detail: phrase });
    }
  }
  // The limit leaves out the closing note about the address and opting out.
  const paragraphs = email.body.trim().split(/\n\s*\n/);
  const last = paragraphs[paragraphs.length - 1] ?? "";
  const main = /stop/i.test(last) ? paragraphs.slice(0, -1) : paragraphs;
  const words = countWords(main.join("\n"));
  if (words > wordLimit) {
    issues.push({ code: "word_limit", level: "warning", detail: `${words}` });
  }
  if (/[şţŞŢ]/.test(text)) {
    issues.push({ code: "cedilla", level: "warning" });
  }
  if (!email.to?.trim()) {
    issues.push({ code: "missing_recipient", level: "warning" });
  } else if (!isEmail(email.to)) {
    issues.push({
      code: "invalid_recipient",
      level: "error",
      detail: email.to,
    });
  }
  return issues;
}

export function hasBlockingIssue(issues: { level: string }[]) {
  return issues.some((issue) => issue.level === "error");
}

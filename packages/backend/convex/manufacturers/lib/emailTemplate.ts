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

export type TemplateVars = {
  firm: string;
  personalization?: string;
  mainProducts?: string;
  address?: string;
  addressSourceUrl?: string;
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
    | "recipient_other_domain";
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

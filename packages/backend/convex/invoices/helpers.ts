import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { requireFirmDoc } from "../lib/access";
import { appError, invalid } from "../lib/errors";
import { normalizeText } from "../lib/text";
import { findCounty } from "./counties";
import type { invoiceParty } from "./validators";

export type InvoiceParty = Infer<typeof invoiceParty>;

// Unless the firm chose otherwise, an invoice is due 15 days after issue.
export const DEFAULT_PAYMENT_TERM_DAYS = 15;
// The series a firm's invoices take until it names its own.
export const DEFAULT_SERIES = "DVZ";
// Lengths the e-Factura XML allows (CIUS-RO BR-RO-L050…L300).
export const MAX_NAME = 200;
export const MAX_STREET = 150;
export const MAX_CITY = 50;
export const MAX_POSTAL = 20;
export const MAX_NOTES = 300;
export const MAX_DESCRIPTION = 200;
export const MAX_LINES = 200;

/** An invoice's number as the app writes it: DVZ-0017. */
export function invoiceCode(series: string, number: number): string {
  return `${series}-${String(number).padStart(4, "0")}`;
}

/** An invoice's number, or null while it is a draft. */
export function codeOf(
  invoice: Pick<Doc<"invoices">, "series" | "number">,
): string | null {
  return invoice.series !== undefined && invoice.number !== undefined
    ? invoiceCode(invoice.series, invoice.number)
    : null;
}

/** A calendar date as the invoice's text writes it: 21.10.2026. */
export function textDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

/** A percentage as the text writes it: 30%, 12,5%. */
export function textPercent(value: number): string {
  return `${String(Math.round(value * 100) / 100).replace(".", ",")}%`;
}

/** The mentions a firm's settings add to every invoice. */
export function mentionsOf(settings: Doc<"invoiceSettings"> | null): string[] {
  const mentions: string[] = [];
  if (settings?.vatOnCollection) {
    mentions.push("TVA la încasare");
  }
  if (settings?.footer) {
    mentions.push(
      ...settings.footer
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );
  }
  return mentions;
}

export async function settingsOf(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
): Promise<Doc<"invoiceSettings"> | null> {
  return await ctx.db
    .query("invoiceSettings")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .unique();
}

export async function seriesOf(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
): Promise<Doc<"invoiceSeries">[]> {
  return await ctx.db
    .query("invoiceSeries")
    .withIndex("by_organizationId_and_code", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(50);
}

/**
 * A free-text address split the way the XML wants it: the county when a part
 * names one, the city before it (or the last part), and the street before
 * both. "Str. Fabricii 10, Cluj-Napoca, Cluj" and "Str. Fabricii 10,
 * Cluj-Napoca, jud. Cluj" both split the same way.
 */
export function splitAddress(address: string | undefined): {
  street?: string;
  city?: string;
  county?: string;
} {
  const parts = (address ?? "")
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return {};
  }
  let county: string | undefined;
  let countyIndex = -1;
  for (let index = parts.length - 1; index >= 0; index--) {
    const found = findCounty(parts[index]);
    if (found) {
      county = found.name;
      countyIndex = index;
      break;
    }
  }
  const rest = parts.filter((_, index) => index !== countyIndex);
  if (rest.length === 0) {
    // "București" alone: the city is the county.
    return county === "București"
      ? { city: county, county }
      : { county: county };
  }
  if (rest.length === 1) {
    // A lone part is a city when the county is known, a street otherwise.
    // In București, where the city is the county, it is the street unless
    // it names a sector.
    if (!county) {
      return { street: rest[0] };
    }
    if (county === "București" && !/sector/i.test(rest[0] ?? "")) {
      return { street: rest[0], city: county, county };
    }
    return { city: rest[0], county };
  }
  const city = rest[rest.length - 1];
  const street = rest.slice(0, -1).join(", ");
  // "Sector 3" after București is a city of its own.
  if (county === "București" && city && !/sector/i.test(city)) {
    return { street: rest.join(", "), city: county, county };
  }
  return { street, city, county };
}

/** The firm as an invoice names it, from its card and its invoicing settings. */
export function sellerSnapshot(
  firm: Doc<"organizations">,
  settings: Doc<"invoiceSettings"> | null,
): InvoiceParty {
  const split = splitAddress(firm.address);
  const county = firm.county ?? split.county;
  return {
    name: firm.name,
    kind: "company",
    cui: firm.cui,
    vatRegistered: firm.vatPayer,
    tradeRegister: firm.tradeRegister,
    address: split.street ?? firm.address,
    city: settings?.city ?? split.city,
    county,
    postalCode: settings?.postalCode,
    email: firm.email,
    phone: firm.phone,
    iban: settings?.iban,
    bank: settings?.bank,
    shareCapital: settings?.shareCapital,
  };
}

/** A client as an invoice names them, from their card. */
export function buyerSnapshot(client: Doc<"clients"> | null): InvoiceParty {
  if (!client) {
    return { name: "", kind: "company", vatRegistered: false };
  }
  const split = splitAddress(client.address);
  return {
    name: client.name,
    kind: client.kind,
    cui: client.cui,
    // A company's CUI goes in as a VAT identifier until the firm says
    // otherwise; "Verifică la ANAF" on the invoice settles it.
    vatRegistered: client.kind === "company" && client.cui !== undefined,
    address: split.street ?? (split.city ? undefined : client.address),
    city: split.city,
    county: split.county,
    email: client.email,
    phone: client.phone,
  };
}

/** A draft invoice of the signed-in user's firm, which can still change. */
export async function requireDraft(
  ctx: MutationCtx,
  invoiceId: Id<"invoices">,
) {
  const { doc: invoice, userId } = await requireFirmDoc(
    ctx,
    "invoices",
    invoiceId,
  );
  if (invoice.status !== "draft") {
    throw appError("locked", "invoice");
  }
  return { invoice, userId };
}

/** A Deviz's invoices, newest first. */
export async function invoicesOf(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"invoices">[]> {
  return await ctx.db
    .query("invoices")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .order("desc")
    .take(200);
}

/** Whether an issued invoice still counts: not cancelled, not reversed. */
export function counts(invoice: Doc<"invoices">): boolean {
  return (
    (invoice.status === "issued" || invoice.status === "paid") &&
    invoice.stornoedBy === undefined
  );
}

/** A series code as people type it: letters and digits, up to 10, upper case. */
export function cleanSeriesCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{0,9}$/.test(code)) {
    throw invalid("series");
  }
  return code;
}

/** A party field as the XML allows it. */
export function partyText(
  value: string | undefined,
  maxLength: number,
  field: string,
): string | undefined {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }
  if (text.length > maxLength) {
    throw invalid(field);
  }
  return text;
}

/** A county as the official forms spell it, or as typed when unknown. */
export function cleanCounty(value: string | undefined): string | undefined {
  const text = optionalText(value, 50);
  return text ? (findCounty(text)?.name ?? text) : undefined;
}

/** Whether two names are the same firm, give or take spelling. */
export function sameName(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

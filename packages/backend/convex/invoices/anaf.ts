import { type Infer, v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { requireFirmDoc } from "../lib/access";
import { appError } from "../lib/errors";
import { askAnaf } from "../producers/anaf";
import { anafRecord } from "../producers/validators";
import { findCounty } from "./counties";
import { cleanCounty, type InvoiceParty, splitAddress } from "./helpers";

// What ANAF tells us about an invoice before it is sent: whether the buyer
// is registered for VAT and where its office is (the public register of VAT
// payers), and whether the XML passes the e-Factura rules (the public
// validator). Neither needs a key or a certificate; sending does (spv.ts).

type AnafRecord = Infer<typeof anafRecord>;

const VALIDATE_URL =
  "https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/FACT1";
const TIMEOUT_MS = 20_000;
const MAX_MESSAGES = 50;

/** "CLUJ-NAPOCA" as a form prints it: Cluj-Napoca, with comma-below diacritics. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/ş/g, "ș")
    .replace(/ţ/g, "ț")
    .replace(
      /(^|[\s\-.(])(\p{L})/gu,
      (_, before, letter) => `${before}${letter.toUpperCase()}`,
    );
}

/**
 * ANAF's address of a firm, split the way the XML wants it. The register
 * writes "JUD. CLUJ, MUN. CLUJ-NAPOCA, STR. FABRICII, NR. 10": county,
 * then town, then the street. Anything else splits as a typed address.
 */
export function splitAnafAddress(address: string | undefined): {
  street?: string;
  city?: string;
  county?: string;
} {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const county = findCounty(
    parts[0]?.replace(/^jud(e[tț]ul)?\.?\s*/i, ""),
  )?.name;
  if (!county) {
    return splitAddress(address);
  }
  const town = parts[1]
    ?.replace(
      /^(mun\.|municipiul|or[sș]\.|ora[sș]ul|ora[sș]|com\.|comuna|sat)\s+/i,
      "",
    )
    .trim();
  const street = parts.slice(2).join(", ");
  return {
    street: street ? titleCase(street) : undefined,
    city: town ? titleCase(town) : undefined,
    county,
  };
}

/**
 * The buyer with what ANAF's register says. Unasked (`replace` false), the
 * register settles only the VAT standing and fills what the client's card
 * left empty; asked from the page, its name and office replace the card's.
 */
export function buyerFromAnaf(
  current: InvoiceParty,
  anaf: AnafRecord,
  replace: boolean,
): InvoiceParty {
  if (anaf.outcome !== "found") {
    return current;
  }
  const split = splitAnafAddress(anaf.address);
  const pick = <T>(own: T | undefined, theirs: T | undefined): T | undefined =>
    replace ? (theirs ?? own) : (own ?? theirs);
  return {
    ...current,
    name:
      (replace ? anaf.name : undefined) ??
      (current.name.trim() || anaf.name || ""),
    vatRegistered: anaf.vatPayer ?? current.vatRegistered,
    tradeRegister: pick(current.tradeRegister, anaf.tradeRegister),
    address: pick(current.address, split.street),
    city: pick(current.city, split.city),
    county: pick(current.county, cleanCounty(split.county)),
    postalCode: replace ? undefined : current.postalCode,
  };
}

/** A draft's buyer, when it is a company with a CUI and unchanged since `updatedAt`. */
export const buyerCui = internalQuery({
  args: { invoiceId: v.id("invoices"), updatedAt: v.number() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get("invoices", args.invoiceId);
    return invoice &&
      invoice.status === "draft" &&
      invoice.updatedAt === args.updatedAt &&
      invoice.buyer.kind === "company" &&
      invoice.buyer.cui
      ? invoice.buyer.cui
      : null;
  },
});

/** Keeps ANAF's answer on a draft that nobody changed meanwhile. */
export const recordBuyer = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    updatedAt: v.number(),
    anaf: anafRecord,
    replace: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get("invoices", args.invoiceId);
    if (invoice?.status !== "draft" || invoice.updatedAt !== args.updatedAt) {
      return null;
    }
    await ctx.db.patch("invoices", invoice._id, {
      buyer: buyerFromAnaf(invoice.buyer, args.anaf, args.replace),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Looks a new draft's buyer up, so the XML names it as the register does. */
export const checkBuyer = internalAction({
  args: { invoiceId: v.id("invoices"), updatedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cui = await ctx.runQuery(internal.invoices.anaf.buyerCui, args);
    if (!cui) {
      return null;
    }
    const anaf = await askAnaf(cui, new Date());
    if (anaf.outcome === "found") {
      await ctx.runMutation(internal.invoices.anaf.recordBuyer, {
        ...args,
        anaf,
        replace: false,
      });
    }
    return null;
  },
});

/** The draft the signed-in member asks about, with the moment it last changed. */
export const draftToCheck = internalQuery({
  args: { invoiceId: v.id("invoices") },
  returns: v.object({
    cui: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { doc: invoice } = await requireFirmDoc(
      ctx,
      "invoices",
      args.invoiceId,
    );
    if (invoice.status !== "draft") {
      throw appError("locked", "invoice");
    }
    return {
      cui:
        invoice.buyer.kind === "company" && invoice.buyer.cui
          ? invoice.buyer.cui
          : null,
      updatedAt: invoice.updatedAt,
    };
  },
});

const anafOutcome = v.union(
  v.literal("found"),
  v.literal("not_found"),
  v.literal("unavailable"),
);

/**
 * "Verifică la ANAF" on a draft: the register's name, office and VAT
 * standing replace the buyer's. Says what it found, for the page.
 */
export const checkBuyerNow = action({
  args: { invoiceId: v.id("invoices") },
  returns: v.object({
    outcome: anafOutcome,
    name: v.optional(v.string()),
    vatPayer: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const draft = await ctx.runQuery(internal.invoices.anaf.draftToCheck, args);
    if (!draft.cui) {
      throw appError("invalid", "cui");
    }
    const anaf = await askAnaf(draft.cui, new Date());
    if (anaf.outcome === "found") {
      await ctx.runMutation(internal.invoices.anaf.recordBuyer, {
        invoiceId: args.invoiceId,
        updatedAt: draft.updatedAt,
        anaf,
        replace: true,
      });
    }
    return { outcome: anaf.outcome, name: anaf.name, vatPayer: anaf.vatPayer };
  },
});

type Validation = NonNullable<Doc<"invoices">["validation"]>;

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/** ANAF's validator's answer: {stare: "ok"|"nok", Messages: [{message}]}. */
export function parseValidation(body: unknown, checkedAt: number): Validation {
  const state = field(body, "stare");
  const raw = field(body, "Messages");
  const messages = (Array.isArray(raw) ? raw : [])
    .map((entry) =>
      typeof entry === "string" ? entry : field(entry, "message"),
    )
    .filter((entry): entry is string => typeof entry === "string" && !!entry)
    .slice(0, MAX_MESSAGES);
  return { checkedAt, ok: state === "ok", messages };
}

export const recordValidation = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    validation: v.object({
      checkedAt: v.number(),
      ok: v.boolean(),
      messages: v.array(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.get("invoices", args.invoiceId)) {
      await ctx.db.patch("invoices", args.invoiceId, {
        validation: args.validation,
      });
    }
    return null;
  },
});

/**
 * Sends the invoice's XML to ANAF's public validator and keeps its answer
 * on the invoice: the same rules the SPV applies, without sending anything
 * there. "unavailable" when ANAF doesn't answer.
 */
export const validate = action({
  args: { invoiceId: v.id("invoices") },
  returns: v.object({
    outcome: v.union(
      v.literal("ok"),
      v.literal("nok"),
      v.literal("unavailable"),
    ),
    messages: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { xml } = await ctx.runQuery(api.invoices.xml.forInvoice, args);
    let body: unknown;
    try {
      const response = await fetch(VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: xml,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return { outcome: "unavailable" as const, messages: [] };
      }
      body = await response.json();
    } catch {
      return { outcome: "unavailable" as const, messages: [] };
    }
    const validation = parseValidation(body, Date.now());
    await ctx.runMutation(internal.invoices.anaf.recordValidation, {
      invoiceId: args.invoiceId,
      validation,
    });
    return {
      outcome: validation.ok ? ("ok" as const) : ("nok" as const),
      messages: validation.messages,
    };
  },
});

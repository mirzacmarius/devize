import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { requireMember } from "../lib/access";
import { appError, invalid, notFound } from "../lib/errors";
import {
  cleanSeriesCode,
  DEFAULT_PAYMENT_TERM_DAYS,
  DEFAULT_SERIES,
  MAX_CITY,
  MAX_POSTAL,
  partyText,
  seriesOf,
  settingsOf,
} from "./helpers";

// A firm's invoicing settings: the series its invoices are numbered in, its
// bank account, what every invoice states and how long clients have to pay.
// Owners and admins change them; members read them.

const MAX_SERIES = 20;
const MAX_FOOTER = 1000;
const MAX_TERM_DAYS = 365;

/** The settings as the page shows them, with defaults where nothing is saved. */
export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { membership } = await requireMember(ctx, args.organizationId);
    const settings = await settingsOf(ctx, args.organizationId);
    const series = await seriesOf(ctx, args.organizationId);
    return {
      iban: settings?.iban ?? null,
      bank: settings?.bank ?? null,
      shareCapital: settings?.shareCapital ?? null,
      city: settings?.city ?? null,
      postalCode: settings?.postalCode ?? null,
      paymentTermDays: settings?.paymentTermDays ?? DEFAULT_PAYMENT_TERM_DAYS,
      vatOnCollection: settings?.vatOnCollection ?? false,
      footer: settings?.footer ?? null,
      series: series.map((row) => ({
        _id: row._id,
        code: row.code,
        nextNumber: row.nextNumber,
        isDefault: row.isDefault,
        active: row.active,
      })),
      canEdit: membership.role !== "member",
    };
  },
});

/** An IBAN as banks print it: letters and digits, spaces ignored, upper case. */
export function cleanIban(value: string | undefined): string | undefined {
  const iban = value?.replace(/\s+/g, "").toUpperCase();
  if (!iban) {
    return undefined;
  }
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban) || !ibanChecks(iban)) {
    throw invalid("iban");
  }
  return iban;
}

/** The mod-97 check every IBAN passes (ISO 13616). */
function ibanChecks(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits =
      char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export const save = mutation({
  args: {
    organizationId: v.id("organizations"),
    iban: v.optional(v.string()),
    bank: v.optional(v.string()),
    shareCapital: v.optional(v.union(v.number(), v.null())),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    paymentTermDays: v.optional(v.number()),
    vatOnCollection: v.optional(v.boolean()),
    footer: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    const patch: Partial<Doc<"invoiceSettings">> = {};
    if (args.iban !== undefined) {
      patch.iban = cleanIban(args.iban);
    }
    if (args.bank !== undefined) {
      patch.bank = optionalText(args.bank, 100);
    }
    if (args.shareCapital !== undefined) {
      const capital = args.shareCapital;
      if (capital !== null && (!Number.isFinite(capital) || capital < 0)) {
        throw invalid("shareCapital");
      }
      patch.shareCapital = capital ?? undefined;
    }
    if (args.city !== undefined) {
      patch.city = partyText(args.city, MAX_CITY, "city");
    }
    if (args.postalCode !== undefined) {
      patch.postalCode = partyText(args.postalCode, MAX_POSTAL, "postalCode");
    }
    if (args.paymentTermDays !== undefined) {
      const days = args.paymentTermDays;
      if (!Number.isInteger(days) || days < 0 || days > MAX_TERM_DAYS) {
        throw invalid("paymentTermDays");
      }
      patch.paymentTermDays = days;
    }
    if (args.vatOnCollection !== undefined) {
      patch.vatOnCollection = args.vatOnCollection;
    }
    if (args.footer !== undefined) {
      patch.footer = optionalText(args.footer, MAX_FOOTER);
    }
    await saveSettings(ctx, args.organizationId, patch);
    return null;
  },
});

/** Saves some of the firm's settings, making its row if it has none. */
export async function saveSettings(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  fields: Partial<Doc<"invoiceSettings">>,
) {
  const settings = await settingsOf(ctx, organizationId);
  const now = Date.now();
  if (settings) {
    await ctx.db.patch("invoiceSettings", settings._id, {
      ...fields,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("invoiceSettings", {
      organizationId,
      paymentTermDays: DEFAULT_PAYMENT_TERM_DAYS,
      vatOnCollection: false,
      ...fields,
      updatedAt: now,
    });
  }
}

/** Adds a series, which starts at `nextNumber` (1 unless the firm continues an older numbering). */
export const addSeries = mutation({
  args: {
    organizationId: v.id("organizations"),
    code: v.string(),
    nextNumber: v.optional(v.number()),
  },
  returns: v.id("invoiceSeries"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, "admin");
    const code = cleanSeriesCode(args.code);
    const existing = await seriesOf(ctx, args.organizationId);
    if (existing.length >= MAX_SERIES) {
      throw invalid("series");
    }
    if (existing.some((row) => row.code === code)) {
      throw appError("in_use", "series");
    }
    const nextNumber = args.nextNumber ?? 1;
    if (!Number.isInteger(nextNumber) || nextNumber < 1) {
      throw invalid("nextNumber");
    }
    return await ctx.db.insert("invoiceSeries", {
      organizationId: args.organizationId,
      code,
      nextNumber,
      isDefault: existing.length === 0,
      active: true,
    });
  },
});

/**
 * Changes a series: its next number (only upwards once it gave a number, so
 * none repeats), whether it is the default and whether it is still used.
 */
export const updateSeries = mutation({
  args: {
    seriesId: v.id("invoiceSeries"),
    nextNumber: v.optional(v.number()),
    isDefault: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const series = await ctx.db.get("invoiceSeries", args.seriesId);
    if (!series) {
      throw notFound("series");
    }
    await requireMember(ctx, series.organizationId, "admin");
    const patch: Partial<Doc<"invoiceSeries">> = {};
    if (args.nextNumber !== undefined) {
      const used = await lastIssued(ctx, series);
      if (
        !Number.isInteger(args.nextNumber) ||
        args.nextNumber < 1 ||
        (used !== undefined && args.nextNumber <= used)
      ) {
        throw invalid("nextNumber");
      }
      patch.nextNumber = args.nextNumber;
    }
    if (args.active !== undefined) {
      patch.active = args.active;
    }
    if (args.isDefault) {
      for (const other of await seriesOf(ctx, series.organizationId)) {
        if (other._id !== series._id && other.isDefault) {
          await ctx.db.patch("invoiceSeries", other._id, { isDefault: false });
        }
      }
      patch.isDefault = true;
      patch.active = args.active ?? true;
    }
    await ctx.db.patch("invoiceSeries", series._id, patch);
    return null;
  },
});

/** Removes a series that never numbered an invoice. */
export const removeSeries = mutation({
  args: { seriesId: v.id("invoiceSeries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const series = await ctx.db.get("invoiceSeries", args.seriesId);
    if (!series) {
      throw notFound("series");
    }
    await requireMember(ctx, series.organizationId, "admin");
    if ((await lastIssued(ctx, series)) !== undefined) {
      throw appError("in_use", "series");
    }
    await ctx.db.delete("invoiceSeries", series._id);
    const left = await seriesOf(ctx, series.organizationId);
    if (series.isDefault && left[0]) {
      await ctx.db.patch("invoiceSeries", left[0]._id, { isDefault: true });
    }
    return null;
  },
});

/** The highest number a series gave, or undefined when it gave none. */
async function lastIssued(
  ctx: MutationCtx,
  series: Doc<"invoiceSeries">,
): Promise<number | undefined> {
  const last = await ctx.db
    .query("invoices")
    .withIndex("by_organizationId_and_series_and_number", (q) =>
      q.eq("organizationId", series.organizationId).eq("series", series.code),
    )
    .order("desc")
    .first();
  return last?.number;
}

/**
 * The series an invoice is numbered in: the one asked for, else the default,
 * made as DVZ from 1 when the firm has none yet.
 */
export async function seriesFor(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  code: string | undefined,
): Promise<Doc<"invoiceSeries">> {
  const all = await seriesOf(ctx, organizationId);
  const chosen = code
    ? all.find((row) => row.code === code && row.active)
    : (all.find((row) => row.isDefault && row.active) ??
      all.find((row) => row.active));
  if (chosen) {
    return chosen;
  }
  if (code || all.length > 0) {
    throw invalid("series");
  }
  const seriesId = await ctx.db.insert("invoiceSeries", {
    organizationId,
    code: DEFAULT_SERIES,
    nextNumber: 1,
    isDefault: true,
    active: true,
  });
  const made = await ctx.db.get("invoiceSeries", seriesId);
  if (!made) {
    throw notFound("series");
  }
  return made;
}

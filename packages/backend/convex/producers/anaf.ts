import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { anafRecord } from "./validators";

type AnafRecord = Infer<typeof anafRecord>;

// ANAF's public register of VAT payers, which answers for any CUI with the
// firm's name, address and status. Free, with no key; at most one request a
// second, and a claim makes one.
const ANAF_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";
const TIMEOUT_MS = 15_000;

function deadline(): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(TIMEOUT_MS)
    : undefined;
}

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function flag(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** ANAF's answer about one CUI, reduced to what reviewing a claim needs. */
export function parseAnaf(body: unknown, checkedAt: number): AnafRecord {
  const found = field(body, "found");
  const entry = Array.isArray(found) ? found[0] : undefined;
  if (entry === undefined) {
    return Array.isArray(field(body, "notFound"))
      ? { outcome: "not_found", checkedAt }
      : { outcome: "unavailable", checkedAt };
  }
  const general = field(entry, "date_generale");
  return {
    outcome: "found",
    checkedAt,
    name: text(field(general, "denumire")),
    address: text(field(general, "adresa")),
    tradeRegister: text(field(general, "nrRegCom")),
    registration: text(field(general, "stare_inregistrare")),
    inactive: flag(field(field(entry, "stare_inactiv"), "statusInactivi")),
    vatPayer: flag(field(field(entry, "inregistrare_scop_Tva"), "scpTVA")),
  };
}

/** Asks ANAF about a CUI on a day; "unavailable" when it doesn't answer. */
export async function askAnaf(cui: string, now: Date): Promise<AnafRecord> {
  const checkedAt = now.getTime();
  try {
    const response = await fetch(ANAF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { cui: Number(cui), data: now.toISOString().slice(0, 10) },
      ]),
      signal: deadline(),
    });
    if (!response.ok) {
      return { outcome: "unavailable", checkedAt };
    }
    return parseAnaf(await response.json(), checkedAt);
  } catch {
    return { outcome: "unavailable", checkedAt };
  }
}

export const claimCui = internalQuery({
  args: { claimId: v.id("manufacturerClaims") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const claim = await ctx.db.get("manufacturerClaims", args.claimId);
    return claim?.status === "pending" && claim.cui ? claim.cui : null;
  },
});

export const record = internalMutation({
  args: { claimId: v.id("manufacturerClaims"), anaf: anafRecord },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.get("manufacturerClaims", args.claimId)) {
      await ctx.db.patch("manufacturerClaims", args.claimId, {
        anaf: args.anaf,
      });
    }
    return null;
  },
});

/** Looks up a waiting claim's CUI with ANAF and keeps the answer on it. */
export const lookup = internalAction({
  args: { claimId: v.id("manufacturerClaims") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cui = await ctx.runQuery(internal.producers.anaf.claimCui, args);
    if (cui) {
      const anaf = await askAnaf(cui, new Date());
      await ctx.runMutation(internal.producers.anaf.record, {
        claimId: args.claimId,
        anaf,
      });
    }
    return null;
  },
});

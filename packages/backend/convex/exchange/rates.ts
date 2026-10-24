import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";
import { internalAction, internalMutation, query } from "../_generated/server";
import { BNR_RATES_URL, parseBnrRates } from "./bnr";

// Totals in EUR beside the lei, at BNR's rate of the day. Only the euro is
// kept: it is the currency Romanian clients compare prices in.
// See docs/adr/0042.

const CURRENCIES = ["EUR"] as const;

const latestRate = v.union(
  v.null(),
  v.object({ currency: v.string(), rate: v.number(), date: v.string() }),
);

/** The newest rate kept for a currency. */
export async function latestRateOf(ctx: QueryCtx, currency: string) {
  const row = await ctx.db
    .query("exchangeRates")
    .withIndex("by_currency_and_date", (q) => q.eq("currency", currency))
    .order("desc")
    .first();
  return row ? { currency, rate: row.rate, date: row.date } : null;
}

/** BNR's latest euro rate, for the totals in EUR. */
export const latest = query({
  args: {},
  returns: latestRate,
  handler: async (ctx) => await latestRateOf(ctx, "EUR"),
});

/** Keeps a day's rates, once each. */
export const record = internalMutation({
  args: {
    date: v.string(),
    rates: v.record(v.string(), v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let added = 0;
    for (const currency of CURRENCIES) {
      const rate = args.rates[currency];
      if (rate === undefined) {
        continue;
      }
      const existing = await ctx.db
        .query("exchangeRates")
        .withIndex("by_currency_and_date", (q) =>
          q.eq("currency", currency).eq("date", args.date),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("exchangeRates", {
          currency,
          date: args.date,
          rate,
          fetchedAt: Date.now(),
        });
        added++;
      }
    }
    return added;
  },
});

/** Reads BNR's rates of the day and keeps the new ones. */
export const refresh = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const response = await fetch(BNR_RATES_URL, {
      headers: { accept: "application/xml" },
    });
    if (!response.ok) {
      throw new Error(`BNR answered ${response.status}`);
    }
    const parsed = parseBnrRates(await response.text());
    if (!parsed) {
      throw new Error("BNR's rates could not be read");
    }
    return await ctx.runMutation(internal.exchange.rates.record, parsed);
  },
});

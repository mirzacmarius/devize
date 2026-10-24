import { defineTable } from "convex/server";
import { v } from "convex/values";

export const exchangeTables = {
  // BNR's reference rates, one row a currency a banking day, read each
  // afternoon. Public data: any page may show them. See docs/adr/0042.
  exchangeRates: defineTable({
    currency: v.string(),
    // The day BNR set the rate for, as YYYY-MM-DD.
    date: v.string(),
    // Lei for one unit of the currency.
    rate: v.number(),
    fetchedAt: v.number(),
  }).index("by_currency_and_date", ["currency", "date"]),
};

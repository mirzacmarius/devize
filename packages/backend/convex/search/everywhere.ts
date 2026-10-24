import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { withClientNames } from "../estimates/estimates";
import { invoiceCode, seriesOf } from "../invoices/helpers";
import { requireMember } from "../lib/access";
import { normalizeText } from "../lib/text";

// Enough to choose from in a menu; the lists have the rest.
const PER_GROUP = 5;

/**
 * What the search menu (Ctrl+K) finds for the words typed, in one read: the
 * firm's devize, clients and invoices, and the norms it can use. With nothing
 * typed, the devize changed last.
 */
export const find = query({
  args: { organizationId: v.id("organizations"), text: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const organizationId = args.organizationId;
    const text = normalizeText(args.text);
    if (!text) {
      const recent = await ctx.db
        .query("estimates")
        .withIndex("by_organizationId_and_updatedAt", (q) =>
          q.eq("organizationId", organizationId),
        )
        .order("desc")
        .take(PER_GROUP);
      return {
        estimates: await withClientNames(ctx, recent),
        clients: [],
        invoices: [],
        norms: [],
      };
    }
    const estimates = await ctx.db
      .query("estimates")
      .withSearchIndex("search_searchText", (q) =>
        q.search("searchText", text).eq("organizationId", organizationId),
      )
      .take(PER_GROUP);
    const clients = await ctx.db
      .query("clients")
      .withSearchIndex("search_nameKey", (q) =>
        q.search("nameKey", text).eq("organizationId", organizationId),
      )
      .take(PER_GROUP);
    return {
      estimates: await withClientNames(ctx, estimates),
      // Whole, for the sheet that edits one.
      clients,
      invoices: await invoicesNumbered(ctx, organizationId, args.text),
      norms: await norms(ctx, organizationId, text),
    };
  },
});

/**
 * Issued invoices whose number is the one typed, as "17", "0017" or
 * "DVZ-0017": in the series named, or in each of the firm's series.
 */
async function invoicesNumbered(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  typed: string,
) {
  const match = /^(.*?)[\s-]*(\d{1,9})$/.exec(typed.trim().toUpperCase());
  if (!match?.[2]) {
    return [];
  }
  const number = Number(match[2]);
  const named = match[1]?.trim();
  const series = (await seriesOf(ctx, organizationId))
    .map((row) => row.code)
    .filter((code) => !named || code === named);
  const found: Doc<"invoices">[] = [];
  for (const code of series) {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_organizationId_and_series_and_number", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("series", code)
          .eq("number", number),
      )
      .first();
    if (invoice) {
      found.push(invoice);
    }
    if (found.length === PER_GROUP) {
      break;
    }
  }
  return found.flatMap((invoice) =>
    invoice.series !== undefined && invoice.number !== undefined
      ? [
          {
            _id: invoice._id,
            code: invoiceCode(invoice.series, invoice.number),
            series: invoice.series,
            number: invoice.number,
            kind: invoice.kind,
            status: invoice.status,
            buyerName: invoice.buyer.name,
            total: invoice.totals.total,
          },
        ]
      : [],
  );
}

/** Published norms the firm can use, its own first, as the catalog finds them. */
async function norms(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  text: string,
) {
  const own = await ctx.db
    .query("norms")
    .withSearchIndex("search_searchText", (q) =>
      q
        .search("searchText", text)
        .eq("organizationId", organizationId)
        .eq("status", "published"),
    )
    .take(PER_GROUP);
  const shared =
    own.length < PER_GROUP
      ? await ctx.db
          .query("norms")
          .withSearchIndex("search_searchText", (q) =>
            q
              .search("searchText", text)
              .eq("visibility", "public")
              .eq("status", "published"),
          )
          .take(PER_GROUP)
      : [];
  const seen = new Set(own.map((norm) => norm._id));
  return [...own, ...shared.filter((norm) => !seen.has(norm._id))]
    .slice(0, PER_GROUP)
    .map((norm) => ({
      _id: norm._id,
      code: norm.code,
      title: norm.title,
      unit: norm.unit,
      own: norm.organizationId === organizationId,
    }));
}

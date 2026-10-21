import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// A firm's settings for store prices: one `priceSettings` row, made the first
// time the firm saves one.

// Unless the firm chose otherwise, it gets an Alertă de preț when a sent
// Deviz's total would change by 5 %.
export const DEFAULT_ALERT_PERCENT = 5;

export async function priceSettingsOf(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
): Promise<Doc<"priceSettings"> | null> {
  return await ctx.db
    .query("priceSettings")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .unique();
}

/** The firm's alert threshold, in percent; 0 when it turned alerts off. */
export function alertPercentOf(settings: Doc<"priceSettings"> | null): number {
  return settings?.alertPercent ?? DEFAULT_ALERT_PERCENT;
}

type Fields = Partial<
  Pick<Doc<"priceSettings">, "storeFees" | "alertPercent" | "alertsCheckedAt">
>;

/** Saves some of the firm's settings, making its row if it has none. */
export async function savePriceSettings(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  fields: Fields,
) {
  const settings = await priceSettingsOf(ctx, organizationId);
  const now = Date.now();
  if (settings) {
    await ctx.db.patch("priceSettings", settings._id, {
      ...fields,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("priceSettings", {
      organizationId,
      storeFees: [],
      ...fields,
      updatedAt: now,
    });
  }
}

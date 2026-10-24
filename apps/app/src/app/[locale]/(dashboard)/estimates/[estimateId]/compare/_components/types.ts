import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { formatMoney } from "@/lib/format";
import type { Locale } from "@/locales/locale";

export type Comparison = FunctionReturnType<
  typeof api.estimates.compare.compare
>;
export type LineChange = Comparison["lines"]["changed"][number];

/** Lei with their sign, as a difference reads: +1.234,00, −56,10 or 0,00. */
export function signedMoney(value: number, locale: Locale): string {
  const text = formatMoney(Math.abs(value), locale);
  if (Math.round(value * 100) === 0) {
    return formatMoney(0, locale);
  }
  return value > 0 ? `+${text}` : `−${text}`;
}

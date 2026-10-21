import { formatMoney, formatPercent } from "@/lib/format";
import type { Locale } from "@/locales/locale";

// What the Prețuri page computes from the backend's numbers, without React.

/** The thresholds offered, in percent; 0 turns alerts off. */
export const thresholds = [0, 3, 5, 10, 20] as const;

/** The thresholds to offer: the usual ones and the firm's, if it differs. */
export function thresholdOptions(current: number | undefined): number[] {
  const options: number[] = [...thresholds];
  if (current !== undefined && !options.includes(current)) {
    options.push(current);
  }
  return options.sort((a, b) => a - b);
}

function signed(value: number, formatted: string): string {
  return value > 0 ? `+${formatted}` : value < 0 ? `−${formatted}` : formatted;
}

/** A change in percent with its sign: +6,1%, −4,2%. */
export function signedPercent(value: number, locale: Locale): string {
  return signed(value, formatPercent(Math.abs(value), locale));
}

/** Lei gained or lost, with the sign: +315,00, −54,20. */
export function signedMoney(value: number, locale: Locale): string {
  return signed(value, formatMoney(Math.abs(value), locale));
}

/** How far a price moved from the one before, in percent, to one decimal. */
export function priceMove(before: number, now: number): number {
  return before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : 0;
}

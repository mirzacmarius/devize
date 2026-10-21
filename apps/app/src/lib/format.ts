import type { Locale } from "@/locales/locale";

// Numbers and dates as Devize shows them: 39.916,16 lei, TVA 21%, 14 oct.
// Romanian pages use Romanian separators; English pages use English ones.

const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "ro-RO");

function decimalFormat(locale: Locale, min: number, max: number) {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/** Lei, always with two decimals: 39.916,16. The currency goes in the column head or after the number. */
export function formatMoney(value: number, locale: Locale): string {
  return decimalFormat(locale, 2, 2).format(value);
}

/** A line item's quantity: 42,50, or 12,345 when it has three decimals. */
export function formatQuantity(value: number, locale: Locale): string {
  return decimalFormat(locale, 2, 3).format(value);
}

/** What one unit of a norm consumes: 4,50 kg, or 0,035 kg. */
export function formatConsumption(value: number, locale: Locale): string {
  return decimalFormat(locale, 2, 4).format(value);
}

/** A percentage glued to its number, as the design asks: 21%, 2,25%. */
export function formatPercent(value: number, locale: Locale): string {
  return `${decimalFormat(locale, 0, 2).format(value)}%`;
}

/** A number to put back in a text field: no thousands separators, up to four decimals. */
export function formatInputNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    useGrouping: false,
    maximumFractionDigits: 4,
  }).format(value);
}

/** Hours of work: 26,4. */
export function formatHours(value: number, locale: Locale): string {
  return decimalFormat(locale, 0, 1).format(value);
}

/** A calendar date stored as YYYY-MM-DD, such as a Deviz's price date: 21 oct. 2026. */
export function formatCalendarDate(value: string, locale: Locale): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** A moment, without the year when it is this year's: 14 oct., or 14 oct. 2025. */
export function formatDay(
  timestamp: number,
  locale: Locale,
  now = Date.now(),
): string {
  const date = new Date(timestamp);
  const thisYear = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: thisYear ? undefined : "numeric",
  }).format(date);
}

/** The time of day, 24-hour: 10:40. */
export function formatTime(timestamp: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

const unitLabels: Record<Locale, Record<string, string>> = {
  ro: { ora: "oră" },
  en: { ora: "h", zi: "day", buc: "pcs" },
};

/**
 * A unit as people read it. Units are stored in their canonical spelling
 * (convex/lib/text.ts), which writes "ora" without its diacritic.
 */
export function formatUnit(unit: string, locale: Locale): string {
  return unitLabels[locale][unit] ?? unit;
}

/** Today's date as YYYY-MM-DD in the browser's time zone, for date inputs. */
export function todayInput(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Reads a number typed the Romanian way or the English way: "1.234,5",
 * "1234,5" and "1234.5" are all 1234.5. Returns undefined for anything else.
 */
export function parseDecimal(input: string): number | undefined {
  let text = input.trim().replace(/\s/g, "");
  if (!text) {
    return undefined;
  }
  if (text.includes(",")) {
    // A comma is the decimal separator, so dots group thousands.
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(text)) {
    // 1.234.567: only thousands, no decimals.
    text = text.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    return undefined;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** A Deviz's number as the design writes codes: DVZ-0142, and DVZ-0142-R2 for its second revision. */
export function estimateCode(number: number, revision = 1): string {
  const code = `DVZ-${String(number).padStart(4, "0")}`;
  return revision > 1 ? `${code}-R${revision}` : code;
}

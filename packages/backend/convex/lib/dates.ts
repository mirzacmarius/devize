import { invalid } from "./errors";

/** 01:00 UTC on the last Sunday of a month, when EU summer time changes. */
function lastSundayAtOneUtc(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return Date.UTC(year, month, lastDay.getUTCDate() - lastDay.getUTCDay(), 1);
}

/**
 * The date in Romania (UTC+2, UTC+3 in summer) at a moment, as YYYY-MM-DD.
 * Computed by hand because the Convex runtime may lack time zone data.
 */
export function romanianDate(timestamp: number): string {
  const year = new Date(timestamp).getUTCFullYear();
  const summer =
    timestamp >= lastSundayAtOneUtc(year, 2) &&
    timestamp < lastSundayAtOneUtc(year, 9);
  const offsetHours = summer ? 3 : 2;
  return new Date(timestamp + offsetHours * 3_600_000)
    .toISOString()
    .slice(0, 10);
}

/** The month in Romania at a moment, as YYYY-MM. */
export function romanianMonth(timestamp: number): string {
  return romanianDate(timestamp).slice(0, 7);
}

/** A month as YYYY-MM. Throws `invalid` for anything else. */
export function checkMonth(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw invalid("month");
  }
  return value;
}

/** The `count` months that end with `until` (YYYY-MM), the earliest first. */
export function monthsUntil(until: string, count: number): string[] {
  const year = Number(until.slice(0, 4));
  const month = Number(until.slice(5, 7));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - count + index, 1));
    return date.toISOString().slice(0, 7);
  });
}

/** A calendar date as YYYY-MM-DD. Throws `invalid` for anything else. */
export function checkDate(value: string): string {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== value
  ) {
    throw invalid("date");
  }
  return value;
}

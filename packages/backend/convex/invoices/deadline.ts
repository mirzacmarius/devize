// Working days in Romania, for the e-Factura deadline: an invoice reaches
// ANAF within five working days of its issue (OUG 89/2025). Working days
// leave out Saturdays, Sundays and the legal holidays of Codul muncii
// art. 139, including the Orthodox Easter and Pentecost, which move.

/** Orthodox Easter Sunday of a year, as a UTC date (Meeus's Julian algorithm). */
export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // A Julian calendar date; the Gregorian one is 13 days later until 2099.
  return new Date(Date.UTC(year, month - 1, day + 13));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function plusDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** The legal holidays of a year, as YYYY-MM-DD. */
export function legalHolidays(year: number): Set<string> {
  const easter = orthodoxEaster(year);
  const fixed = [
    "01-01",
    "01-02",
    "01-06",
    "01-07",
    "01-24",
    "05-01",
    "06-01",
    "08-15",
    "11-30",
    "12-01",
    "12-25",
    "12-26",
  ].map((day) => `${year}-${day}`);
  const moving = [-2, 0, 1, 49, 50].map((offset) =>
    iso(plusDays(easter, offset)),
  );
  return new Set([...fixed, ...moving]);
}

/** Whether a calendar day (YYYY-MM-DD) is a working day in Romania. */
export function isWorkingDay(day: string): boolean {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return false;
  }
  return !legalHolidays(date.getUTCFullYear()).has(day);
}

/** The day `count` working days after `from` (YYYY-MM-DD). */
export function addWorkingDays(from: string, count: number): string {
  let date = new Date(`${from}T00:00:00Z`);
  let left = count;
  while (left > 0) {
    date = plusDays(date, 1);
    if (isWorkingDay(iso(date))) {
      left -= 1;
    }
  }
  return iso(date);
}

/** The last day to send an invoice issued on `issueDate` to ANAF. */
export function efacturaDeadline(issueDate: string): string {
  return addWorkingDays(issueDate, 5);
}

/** A calendar date some days later, as YYYY-MM-DD. */
export function addCalendarDays(from: string, days: number): string {
  return iso(plusDays(new Date(`${from}T00:00:00Z`), days));
}

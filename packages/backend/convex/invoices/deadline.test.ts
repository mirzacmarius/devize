import { describe, expect, test } from "bun:test";
import {
  addCalendarDays,
  addWorkingDays,
  efacturaDeadline,
  isWorkingDay,
  legalHolidays,
  orthodoxEaster,
} from "./deadline";

const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("the e-Factura deadline", () => {
  test("knows when the Orthodox Easter falls", () => {
    expect(iso(orthodoxEaster(2025))).toBe("2025-04-20");
    expect(iso(orthodoxEaster(2026))).toBe("2026-04-12");
    expect(iso(orthodoxEaster(2027))).toBe("2027-05-02");
    expect(iso(orthodoxEaster(2030))).toBe("2030-04-28");
  });

  test("lists the legal holidays, fixed and moving", () => {
    const holidays = legalHolidays(2026);
    for (const day of [
      "2026-01-01",
      "2026-01-02",
      "2026-01-06",
      "2026-01-07",
      "2026-01-24",
      // Vinerea Mare, Paștele și a doua zi de Paște.
      "2026-04-10",
      "2026-04-12",
      "2026-04-13",
      "2026-05-01",
      // Rusaliile.
      "2026-05-31",
      "2026-06-01",
      "2026-08-15",
      "2026-11-30",
      "2026-12-01",
      "2026-12-25",
      "2026-12-26",
    ]) {
      expect(holidays.has(day)).toBe(true);
    }
    expect(holidays.size).toBe(16);
    expect(isWorkingDay("2026-10-23")).toBe(true);
    expect(isWorkingDay("2026-10-24")).toBe(false);
    expect(isWorkingDay("2026-12-01")).toBe(false);
  });

  test("counts five working days, skipping weekends and holidays", () => {
    // A Friday: the next five working days end on the Friday after.
    expect(efacturaDeadline("2026-10-23")).toBe("2026-10-30");
    // Sf. Andrei and 1 Decembrie fall on the Monday and Tuesday after.
    expect(efacturaDeadline("2026-11-27")).toBe("2026-12-08");
    // Across the Easter weekend: Good Friday and Easter Monday are skipped.
    expect(efacturaDeadline("2026-04-08")).toBe("2026-04-17");
    // Christmas and the second day fall on the Friday and Saturday.
    expect(addWorkingDays("2026-12-23", 3)).toBe("2026-12-29");
  });

  test("adds calendar days across the year's end", () => {
    expect(addCalendarDays("2026-12-30", 15)).toBe("2027-01-14");
    expect(addCalendarDays("2026-02-27", 2)).toBe("2026-03-01");
  });
});

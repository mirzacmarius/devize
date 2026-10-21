import { describe, expect, test } from "bun:test";
import {
  checkDate,
  checkMonth,
  monthsUntil,
  romanianDate,
  romanianMonth,
} from "./dates";

describe("romanianDate", () => {
  test("is three hours ahead of UTC in summer", () => {
    expect(romanianDate(Date.parse("2026-10-21T22:30:00Z"))).toBe("2026-10-22");
    expect(romanianDate(Date.parse("2026-10-21T20:59:00Z"))).toBe("2026-10-21");
  });

  test("is two hours ahead of UTC in winter", () => {
    expect(romanianDate(Date.parse("2026-12-31T22:30:00Z"))).toBe("2027-01-01");
    expect(romanianDate(Date.parse("2026-12-31T21:30:00Z"))).toBe("2026-12-31");
  });

  test("switches at 01:00 UTC on the last Sundays of March and October", () => {
    // Summer time starts on 29 March 2026 and ends on 25 October 2026.
    expect(romanianDate(Date.parse("2026-03-28T21:30:00Z"))).toBe("2026-03-28");
    expect(romanianDate(Date.parse("2026-10-24T21:30:00Z"))).toBe("2026-10-25");
    expect(romanianDate(Date.parse("2026-10-25T21:30:00Z"))).toBe("2026-10-25");
  });
});

describe("checkDate", () => {
  test("accepts real calendar dates", () => {
    expect(checkDate("2026-10-21")).toBe("2026-10-21");
    expect(checkDate("2028-02-29")).toBe("2028-02-29");
  });

  test("rejects other formats and impossible dates", () => {
    expect(() => checkDate("21.10.2026")).toThrow();
    expect(() => checkDate("2026-02-30")).toThrow();
    expect(() => checkDate("2026-13-01")).toThrow();
  });
});

describe("months", () => {
  test("are taken in Romania's time", () => {
    expect(romanianMonth(Date.parse("2026-10-31T22:30:00Z"))).toBe("2026-11");
    expect(romanianMonth(Date.parse("2026-10-31T21:30:00Z"))).toBe("2026-10");
  });

  test("count back across the year", () => {
    expect(monthsUntil("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(monthsUntil("2026-10", 12)).toHaveLength(12);
    expect(monthsUntil("2026-10", 12)[0]).toBe("2025-11");
  });

  test("are checked", () => {
    expect(checkMonth("2026-10")).toBe("2026-10");
    expect(() => checkMonth("2026-13")).toThrow();
    expect(() => checkMonth("2026-1")).toThrow();
  });
});

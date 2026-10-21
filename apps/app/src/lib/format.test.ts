import { describe, expect, test } from "bun:test";
import {
  estimateCode,
  formatAmount,
  formatCalendarDate,
  formatConsumption,
  formatCount,
  formatFileSize,
  formatMoney,
  formatMonth,
  formatPercent,
  formatQuantity,
  parseDecimal,
} from "./format";

describe("formatting", () => {
  test("writes lei with a dot for thousands and two decimals", () => {
    expect(formatMoney(39916.16, "ro")).toBe("39.916,16");
    expect(formatMoney(1615, "ro")).toBe("1.615,00");
    expect(formatMoney(1615, "en")).toBe("1,615.00");
  });

  test("keeps up to three decimals of a quantity and four of a consumption", () => {
    expect(formatQuantity(42.5, "ro")).toBe("42,50");
    expect(formatQuantity(12.345, "ro")).toBe("12,345");
    expect(formatConsumption(0.035, "ro")).toBe("0,035");
    expect(formatConsumption(4.5, "ro")).toBe("4,50");
  });

  test("glues the percent sign to the number", () => {
    expect(formatPercent(21, "ro")).toBe("21%");
    expect(formatPercent(2.25, "ro")).toBe("2,25%");
  });

  test("writes a price date with a short month", () => {
    expect(formatCalendarDate("2026-10-21", "ro")).toBe("21 oct. 2026");
  });

  test("writes a file's size in megabytes, or kilobytes under one", () => {
    expect(formatFileSize(2.45 * 1024 * 1024, "ro")).toBe("2,5 MB");
    expect(formatFileSize(20 * 1024 * 1024, "en")).toBe("20 MB");
    expect(formatFileSize(340 * 1024, "ro")).toBe("340 KB");
    expect(formatFileSize(12, "ro")).toBe("1 KB");
  });

  test("writes counts, totals and months", () => {
    expect(formatCount(1284, "ro")).toBe("1.284");
    expect(formatAmount(1250.25, "ro")).toBe("1.250,3");
    expect(formatAmount(500, "en")).toBe("500");
    expect(formatMonth("2026-10", "ro")).toBe("oct.");
    expect(formatMonth("2026-10", "ro", true)).toBe("oct. 2026");
    expect(formatMonth("2026-01", "en", true)).toBe("Jan 2026");
  });

  test("numbers a Deviz and its revisions", () => {
    expect(estimateCode(142)).toBe("DVZ-0142");
    expect(estimateCode(142, 2)).toBe("DVZ-0142-R2");
    expect(estimateCode(12345)).toBe("DVZ-12345");
  });
});

describe("parseDecimal", () => {
  test("reads Romanian and English decimals", () => {
    expect(parseDecimal("42,5")).toBe(42.5);
    expect(parseDecimal("1.234,56")).toBe(1234.56);
    expect(parseDecimal("1234.56")).toBe(1234.56);
    expect(parseDecimal("1.234.567")).toBe(1234567);
    expect(parseDecimal(" 12 ")).toBe(12);
  });

  test("treats a single dot as the decimal point", () => {
    expect(parseDecimal("1.234")).toBe(1.234);
  });

  test("rejects anything that is not a number", () => {
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("abc")).toBeUndefined();
    expect(parseDecimal("1,2,3")).toBeUndefined();
    expect(parseDecimal("12 mp")).toBeUndefined();
  });
});

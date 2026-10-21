import { describe, expect, test } from "bun:test";
import {
  estimateCode,
  formatConsumption,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatUnit,
} from "./format";

describe("numbers", () => {
  test("groups thousands with dots and uses a decimal comma", () => {
    expect(formatMoney(39916.16)).toBe("39.916,16");
    expect(formatMoney(1234567.5)).toBe("1.234.567,50");
    expect(formatMoney(-1615)).toBe("-1.615,00");
    expect(formatNumber(999.999, 2)).toBe("1.000,00");
  });

  test("rounds halves away from zero, without float noise", () => {
    expect(formatMoney(1.005)).toBe("1,01");
    expect(formatMoney(2.675)).toBe("2,68");
    expect(formatMoney(-0.001)).toBe("0,00");
  });

  test("keeps only the decimals a quantity needs", () => {
    expect(formatQuantity(42.5)).toBe("42,50");
    expect(formatQuantity(12.3456)).toBe("12,346");
    expect(formatConsumption(0.035)).toBe("0,035");
    expect(formatConsumption(4.5)).toBe("4,50");
    expect(formatPercent(21)).toBe("21%");
    expect(formatPercent(2.25)).toBe("2,25%");
  });
});

describe("dates, codes and units", () => {
  test("writes a calendar date as forms do", () => {
    expect(formatDate("2026-10-21")).toBe("21.10.2026");
    expect(formatDate("not a date")).toBe("not a date");
  });

  test("names a Deviz and its revisions", () => {
    expect(estimateCode(142)).toBe("DVZ-0142");
    expect(estimateCode(142, 2)).toBe("DVZ-0142-R2");
    expect(estimateCode(12345)).toBe("DVZ-12345");
  });

  test("gives hours their diacritic back", () => {
    expect(formatUnit("ora")).toBe("oră");
    expect(formatUnit("mp")).toBe("mp");
  });
});

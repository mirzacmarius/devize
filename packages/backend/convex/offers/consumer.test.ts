import { describe, expect, test } from "bun:test";
import {
  bucharestOffsetMinutes,
  cleanEvidence,
  formatBucharest,
  maskEmail,
  withdrawalDeadline,
} from "./consumer";

describe("a consumer's acceptance", () => {
  test("may be withdrawn for 14 days", () => {
    const signedAt = Date.UTC(2026, 9, 24, 12, 5);
    expect(withdrawalDeadline(signedAt)).toBe(Date.UTC(2026, 10, 7, 12, 5));
  });

  test("keeps the browser's evidence trimmed, or none", () => {
    expect(cleanEvidence(undefined)).toBeUndefined();
    expect(cleanEvidence({ userAgent: "  ", address: "" })).toBeUndefined();
    expect(
      cleanEvidence({
        userAgent: " Mozilla/5.0 ",
        language: "ro-RO",
        timeZone: "Europe/Bucharest",
        screen: "390×844",
        address: "203.0.113.7",
      }),
    ).toEqual({
      userAgent: "Mozilla/5.0",
      language: "ro-RO",
      timeZone: "Europe/Bucharest",
      screen: "390×844",
      address: "203.0.113.7",
    });
    expect(() => cleanEvidence({ userAgent: "x".repeat(301) })).toThrow(
      /evidence/,
    );
    expect(() => cleanEvidence({ address: "x".repeat(65) })).toThrow(
      /evidence/,
    );
  });

  test("shows an email with its name hidden", () => {
    expect(maskEmail("ion.popescu@exemplu.ro")).toBe("i***@exemplu.ro");
    expect(maskEmail("nimic")).toBe("***");
  });

  test("tells the time as Romania does, in winter and in summer", () => {
    // Winter: EET, UTC+2.
    expect(bucharestOffsetMinutes(Date.UTC(2026, 0, 15, 12))).toBe(120);
    expect(formatBucharest(Date.UTC(2026, 0, 15, 22, 30))).toEqual({
      date: "16.01.2026",
      time: "00:30",
    });
    // Summer: EEST, UTC+3, from the last Sunday of March at 01:00 UTC.
    expect(bucharestOffsetMinutes(Date.UTC(2026, 2, 29, 0, 59))).toBe(120);
    expect(bucharestOffsetMinutes(Date.UTC(2026, 2, 29, 1))).toBe(180);
    expect(formatBucharest(Date.UTC(2026, 9, 24, 11, 5))).toEqual({
      date: "24.10.2026",
      time: "14:05",
    });
    // Back to winter on the last Sunday of October at 01:00 UTC.
    expect(bucharestOffsetMinutes(Date.UTC(2026, 9, 25, 0, 59))).toBe(180);
    expect(bucharestOffsetMinutes(Date.UTC(2026, 9, 25, 1))).toBe(120);
  });
});

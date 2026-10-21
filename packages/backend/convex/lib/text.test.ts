import { describe, expect, test } from "bun:test";
import {
  isHourUnit,
  isPercentUnit,
  normalizeText,
  normalizeUnit,
} from "./text";

describe("normalizeText", () => {
  test("drops diacritics, both comma and cedilla forms", () => {
    expect(normalizeText("Faianță, șapă și ţiglă")).toBe(
      "faianta sapa si tigla",
    );
    expect(normalizeText("Ştraif ÎNCĂLZIRE")).toBe("straif incalzire");
  });

  test("keeps digits and percent signs, collapses the rest", () => {
    expect(normalizeText("  BCA 25 cm / 3%  ")).toBe("bca 25 cm 3%");
  });
});

describe("normalizeUnit", () => {
  test("maps the spellings norms use to one unit", () => {
    expect(normalizeUnit("m²")).toBe("mp");
    expect(normalizeUnit("M2")).toBe("mp");
    expect(normalizeUnit("mp.")).toBe("mp");
    expect(normalizeUnit("m³")).toBe("mc");
    expect(normalizeUnit("ml")).toBe("m");
    expect(normalizeUnit("m")).toBe("m");
    expect(normalizeUnit("Oră")).toBe("ora");
    expect(normalizeUnit("ore")).toBe("ora");
    expect(normalizeUnit("buc.")).toBe("buc");
    expect(normalizeUnit("to")).toBe("t");
    expect(normalizeUnit("%")).toBe("%");
  });

  test("keeps unknown units, normalized", () => {
    expect(normalizeUnit("Sac ")).toBe("sac");
  });

  test("recognizes percentages and hours", () => {
    expect(isPercentUnit("%")).toBe(true);
    expect(isPercentUnit("kg")).toBe(false);
    expect(isHourUnit("ore")).toBe(true);
    expect(isHourUnit("zi")).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";
import {
  isHourUnit,
  isKnownUnit,
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
    expect(normalizeUnit("Saci")).toBe("sac");
    expect(normalizeUnit("Rolă")).toBe("rola");
    expect(normalizeUnit("om-ore")).toBe("ora");
    expect(normalizeUnit("t·km")).toBe("tkm");
  });

  test("keeps a count in front of the unit", () => {
    expect(normalizeUnit("100 m²")).toBe("100 mp");
    expect(normalizeUnit("10buc.")).toBe("10 buc");
    expect(normalizeUnit("2,5 kg")).toBe("2.5 kg");
    expect(normalizeUnit("1 buc")).toBe("buc");
    expect(normalizeUnit(normalizeUnit("2,5 kg"))).toBe("2.5 kg");
  });

  test("keeps unknown units, normalized", () => {
    expect(normalizeUnit("Pachet ")).toBe("pachet");
  });

  test("tells the units it knows", () => {
    expect(isKnownUnit("m²")).toBe(true);
    expect(isKnownUnit("100 mp")).toBe(true);
    expect(isKnownUnit("ore")).toBe(true);
    expect(isKnownUnit("pachet")).toBe(false);
    expect(isKnownUnit("10 pachete")).toBe(false);
  });

  test("recognizes percentages and hours", () => {
    expect(isPercentUnit("%")).toBe(true);
    expect(isPercentUnit("kg")).toBe(false);
    expect(isHourUnit("ore")).toBe(true);
    expect(isHourUnit("zi")).toBe(false);
  });
});

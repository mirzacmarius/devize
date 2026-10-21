import { describe, expect, test } from "bun:test";
import { unitsPerSale } from "./units";

describe("unitsPerSale", () => {
  test("reads the amount in the material's unit", () => {
    expect(unitsPerSale("Adeziv flexibil C2TE, 25 kg", "kg")).toBe(25);
    expect(unitsPerSale("Ciment Portland 42.5R 40kg", "kg")).toBe(40);
    expect(unitsPerSale("Vopsea lavabilă 2,5 l", "l")).toBe(2.5);
    expect(unitsPerSale("Vată minerală 50 mm, 7,2 m² / bax", "mp")).toBe(7.2);
    expect(unitsPerSale("Profil UD 3 m", "ml")).toBe(3);
  });

  test("converts between units", () => {
    expect(unitsPerSale("Silicon sanitar 280 ml", "l")).toBe(0.28);
    expect(unitsPerSale("Chit de rosturi 500 g", "kg")).toBe(0.5);
    expect(unitsPerSale("Nisip 1 tonă", "kg")).toBe(1000);
  });

  test("counts items per piece unless the title says how many", () => {
    expect(unitsPerSale("Dibluri 6 x 40, set 100 bucăți", "buc")).toBe(100);
    expect(unitsPerSale("Sac moloz rafie", "buc")).toBe(1);
  });

  test("returns null when the title names nothing that converts", () => {
    expect(unitsPerSale("Gresie 60 x 60 cm", "mp")).toBeNull();
    expect(unitsPerSale("Silicon sanitar 280 ml", "kg")).toBeNull();
    expect(unitsPerSale("Cablu 3 x 2,5 mm", "m")).toBeNull();
  });
});

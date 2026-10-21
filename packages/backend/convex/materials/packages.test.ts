import { describe, expect, test } from "bun:test";
import {
  cleanSizes,
  isCountedUnit,
  kindFromLabel,
  thicknessOf,
  typicalPackage,
} from "./packages";

describe("typicalPackage", () => {
  test("knows what the base catalog's materials come in", () => {
    expect(typicalPackage("Adeziv flexibil C2TE", "kg")).toEqual({
      kind: "bag",
      sizes: [25],
    });
    expect(typicalPackage("Gresie porțelanată", "mp")).toEqual({
      kind: "box",
      sizes: [1.44],
    });
    expect(typicalPackage("Vopsea lavabilă de interior", "l")).toEqual({
      kind: "bucket",
      sizes: [15, 8.5, 4, 2.5],
    });
    expect(typicalPackage("Vopsea lavabilă pentru fațade", "l")?.sizes).toEqual(
      [15, 5],
    );
    expect(typicalPackage("Placă de gips-carton, 12,5 mm", "mp")).toEqual({
      kind: "sheet",
      sizes: [3.12],
    });
    expect(typicalPackage("Adeziv pentru plăci de gips-carton", "kg")).toEqual({
      kind: "bag",
      sizes: [30],
    });
    expect(
      typicalPackage("Tencuială mecanizată pe bază de ipsos", "kg")?.sizes,
    ).toEqual([30]);
    expect(
      typicalPackage("Șurub autoforant pentru gips-carton", "buc"),
    ).toEqual({ kind: "box", sizes: [1000, 200] });
    expect(typicalPackage("Profil CW 75", "m")).toEqual({
      kind: "bar",
      sizes: [3],
    });
  });

  test("packs insulation boards by volume, so thicker boards come fewer", () => {
    expect(typicalPackage("Polistiren expandat EPS 80, 10 cm", "mp")).toEqual({
      kind: "pack",
      sizes: [5],
    });
    expect(typicalPackage("Polistiren expandat EPS 80, 15 cm", "mp")).toEqual({
      kind: "pack",
      sizes: [3.33],
    });
    expect(
      typicalPackage("Vată minerală de sticlă, 5 cm", "mp")?.sizes,
    ).toEqual([18]);
    // Without a thickness there is no telling.
    expect(typicalPackage("Polistiren expandat", "mp")).toBeNull();
  });

  test("matches on the unit too, and knows no package for bulk", () => {
    expect(typicalPackage("Adeziv flexibil C2TE", "mp")).toBeNull();
    expect(typicalPackage("Beton C16/20", "mc")).toBeNull();
    expect(typicalPackage("Nisip", "mc")).toBeNull();
  });
});

test("thicknessOf reads centimetres and millimetres", () => {
  expect(thicknessOf("EPS 80, 10 cm")).toBe(0.1);
  expect(thicknessOf("Placă, 12,5 mm")).toBe(0.0125);
  expect(thicknessOf("Vată")).toBeNull();
});

test("cleanSizes keeps up to four positive sizes, largest first", () => {
  expect(cleanSizes([2.5, 15, 15, 0, -1, 8.5, 4, 1])).toEqual([
    15, 8.5, 4, 2.5,
  ]);
});

test("isCountedUnit", () => {
  expect(isCountedUnit("buc")).toBe(true);
  expect(isCountedUnit("bucăți")).toBe(true);
  expect(isCountedUnit("kg")).toBe(false);
});

test("kindFromLabel reads the package from a title, else falls back", () => {
  expect(kindFromLabel("Adeziv Flex, sac 25 kg", "box")).toBe("bag");
  expect(kindFromLabel("Vopsea albă, găleată 15 l", undefined)).toBe("bucket");
  expect(kindFromLabel("Adeziv pentru plăci ceramice 25 kg", "bag")).toBe(
    "bag",
  );
  expect(kindFromLabel(undefined, undefined)).toBe("piece");
});

import { describe, expect, test } from "bun:test";
import { schoolData } from "./sample.helper";
import {
  guessSubchapter,
  placeCategories,
  sheetCategories,
  vatOf,
  worthOf,
} from "./subchapters";
import { buildTree, type Category, type WorkObject } from "./tree";

const object = (name: string, implicit = false): WorkObject => ({
  key: name,
  name,
  implicit,
  categories: [],
});

const category = (name: string, code?: string) =>
  ({ key: name, name, code, items: [] }) as unknown as Category;

describe("guessSubchapter", () => {
  const building = object("Corp A");

  test.each([
    ["Terasamente", "4.1.1"],
    ["Săpături manuale", "4.1.1"],
    ["Amenajări exterioare, alei și împrejmuire", "4.1.1"],
    ["Structură de rezistență", "4.1.2"],
    ["Zidărie portantă", "4.1.2"],
    ["Arhitectură", "4.1.3"],
    ["Pardoseli din beton", "4.1.3"],
    ["Zidării de compartimentare", "4.1.3"],
    ["Demolări", "4.1.3"],
    ["Reabilitare termică", "4.1.3"],
    ["Instalații electrice", "4.1.4"],
    ["Instalații termice", "4.1.4"],
    ["Centrală termică", "4.1.4"],
    ["Armături sanitare", "4.1.4"],
    ["Gazon și plantări", "4.1.1"],
    ["Montaj utilaje", "4.2"],
    ["Utilaje și echipamente tehnologice", "4.3"],
    ["Echipamente fără montaj", "4.4"],
    ["Dotări", "4.5"],
    ["Mobilier", "4.5"],
    ["Licențe software", "4.6"],
    ["Organizare de șantier", "5.1.1"],
    ["Branșamente utilități", "2"],
    ["Amenajarea terenului", "1.2"],
    ["Devierea rețelelor", "1.4"],
    ["Lucrări diverse", "4.1.3"],
  ])("places %s under %s", (name, expected) => {
    expect<string>(guessSubchapter(building, category(name))).toBe(expected);
  });

  test("takes a category's code when it is a subchapter's", () => {
    expect(guessSubchapter(building, category("Diverse", "4.1.4"))).toBe(
      "4.1.4",
    );
    expect(guessSubchapter(building, category("Diverse", "02"))).toBe("4.1.3");
  });

  test("places everything in an object outside the base investment with it", () => {
    const site = object("Organizare de șantier");
    expect(guessSubchapter(site, category("Instalații electrice"))).toBe(
      "5.1.1",
    );
    expect(
      guessSubchapter(object("Obiect 03 – Utilități"), category("Rețea apă")),
    ).toBe("2");
  });

  test("falls back on a named object's name, not on the Deviz's title", () => {
    expect(
      guessSubchapter(object("Instalații exterioare"), category("Lot 1")),
    ).toBe("4.1.4");
    expect(
      guessSubchapter(
        object("Organizarea șantierului", true),
        category("Lot 1"),
      ),
    ).toBe("4.1.3");
  });
});

describe("placing a Deviz's categories", () => {
  test("guesses the made-up school's categories", () => {
    expect(
      sheetCategories(schoolData()).map((entry) => [
        entry.name,
        entry.object.name,
        entry.guess,
      ]),
    ).toEqual([
      ["Branșamente utilități", "Lucrări generale", "2"],
      ["Terasamente", "01 Corp școală", "4.1.1"],
      ["Structură de rezistență", "01 Corp școală", "4.1.2"],
      ["Arhitectură", "01 Corp școală", "4.1.3"],
      ["Instalații electrice", "01 Corp școală", "4.1.4"],
      ["Utilaje și echipamente tehnologice", "01 Corp școală", "4.3"],
      ["Dotări", "01 Corp școală", "4.5"],
      ["Construcții provizorii", "02 Organizare de șantier", "5.1.1"],
    ]);
  });

  test("keeps the person's choice over the guess", () => {
    const tree = buildTree(schoolData());
    const placed = placeCategories(tree, {
      subchapters: { boiler: "4.1.4", furniture: "not a subchapter" as never },
    });
    const of = (key: string) =>
      placed.find((entry) => entry.category.key === key)?.subchapter;
    expect(of("boiler")).toBe("4.1.4");
    expect(of("furniture")).toBe("4.5");
  });

  test("adds values in bani and VAT on each object's subchapter", () => {
    const placed = placeCategories(buildTree(schoolData()), {});
    const buildings = ["4.1.1", "4.1.2", "4.1.3", "4.1.4"] as const;
    const parts = buildings.map((one) => worthOf(placed, [one]));
    expect(worthOf(placed, buildings)).toBe(
      Math.round(parts.reduce((sum, part) => sum + part * 100, 0)) / 100,
    );
    const vats = buildings.map((one) => vatOf(placed, [one], 21));
    expect(vatOf(placed, buildings, 21)).toBe(
      Math.round(vats.reduce((sum, vat) => sum + vat * 100, 0)) / 100,
    );
    expect(vatOf(placed, ["4.6"], 21)).toBe(0);
  });
});

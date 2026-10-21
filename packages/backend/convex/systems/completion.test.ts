import { describe, expect, test } from "bun:test";
import {
  type ProducerSystem,
  perimeterOf,
  restOfSystems,
  type SystemItem,
  suitableSystems,
  unsuitableFindings,
} from "./completion";
import { contextsOf } from "./contexts";

function item(
  _id: string,
  title: string,
  fields: Partial<SystemItem> = {},
): SystemItem {
  return {
    _id,
    title,
    code: fields.baseCode ?? "—",
    resources: [],
    productIds: [],
    ...fields,
  };
}

function rest(
  items: SystemItem[],
  systems: ProducerSystem[] = [],
  sections: { _id: string; name: string }[] = [],
) {
  const contexts = contextsOf({ estimateTitle: "Renovare", sections, items });
  return restOfSystems(items, contexts, systems).map((suggestion) => ({
    key: suggestion.key,
    lineItemIds: suggestion.lineItemIds,
  }));
}

// A made-up producer's floor system.
const floorSystem: ProducerSystem = {
  _id: "system",
  name: "Sistem de pardoseală Exemplu",
  producer: "Producător Exemplu",
  normLineageIds: ["primer", "adhesive", "grout"],
  productIds: ["product"],
  suitable: ["wet"],
  unsuitable: ["floor_heating"],
};

describe("restOfSystems", () => {
  test("completes Devize's own systems", () => {
    expect(
      rest([item("floor", "Pardoseală din gresie", { baseCode: "DV-PRD-03" })]),
    ).toEqual([{ key: "rest:base:DV-PRD-04", lineItemIds: ["floor"] }]);
  });

  test("asks for the waterproofing, not the skirting, in a bathroom", () => {
    const sections = [{ _id: "baie", name: "Baie" }];
    expect(
      rest(
        [
          item("floor", "Pardoseală din gresie", {
            baseCode: "DV-PRD-03",
            sectionId: "baie",
          }),
          item("wall", "Placaj din faianță pe pereți", {
            baseCode: "DV-PLC-01",
            sectionId: "baie",
          }),
        ],
        [],
        sections,
      ),
    ).toEqual([
      // Once, for the floor and the walls.
      { key: "rest:base:DV-HDR-03", lineItemIds: ["floor", "wall"] },
      { key: "rest:base:DV-PLC-02", lineItemIds: ["wall"] },
    ]);
  });

  test("leaves out a part another Articol already does", () => {
    expect(
      rest([
        item("floor", "Pardoseală din gresie", { baseCode: "DV-PRD-03" }),
        item("skirting", "Plintă din gresie, montată de noi"),
        item("drywall", "Perete din gips-carton", { baseCode: "DV-GIP-01" }),
        item("paint", "Zugrăveli lavabile", { baseCode: "DV-ZUG-01" }),
      ]),
    ).toEqual([{ key: "rest:base:DV-TEN-04", lineItemIds: ["drywall"] }]);
  });

  test("completes a producer's system, started by a norm or a product", () => {
    expect(
      rest([item("a", "Grund", { lineageId: "primer" })], [floorSystem]),
    ).toEqual([
      { key: "rest:norm:adhesive", lineItemIds: ["a"] },
      { key: "rest:norm:grout", lineItemIds: ["a"] },
    ]);
    expect(
      rest(
        [
          item("a", "Adeziv", { productIds: ["product"] }),
          item("b", "Chit", { lineageId: "grout" }),
        ],
        [floorSystem],
      ),
    ).toEqual([
      { key: "rest:norm:primer", lineItemIds: ["a", "b"] },
      { key: "rest:norm:adhesive", lineItemIds: ["a", "b"] },
    ]);
  });
});

test("unsuitableFindings says where a producer's system doesn't belong", () => {
  const items = [
    item("a", "Adeziv pe încălzire în pardoseală", { lineageId: "adhesive" }),
    item("b", "Adeziv în baie", { lineageId: "adhesive" }),
  ];
  const contexts = contextsOf({
    estimateTitle: "Renovare",
    sections: [],
    items,
  });
  expect(
    unsuitableFindings(items, contexts, [floorSystem]).map((finding) => ({
      lineItemId: finding.lineItemId,
      severity: finding.severity,
      context: finding.context,
    })),
  ).toEqual([
    { lineItemId: "a", severity: "error", context: "floor_heating" },
    // Read from the other Articol: only worth checking.
    { lineItemId: "b", severity: "warning", context: "floor_heating" },
  ]);
});

test("suitableSystems orders by producer, then name, for no money", () => {
  const systems = [
    { ...floorSystem, _id: "b", name: "B", producer: "Zeta" },
    { ...floorSystem, _id: "a", name: "A", producer: "Ălfa" },
    { ...floorSystem, _id: "c", name: "C", producer: "Beta", suitable: [] },
  ];
  expect(suitableSystems(systems, "wet").map((system) => system._id)).toEqual([
    "a",
    "b",
  ]);
});

test("perimeterOf measures around the floors", () => {
  expect(
    perimeterOf([
      { count: 1, length: 4, width: 3, deduct: false },
      { count: 2, length: 3, width: 2.5, deduct: false },
      { count: 1, length: 1, width: 1, deduct: true },
    ]),
  ).toBe(36);
  // Walls measured in height aren't floors.
  expect(
    perimeterOf([{ count: 1, length: 4, height: 2.6, deduct: false }]),
  ).toBeNull();
  expect(perimeterOf([])).toBeNull();
});

import { describe, expect, test } from "bun:test";
import {
  baseResources,
  coveringsOf,
  hintedMethod,
  isStale,
  layResources,
  presetFor,
  startingResources,
} from "./layout";

// A made-up floor tiling Articol, per mp.
const floor = {
  unit: "mp",
  resources: [
    {
      key: "gresie",
      kind: "material",
      name: "Gresie porțelanată",
      unit: "mp",
      quantity: 1.06,
    },
    {
      key: "adeziv",
      kind: "material",
      name: "Adeziv flexibil C2TE",
      unit: "kg",
      quantity: 5.5,
    },
    {
      key: "folie",
      kind: "material",
      name: "Folie de polietilenă",
      unit: "mp",
      quantity: 1.1,
    },
    {
      key: "faiantar",
      kind: "labor",
      name: "Faianțar",
      unit: "ora",
      quantity: 0.85,
    },
    {
      key: "masina",
      kind: "equipment",
      name: "Mașină de tăiat plăci",
      unit: "ora",
      quantity: 0.06,
    },
  ],
};

describe("coveringsOf", () => {
  test("finds the covering and the losses its norm includes", () => {
    expect(coveringsOf(floor)).toEqual({
      family: "tiles",
      coverings: [
        { key: "gresie", name: "Gresie porțelanată", layers: 1, loss: 0.06 },
      ],
    });
  });

  test("counts the layers of boards on two faces", () => {
    const partition = {
      unit: "mp",
      resources: [
        {
          key: "placa",
          kind: "material",
          name: "Placă de gips-carton, 12,5 mm",
          unit: "mp",
          quantity: 2.1,
        },
      ],
    };
    expect(coveringsOf(partition)?.coverings[0]).toEqual({
      key: "placa",
      name: "Placă de gips-carton, 12,5 mm",
      layers: 2,
      loss: 0.05,
    });
  });

  test("leaves out works with no covering, or not counted in mp", () => {
    expect(coveringsOf({ ...floor, unit: "m" })).toBeNull();
    expect(
      coveringsOf({
        unit: "mp",
        resources: [
          {
            key: "vopsea",
            kind: "material",
            name: "Vopsea lavabilă",
            unit: "l",
            quantity: 0.3,
          },
        ],
      }),
    ).toBeNull();
  });
});

describe("layResources", () => {
  const found = coveringsOf(floor);
  if (!found) {
    throw new Error("no covering");
  }

  test("lays diagonally: the method's losses and extra labour", () => {
    const preset = presetFor("diagonal", found.family, found.coverings);
    expect(preset).toEqual({ method: "diagonal", waste: 15, labor: 25 });
    const laid = layResources(floor.resources, found.coverings, preset);
    expect(laid.resources.map((r) => r.quantity)).toEqual([
      1.15, 5.5, 1.1, 1.0625, 0.06,
    ]);
    expect(laid.base).toEqual([
      { key: "gresie", quantity: 1.06 },
      { key: "faiantar", quantity: 0.85 },
    ]);
  });

  test("never lowers the losses a norm already has", () => {
    const generous = coveringsOf({
      unit: "mp",
      resources: [{ ...floor.resources[0], quantity: 1.18 } as never],
    });
    expect(
      presetFor("diagonal", "tiles", generous?.coverings ?? []).waste,
    ).toBe(18);
  });

  test("starts every method from the consumptions before any", () => {
    const laid = layResources(floor.resources, found.coverings, {
      method: "diagonal",
      waste: 15,
      labor: 25,
    });
    const layout = {
      method: "diagonal" as const,
      waste: 15,
      labor: 25,
      base: laid.base,
    };
    const base = baseResources(laid.resources, layout);
    expect(base.map((r) => r.quantity)).toEqual(
      floor.resources.map((r) => r.quantity),
    );
    const again = layResources(base, found.coverings, {
      method: "herringbone",
      waste: 20,
      labor: 50,
    });
    expect(again.resources[0]?.quantity).toBe(1.2);
    expect(again.resources[3]?.quantity).toBe(1.275);
  });

  test("goes stale when a consumption changes, and starts again from it", () => {
    const laid = layResources(floor.resources, found.coverings, {
      method: "diagonal",
      waste: 15,
      labor: 25,
    });
    const layout = {
      method: "diagonal" as const,
      waste: 15,
      labor: 25,
      base: laid.base,
    };
    expect(isStale(laid.resources, layout, floor)).toBe(false);
    // A newer norm puts back 1,07 mp of tiles.
    const changed = laid.resources.map((r) =>
      r.key === "gresie" ? { ...r, quantity: 1.07 } : r,
    );
    expect(isStale(changed, layout, floor)).toBe(true);
    const start = startingResources(changed, layout, floor);
    expect(start.map((r) => r.quantity)).toEqual([1.07, 5.5, 1.1, 0.85, 0.06]);
  });
});

test("hintedMethod reads the method from the Articol's words", () => {
  expect(hintedMethod("Gresie 60 × 60 montată pe diagonală", "tiles")).toBe(
    "diagonal",
  );
  expect(hintedMethod("Parchet în spic", "planks")).toBe("herringbone");
  expect(hintedMethod("Placaj decalat 1/2", "tiles")).toBe("offset");
  // Planks are always staggered: "decalat" is no method of theirs.
  expect(hintedMethod("Parchet decalat", "planks")).toBeNull();
  expect(hintedMethod("Gips-carton la mansardă", "boards")).toBe("complex");
  expect(hintedMethod("Gresie în baie", "tiles")).toBeNull();
});

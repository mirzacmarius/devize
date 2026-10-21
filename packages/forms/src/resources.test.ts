import { describe, expect, test } from "bun:test";
import { lineTotals } from "@devize/backend/convex/estimates/recap";
import { resourceList, resourceLists } from "./resources";
import { lineItem, sampleData } from "./sample.helper";

describe("resourceList", () => {
  test("sums a resource over line items, one line per price", () => {
    const { lineItems } = sampleData();
    const labor = resourceList(lineItems, "labor");
    const unskilled = labor.lines.find(
      (line) => line.name === "Muncitor necalificat",
    );
    // 42,5 mp × 0,35 h and 60 mp × 0,05 h, both at 30 lei.
    expect(unskilled).toEqual({
      name: "Muncitor necalificat",
      unit: "ora",
      quantity: 17.875,
      unitPrice: 30,
      value: 536.25,
      store: undefined,
    });
    expect(labor.lines.map((line) => line.name)).toEqual([
      "Faianțar",
      "Izolator",
      "Muncitor necalificat",
      "Zugrav",
    ]);
  });

  test("names the store every price came from", () => {
    const materials = resourceList(sampleData().lineItems, "material");
    const stores = new Map(
      materials.lines.map((line) => [line.name, line.store]),
    );
    expect(stores.get("Gresie porțelanată 60x60")).toBe("Dedeman");
    expect(stores.get("Adeziv flexibil C2TE")).toBe("Leroy Merlin");
    expect(stores.get("Amorsă")).toBe("BRICO");
    expect(stores.get("Amorsă bituminoasă")).toBeUndefined();
  });

  test("turns a percentage into lei and lists it last", () => {
    const materials = resourceList(sampleData().lineItems, "material");
    const last = materials.lines.at(-1);
    // 2% of the tiling's materials, (1,05 × 64,9 + 4,5 × 2,15 + 0,4 × 6,8)
    // lei per mp, on 18,25 mp.
    expect(last).toEqual({
      name: "Material mărunt (din materiale)",
      unit: "%",
      value: 29.4,
    });
    const transport = resourceList(sampleData().lineItems, "transport");
    expect(transport.lines.map((line) => line.name)).toEqual([
      "Transport materiale (din materiale)",
    ]);
  });

  test("adds up to the lists of quantities, rounding included", () => {
    const { lineItems } = sampleData();
    for (const list of resourceLists(lineItems)) {
      const expected = lineItems.reduce(
        (bani, item) => bani + Math.round(lineTotals(item)[list.kind] * 100),
        0,
      );
      const listed = list.lines.reduce(
        (bani, line) => bani + Math.round(line.value * 100),
        0,
      );
      expect(Math.round(list.total * 100)).toBe(expected);
      expect(Math.round(list.rounding * 100)).toBe(expected - listed);
    }
  });

  test("keeps a resource bought at two prices on two lines", () => {
    const item = (unitPrice: number) =>
      lineItem({
        code: "X",
        title: "Placare",
        unit: "mp",
        quantity: 10,
        resources: [
          {
            kind: "material",
            productId: "tiles",
            name: "Gresie",
            unit: "mp",
            quantity: 1,
            unitPrice,
          },
        ],
      });
    const list = resourceList([item(50), item(55), item(50)], "material");
    expect(
      list.lines.map((line) => [line.quantity, line.unitPrice, line.value]),
    ).toEqual([
      [20, 50, 1000],
      [10, 55, 550],
    ]);
    expect(list.rounding).toBe(0);
  });
});

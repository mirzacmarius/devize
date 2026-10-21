import { describe, expect, test } from "bun:test";
import { computeRecap } from "@devize/backend/convex/estimates/recap";
import { lineItem, sampleData } from "./sample.helper";
import { buildTree } from "./tree";

const labor = (quantity: number) => ({
  kind: "labor" as const,
  name: "Muncitor",
  unit: "ora",
  quantity,
  unitPrice: 40,
});

describe("buildTree", () => {
  test("puts works outside every object first, then each object's chapters", () => {
    const tree = buildTree(sampleData());
    expect(
      tree.map((object) => [
        object.name,
        object.implicit,
        object.categories.map((category) => category.name),
      ]),
    ).toEqual([
      ["Lucrări generale", true, ["Lucrări diverse"]],
      ["Apartament", false, ["Demolări", "Finisaje"]],
      ["Terasă", false, ["Hidroizolații"]],
    ]);
  });

  test("closes each category on its own items", () => {
    const data = sampleData();
    const tree = buildTree(data);
    const finishes = tree[1]?.categories[1];
    expect(finishes?.items.map((item) => item.code)).toEqual(["FX10", "FX20"]);
    expect(finishes?.recap).toEqual(
      computeRecap(finishes?.items ?? [], data.estimate.markups),
    );
    // Every line item lands in exactly one category.
    const listed = tree.flatMap((object) =>
      object.categories.flatMap((category) => category.items),
    );
    expect(listed).toHaveLength(data.lineItems.length);
  });

  test("names a Deviz without sections after itself", () => {
    const data = sampleData();
    data.sections = [];
    const tree = buildTree(data);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Renovare apartament");
    expect(tree[0]?.categories.map((category) => category.name)).toEqual([
      "Renovare apartament",
    ]);
    expect(tree[0]?.categories[0]?.items).toHaveLength(5);
  });

  test("treats items of a deleted section as loose and skips empty chapters", () => {
    const data = sampleData();
    data.sections = [
      {
        _id: "walls",
        kind: "chapter",
        code: "05",
        name: "Pereți",
        position: 1,
      },
      { _id: "empty", kind: "chapter", name: "Gol", position: 2 },
    ];
    data.lineItems = [
      lineItem({
        sectionId: "walls",
        code: "A",
        title: "Zidărie",
        unit: "mp",
        quantity: 2,
        resources: [labor(1)],
      }),
      lineItem({
        sectionId: "gone",
        code: "B",
        title: "Tencuială",
        unit: "mp",
        quantity: 3,
        resources: [labor(0.5)],
      }),
    ];
    const tree = buildTree(data);
    expect(tree).toHaveLength(1);
    expect(
      tree[0]?.categories.map((category) => [
        category.name,
        category.items.map((item) => item.code),
      ]),
    ).toEqual([
      ["Lucrări diverse", ["B"]],
      ["Pereți", ["A"]],
    ]);
  });
});

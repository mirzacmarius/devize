import { describe, expect, test } from "bun:test";
import type { Id } from "../_generated/dataModel";
import { type DiffLine, diffLines } from "./diff";

// Made-up articles; ids are only labels here.
function line(
  id: string,
  fields: Partial<Omit<DiffLine, "_id" | "originId">> & { originId?: string },
): DiffLine {
  return {
    _id: id as Id<"lineItems">,
    originId: fields.originId as Id<"lineItems"> | undefined,
    code: fields.code ?? "DV-FAI-01",
    title: fields.title ?? "Placare cu faianță pe pereți",
    unit: fields.unit ?? "mp",
    quantity: fields.quantity ?? 10,
    unitCost: fields.unitCost ?? {
      material: 50,
      labor: 30,
      equipment: 0,
      transport: 0,
    },
    laborHours: fields.laborHours ?? 1,
    section: fields.section,
  };
}

describe("comparing two revisions' articles", () => {
  test("pairs an article with the one it was copied from, whatever changed", () => {
    const before = [line("a1", {})];
    const after = [
      line("b1", {
        originId: "a1",
        title: "Placare cu faianță, format mare",
        quantity: 12,
        unitCost: { material: 55, labor: 30, equipment: 0, transport: 0 },
      }),
    ];
    const diff = diffLines(before, after);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([
      {
        _id: "b1" as Id<"lineItems">,
        before: {
          code: "DV-FAI-01",
          title: "Placare cu faianță pe pereți",
          unit: "mp",
          quantity: 10,
          unitPrice: 80,
          total: 800,
          section: undefined,
        },
        after: {
          code: "DV-FAI-01",
          title: "Placare cu faianță, format mare",
          unit: "mp",
          quantity: 12,
          unitPrice: 85,
          total: 1020,
          section: undefined,
        },
        fields: ["title", "quantity", "price"],
        difference: 220,
      },
    ]);
  });

  test("tells added, removed and unchanged articles apart", () => {
    const before = [
      line("a1", {}),
      line("a2", { code: "DV-TEN-01", title: "Tencuială", quantity: 30 }),
    ];
    const after = [
      line("b1", { originId: "a1" }),
      line("b3", {
        code: "—",
        title: "Tavan fals din gips-carton",
        quantity: 6,
        unitCost: { material: 31.5, labor: 32, equipment: 0, transport: 0 },
      }),
    ];
    const diff = diffLines(before, after);
    expect(diff.unchanged).toBe(1);
    expect(diff.changed).toEqual([]);
    expect(
      diff.added.map((change) => [String(change._id), change.difference]),
    ).toEqual([["b3", 381]]);
    expect(
      diff.removed.map((change) => [String(change._id), change.difference]),
    ).toEqual([["a2", -2400]]);
  });

  test("pairs revisions made before articles remembered their origin by code, unit and words", () => {
    const before = [
      line("a1", { code: "DV-FAI-01" }),
      line("a2", { code: "DV-GRE-01", title: "Gresie pe pardoseală" }),
    ];
    // In another order, with a price changed and a title reworded.
    const after = [
      line("b2", {
        code: "DV-GRE-01",
        title: "Gresie pe pardoseală",
        quantity: 14,
      }),
      line("b1", { code: "DV-FAI-01", title: "Faianță în baie" }),
    ];
    const diff = diffLines(before, after);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(
      diff.changed.map((change) => [String(change._id), change.fields]),
    ).toEqual([
      ["b2", ["quantity"]],
      ["b1", ["title"]],
    ]);
  });

  test("pairs a custom article only by its words, never by the dash it has for a code", () => {
    const before = [
      line("a1", { code: "—", title: "Curățenie finală", unit: "buc" }),
    ];
    const after = [
      line("b1", { code: "—", title: "Transport moloz", unit: "buc" }),
      line("b2", {
        code: "—",
        title: "Curățenie finală",
        unit: "buc",
        quantity: 2,
      }),
    ];
    const diff = diffLines(before, after);
    expect(diff.changed.map((change) => String(change._id))).toEqual(["b2"]);
    expect(diff.added.map((change) => String(change._id))).toEqual(["b1"]);
    expect(diff.removed).toEqual([]);
  });

  test("pairs the same article twice over one to one, in order", () => {
    const before = [
      line("a1", { quantity: 10, section: "Baie" }),
      line("a2", { quantity: 20, section: "Bucătărie" }),
    ];
    const after = [
      line("b1", { quantity: 10, section: "Baie" }),
      line("b2", { quantity: 25, section: "Bucătărie" }),
      line("b3", { quantity: 5, section: "Hol" }),
    ];
    const diff = diffLines(before, after);
    expect(diff.unchanged).toBe(1);
    expect(
      diff.changed.map((change) => [String(change._id), change.after?.section]),
    ).toEqual([["b2", "Bucătărie"]]);
    expect(diff.added.map((change) => String(change._id))).toEqual(["b3"]);
  });

  test("pairs by origin alone, even when nothing else is alike", () => {
    const before = [
      line("a1", { code: "—", title: "Curățenie finală", unit: "buc" }),
    ];
    const after = [
      line("b1", {
        originId: "a1",
        code: "—",
        title: "Curățenie după lucrări",
        unit: "ora",
      }),
    ];
    const diff = diffLines(before, after);
    expect(
      diff.changed.map((change) => [String(change._id), change.fields]),
    ).toEqual([["b1", ["title", "unit"]]]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  test("never pairs two custom articles by their dash alone", () => {
    const before = [
      line("a1", { code: "—", title: "Curățenie finală", unit: "buc" }),
    ];
    const after = [
      line("b1", { code: "—", title: "Transport moloz", unit: "buc" }),
    ];
    const diff = diffLines(before, after);
    expect(diff.changed).toEqual([]);
    expect(diff.added.map((change) => String(change._id))).toEqual(["b1"]);
    expect(diff.removed.map((change) => String(change._id))).toEqual(["a1"]);
  });

  test("doesn't guess pairs for revisions that remember their origin", () => {
    const before = [
      line("a1", { quantity: 30, section: "Living" }),
      line("a2", { quantity: 40, section: "Dormitor" }),
    ];
    // The bedroom's tiles were taken out and the hall's added: the same
    // article, but not the same work.
    const after = [
      line("b1", { originId: "a1", quantity: 30, section: "Living" }),
      line("b3", { quantity: 15, section: "Hol" }),
    ];
    const diff = diffLines(before, after);
    expect(diff.unchanged).toBe(1);
    expect(diff.changed).toEqual([]);
    expect(diff.added.map((change) => String(change._id))).toEqual(["b3"]);
    expect(diff.removed.map((change) => String(change._id))).toEqual(["a2"]);
  });

  test("pairs an article in the same Capitol before one elsewhere", () => {
    const before = [
      line("a1", { quantity: 10, section: "Baie" }),
      line("a2", { quantity: 20, section: "Bucătărie" }),
    ];
    const after = [line("b2", { quantity: 20, section: "Bucătărie" })];
    const diff = diffLines(before, after);
    expect(diff.unchanged).toBe(1);
    expect(diff.changed).toEqual([]);
    expect(diff.added).toEqual([]);
    expect(diff.removed.map((change) => String(change._id))).toEqual(["a1"]);
  });

  test("ignores differences the forms don't print", () => {
    const before = [line("a1", { quantity: 10.0001 })];
    const after = [
      line("b1", {
        originId: "a1",
        quantity: 10,
        title: " Placare cu faianță pe pereți ",
      }),
    ];
    expect(diffLines(before, after)).toEqual({
      added: [],
      removed: [],
      changed: [],
      unchanged: 1,
    });
  });
});

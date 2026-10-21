import { describe, expect, test } from "bun:test";
import { groupLines } from "./groups";

const item = (id: string, total: number, sectionId?: string) => ({
  _id: id,
  sectionId,
  totals: { total },
});

describe("groupLines", () => {
  test("numbers loose items first, then each section with its chapters", () => {
    const groups = groupLines(
      [
        { _id: "obj", kind: "object" as const },
        { _id: "cap1", kind: "chapter" as const, parentId: "obj" },
        { _id: "cap2", kind: "chapter" as const },
      ],
      [
        item("a", 10, "cap2"),
        item("b", 0.1, "cap1"),
        item("c", 5),
        item("d", 0.2, "cap1"),
        item("e", 1, "obj"),
      ],
    );
    expect(groups.loose.map(({ item, index }) => [item._id, index])).toEqual([
      ["c", 1],
    ]);
    expect(groups.sections.map((group) => group.section._id)).toEqual([
      "obj",
      "cap2",
    ]);
    const [object, chapter] = groups.sections;
    expect(object?.items.map(({ index }) => index)).toEqual([2]);
    expect(object?.chapters[0]?.items.map(({ index }) => index)).toEqual([
      3, 4,
    ]);
    expect(chapter?.items.map(({ index }) => index)).toEqual([5]);
    // 0,1 + 0,2 adds up in bani, without float noise.
    expect(object?.chapters[0]?.total).toBe(0.3);
    expect(object?.total).toBe(1.3);
    expect(chapter?.total).toBe(10);
  });

  test("keeps items and chapters whose section is gone", () => {
    const groups = groupLines(
      [{ _id: "cap", kind: "chapter" as const, parentId: "gone" }],
      [item("a", 1, "missing"), item("b", 2, "cap")],
    );
    expect(groups.loose.map(({ item }) => item._id)).toEqual(["a"]);
    expect(groups.sections.map((group) => group.section._id)).toEqual(["cap"]);
    expect(groups.sections[0]?.items[0]?.index).toBe(2);
  });
});

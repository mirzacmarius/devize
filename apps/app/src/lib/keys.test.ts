import { describe, expect, it } from "bun:test";
import { uniqueKeys } from "./keys";

describe("uniqueKeys", () => {
  it("keeps distinct keys and numbers repeats", () => {
    expect(uniqueKeys(["a", "b", "a", "a"], (item) => item)).toEqual([
      "a",
      "b",
      "a#1",
      "a#2",
    ]);
  });
});

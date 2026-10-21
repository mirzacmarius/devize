import { describe, expect, test } from "bun:test";
import { initials } from "./initials";

describe("initials", () => {
  test("takes the first letters of the first two words", () => {
    expect(initials("Andrei Pop")).toBe("AP");
    expect(initials("  Maria   Ionescu Popa ")).toBe("MI");
  });

  test("takes two letters of a single word or username", () => {
    expect(initials("ionpopescu")).toBe("IO");
    expect(initials("ion.popescu")).toBe("IP");
  });

  test("keeps Romanian letters", () => {
    expect(initials("ștefan țurcanu")).toBe("ȘȚ");
  });

  test("is empty for an empty name", () => {
    expect(initials("")).toBe("");
  });
});

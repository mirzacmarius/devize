import { describe, expect, test } from "bun:test";
import { username } from "./validators";

describe("username", () => {
  test("is stored in lower case without surrounding spaces", () => {
    expect(username.parse("  Marius ")).toBe("marius");
  });

  test("counts its length after trimming", () => {
    expect(username.safeParse("  ab  ").success).toBe(false);
    expect(username.safeParse("a".repeat(32)).success).toBe(true);
    expect(username.safeParse("a".repeat(33)).success).toBe(false);
  });

  test("only allows letters and digits", () => {
    expect(username.safeParse("ana-maria").success).toBe(false);
    expect(username.safeParse("ana maria").success).toBe(false);
    expect(username.safeParse("constructii2026").success).toBe(true);
  });
});

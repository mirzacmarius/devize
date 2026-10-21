import { describe, expect, test } from "bun:test";
import { returnPath, signInPath } from "./return-path";

describe("returnPath", () => {
  test("keeps a path on this site, with its query", () => {
    expect(returnPath("/invite/abc123")).toBe("/invite/abc123");
    expect(returnPath("/catalog?view=own")).toBe("/catalog?view=own");
  });

  test("refuses anything that could lead to another site", () => {
    for (const value of [
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "https://evil.example/invite",
      "javascript:alert(1)",
      "invite/abc",
      "",
      undefined,
      ["/invite/abc"],
    ]) {
      expect(returnPath(value)).toBeUndefined();
    }
  });
});

describe("signInPath", () => {
  test("names the page to come back to, unless it's the home page", () => {
    expect(signInPath("/invite/abc123")).toBe("/login?next=%2Finvite%2Fabc123");
    expect(
      returnPath(new URLSearchParams("next=%2Finvite%2Fabc123").get("next")),
    ).toBe("/invite/abc123");
    expect(signInPath("/")).toBe("/login");
  });
});

import { describe, expect, test } from "bun:test";
import { defaultModel, hasDynamicFiltering, webTools } from "./models";

const limits = { maxUses: 12, maxContentTokens: 30_000 };

describe("webTools", () => {
  test("gives the default model the web tools with dynamic filtering", () => {
    expect(hasDynamicFiltering(defaultModel)).toBe(true);
    expect(webTools(defaultModel, limits)).toEqual([
      { type: "web_search_20260209", name: "web_search", max_uses: 12 },
      {
        type: "web_fetch_20260209",
        name: "web_fetch",
        max_uses: 12,
        max_content_tokens: 30_000,
      },
    ]);
  });

  test("gives other models, such as Haiku, the basic versions", () => {
    expect(hasDynamicFiltering("claude-haiku-5-5")).toBe(false);
    expect(hasDynamicFiltering("claude-opus-4-1")).toBe(false);
    expect(
      webTools("claude-haiku-5-5", limits).map((tool) => tool.type),
    ).toEqual(["web_search_20250305", "web_fetch_20250910"]);
  });

  test("matches a model with or without a version after its name", () => {
    expect(hasDynamicFiltering("claude-opus-5")).toBe(true);
    expect(hasDynamicFiltering("claude-sonnet-5-5")).toBe(true);
    expect(hasDynamicFiltering("claude-sonnet-4-6-20260101")).toBe(true);
    expect(hasDynamicFiltering("claude-sonnet-4-60")).toBe(false);
  });

  test("sends no location, which the search provider rejects for Romania", () => {
    for (const model of [defaultModel, "claude-haiku-5-5"]) {
      for (const tool of webTools(model, limits)) {
        expect(tool).not.toHaveProperty("user_location");
      }
    }
  });
});

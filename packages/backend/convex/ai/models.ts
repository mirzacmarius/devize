import type Anthropic from "@anthropic-ai/sdk";
import { env } from "../_generated/server";

export const defaultModel = "claude-opus-5-5";

/**
 * The model for new AI jobs. AI_MODEL in the deployment's environment
 * overrides it, for example with a smaller model to spend less.
 */
export function aiModel(): string {
  return env.AI_MODEL?.trim() || defaultModel;
}

// Models whose web tools filter results with code before reading them
// (dynamic filtering). A name matches with or without a version after it,
// so "claude-opus-5" covers claude-opus-5-5 too.
const dynamicFilteringModels = [
  "claude-opus-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
];

export function hasDynamicFiltering(model: string): boolean {
  return dynamicFilteringModels.some(
    (name) => model === name || model.startsWith(`${name}-`),
  );
}

/**
 * Web search and web fetch for a request to `model`: the versions with
 * dynamic filtering where the model has them, the basic ones otherwise (a
 * Haiku set in AI_MODEL, for one). They carry no user_location, because the
 * search provider rejects Romania as a country; the prompts ask for Romanian
 * sources instead.
 */
export function webTools(
  model: string,
  limits: { maxUses: number; maxContentTokens: number },
): Anthropic.ToolUnion[] {
  const fetchLimits = {
    max_uses: limits.maxUses,
    max_content_tokens: limits.maxContentTokens,
  };
  return hasDynamicFiltering(model)
    ? [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: limits.maxUses,
        },
        { type: "web_fetch_20260209", name: "web_fetch", ...fetchLimits },
      ]
    : [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: limits.maxUses,
        },
        { type: "web_fetch_20250910", name: "web_fetch", ...fetchLimits },
      ];
}

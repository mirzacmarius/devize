import type { Infer } from "convex/values";
import type { aiUsage } from "./validators";

export type AiUsage = Infer<typeof aiUsage>;

export const emptyUsage: AiUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  webSearches: 0,
  webFetches: 0,
};

export function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    webSearches: a.webSearches + b.webSearches,
    webFetches: a.webFetches + b.webFetches,
  };
}

// Anthropic list prices in USD per million tokens (October 2026). Cache
// writes use the 5-minute TTL, 1.25 times the input price.
const pricesPerMillion: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-sonnet-5-5": {
    input: 2,
    output: 10,
    cacheWrite: 2.5,
    cacheRead: 0.2,
  },
};

// Web search is billed per search; web fetch only through its tokens.
const webSearchUsd = 10 / 1000;

/** List-price cost of `usage` on `model`, or undefined for an unknown model. */
export function costUsd(model: string, usage: AiUsage): number | undefined {
  const price = pricesPerMillion[model];
  if (!price) {
    return undefined;
  }
  const tokens =
    usage.inputTokens * price.input +
    usage.outputTokens * price.output +
    usage.cacheWriteTokens * price.cacheWrite +
    usage.cacheReadTokens * price.cacheRead;
  return tokens / 1_000_000 + usage.webSearches * webSearchUsd;
}

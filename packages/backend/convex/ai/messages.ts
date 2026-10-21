import type Anthropic from "@anthropic-ai/sdk";
import type { AiUsage } from "./pricing";

// Reading Claude API responses: what they cost and what the server tools saw.

export function usageOf(message: Anthropic.Message): AiUsage {
  const { usage } = message;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    webSearches: usage.server_tool_use?.web_search_requests ?? 0,
    webFetches: usage.server_tool_use?.web_fetch_requests ?? 0,
  };
}

/**
 * The answer at the end of a turn: the text after the last tool call of the
 * last response. A turn cut short has no such text, so all its text is used.
 */
export function finalText(messages: Anthropic.Message[]): string {
  const last = messages[messages.length - 1]?.content ?? [];
  let lastTool = -1;
  last.forEach((block, index) => {
    if (block.type !== "text") {
      lastTool = index;
    }
  });
  const answer = last
    .slice(lastTool + 1)
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (answer) {
    return answer;
  }
  return messages
    .flatMap((message) => message.content)
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

export type WebSource = { url: string; title?: string };

/**
 * The pages a turn with web search and web fetch saw: every search result,
 * fetched page and cited source, plus the text it read (fetched pages, cited
 * passages and the output of the code that filtered them). The model's own
 * words are not included, so a claim can be checked against them.
 */
export function webEvidence(messages: Anthropic.Message[]): {
  sources: WebSource[];
  texts: string[];
} {
  const sources = new Map<string, WebSource>();
  const texts: string[] = [];
  const addSource = (url: string, title?: string | null) => {
    const existing = sources.get(url);
    if (!existing) {
      sources.set(url, title ? { url, title } : { url });
    } else if (!existing.title && title) {
      existing.title = title;
    }
  };
  for (const block of messages.flatMap((message) => message.content)) {
    switch (block.type) {
      case "web_search_tool_result":
        if (Array.isArray(block.content)) {
          for (const result of block.content) {
            addSource(result.url, result.title);
          }
        }
        break;
      case "web_fetch_tool_result":
        if (block.content.type === "web_fetch_result") {
          const document = block.content.content;
          addSource(block.content.url, document.title);
          if (document.source.type === "text") {
            texts.push(document.source.data);
          }
        }
        break;
      case "code_execution_tool_result":
        if (block.content.type === "code_execution_result") {
          texts.push(block.content.stdout);
        }
        break;
      case "bash_code_execution_tool_result":
        if (block.content.type === "bash_code_execution_result") {
          texts.push(block.content.stdout);
        }
        break;
      case "text":
        for (const citation of block.citations ?? []) {
          if (citation.type === "web_search_result_location") {
            addSource(citation.url, citation.title);
          }
          texts.push(citation.cited_text);
        }
        break;
    }
  }
  return { sources: [...sources.values()], texts };
}

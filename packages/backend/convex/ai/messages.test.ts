import { describe, expect, test } from "bun:test";
import type Anthropic from "@anthropic-ai/sdk";
import { finalText, usageOf, webEvidence } from "./messages";

// Responses shaped like the API's, cut down to the fields the helpers read.
function message(content: unknown[], usage: Partial<Anthropic.Usage> = {}) {
  return {
    content,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      server_tool_use: null,
      ...usage,
    },
  } as unknown as Anthropic.Message;
}

const research = [
  message(
    [
      { type: "text", text: "Caut site-ul.", citations: null },
      { type: "server_tool_use", id: "s1", name: "web_search", input: {} },
      {
        type: "web_search_tool_result",
        tool_use_id: "s1",
        content: [
          {
            type: "web_search_result",
            url: "https://exemplu.test/",
            title: "Exemplu",
            encrypted_content: "",
            page_age: null,
          },
        ],
      },
      {
        type: "web_fetch_tool_result",
        tool_use_id: "f1",
        content: {
          type: "web_fetch_result",
          url: "https://exemplu.test/contact",
          retrieved_at: null,
          content: {
            type: "document",
            title: "Contact",
            citations: null,
            source: {
              type: "text",
              media_type: "text/plain",
              data: "Scrieți la office@exemplu.test",
            },
          },
        },
      },
      {
        type: "web_fetch_tool_result",
        tool_use_id: "f2",
        content: {
          type: "web_fetch_tool_result_error",
          error_code: "url_not_accessible",
        },
      },
    ],
    {
      input_tokens: 1000,
      output_tokens: 200,
      cache_read_input_tokens: 50,
      server_tool_use: { web_search_requests: 1, web_fetch_requests: 2 },
    },
  ),
  message([
    {
      type: "bash_code_execution_tool_result",
      tool_use_id: "c1",
      content: {
        type: "bash_code_execution_result",
        stdout: "tehnic@exemplu.test",
        stderr: "",
        return_code: 0,
        content: [],
      },
    },
    { type: "text", text: "Raportul: ", citations: null },
    {
      type: "text",
      text: "normele sunt publice",
      citations: [
        {
          type: "web_search_result_location",
          url: "https://exemplu.test/norme.pdf",
          title: "Norme",
          cited_text: "Norme de deviz, ediția 2019",
          encrypted_index: "",
        },
      ],
    },
    { type: "text", text: ".", citations: null },
  ]),
];

describe("usageOf", () => {
  test("maps the API's usage, with missing counters as zero", () => {
    expect(usageOf(research[0])).toEqual({
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 50,
      cacheWriteTokens: 0,
      webSearches: 1,
      webFetches: 2,
    });
  });
});

describe("finalText", () => {
  test("is the text after the last tool call", () => {
    expect(finalText(research)).toBe("Raportul: normele sunt publice.");
  });

  test("falls back to all the text of a turn that ends in a tool call", () => {
    expect(finalText([research[0]])).toBe("Caut site-ul.");
  });
});

describe("webEvidence", () => {
  test("lists every page seen and the text read, not the model's own words", () => {
    const evidence = webEvidence(research);
    expect(evidence.sources).toEqual([
      { url: "https://exemplu.test/", title: "Exemplu" },
      { url: "https://exemplu.test/contact", title: "Contact" },
      { url: "https://exemplu.test/norme.pdf", title: "Norme" },
    ]);
    expect(evidence.texts).toEqual([
      "Scrieți la office@exemplu.test",
      "tehnic@exemplu.test",
      "Norme de deviz, ediția 2019",
    ]);
  });
});

import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";

// BotID's answer, and what Convex was asked and answers, in memory.
let botCheck: () => Promise<{ isBot: boolean }>;
let convexAnswer: () => Promise<unknown>;
let asked: { name: string; args: unknown }[] = [];
let reported: unknown[] = [];

mock.module("botid/server", () => ({ checkBotId: () => botCheck() }));
mock.module("convex/nextjs", () => ({
  fetchAction: (reference: never, args: unknown) => {
    asked.push({ name: getFunctionName(reference), args });
    return convexAnswer();
  },
}));
mock.module("@sentry/nextjs", () => ({
  captureException: (error: unknown) => reported.push(error),
}));

const { POST } = await import("./route");

function codeRequest(body: unknown, oidcToken?: string) {
  return new Request("https://devize.ro/api/sign-in-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(oidcToken ? { "x-vercel-oidc-token": oidcToken } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function answer(request: Request) {
  const response = await POST(request);
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  botCheck = async () => ({ isBot: false });
  convexAnswer = async () => ({ tokens: null });
  asked = [];
  reported = [];
});

describe("asking for a sign-in code", () => {
  test("passes the request's Vercel token on to Convex once BotID lets it through", async () => {
    expect(
      await answer(codeRequest({ email: "ana@example.com" }, "vercel-token")),
    ).toEqual({ status: 200, body: { sent: true } });
    expect(asked).toEqual([
      {
        name: "auth:signIn",
        args: {
          provider: "email-code",
          params: { email: "ana@example.com", oidcToken: "vercel-token" },
        },
      },
    ]);
  });

  test("asks Convex nothing for a script, or when BotID can't tell", async () => {
    botCheck = async () => ({ isBot: true });
    expect(
      await answer(codeRequest({ email: "ana@example.com" }, "vercel-token")),
    ).toEqual({ status: 403, body: { error: "forbidden" } });
    const failure = new Error("The 'x-vercel-oidc-token' header is missing");
    botCheck = async () => {
      throw failure;
    };
    expect(
      await answer(codeRequest({ email: "ana@example.com" }, "vercel-token")),
    ).toEqual({ status: 403, body: { error: "forbidden" } });
    expect(asked).toEqual([]);
    expect(reported).toEqual([failure]);
  });

  test("refuses what isn't an address", async () => {
    for (const body of [{}, { email: 42 }, { email: "" }, "ana@example.com"]) {
      expect(await answer(codeRequest(body))).toEqual({
        status: 400,
        body: { error: "invalid" },
      });
    }
    expect(
      await answer(codeRequest({ email: `${"a".repeat(250)}@example.com` })),
    ).toEqual({ status: 400, body: { error: "invalid" } });
    expect(asked).toEqual([]);
  });

  test("says why Convex sent no code", async () => {
    convexAnswer = async () => {
      throw new ConvexError({ code: "rate_limited", detail: "email" });
    };
    expect(await answer(codeRequest({ email: "ana@example.com" }))).toEqual({
      status: 429,
      body: { error: "rate_limited" },
    });
    convexAnswer = async () => {
      throw new ConvexError({ code: "forbidden", detail: "bot" });
    };
    expect(await answer(codeRequest({ email: "ana@example.com" }))).toEqual({
      status: 403,
      body: { error: "forbidden" },
    });
    // Such as Resend refusing the address.
    const logged = spyOn(console, "error").mockImplementation(() => {});
    convexAnswer = async () => {
      throw new Error("Server Error");
    };
    expect(await answer(codeRequest({ email: "ana@example.com" }))).toEqual({
      status: 502,
      body: { error: "send_failed" },
    });
    logged.mockRestore();
    // Without Vercel's token, as on a laptop, Convex decides.
    expect(asked.at(-1)?.args).toEqual({
      provider: "email-code",
      params: { email: "ana@example.com" },
    });
  });
});

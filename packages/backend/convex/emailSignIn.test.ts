import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { api, internal } from "./_generated/api";
import { CODE_LENGTH, codeEmail, randomDigits } from "./emailSignIn";
import { setup, type TestConvex } from "./test.helper";

type SentEmail = { from: string; to: string[]; subject: string; text: string };

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const realFetch = globalThis.fetch;
const variables = [
  "AUTH_LOG_LEVEL",
  "SITE_URL",
  "CONVEX_SITE_URL",
  "JWT_PRIVATE_KEY",
  "AUTH_RESEND_KEY",
  "AUTH_EMAIL_FROM",
] as const;
let sent: SentEmail[] = [];

beforeEach(() => {
  sent = [];
  process.env.AUTH_LOG_LEVEL = "ERROR";
  process.env.SITE_URL = "http://localhost:3000";
  process.env.CONVEX_SITE_URL = "https://test-123.convex.site";
  process.env.JWT_PRIVATE_KEY = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  process.env.AUTH_RESEND_KEY = "re_test";
  // Resend answers in memory; nothing leaves the test.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) !== "https://api.resend.com/emails") {
      throw new Error(`Unexpected request to ${String(input)}`);
    }
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({ id: `email-${sent.length}` });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const name of variables) {
    delete process.env[name];
  }
  setSystemTime();
});

async function requestCode(t: TestConvex, email: string) {
  return await t.action(api.auth.signIn, {
    provider: "email-code",
    params: { email },
  });
}

function codeIn(email: SentEmail | undefined) {
  return email?.subject.match(/\d+/)?.[0] ?? "";
}

describe("email sign-in", () => {
  test("sends a code that signs in the address it was sent to", async () => {
    const t = setup();
    await requestCode(t, "ana@example.com");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(["ana@example.com"]);
    expect(sent[0]?.from).toBe("Devize <onboarding@resend.dev>");
    const code = codeIn(sent[0]);
    expect(code).toMatch(/^\d{8}$/);

    const result = await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code },
    });
    expect(result.tokens?.token).toBeString();
    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe("ana@example.com");
    expect(users[0]?.emailVerificationTime).toBeNumber();
  });

  test("refuses a wrong code, and a code with another address", async () => {
    const t = setup();
    await requestCode(t, "ana@example.com");
    const code = codeIn(sent[0]);
    const wrong = code === "00000000" ? "11111111" : "00000000";
    await expect(
      t.action(api.auth.signIn, {
        provider: "email-code",
        params: { email: "ana@example.com", code: wrong },
      }),
    ).rejects.toThrow();
    await expect(
      t.action(api.auth.signIn, {
        provider: "email-code",
        params: { email: "bob@example.com", code },
      }),
    ).rejects.toThrow();
    const sessions = await t.run(async (ctx) =>
      ctx.db.query("authSessions").collect(),
    );
    expect(sessions).toHaveLength(0);
  });

  test("sends from AUTH_EMAIL_FROM when it is set", async () => {
    process.env.AUTH_EMAIL_FROM = "Devize <cont@devize.ro>";
    const t = setup();
    await requestCode(t, "ana@example.com");
    expect(sent[0]?.from).toBe("Devize <cont@devize.ro>");
  });

  test("sends one address a code at most every 30 seconds and 5 an hour", async () => {
    const t = setup();
    const start = new Date("2026-10-21T10:00:00Z").getTime();
    setSystemTime(start);
    await requestCode(t, "ana@example.com");
    await expect(requestCode(t, "ana@example.com")).rejects.toThrow(
      /rate_limited/,
    );
    // Other addresses aren't held back.
    await requestCode(t, "bob@example.com");
    for (let minute = 1; minute <= 4; minute++) {
      setSystemTime(start + minute * 60_000);
      await requestCode(t, "ana@example.com");
    }
    setSystemTime(start + 5 * 60_000);
    await expect(requestCode(t, "ana@example.com")).rejects.toThrow(
      /rate_limited/,
    );
    setSystemTime(start + 61 * 60_000);
    await requestCode(t, "ana@example.com");
    expect(
      sent.filter((email) => email.to[0] === "ana@example.com"),
    ).toHaveLength(6);
  });

  test("keeps the last code working when it refuses to send another", async () => {
    const t = setup();
    await requestCode(t, "ana@example.com");
    await expect(requestCode(t, "ana@example.com")).rejects.toThrow(
      /rate_limited/,
    );
    expect(sent).toHaveLength(1);
    const result = await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code: codeIn(sent[0]) },
    });
    expect(result.tokens?.token).toBeString();
  });

  test("hands an unused code's user over to Google on the same address", async () => {
    const t = setup();
    await requestCode(t, "ana@example.com");
    // A Google sign-in with the same address, as Convex Auth stores one.
    await t.run(async (ctx) => {
      await ctx.db.insert("authVerifiers", { signature: "state" });
    });
    await t.mutation(internal.auth.store, {
      args: {
        type: "userOAuth",
        provider: "google",
        providerAccountId: "google-ana",
        profile: { email: "ana@example.com", name: "Ana" },
        signature: "state",
      },
    });
    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe("Ana");

    const result = await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code: codeIn(sent[0]) },
    });
    expect(result.tokens?.token).toBeString();
    const sessions = await t.run(async (ctx) =>
      ctx.db.query("authSessions").collect(),
    );
    expect(sessions.map((session) => session.userId)).toEqual([users[0]?._id]);
  });

  test("leaves alone a user who signed in with a code", async () => {
    const t = setup();
    await requestCode(t, "ana@example.com");
    await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code: codeIn(sent[0]) },
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("authVerifiers", { signature: "state" });
    });
    await t.mutation(internal.auth.store, {
      args: {
        type: "userOAuth",
        provider: "google",
        providerAccountId: "google-ana",
        profile: { email: "ana@example.com", name: "Ana" },
        signature: "state",
      },
    });
    const accounts = await t.run(async (ctx) =>
      ctx.db.query("authAccounts").collect(),
    );
    // Google links to the verified user, as Convex Auth does by default.
    expect(accounts).toHaveLength(2);
    expect(new Set(accounts.map((account) => account.userId)).size).toBe(1);
    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
  });

  test("says which variable is missing when there is no Resend key", async () => {
    delete process.env.AUTH_RESEND_KEY;
    const t = setup();
    await expect(requestCode(t, "ana@example.com")).rejects.toThrow(
      /AUTH_RESEND_KEY/,
    );
    expect(sent).toHaveLength(0);
  });
});

describe("sign-in codes", () => {
  test("are 8 random digits", () => {
    const codes = Array.from({ length: 200 }, () => randomDigits(CODE_LENGTH));
    for (const code of codes) {
      expect(code).toMatch(/^\d{8}$/);
    }
    // Every digit turns up in 1,600 random ones.
    expect(new Set(codes.join("")).size).toBe(10);
    expect(new Set(codes).size).toBeGreaterThan(190);
  });

  test("appear in the email's subject, text and HTML", () => {
    const email = codeEmail("40817263");
    expect(email.subject).toContain("40817263");
    expect(email.text).toContain("40817263");
    expect(email.html).toContain("40817263");
  });
});

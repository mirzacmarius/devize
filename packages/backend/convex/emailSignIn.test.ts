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
  "TURNSTILE_SECRET_KEY",
] as const;
const TURNSTILE_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_SECRET = "turnstile-test-secret";
// What Cloudflare says of the tokens the tests send; any other is refused.
const turnstileAnswers: Record<string, { success: boolean; action: string }> = {
  "token-solved": { success: true, action: "sign-in" },
  "token-other-page": { success: true, action: "contact" },
};
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
  // Resend and Cloudflare answer in memory; nothing leaves the test.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === TURNSTILE_URL) {
      const form = new URLSearchParams(String(init?.body));
      const answer = turnstileAnswers[form.get("response") ?? ""];
      return Response.json(
        form.get("secret") === TURNSTILE_SECRET && answer
          ? answer
          : { success: false, "error-codes": ["invalid-input-response"] },
      );
    }
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

async function requestCode(
  t: TestConvex,
  email: string,
  turnstileToken?: string,
) {
  return await t.action(api.auth.signIn, {
    provider: "email-code",
    params:
      turnstileToken === undefined ? { email } : { email, turnstileToken },
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

  test("signs in to the user an address had before codes passed Turnstile", async () => {
    const t = setup();
    // A user and account as the Email provider stored them.
    const userId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        email: "ana@example.com",
        emailVerificationTime: Date.now(),
        username: "ana",
      });
      await ctx.db.insert("authAccounts", {
        userId: id,
        provider: "email-code",
        providerAccountId: "ana@example.com",
        emailVerified: "ana@example.com",
      });
      return id;
    });
    await requestCode(t, "ana@example.com");
    const result = await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code: codeIn(sent[0]) },
    });
    expect(result.tokens?.token).toBeString();
    const stored = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      accounts: await ctx.db.query("authAccounts").collect(),
      sessions: await ctx.db.query("authSessions").collect(),
    }));
    expect(stored.users.map((user) => user._id)).toEqual([userId]);
    expect(stored.accounts).toHaveLength(1);
    expect(stored.sessions.map((session) => session.userId)).toEqual([userId]);
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

describe("email sign-in with Turnstile set up", () => {
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = TURNSTILE_SECRET;
  });

  test("sends a code once Cloudflare confirms the sign-in page's challenge", async () => {
    const t = setup();
    await expect(requestCode(t, "ana@example.com")).rejects.toThrow(
      /turnstile/,
    );
    await expect(
      requestCode(t, "ana@example.com", "token-made-up"),
    ).rejects.toThrow(/turnstile/);
    // A challenge solved for another page doesn't count.
    await expect(
      requestCode(t, "ana@example.com", "token-other-page"),
    ).rejects.toThrow(/turnstile/);
    // Nothing is sent or stored for a refused request.
    expect(sent).toHaveLength(0);
    expect(await t.run(async (ctx) => ctx.db.query("users").collect())).toEqual(
      [],
    );

    await requestCode(t, "ana@example.com", "token-solved");
    expect(sent).toHaveLength(1);
    // The code itself signs in, with no second challenge.
    const result = await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code: codeIn(sent[0]) },
    });
    expect(result.tokens?.token).toBeString();
  });

  test("sends no code while Cloudflare is out of reach", async () => {
    const t = setup();
    const answering = globalThis.fetch;
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      if (String(input) === TURNSTILE_URL) {
        throw new TypeError("fetch failed");
      }
      return answering(input, init);
    }) as typeof fetch;
    await expect(
      requestCode(t, "ana@example.com", "token-solved"),
    ).rejects.toThrow(/turnstile/);
    expect(sent).toHaveLength(0);
  });

  test("can't be skipped by asking the provider that sends the codes", async () => {
    const t = setup();
    await expect(
      t.action(api.auth.signIn, {
        provider: "email-code-sender",
        params: { email: "ana@example.com" },
      }),
    ).rejects.toThrow(/not configured/);
    expect(sent).toHaveLength(0);
  });
});

describe("what signing in leaves behind", () => {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const start = new Date("2026-10-24T08:00:00Z").getTime();

  async function sweep(t: TestConvex) {
    await t.mutation(internal.signInLeftovers.sweep, {});
    await t.finishAllScheduledFunctions(() => {});
  }

  function stored(t: TestConvex) {
    return t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      accounts: await ctx.db.query("authAccounts").collect(),
      codes: await ctx.db.query("authVerificationCodes").collect(),
      sessions: await ctx.db.query("authSessions").collect(),
      refreshTokens: await ctx.db.query("authRefreshTokens").collect(),
      verifiers: await ctx.db.query("authVerifiers").collect(),
      sends: await ctx.db.query("emailCodeSends").collect(),
      limits: await ctx.db.query("authRateLimits").collect(),
    }));
  }

  function typeCode(t: TestConvex, email: string, code: string) {
    return t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email, code },
    });
  }

  function wrong(code: string) {
    return code === "00000000" ? "11111111" : "00000000";
  }

  test("deletes, a day on, the user of an address that never signed in", async () => {
    const t = setup();
    setSystemTime(start);
    await requestCode(t, "ana@example.com");
    await requestCode(t, "bob@example.com");
    await typeCode(t, "bob@example.com", codeIn(sent[1]));
    await t.run(async (ctx) => {
      // Made a super admin before ever signing in.
      await ctx.db.insert("users", {
        email: "admin@example.com",
        role: "superadmin",
      });
      // Users with no proven address who signed in some other way, or are in
      // a firm, or have a Google account, stay too.
      const carol = await ctx.db.insert("users", {
        email: "carol@example.com",
      });
      await ctx.db.insert("authSessions", {
        userId: carol,
        expirationTime: start + 30 * DAY,
      });
      const dan = await ctx.db.insert("users", { email: "dan@example.com" });
      const firm = await ctx.db.insert("organizations", {
        name: "Dan Construct SRL",
        kind: "contractor",
        vatPayer: true,
        defaultMarkups: { cam: 0, indirect: 0, profit: 0, vat: 21 },
        lastEstimateNumber: 0,
        createdBy: dan,
      });
      await ctx.db.insert("memberships", {
        organizationId: firm,
        userId: dan,
        role: "owner",
        lastActiveAt: start,
      });
      const eve = await ctx.db.insert("users", { email: "eve@example.com" });
      await ctx.db.insert("authAccounts", {
        userId: eve,
        provider: "google",
        providerAccountId: "google-eve",
      });
    });

    setSystemTime(start + 23 * HOUR);
    await sweep(t);
    expect((await stored(t)).users).toHaveLength(6);

    setSystemTime(start + DAY + MINUTE);
    await sweep(t);
    const left = await stored(t);
    expect(left.users.map((user) => user.email).sort()).toEqual([
      "admin@example.com",
      "bob@example.com",
      "carol@example.com",
      "dan@example.com",
      "eve@example.com",
    ]);
    expect(
      left.accounts.map((account) => account.providerAccountId).sort(),
    ).toEqual(["bob@example.com", "google-eve"]);
    expect(left.codes).toEqual([]);
    expect(left.sessions).toHaveLength(2);
  });

  test("keeps the user of an address whose code still works", async () => {
    const t = setup();
    setSystemTime(start);
    await requestCode(t, "ana@example.com");
    setSystemTime(start + DAY + MINUTE);
    await requestCode(t, "ana@example.com");
    await sweep(t);
    const result = await typeCode(t, "ana@example.com", codeIn(sent[1]));
    expect(result.tokens?.token).toBeString();
  });

  test("forgets the codes sent and the wrong ones typed an hour on", async () => {
    const t = setup();
    setSystemTime(start);
    await requestCode(t, "ana@example.com");
    const code = codeIn(sent[0]);
    await expect(typeCode(t, "ana@example.com", wrong(code))).rejects.toThrow();

    setSystemTime(start + 30 * MINUTE);
    await sweep(t);
    let left = await stored(t);
    expect(left.sends).toHaveLength(1);
    expect(left.limits).toHaveLength(1);

    setSystemTime(start + HOUR + MINUTE);
    await sweep(t);
    left = await stored(t);
    expect(left.sends).toEqual([]);
    expect(left.limits).toEqual([]);

    // A wrong code typed later keeps the count for an hour after it.
    await expect(typeCode(t, "ana@example.com", wrong(code))).rejects.toThrow();
    setSystemTime(start + 2 * HOUR + 30 * MINUTE);
    await expect(typeCode(t, "ana@example.com", wrong(code))).rejects.toThrow();
    setSystemTime(start + 3 * HOUR);
    await sweep(t);
    expect((await stored(t)).limits).toHaveLength(1);
  });

  test("forgets the codes an address was sent once its account is deleted", async () => {
    const t = setup();
    setSystemTime(start);
    await requestCode(t, "ana@example.com");
    await typeCode(t, "ana@example.com", codeIn(sent[0]));
    setSystemTime(start + MINUTE);
    await requestCode(t, "ana@example.com");
    await expect(
      typeCode(t, "ana@example.com", wrong(codeIn(sent[1]))),
    ).rejects.toThrow();
    const [session] = (await stored(t)).sessions;
    const ana = t.withIdentity({
      subject: `${session?.userId}|${session?._id}`,
    });

    await ana.mutation(api.users.deleteCurrentUserAccount, {});
    expect(await stored(t)).toEqual({
      users: [],
      accounts: [],
      codes: [],
      sessions: [],
      refreshTokens: [],
      verifiers: [],
      sends: [],
      limits: [],
    });
  });

  test("deletes ended sessions, and codes and Google sign-ins a day old", async () => {
    const t = setup();
    setSystemTime(start);
    await requestCode(t, "ana@example.com");
    await typeCode(t, "ana@example.com", codeIn(sent[0]));
    // A Google sign-in started and never finished.
    await t.run(async (ctx) => {
      await ctx.db.insert("authVerifiers", { signature: "state" });
    });
    // A code asked for and never typed.
    setSystemTime(start + MINUTE);
    await requestCode(t, "ana@example.com");

    setSystemTime(start + DAY + 2 * MINUTE);
    await sweep(t);
    let left = await stored(t);
    expect(left.codes).toEqual([]);
    expect(left.verifiers).toEqual([]);
    expect(left.sessions).toHaveLength(1);
    expect(left.refreshTokens).toHaveLength(1);

    // Sessions end 30 days after signing in.
    setSystemTime(start + 30 * DAY + MINUTE);
    await sweep(t);
    left = await stored(t);
    expect(left.sessions).toEqual([]);
    expect(left.refreshTokens).toEqual([]);
    expect(left.users).toHaveLength(1);
    expect(left.accounts).toHaveLength(1);
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

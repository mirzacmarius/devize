import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { type JWTPayload, SignJWT } from "jose";
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
  "BOTID_CHECK",
] as const;
// Vercel's OIDC issuer for the team, its keys, and the key it signs with.
const VERCEL_ISSUER = "https://oidc.vercel.com/orvibo";
const vercelKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
const VERCEL_KEY_ID = "vercel-test-key";
const vercelKeys = {
  keys: [
    {
      ...vercelKey.publicKey.export({ format: "jwk" }),
      kid: VERCEL_KEY_ID,
      alg: "RS256",
      use: "sig",
    },
  ],
};
const PRODUCTION = "owner:orvibo:project:devize:environment:production";
let sent: SentEmail[] = [];
// Every address asked for, besides Resend's.
let requested: string[] = [];

/**
 * An OIDC token as Vercel gives the app's production functions, good for an
 * hour, with `claims` changed and signed with `key`.
 */
async function vercelToken(
  claims: JWTPayload = {},
  key: KeyObject = vercelKey.privateKey,
) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    iss: VERCEL_ISSUER,
    aud: "https://vercel.com/orvibo",
    sub: PRODUCTION,
    owner: "orvibo",
    project: "devize",
    environment: "production",
    iat: now,
    nbf: now,
    exp: now + 60 * 60,
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: VERCEL_KEY_ID, typ: "JWT" })
    .sign(key);
}

beforeEach(() => {
  sent = [];
  requested = [];
  process.env.AUTH_LOG_LEVEL = "ERROR";
  process.env.SITE_URL = "http://localhost:3000";
  process.env.CONVEX_SITE_URL = "https://test-123.convex.site";
  process.env.JWT_PRIVATE_KEY = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  process.env.AUTH_RESEND_KEY = "re_test";
  // Resend and Vercel answer in memory; nothing leaves the test.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url !== "https://api.resend.com/emails") {
      requested.push(url);
      if (
        url === `${VERCEL_ISSUER}/.well-known/jwks` ||
        url === "https://oidc.vercel.com/.well-known/jwks"
      ) {
        return Response.json(vercelKeys);
      }
      throw new Error(`Unexpected request to ${url}`);
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

/**
 * Asks for a code as the app's /api/sign-in-code does, with Vercel's token
 * unless `oidcToken` says otherwise (null for none).
 */
async function requestCode(
  t: TestConvex,
  email: string,
  oidcToken?: string | null,
) {
  const token = oidcToken === undefined ? await vercelToken() : oidcToken;
  return await t.action(api.auth.signIn, {
    provider: "email-code",
    params: token === null ? { email } : { email, oidcToken: token },
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

  test("signs in to the user an address had under the old Email provider", async () => {
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

describe("email sign-in behind Vercel BotID", () => {
  async function refused(t: TestConvex, oidcToken: string | null) {
    await expect(requestCode(t, "ana@example.com", oidcToken)).rejects.toThrow(
      /forbidden/,
    );
  }

  test("sends a code only with Vercel's token for the app's functions", async () => {
    const t = setup();
    const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
    // No token, and tokens that aren't Vercel's for this project's production
    // or preview functions.
    await refused(t, null);
    await refused(t, "not-a-token");
    await refused(t, await vercelToken({}, otherKey.privateKey));
    await refused(
      t,
      await vercelToken({
        sub: "owner:orvibo:project:other-app:environment:production",
      }),
    );
    // What a laptop gets from `vercel env pull`.
    await refused(
      t,
      await vercelToken({
        sub: "owner:orvibo:project:devize:environment:development",
      }),
    );
    await refused(t, await vercelToken({ aud: "https://vercel.com/acme" }));
    await refused(
      t,
      await vercelToken({ exp: Math.floor(Date.now() / 1000) - 120 }),
    );
    // Far longer than any token Vercel gives.
    await refused(t, await vercelToken({ padding: "x".repeat(8192) }));
    // Keys are only ever fetched from Vercel.
    await refused(t, await vercelToken({ iss: "https://attacker.example" }));
    expect(
      requested.some((url) => !url.startsWith("https://oidc.vercel.com/")),
    ).toBe(false);
    // Nothing is sent or stored for a refused request.
    expect(sent).toHaveLength(0);
    expect(await t.run(async (ctx) => ctx.db.query("users").collect())).toEqual(
      [],
    );

    await requestCode(t, "ana@example.com");
    await requestCode(
      t,
      "bob@example.com",
      await vercelToken({
        sub: "owner:orvibo:project:devize:environment:preview",
        environment: "preview",
      }),
    );
    expect(sent.map((email) => email.to[0])).toEqual([
      "ana@example.com",
      "bob@example.com",
    ]);
    // The code itself signs in, with no token.
    const result = await t.action(api.auth.signIn, {
      provider: "email-code",
      params: { email: "ana@example.com", code: codeIn(sent[0]) },
    });
    expect(result.tokens?.token).toBeString();
  });

  test("takes the tokens Vercel signs under the global issuer mode", async () => {
    const t = setup();
    await requestCode(
      t,
      "ana@example.com",
      await vercelToken({ iss: "https://oidc.vercel.com" }),
    );
    expect(sent).toHaveLength(1);
  });

  test("sends no code while Vercel's keys are out of reach", async () => {
    const t = setup();
    const answering = globalThis.fetch;
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      if (String(input).startsWith("https://oidc.vercel.com/")) {
        throw new TypeError("fetch failed");
      }
      return answering(input, init);
    }) as typeof fetch;
    await refused(t, await vercelToken());
    expect(sent).toHaveLength(0);
  });

  test("sends codes without a token where the check is off", async () => {
    process.env.BOTID_CHECK = "off";
    const t = setup();
    await requestCode(t, "ana@example.com", null);
    expect(sent).toHaveLength(1);
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

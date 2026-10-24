import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { setup, signIn, type TestConvex } from "../test.helper";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** A resolver holding `records` (name → TXT strings); returns the names asked. */
function fakeDns(records: Record<string, string[]>, status = 0) {
  const names: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const name = new URL(String(input)).searchParams.get("name") ?? "";
    names.push(name);
    const found = records[name];
    return Response.json(
      status !== 0
        ? { Status: status }
        : found
          ? {
              Status: 0,
              Answer: found.map((data) => ({
                name,
                type: 16,
                data: `"${data}"`,
              })),
            }
          : { Status: 3 },
    );
  }) as typeof fetch;
  return names;
}

async function adminWithMailbox(t: TestConvex, senderEmail: string) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  await admin.as.mutation(api.manufacturers.outreach.updateSettings, {
    firstName: "Ioana",
    lastName: "Pop",
    phone: "0711 111 111",
    senderEmail,
  });
  return admin;
}

const check = api.manufacturers.mailbox.checkSenderDomain;

describe("checkSenderDomain", () => {
  test("reads SPF, DMARC and the DKIM key of the mailbox's domain", async () => {
    const t = setup();
    const admin = await adminWithMailbox(t, "ioana@devize.example");
    fakeDns({
      "devize.example": ["v=spf1 include:_spf.google.com ~all"],
      "_dmarc.devize.example": ["v=DMARC1; p=none"],
      "google._domainkey.devize.example": ["v=DKIM1; k=rsa; p=MIIBIjANBgkq"],
    });
    expect(await admin.as.action(check, {})).toEqual({
      outcome: "checked",
      domain: "devize.example",
      spf: true,
      dmarc: true,
      dkim: "google",
    });
  });

  test("says what is missing", async () => {
    const t = setup();
    const admin = await adminWithMailbox(t, "ioana@devize.example");
    fakeDns({ "devize.example": ["google-site-verification=abc"] });
    expect(await admin.as.action(check, {})).toEqual({
      outcome: "checked",
      domain: "devize.example",
      spf: false,
      dmarc: false,
      dkim: null,
    });
  });

  test("doesn't look up a public mailbox", async () => {
    const t = setup();
    const admin = await adminWithMailbox(t, "ioana@gmail.com");
    const names = fakeDns({});
    expect(await admin.as.action(check, {})).toEqual({
      outcome: "provider",
      domain: "gmail.com",
    });
    expect(names).toEqual([]);
  });

  test("a resolver that fails leaves the domain unchecked", async () => {
    const t = setup();
    const admin = await adminWithMailbox(t, "ioana@devize.example");
    fakeDns({}, 2);
    expect(await admin.as.action(check, {})).toEqual({
      outcome: "unavailable",
      domain: "devize.example",
    });
  });

  test("with no mailbox there is nothing to check", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    expect(await admin.as.action(check, {})).toEqual({ outcome: "none" });
  });

  test("is only for super admins", async () => {
    const t = setup();
    await adminWithMailbox(t, "ioana@devize.example");
    const user = await signIn(t, { name: "Ion" });
    await expect(user.as.action(check, {})).rejects.toThrow();
  });
});

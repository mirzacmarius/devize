import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { api, internal } from "../_generated/api";
import { firmOwner, setup, signIn } from "../test.helper";
import { EMAILS_PER_DAY, invitationEmail } from "./invitations";

type SentEmail = { from: string; to: string[]; subject: string; text: string };

const realFetch = globalThis.fetch;
const variables = ["SITE_URL", "AUTH_RESEND_KEY", "AUTH_EMAIL_FROM"];
let sent: SentEmail[] = [];

beforeEach(() => {
  sent = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const name of variables) {
    delete process.env[name];
  }
  setSystemTime();
});

/** Lets Resend's fake take emails, refusing them when `status` isn't 200. */
function fakeResend(status = 200) {
  process.env.SITE_URL = "https://devize.test";
  process.env.AUTH_RESEND_KEY = "re_test";
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)) as SentEmail);
    return new Response(status === 200 ? '{"id":"1"}' : "forbidden", {
      status,
    });
  }) as typeof fetch;
}

/** Waits for the email the last mutation scheduled. */
async function emailsSent(t: ReturnType<typeof setup>) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  await t.finishInProgressScheduledFunctions();
}

describe("invitations", () => {
  test("an admin invites someone by email, who joins with that address", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const { invitationId, token } = await ana.as.mutation(
      api.accounts.invitations.create,
      {
        organizationId: ana.organizationId,
        email: " Bogdan@Example.com ",
        role: "member",
      },
    );
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    const waiting = await ana.as.query(
      api.accounts.invitations.listForOrganization,
      { organizationId: ana.organizationId },
    );
    expect(waiting).toMatchObject([
      {
        _id: invitationId,
        email: "bogdan@example.com",
        role: "member",
        invitedByName: "Ana",
        // Without Resend set up, the admin shares the link.
        emailStatus: "not_sent",
      },
    ]);

    // Bogdan signs in with the address invited.
    const bogdan = await signIn(t, { name: "Bogdan" });
    await bogdan.as.mutation(api.accounts.organizations.create, {
      name: "Bogdan Instal SRL",
    });
    expect(
      await bogdan.as.query(api.accounts.invitations.listMine, {}),
    ).toMatchObject([
      {
        _id: invitationId,
        organizationName: "Ana Construct SRL",
        role: "member",
      },
    ]);
    expect(
      await bogdan.as.query(api.accounts.invitations.getByToken, { token }),
    ).toMatchObject({ forYou: true, isMember: false, invitedByName: "Ana" });

    const joined = await bogdan.as.mutation(api.accounts.invitations.accept, {
      invitationId,
    });
    expect(joined).toBe(ana.organizationId);
    // The firm joined opens first.
    const firms = await bogdan.as.query(
      api.accounts.organizations.listMine,
      {},
    );
    expect(firms.map((firm) => [firm.name, firm.role])).toEqual([
      ["Ana Construct SRL", "member"],
      ["Bogdan Instal SRL", "owner"],
    ]);
    expect(
      await bogdan.as.query(api.accounts.invitations.listMine, {}),
    ).toEqual([]);
    expect(
      await bogdan.as.query(api.accounts.invitations.getByToken, { token }),
    ).toBeNull();
    const members = await ana.as.query(api.accounts.organizations.listMembers, {
      organizationId: ana.organizationId,
    });
    expect(members.map((member) => member.name)).toEqual(["Ana", "Bogdan"]);
  });

  test("only the person invited accepts, and only admins invite", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const { invitationId, token } = await ana.as.mutation(
      api.accounts.invitations.create,
      {
        organizationId: ana.organizationId,
        email: "bogdan@example.com",
        role: "admin",
      },
    );
    const carol = await signIn(t, { name: "Carol" });
    expect(
      await carol.as.query(api.accounts.invitations.getByToken, { token }),
    ).toMatchObject({
      forYou: false,
      email: "bogdan@example.com",
      signedInAs: "carol@example.com",
    });
    await expect(
      carol.as.mutation(api.accounts.invitations.accept, { invitationId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      carol.as.mutation(api.accounts.invitations.decline, { invitationId }),
    ).rejects.toThrow(/not_found/);

    // Bogdan joins as an admin; a plain member may not invite.
    const bogdan = await signIn(t, { name: "Bogdan" });
    await bogdan.as.mutation(api.accounts.invitations.accept, { invitationId });
    const second = await bogdan.as.mutation(api.accounts.invitations.create, {
      organizationId: ana.organizationId,
      email: "carol@example.com",
      role: "member",
    });
    await carol.as.mutation(api.accounts.invitations.accept, {
      invitationId: second.invitationId,
    });
    await expect(
      carol.as.mutation(api.accounts.invitations.create, {
        organizationId: ana.organizationId,
        email: "dan@example.com",
        role: "member",
      }),
    ).rejects.toThrow(/forbidden/);
    await expect(
      carol.as.query(api.accounts.invitations.listForOrganization, {
        organizationId: ana.organizationId,
      }),
    ).rejects.toThrow(/forbidden/);
  });

  test("inviting again keeps one invitation and its link, until it's revoked", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    const first = await ana.as.mutation(api.accounts.invitations.create, {
      organizationId: ana.organizationId,
      email: "bogdan@example.com",
      role: "member",
    });
    const again = await ana.as.mutation(api.accounts.invitations.create, {
      organizationId: ana.organizationId,
      email: "BOGDAN@example.com",
      role: "admin",
    });
    expect(again).toEqual(first);
    expect(
      await ana.as.query(api.accounts.invitations.listForOrganization, {
        organizationId: ana.organizationId,
      }),
    ).toMatchObject([{ role: "admin" }]);

    // A member can't be invited, and an address must look like one.
    await expect(
      ana.as.mutation(api.accounts.invitations.create, {
        organizationId: ana.organizationId,
        email: "ana@example.com",
        role: "member",
      }),
    ).rejects.toThrow(/in_use/);
    await expect(
      ana.as.mutation(api.accounts.invitations.create, {
        organizationId: ana.organizationId,
        email: "bogdan",
        role: "member",
      }),
    ).rejects.toThrow(/invalid/);

    await ana.as.mutation(api.accounts.invitations.revoke, {
      invitationId: first.invitationId,
    });
    const bogdan = await signIn(t, { name: "Bogdan" });
    expect(
      await bogdan.as.query(api.accounts.invitations.getByToken, {
        token: first.token,
      }),
    ).toBeNull();
    await expect(
      bogdan.as.mutation(api.accounts.invitations.accept, {
        invitationId: first.invitationId,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("an invitation expires after a week", async () => {
    const t = setup();
    const start = Date.now();
    setSystemTime(start);
    const ana = await firmOwner(t, "Ana");
    const { invitationId } = await ana.as.mutation(
      api.accounts.invitations.create,
      {
        organizationId: ana.organizationId,
        email: "bogdan@example.com",
        role: "member",
      },
    );
    const bogdan = await signIn(t, { name: "Bogdan" });
    setSystemTime(start + 8 * 24 * 60 * 60 * 1000);
    await expect(
      bogdan.as.mutation(api.accounts.invitations.accept, { invitationId }),
    ).rejects.toThrow(/not_found/);
    await t.mutation(internal.accounts.invitations.expire, { invitationId });
    expect(
      await t.run(async (ctx) => await ctx.db.get("invitations", invitationId)),
    ).toBeNull();
  });

  test("emails the link when Resend is set up, and says when it couldn't", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    fakeResend();
    const { token } = await ana.as.mutation(api.accounts.invitations.create, {
      organizationId: ana.organizationId,
      email: "bogdan@example.com",
      role: "member",
    });
    await emailsSent(t);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(["bogdan@example.com"]);
    expect(sent[0]?.subject).toBe(
      "Ana te invită în Ana Construct SRL pe Devize",
    );
    expect(sent[0]?.text).toContain(`https://devize.test/invite/${token}`);
    const list = () =>
      ana.as.query(api.accounts.invitations.listForOrganization, {
        organizationId: ana.organizationId,
      });
    expect(await list()).toMatchObject([{ emailStatus: "sent" }]);

    // Inviting again right away doesn't email the address again.
    await ana.as.mutation(api.accounts.invitations.create, {
      organizationId: ana.organizationId,
      email: "bogdan@example.com",
      role: "member",
    });
    await emailsSent(t);
    expect(sent).toHaveLength(1);

    fakeResend(403);
    await ana.as.mutation(api.accounts.invitations.create, {
      organizationId: ana.organizationId,
      email: "carol@example.com",
      role: "member",
    });
    await emailsSent(t);
    expect(sent).toHaveLength(2);
    expect(
      (await list()).find((row) => row.email === "carol@example.com"),
    ).toMatchObject({ emailStatus: "not_sent" });
  });

  test("emails at most 20 invitations a day for each person, then the links are shared by hand", async () => {
    const t = setup();
    const ana = await firmOwner(t, "Ana");
    fakeResend();
    for (let index = 0; index <= EMAILS_PER_DAY; index++) {
      await ana.as.mutation(api.accounts.invitations.create, {
        organizationId: ana.organizationId,
        email: `coleg${index}@example.com`,
        role: "member",
      });
    }
    await emailsSent(t);
    expect(sent).toHaveLength(EMAILS_PER_DAY);
    const invitations = await ana.as.query(
      api.accounts.invitations.listForOrganization,
      { organizationId: ana.organizationId },
    );
    expect(invitations).toHaveLength(EMAILS_PER_DAY + 1);
    expect(
      invitations.find(
        (row) => row.email === `coleg${EMAILS_PER_DAY}@example.com`,
      ),
    ).toMatchObject({ emailStatus: "not_sent" });
  });

  test("the email escapes what the firm wrote", () => {
    const email = invitationEmail({
      organizationName: "<b>Ana & Co</b>",
      invitedByName: null,
      role: "admin",
      email: "bogdan@example.com",
      link: "https://devize.test/invite/abc",
    });
    expect(email.subject).toBe(
      "Un coleg te invită în <b>Ana & Co</b> pe Devize",
    );
    expect(email.html).toContain("&lt;b&gt;Ana &amp; Co&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Ana");
    expect(email.text).toContain("ca administrator");
  });
});

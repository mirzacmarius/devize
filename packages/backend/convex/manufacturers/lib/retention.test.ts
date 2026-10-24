import { describe, expect, test } from "bun:test";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  DAY_MS,
  ERASED,
  firmWords,
  IN_TOUCH_MS,
  inTouch,
  isPersonAddress,
  mentions,
  NO_ANSWER_MS,
  NOT_WRITTEN_MS,
  retentionPlan,
  scrubSender,
  scrubText,
} from "./retention";

// A made-up producer; never a real one's people.
const firm = firmWords({
  name: "Termo Test SA",
  brands: ["Izotest"],
  website: "https://www.termotest.example",
});

const manufacturer = {
  name: "Termo Test SA",
  brands: [],
  website: "https://termotest.example",
  status: "contacted",
  normsStatus: "existing",
  claimStatus: "unclaimed",
} as const satisfies Partial<Doc<"manufacturers">>;

const T = Date.UTC(2026, 10, 2);

function contact(
  email: string,
  fields: Partial<Doc<"manufacturerContacts">> = {},
): Doc<"manufacturerContacts"> {
  return {
    _id: email as Id<"manufacturerContacts">,
    _creationTime: T,
    manufacturerId: "m" as Id<"manufacturers">,
    kind: "generic",
    email,
    sourceVerified: true,
    origin: "research",
    foundAt: T,
    ...fields,
  };
}

function message(
  to: string | undefined,
  fields: Partial<Doc<"outreachMessages">> = {},
): Doc<"outreachMessages"> {
  return {
    _id: `${to}-${fields.sentAt}` as Id<"outreachMessages">,
    _creationTime: T,
    manufacturerId: "m" as Id<"manufacturers">,
    step: "initial",
    status: "sent",
    to,
    subject: "Normele de deviz Termo Test în Devize",
    body: "Bună ziua",
    vars: { firm: "Termo Test", address: to },
    issues: [],
    edited: false,
    updatedAt: T,
    sentAt: T,
    toSetAt: T,
    ...fields,
  };
}

type PlanInput = Parameters<typeof retentionPlan>[0];

function plan(input: {
  manufacturer?: Partial<PlanInput["manufacturer"]>;
  contacts?: PlanInput["contacts"];
  messages?: PlanInput["messages"];
  suppressed?: PlanInput["suppressed"];
  normsReceivedAt?: number;
}) {
  return Object.fromEntries(
    retentionPlan({
      contacts: input.contacts ?? [],
      messages: input.messages ?? [],
      suppressed: input.suppressed ?? new Set(),
      manufacturer: { ...manufacturer, ...input.manufacturer },
      normsReceivedAt: input.normsReceivedAt,
    }).map((entry) => [entry.address, { at: entry.at, rule: entry.rule }]),
  );
}

describe("isPersonAddress", () => {
  test("a name is a person's, even when research called it generic", () => {
    expect(isPersonAddress("ion.popescu@termotest.example", firm)).toBe(true);
    expect(isPersonAddress("andrei@termotest.example", firm)).toBe(true);
    expect(isPersonAddress("ipopescu@termotest.example", firm)).toBe(true);
    expect(isPersonAddress("tehnic.ion@termotest.example", firm)).toBe(true);
  });

  test("roles and the firm's own name are a company's", () => {
    for (const email of [
      "office@termotest.example",
      "info2@termotest.example",
      "vanzari.export@termotest.example",
      "tehnic-ro@termotest.example",
      "termotest@termotest.example",
      "izotest.romania@termotest.example",
    ]) {
      expect(isPersonAddress(email, firm)).toBe(false);
    }
  });

  test("a contact research called a person is always one", () => {
    expect(isPersonAddress("tehnic@termotest.example", firm, "person")).toBe(
      true,
    );
  });
});

describe("inTouch", () => {
  test("an answer, norms or a claimed profile keep the firm in touch", () => {
    expect(inTouch({ ...manufacturer, answeredAt: T })).toBe(true);
    expect(inTouch({ ...manufacturer, status: "replied" })).toBe(true);
    expect(inTouch({ ...manufacturer, status: "norms_received" })).toBe(true);
    expect(inTouch({ ...manufacturer, normsStatus: "received" })).toBe(true);
    expect(inTouch({ ...manufacturer, claimStatus: "claimed" })).toBe(true);
    expect(inTouch(manufacturer)).toBe(false);
  });

  test("a firm that declined is no longer in touch", () => {
    expect(
      inTouch({ ...manufacturer, status: "declined", answeredAt: T }),
    ).toBe(false);
  });
});

describe("retentionPlan", () => {
  test("a person written to goes 175 days after the last email", () => {
    const result = plan({
      contacts: [
        contact("ion.popescu@termotest.example", { kind: "person" }),
        contact("office@termotest.example"),
      ],
      messages: [
        message("ion.popescu@termotest.example", { sentAt: T + DAY_MS }),
      ],
    });
    expect(result).toEqual({
      "ion.popescu@termotest.example": {
        at: T + DAY_MS + NO_ANSWER_MS,
        rule: "no_answer",
      },
    });
  });

  test("an email opened to send counts as written", () => {
    const result = plan({
      messages: [
        message("ion.popescu@termotest.example", {
          status: "approved",
          sentAt: undefined,
          approvedAt: T + 2 * DAY_MS,
        }),
      ],
    });
    expect(result["ion.popescu@termotest.example"]?.at).toBe(
      T + 2 * DAY_MS + NO_ANSWER_MS,
    );
  });

  test("each address keeps its own clock", () => {
    const result = plan({
      messages: [
        message("ion.popescu@termotest.example"),
        message("maria.ionescu@termotest.example", {
          step: "followup_1",
          sentAt: T + 60 * DAY_MS,
        }),
      ],
    });
    expect(result["ion.popescu@termotest.example"]?.at).toBe(T + NO_ANSWER_MS);
    expect(result["maria.ionescu@termotest.example"]?.at).toBe(
      T + 60 * DAY_MS + NO_ANSWER_MS,
    );
  });

  test("a person nobody wrote to goes 25 days after being found", () => {
    const result = plan({
      contacts: [
        contact("maria.ionescu@termotest.example", { foundAt: T - DAY_MS }),
      ],
      messages: [
        message("maria.ionescu@termotest.example", {
          status: "draft",
          sentAt: undefined,
        }),
      ],
    });
    expect(result["maria.ionescu@termotest.example"]).toEqual({
      at: T - DAY_MS + NOT_WRITTEN_MS,
      rule: "not_written",
    });
  });

  test("an older address left in a sent email wasn't written to", () => {
    const result = plan({
      messages: [
        message("maria.ionescu@termotest.example", {
          vars: {
            firm: "Termo Test",
            address: "ion.popescu@termotest.example",
          },
        }),
      ],
    });
    expect(result["ion.popescu@termotest.example"]?.rule).toBe("not_written");
    expect(result["maria.ionescu@termotest.example"]?.rule).toBe("no_answer");
  });

  test("an address typed into a draft counts from when it was typed", () => {
    const result = plan({
      messages: [
        message("ion@gmail.example", {
          status: "draft",
          sentAt: undefined,
          toSetAt: T + 3 * DAY_MS,
        }),
      ],
    });
    expect(result["ion@gmail.example"]?.at).toBe(
      T + 3 * DAY_MS + NOT_WRITTEN_MS,
    );
  });

  test("people stay while the firm is in touch, until 2 years after the last message", () => {
    const result = plan({
      manufacturer: { answeredAt: T, status: "contacted" },
      contacts: [contact("ion.popescu@termotest.example")],
      messages: [message("ion.popescu@termotest.example")],
    });
    expect(result["ion.popescu@termotest.example"]).toEqual({
      at: T + IN_TOUCH_MS,
      rule: "inactive",
    });
    expect(IN_TOUCH_MS).toBeLessThan(730 * DAY_MS);
  });

  test("the last message is the firm's last answer, its last norms or our last email to anyone there", () => {
    const ion = "ion.popescu@termotest.example";
    const later = (days: number) => T + days * DAY_MS;
    const at = (input: Parameters<typeof plan>[0]) =>
      plan({ contacts: [contact(ion)], ...input })[ion]?.at;
    const replied = { answeredAt: T, status: "replied" } as const;
    expect(
      at({ manufacturer: { ...replied, lastAnsweredAt: later(30) } }),
    ).toBe(later(30) + IN_TOUCH_MS);
    expect(at({ manufacturer: replied, normsReceivedAt: later(60) })).toBe(
      later(60) + IN_TOUCH_MS,
    );
    expect(
      at({
        manufacturer: replied,
        messages: [
          message("office@termotest.example", { sentAt: later(90) }),
          message(undefined, { status: "draft", sentAt: undefined }),
        ],
      }),
    ).toBe(later(90) + IN_TOUCH_MS);
  });

  test("a firm in touch with nothing that dates it keeps its people for now", () => {
    const result = plan({
      manufacturer: { claimStatus: "claimed" },
      contacts: [contact("ion.popescu@termotest.example")],
    });
    expect(result["ion.popescu@termotest.example"]).toEqual({
      at: null,
      rule: null,
    });
  });

  test("someone who asked us to stop goes at once, even at a firm in touch", () => {
    const result = plan({
      manufacturer: { status: "norms_received" },
      contacts: [contact("ion.popescu@termotest.example")],
      suppressed: new Set(["ion.popescu@termotest.example"]),
    });
    expect(result["ion.popescu@termotest.example"]).toEqual({
      at: 0,
      rule: "opt_out",
    });
  });

  test("the people of an excluded firm go at once", () => {
    const result = plan({
      manufacturer: { status: "excluded" },
      contacts: [contact("ion.popescu@termotest.example")],
    });
    expect(result["ion.popescu@termotest.example"]?.rule).toBe("excluded");
  });

  test("company addresses and contact forms are kept", () => {
    const result = plan({
      contacts: [
        contact("office@termotest.example"),
        contact("vanzari@termotest.example", { kind: "department" }),
        { ...contact("form"), email: undefined, kind: "form" },
      ],
      messages: [message("office@termotest.example")],
    });
    expect(result).toEqual({});
  });

  test("a thank-you's claim address counts", () => {
    const result = plan({
      messages: [
        message("ion.popescu@termotest.example", {
          step: "thanks",
          vars: {
            firm: "Termo Test",
            thanks: {
              claimEmail: "ion.popescu@termotest.example",
              consentRecorded: true,
            },
          },
        }),
      ],
    });
    expect(Object.keys(result)).toEqual(["ion.popescu@termotest.example"]);
  });
});

describe("scrubText", () => {
  test("replaces the address in any case and form", () => {
    const text =
      "Am găsit adresa Ion.Popescu@TermoTest.example. Scrieți la mailto:ion.popescu@termotest.example sau ion.popescu%40termotest.example; office@termotest.example rămâne.";
    const scrubbed = scrubText(text, ["ion.popescu@termotest.example"]);
    expect(scrubbed).toBe(
      `Am găsit adresa ${ERASED}. Scrieți la ${ERASED} sau ${ERASED}; office@termotest.example rămâne.`,
    );
    expect(scrubText(scrubbed, ["ion.popescu@termotest.example"])).toBe(
      scrubbed,
    );
  });

  test("doesn't take a dot in the address for any letter", () => {
    expect(
      scrubText("ionxpopescu@termotest.example", [
        "ion.popescu@termotest.example",
      ]),
    ).toBe("ionxpopescu@termotest.example");
  });

  test("mentions finds what scrubText would replace", () => {
    expect(
      mentions("Contact: ION.POPESCU@termotest.example", [
        "ion.popescu@termotest.example",
      ]),
    ).toBe(true);
    expect(
      mentions("office@termotest.example", ["ion@termotest.example"]),
    ).toBe(false);
  });
});

describe("scrubSender", () => {
  const sender = { firstName: "Dan", lastName: "Pop", phone: "0711 111 111" };

  test("puts the placeholders back for the names and the phone", () => {
    expect(
      scrubSender(
        "Sunt Dan, fondatorul Devize.\n\nDan Pop\nFondator, Devize · 0711 111 111. Sau 0711-111-111, 0711.111.111, 0711111111.",
        sender,
      ),
    ).toBe(
      "Sunt {Prenume}, fondatorul Devize.\n\n{Prenume} {Nume}\nFondator, Devize · {telefon}. Sau {telefon}, {telefon}, {telefon}.",
    );
  });

  test("leaves words and numbers that only contain them", () => {
    const text =
      "Danubiu Construct, Popescu și Populare; dan; 10711111111; 07111111112.";
    expect(scrubSender(text, sender)).toBe(text);
  });

  test("names with diacritics match whole, not inside other words", () => {
    expect(
      scrubSender("Ștefan Țepeș, Ștefania", {
        firstName: "Ștefan",
        lastName: "Țepeș",
      }),
    ).toBe("{Prenume} {Nume}, Ștefania");
  });

  test("a short phone or no signature changes nothing", () => {
    expect(scrubSender("Camera 112, Dan", { phone: "112" })).toBe(
      "Camera 112, Dan",
    );
    expect(scrubSender("Dan Pop", {})).toBe("Dan Pop");
  });
});

import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { firmOwner, setup } from "../test.helper";
import { parseValidation } from "./anaf";
import { billedDeviz, ionAtHome, issuedAdvance } from "./test.helper";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  setSystemTime();
});

/** Answers every request with `answer`; returns the requests made. */
function fakeAnaf(answer: (url: string) => Response) {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? "") });
    return answer(url);
  }) as typeof fetch;
  return calls;
}

const found = {
  found: [
    {
      date_generale: {
        cui: 12345674,
        denumire: "BETA IMOBILIARE S.R.L.",
        adresa: "JUD. CLUJ, MUN. CLUJ-NAPOCA, STR. FABRICII, NR. 10",
        nrRegCom: "J12/1/2000",
      },
      inregistrare_scop_Tva: { scpTVA: true },
      stare_inactiv: { statusInactivi: false },
    },
  ],
  notFound: [],
};

describe("ANAF checks", () => {
  test("a company buyer is looked up in the register when the draft is made", async () => {
    setSystemTime(new Date("2026-10-23T10:00:00Z"));
    const t = setup();
    const { firm, estimateId } = await billedDeviz(t, {
      client: { kind: "company", name: "Beta Imobiliare", cui: "12345674" },
    });
    const calls = fakeAnaf(() => Response.json(found));
    const invoiceId = await firm.as.mutation(
      api.invoices.invoices.createAdvance,
      { estimateId },
    );
    const before = await firm.as.query(api.invoices.invoices.get, {
      invoiceId,
    });
    // Until the register answers, a company with a CUI counts as registered.
    expect(before.buyer).toEqual({
      name: "Beta Imobiliare",
      kind: "company",
      cui: "12345674",
      vatRegistered: true,
    });
    await t.finishAllScheduledFunctions(() => {});
    expect(
      calls.filter((call) => call.url.includes("PlatitorTvaRest")),
    ).toHaveLength(1);
    const checked = await firm.as.query(api.invoices.invoices.get, {
      invoiceId,
    });
    // The register fills what the card lacks; the name stays the card's.
    expect(checked.buyer).toEqual({
      name: "Beta Imobiliare",
      kind: "company",
      cui: "12345674",
      vatRegistered: true,
      tradeRegister: "J12/1/2000",
      address: "Str. Fabricii, Nr. 10",
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(checked.findings).toEqual([]);

    // Asked from the page, the register's name replaces the card's.
    const result = await firm.as.action(api.invoices.anaf.checkBuyerNow, {
      invoiceId,
    });
    expect(result).toEqual({
      outcome: "found",
      name: "BETA IMOBILIARE S.R.L.",
      vatPayer: true,
    });
    const replaced = await firm.as.query(api.invoices.invoices.get, {
      invoiceId,
    });
    expect(replaced.buyer.name).toBe("BETA IMOBILIARE S.R.L.");

    // A draft changed meanwhile keeps its buyer.
    const stale = checked.updatedAt;
    await firm.as.mutation(api.invoices.invoices.update, {
      invoiceId,
      buyer: { name: "Beta Imobiliare SRL" },
    });
    await t.action(internal.invoices.anaf.checkBuyer, {
      invoiceId,
      updatedAt: stale,
    });
    expect(
      (await firm.as.query(api.invoices.invoices.get, { invoiceId })).buyer
        .name,
    ).toBe("Beta Imobiliare SRL");

    // A person has no CUI to look up; a stranger sees nothing.
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.action(api.invoices.anaf.checkBuyerNow, { invoiceId }),
    ).rejects.toThrow(/not_found/);
  });

  test("when the register doesn't answer, the buyer stays as the card says", async () => {
    setSystemTime(new Date("2026-10-23T10:00:00Z"));
    const t = setup();
    const { firm, estimateId } = await billedDeviz(t, {
      client: { kind: "company", name: "Beta Imobiliare", cui: "12345674" },
    });
    fakeAnaf(() => new Response("", { status: 503 }));
    const invoiceId = await firm.as.mutation(
      api.invoices.invoices.createAdvance,
      { estimateId },
    );
    await t.finishAllScheduledFunctions(() => {});
    const invoice = await firm.as.query(api.invoices.invoices.get, {
      invoiceId,
    });
    expect(invoice.buyer).toEqual({
      name: "Beta Imobiliare",
      kind: "company",
      cui: "12345674",
      vatRegistered: true,
    });
    expect(
      (await firm.as.action(api.invoices.anaf.checkBuyerNow, { invoiceId }))
        .outcome,
    ).toBe("unavailable");
    // A person has nothing to look up.
    await firm.as.mutation(api.invoices.invoices.update, {
      invoiceId,
      buyer: { kind: "person", name: "Ion Popescu", ...ionAtHome },
    });
    await expect(
      firm.as.action(api.invoices.anaf.checkBuyerNow, { invoiceId }),
    ).rejects.toThrow(/cui/);
  });

  test("the validator's verdict is kept on the invoice", async () => {
    setSystemTime(new Date("2026-10-23T10:00:00Z"));
    const t = setup();
    const { firm, advanceId } = await issuedAdvance(t);
    const calls = fakeAnaf(() =>
      Response.json({
        stare: "nok",
        Messages: [{ message: "E: BR-RO-L050: CityName prea lung" }],
        trace_id: "abc",
      }),
    );
    const refused = await firm.as.action(api.invoices.anaf.validate, {
      invoiceId: advanceId,
    });
    expect(refused).toEqual({
      outcome: "nok",
      messages: ["E: BR-RO-L050: CityName prea lung"],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/FACT1",
    );
    expect(calls[0]?.body).toContain("<cbc:ID>DVZ-0001</cbc:ID>");
    expect(calls[0]?.body).toContain("<cbc:CustomizationID>");
    let invoice = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(invoice.validation).toMatchObject({
      ok: false,
      messages: ["E: BR-RO-L050: CityName prea lung"],
    });

    fakeAnaf(() => Response.json({ stare: "ok", Messages: [], trace_id: "d" }));
    expect(
      await firm.as.action(api.invoices.anaf.validate, {
        invoiceId: advanceId,
      }),
    ).toEqual({ outcome: "ok", messages: [] });
    invoice = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(invoice.validation?.ok).toBe(true);

    // ANAF down: nothing changes.
    fakeAnaf(() => new Response("", { status: 500 }));
    expect(
      await firm.as.action(api.invoices.anaf.validate, {
        invoiceId: advanceId,
      }),
    ).toEqual({ outcome: "unavailable", messages: [] });
    invoice = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(invoice.validation?.ok).toBe(true);

    // Not for other firms.
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.action(api.invoices.anaf.validate, { invoiceId: advanceId }),
    ).rejects.toThrow(/not_found/);
  });

  test("reads the validator's answer however it is shaped", () => {
    expect(
      parseValidation(
        { stare: "nok", Messages: ["a", { message: "b" }, 3, { other: 1 }] },
        5,
      ),
    ).toEqual({ checkedAt: 5, ok: false, messages: ["a", "b"] });
    expect(parseValidation({ stare: "ok" }, 6)).toEqual({
      checkedAt: 6,
      ok: true,
      messages: [],
    });
    expect(parseValidation("garbage", 7)).toEqual({
      checkedAt: 7,
      ok: false,
      messages: [],
    });
  });
});

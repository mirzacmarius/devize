import { afterEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { devizFor } from "../offers/test.helper";
import { setup } from "../test.helper";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

// BNR's document, shortened, with made-up figures.
function bnrPage(date: string, eur: string) {
  return `<DataSet><Body><Cube date="${date}"><Rate currency="EUR">${eur}</Rate><Rate currency="USD">4.4301</Rate></Cube></Body></DataSet>`;
}

describe("BNR's euro rate", () => {
  test("is read once a day and the newest is shown", async () => {
    const t = setup();
    expect(await t.query(api.exchange.rates.latest, {})).toBeNull();

    let page = bnrPage("2026-10-22", "4.9701");
    globalThis.fetch = (async () =>
      new Response(page, { status: 200 })) as unknown as typeof fetch;
    expect(await t.action(internal.exchange.rates.refresh, {})).toBe(1);
    // The same day read again keeps one row.
    expect(await t.action(internal.exchange.rates.refresh, {})).toBe(0);
    page = bnrPage("2026-10-23", "4.9772");
    await t.action(internal.exchange.rates.refresh, {});

    expect(await t.query(api.exchange.rates.latest, {})).toEqual({
      currency: "EUR",
      rate: 4.9772,
      date: "2026-10-23",
    });
  });

  test("a page that isn't BNR's rates fails and keeps nothing", async () => {
    const t = setup();
    globalThis.fetch = (async () =>
      new Response("<html>Mentenanță</html>", {
        status: 200,
      })) as unknown as typeof fetch;
    await expect(t.action(internal.exchange.rates.refresh, {})).rejects.toThrow(
      /could not be read/,
    );
    expect(await t.query(api.exchange.rates.latest, {})).toBeNull();
  });

  test("shows on a client's link only when the firm asked", async () => {
    const t = setup();
    await t.mutation(internal.exchange.rates.record, {
      date: "2026-10-23",
      rates: { EUR: 4.9772 },
    });
    const { firm, estimateId } = await devizFor(t);
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      showEur: true,
    });
    const page = await t.query(api.offers.public.view, { token });
    expect(page?.state === "open" && page.eur).toEqual({
      currency: "EUR",
      rate: 4.9772,
      date: "2026-10-23",
    });

    const other = await devizFor(t, "Bogdan", "DV-FAI-02");
    const { token: plain } = await other.firm.as.mutation(
      api.offers.offers.create,
      { estimateId: other.estimateId },
    );
    const plainPage = await t.query(api.offers.public.view, { token: plain });
    expect(plainPage?.state === "open" && plainPage.eur).toBeNull();
  });
});

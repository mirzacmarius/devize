import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import { issuedAdvance } from "../invoices/test.helper";
import { devizFor } from "../offers/test.helper";
import { firmOwner, setup, tilingResources } from "../test.helper";

afterEach(() => {
  setSystemTime();
});

/** A norm of the firm's own, published unless asked for a draft. */
async function ownNorm(
  firm: Awaited<ReturnType<typeof firmOwner>>,
  fields: { code: string; title: string; draft?: boolean },
) {
  const normId = await firm.as.mutation(api.catalog.norms.create, {
    source: "organization",
    organizationId: firm.organizationId,
    code: fields.code,
    title: fields.title,
    unit: "mp",
    resources: tilingResources,
  });
  if (!fields.draft) {
    await firm.as.mutation(api.catalog.norms.publish, { normId });
  }
  return normId;
}

describe("the search menu", () => {
  test("with nothing typed, shows the devize changed last", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    setSystemTime(Date.now() + 60_000);
    const later = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Bucătărie Dorobanți",
    });
    const found = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: "  ",
    });
    expect(found.estimates.map((estimate) => estimate._id)).toEqual([
      later,
      estimateId,
    ]);
    expect(found.estimates[1]).toMatchObject({
      title: "Baie apartament",
      clientName: "Ion Popescu",
    });
    expect(found.clients).toEqual([]);
    expect(found.norms).toEqual([]);
  });

  test("finds devize, clients and norms by their words, without diacritics", async () => {
    const t = setup();
    const { firm, estimateId, normId } = await devizFor(t);
    const byTitle = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: "baie",
    });
    expect(byTitle.estimates.map((estimate) => estimate._id)).toEqual([
      estimateId,
    ]);
    // The number as typed, or as the code shows it.
    for (const text of ["1", "DVZ-0001"]) {
      const byNumber = await firm.as.query(api.search.everywhere.find, {
        organizationId: firm.organizationId,
        text,
      });
      expect(byNumber.estimates.map((estimate) => estimate._id)).toEqual([
        estimateId,
      ]);
    }
    const client = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: "popescu",
    });
    expect(client.clients).toEqual([
      expect.objectContaining({ name: "Ion Popescu", kind: "person" }),
    ]);
    const norm = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: "faianta",
    });
    expect(norm.norms).toEqual([
      {
        _id: normId,
        code: "DV-FAI-01",
        title: "Placare cu faianță pe pereți",
        unit: "mp",
        own: false,
      },
    ]);
  });

  test("finds an issued invoice by its number", async () => {
    const t = setup();
    const { firm, advanceId } = await issuedAdvance(t);
    for (const text of ["1", "0001", "DVZ-0001", "dvz 1"]) {
      const found = await firm.as.query(api.search.everywhere.find, {
        organizationId: firm.organizationId,
        text,
      });
      expect(found.invoices).toEqual([
        expect.objectContaining({
          _id: advanceId,
          code: "DVZ-0001",
          series: "DVZ",
          number: 1,
          kind: "advance",
          buyerName: "Ion Popescu",
        }),
      ]);
    }
    for (const text of ["2", "ABC-0001", "factura"]) {
      const found = await firm.as.query(api.search.everywhere.find, {
        organizationId: firm.organizationId,
        text,
      });
      expect(found.invoices).toEqual([]);
    }
  });

  test("finds the firm's own norms first, never another firm's or a draft", async () => {
    const t = setup();
    const { firm, normId } = await devizFor(t);
    const own = await ownNorm(firm, {
      code: "AN-FAI-01",
      title: "Faianță pe pereți, rețeta firmei",
    });
    await ownNorm(firm, {
      code: "AN-FAI-02",
      title: "Faianță în lucru",
      draft: true,
    });
    const other = await firmOwner(t, "Mihai");
    await ownNorm(other, {
      code: "MH-FAI-01",
      title: "Faianță la Mihai",
    });
    const found = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: "faianta",
    });
    expect(found.norms.map((norm) => [norm._id, norm.own])).toEqual([
      [own, true],
      [normId, false],
    ]);
  });

  test("finds an invoice in a series that ends in a dash", async () => {
    const t = setup();
    const { firm, estimateId, organizationId } = await issuedAdvance(t);
    await firm.as.mutation(api.invoices.settings.addSeries, {
      organizationId,
      code: "fact-",
      nextNumber: 7,
    });
    const finalId = await firm.as.mutation(api.invoices.invoices.createFinal, {
      estimateId,
    });
    const { code } = await firm.as.mutation(api.invoices.invoices.issue, {
      invoiceId: finalId,
      series: "FACT-",
    });
    expect(code).toBe("FACT--0007");
    for (const text of ["FACT--0007", "fact 7", "7"]) {
      const found = await firm.as.query(api.search.everywhere.find, {
        organizationId,
        text,
      });
      expect(found.invoices.map((invoice) => invoice._id)).toEqual([finalId]);
    }
    const dvz = await firm.as.query(api.search.everywhere.find, {
      organizationId,
      text: "DVZ-0007",
    });
    expect(dvz.invoices).toEqual([]);
  });

  test("finds nothing for punctuation alone", async () => {
    const t = setup();
    const { firm } = await devizFor(t);
    const found = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: " — ",
    });
    expect(found).toEqual({
      estimates: [],
      clients: [],
      invoices: [],
      norms: [],
    });
  });

  test("shows only the firm's own rows, and only to its members", async () => {
    const t = setup();
    const { firm } = await devizFor(t);
    const other = await firmOwner(t, "Mihai");
    await other.as.mutation(api.accounts.clients.create, {
      organizationId: other.organizationId,
      kind: "person",
      name: "Ion Popa",
    });
    const found = await firm.as.query(api.search.everywhere.find, {
      organizationId: firm.organizationId,
      text: "ion",
    });
    expect(found.clients.map((client) => client.name)).toEqual(["Ion Popescu"]);
    await expect(
      other.as.query(api.search.everywhere.find, {
        organizationId: firm.organizationId,
        text: "baie",
      }),
    ).rejects.toThrow();
  });
});

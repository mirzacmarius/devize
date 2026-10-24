import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import { issuedAdvance } from "../invoices/test.helper";
import { devizFor } from "../offers/test.helper";
import { firmOwner, setup } from "../test.helper";

afterEach(() => {
  setSystemTime();
});

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

import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api } from "../_generated/api";
import { roundLei } from "../estimates/recap";
import { firmOwner, setup } from "../test.helper";
import { billedDeviz, ionAtHome, issuedAdvance } from "./test.helper";

// A Friday in October 2026: the deadline is the Friday after.
const today = new Date("2026-10-23T10:00:00Z");

afterEach(() => {
  setSystemTime();
});

describe("invoices", () => {
  test("the advance of an accepted Ofertă, issued with the first number", async () => {
    setSystemTime(today);
    const t = setup();
    const { firm, estimateId, acceptedNet, advanceNet } = await billedDeviz(t);
    const before = await firm.as.query(api.invoices.invoices.forEstimate, {
      estimateId,
    });
    expect(before.invoices).toEqual([]);
    expect(before.accepted?.depositPercent).toBe(30);
    expect(before.canAdvance).toBe(true);
    expect(before.canFinal).toBe(true);
    expect(before.remainingNet).toBe(acceptedNet);
    expect(acceptedNet).toBeGreaterThan(0);

    const advanceId = await firm.as.mutation(
      api.invoices.invoices.createAdvance,
      { estimateId },
    );
    const draft = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(draft).toMatchObject({
      kind: "advance",
      status: "draft",
      code: null,
      advancePercent: 30,
      issueDate: "2026-10-23",
      dueDate: "2026-11-22",
      efactura: { status: "not_sent", deadline: "2026-10-30" },
      mentions: ["TVA la încasare", "Mulțumim!"],
      seriesOptions: [],
      canCancel: true,
    });
    expect(draft.estimate).toMatchObject({
      code: "DVZ-0001",
      title: "Baie apartament",
    });
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0]).toMatchObject({
      unit: "buc",
      quantity: 1,
      unitPrice: advanceNet,
      net: advanceNet,
      vatRate: 21,
      vatCategory: "S",
    });
    expect(draft.lines[0]?.description).toBe(
      "Avans 30% pentru lucrarea „Baie apartament”, conform ofertei acceptate DVZ-0001 din 23.10.2026",
    );
    expect(draft.totals).toEqual({
      net: advanceNet,
      vat: roundLei(advanceNet * 0.21),
      total: roundLei(advanceNet + roundLei(advanceNet * 0.21)),
      byRate: [
        {
          vatRate: 21,
          vatCategory: "S",
          net: advanceNet,
          vat: roundLei(advanceNet * 0.21),
        },
      ],
    });
    // The firm and the client as they stand, the firm's address split.
    expect(draft.seller).toMatchObject({
      name: "Ana Construct SRL",
      kind: "company",
      cui: "2816464",
      vatRegistered: true,
      tradeRegister: "J12/1234/2020",
      address: "Str. Fabricii 10",
      city: "Cluj-Napoca",
      county: "Cluj",
      email: "office@anaconstruct.ro",
      iban: "RO49AAAA1B31007593840000",
      bank: "Banca Exemplu",
      shareCapital: 200,
    });
    expect(draft.buyer).toEqual({
      name: "Ion Popescu",
      kind: "person",
      vatRegistered: false,
      phone: "0722 123 456",
    });
    // Ion's card has no address, so the XML would lack his city and county.
    expect(draft.findings.map((finding) => finding.id)).toEqual([
      "buyerStreet",
      "buyerCounty",
      "buyerCity",
      "buyerCnp",
    ]);
    await expect(
      firm.as.mutation(api.invoices.invoices.issue, { invoiceId: advanceId }),
    ).rejects.toThrow(/checks/);

    await firm.as.mutation(api.invoices.invoices.update, {
      invoiceId: advanceId,
      buyer: ionAtHome,
      notes: "Avans conform contract.",
    });
    const fixed = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(fixed.buyer).toEqual({
      name: "Ion Popescu",
      kind: "person",
      vatRegistered: false,
      phone: "0722 123 456",
      address: "Bd. Unirii 5",
      city: "Sector 3",
      county: "București",
      cui: "1900101123456",
    });
    expect(fixed.notes).toBe("Avans conform contract.");
    expect(fixed.findings).toEqual([]);

    // Not in the future, not in a series the firm doesn't have.
    await expect(
      firm.as.mutation(api.invoices.invoices.issue, {
        invoiceId: advanceId,
        issueDate: "2026-10-24",
      }),
    ).rejects.toThrow(/issueDate/);
    await expect(
      firm.as.mutation(api.invoices.invoices.issue, {
        invoiceId: advanceId,
        series: "XX",
      }),
    ).rejects.toThrow(/series/);

    const { code } = await firm.as.mutation(api.invoices.invoices.issue, {
      invoiceId: advanceId,
    });
    expect(code).toBe("DVZ-0001");
    const issued = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(issued).toMatchObject({
      status: "issued",
      series: "DVZ",
      number: 1,
      code: "DVZ-0001",
      issueDate: "2026-10-23",
      dueDate: "2026-11-22",
      issuedBy: firm.userId,
      mentions: ["TVA la încasare", "Mulțumim!"],
    });
    expect(issued.efactura.deadline).toBe("2026-10-30");
    expect(issued.seriesOptions).toEqual([
      { code: "DVZ", nextNumber: 2, isDefault: true },
    ]);

    // An issued invoice is frozen.
    await expect(
      firm.as.mutation(api.invoices.invoices.update, {
        invoiceId: advanceId,
        notes: "x",
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.invoices.invoices.remove, { invoiceId: advanceId }),
    ).rejects.toThrow(/locked/);

    const after = await firm.as.query(api.invoices.invoices.forEstimate, {
      estimateId,
    });
    expect(after.invoicedNet).toBe(advanceNet);
    expect(after.remainingNet).toBe(roundLei(acceptedNet - advanceNet));
    expect(after.canAdvance).toBe(false);
    expect(after.canFinal).toBe(true);
    expect(after.openAdvances).toBe(1);
    expect(after.invoices.map((invoice) => invoice.code)).toEqual(["DVZ-0001"]);
  });

  test("the final invoice deducts the advance, gets paid, and a storno reverses it", async () => {
    setSystemTime(today);
    const t = setup();
    const {
      firm,
      estimateId,
      organizationId,
      acceptedNet,
      advanceNet,
      advanceId,
    } = await issuedAdvance(t);

    const finalId = await firm.as.mutation(api.invoices.invoices.createFinal, {
      estimateId,
    });
    const draft = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: finalId,
    });
    expect(draft.kind).toBe("final");
    expect(draft.lines).toHaveLength(2);
    expect(draft.lines[0]).toMatchObject({
      description:
        "Lucrări de construcții „Baie apartament”, conform devizului DVZ-0001, acceptat la 23.10.2026",
      quantity: 1,
      unitPrice: acceptedNet,
      vatRate: 21,
    });
    expect(draft.lines[1]).toMatchObject({
      description: "Storno avans factura DVZ-0001 din 23.10.2026",
      quantity: -1,
      unitPrice: advanceNet,
      net: -advanceNet,
      vatRate: 21,
      vatCategory: "S",
      settles: advanceId,
    });
    expect(draft.settlesInvoiceIds).toEqual([advanceId]);
    expect(draft.settles).toHaveLength(1);
    expect(draft.settles[0]).toMatchObject({
      _id: advanceId,
      code: "DVZ-0001",
      issueDate: "2026-10-23",
    });
    expect(draft.totals.net).toBe(roundLei(acceptedNet - advanceNet));
    // Ion's address, corrected on the advance, carries over.
    expect(draft.buyer).toMatchObject({
      address: "Bd. Unirii 5",
      city: "Sector 3",
      county: "București",
    });
    expect(draft.findings).toEqual([]);

    const { code } = await firm.as.mutation(api.invoices.invoices.issue, {
      invoiceId: finalId,
    });
    expect(code).toBe("DVZ-0002");
    const billing = await firm.as.query(api.invoices.invoices.forEstimate, {
      estimateId,
    });
    expect(billing.invoicedNet).toBe(acceptedNet);
    expect(billing.remainingNet).toBe(0);
    expect(billing.openAdvances).toBe(0);
    expect(billing.canFinal).toBe(false);

    // The XML names the advance it deducts and the Deviz.
    const { xml, fileName } = await firm.as.query(api.invoices.xml.forInvoice, {
      invoiceId: finalId,
    });
    expect(fileName).toBe("Factura-DVZ-0002.xml");
    expect(xml).toContain("<cbc:ID>DVZ-0002</cbc:ID>");
    expect(xml).toContain(
      "<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>DVZ-0001</cbc:ID><cbc:IssueDate>2026-10-23</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>",
    );
    expect(xml).toContain("<cbc:Note>TVA la încasare</cbc:Note>");
    expect(xml).toContain("<cbc:ID>Deviz DVZ-0001</cbc:ID>");
    expect(xml).toContain("<cbc:Note>Scadență 22.11.2026</cbc:Note>");
    expect(xml).toContain("<cbc:CityName>SECTOR3</cbc:CityName>");

    // Payments: a part, then the rest; then one taken back.
    const total = (
      await firm.as.query(api.invoices.invoices.get, { invoiceId: finalId })
    ).totals.total;
    await firm.as.mutation(api.invoices.invoices.addPayment, {
      invoiceId: finalId,
      date: "2026-10-24",
      amount: 100,
      method: "cash",
    });
    let paid = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: finalId,
    });
    expect(paid.status).toBe("issued");
    expect(paid.paidAmount).toBe(100);
    await firm.as.mutation(api.invoices.invoices.addPayment, {
      invoiceId: finalId,
      date: "2026-10-25",
      method: "transfer",
      note: "OP 12",
    });
    paid = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: finalId,
    });
    expect(paid.status).toBe("paid");
    expect(paid.paidAmount).toBe(total);
    expect(paid.paidAt).toBe(Date.parse("2026-10-25T12:00:00Z"));
    expect(paid.payments).toEqual([
      { date: "2026-10-24", amount: 100, method: "cash" },
      {
        date: "2026-10-25",
        amount: roundLei(total - 100),
        method: "transfer",
        note: "OP 12",
      },
    ]);
    // Nothing is owed, so there is nothing to record.
    await expect(
      firm.as.mutation(api.invoices.invoices.addPayment, {
        invoiceId: finalId,
        date: "2026-10-26",
        method: "cash",
      }),
    ).rejects.toThrow(/paymentAmount/);
    await firm.as.mutation(api.invoices.invoices.removePayment, {
      invoiceId: finalId,
      index: 1,
    });
    paid = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: finalId,
    });
    expect(paid.status).toBe("issued");
    expect(paid.paidAmount).toBe(100);
    expect(paid.paidAt).toBeUndefined();
    // Paid in part, it can't be cancelled; it is reversed instead.
    await expect(
      firm.as.mutation(api.invoices.invoices.cancel, { invoiceId: finalId }),
    ).rejects.toThrow(/locked/);

    const stornoId = await firm.as.mutation(
      api.invoices.invoices.createStorno,
      { invoiceId: finalId, reason: "sumă greșită" },
    );
    const storno = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: stornoId,
    });
    expect(storno.kind).toBe("storno");
    expect(storno.notes).toBe(
      "Stornare factura DVZ-0002 din 23.10.2026: sumă greșită",
    );
    expect(storno.lines.map((line) => line.quantity)).toEqual([-1, 1]);
    expect(storno.totals.total).toBe(-total);
    expect(storno.stornoOf).toMatchObject({
      _id: finalId,
      code: "DVZ-0002",
      total,
    });
    expect(storno.buyer).toEqual(paid.buyer);
    expect(storno.findings).toEqual([]);
    expect(
      (
        await firm.as.query(
          api.invoices.invoices.issue !== undefined
            ? api.invoices.invoices.get
            : api.invoices.invoices.get,
          {
            invoiceId: finalId,
          },
        )
      ).stornoedBy,
    ).toBeNull();
    expect(
      (
        await firm.as.mutation(api.invoices.invoices.issue, {
          invoiceId: stornoId,
        })
      ).code,
    ).toBe("DVZ-0003");
    const original = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: finalId,
    });
    expect(original.stornoedBy).toMatchObject({
      _id: stornoId,
      code: "DVZ-0003",
    });
    // The final no longer counts, so the advance is open again.
    const again = await firm.as.query(api.invoices.invoices.forEstimate, {
      estimateId,
    });
    expect(again.invoicedNet).toBe(advanceNet);
    expect(again.openAdvances).toBe(1);
    expect(again.canFinal).toBe(true);
    // Neither a storno nor a reversed invoice is reversed again.
    await expect(
      firm.as.mutation(api.invoices.invoices.createStorno, {
        invoiceId: stornoId,
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.invoices.invoices.createStorno, {
        invoiceId: finalId,
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.invoices.invoices.addPayment, {
        invoiceId: stornoId,
        date: "2026-10-26",
        method: "cash",
      }),
    ).rejects.toThrow(/locked/);

    // The firm's list, and the Deviz that can't go while they exist.
    const page = await firm.as.query(api.invoices.invoices.list, {
      organizationId,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.isDone).toBe(true);
    expect(page.page.map((row) => row.code).sort()).toEqual([
      "DVZ-0001",
      "DVZ-0002",
      "DVZ-0003",
    ]);
    expect(page.page[0]?.estimate).toMatchObject({ code: "DVZ-0001" });
    const issuedOnly = await firm.as.query(api.invoices.invoices.list, {
      organizationId,
      status: "draft",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(issuedOnly.page).toEqual([]);
    await expect(
      firm.as.mutation(api.estimates.estimates.remove, { estimateId }),
    ).rejects.toThrow(/invoices/);
  });

  test("cancelling an unsent, unpaid invoice keeps its number taken", async () => {
    setSystemTime(today);
    const t = setup();
    const { firm, estimateId, advanceId } = await issuedAdvance(t);
    await firm.as.mutation(api.invoices.invoices.cancel, {
      invoiceId: advanceId,
    });
    const cancelled = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: advanceId,
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.code).toBe("DVZ-0001");
    await expect(
      firm.as.mutation(api.invoices.invoices.cancel, { invoiceId: advanceId }),
    ).rejects.toThrow(/locked/);
    const billing = await firm.as.query(api.invoices.invoices.forEstimate, {
      estimateId,
    });
    expect(billing.invoicedNet).toBe(0);
    expect(billing.canAdvance).toBe(true);
    // The next advance takes the next number, never the cancelled one.
    const nextId = await firm.as.mutation(api.invoices.invoices.createAdvance, {
      estimateId,
    });
    const { code } = await firm.as.mutation(api.invoices.invoices.issue, {
      invoiceId: nextId,
    });
    expect(code).toBe("DVZ-0002");
    // Deleting is for owners and admins; drafts go, issued invoices stay.
    const draftId = await firm.as.mutation(api.invoices.invoices.createFinal, {
      estimateId,
    });
    await firm.as.mutation(api.invoices.invoices.remove, {
      invoiceId: draftId,
    });
    await expect(
      firm.as.query(api.invoices.invoices.get, { invoiceId: draftId }),
    ).rejects.toThrow(/not_found/);
  });

  test("each series counts on its own, and dates never go back", async () => {
    setSystemTime(today);
    const t = setup();
    const { firm, estimateId, organizationId, advanceId } =
      await issuedAdvance(t);
    const avId = await firm.as.mutation(api.invoices.settings.addSeries, {
      organizationId,
      code: "AV",
      nextNumber: 100,
    });
    const finalId = await firm.as.mutation(api.invoices.invoices.createFinal, {
      estimateId,
    });
    const final = await firm.as.query(api.invoices.invoices.get, {
      invoiceId: finalId,
    });
    expect(final.seriesOptions.map((series) => series.code)).toEqual([
      "AV",
      "DVZ",
    ]);
    expect(
      (
        await firm.as.mutation(api.invoices.invoices.issue, {
          invoiceId: finalId,
          series: "AV",
        })
      ).code,
    ).toBe("AV-0100");
    // DVZ gave 1, so it can only continue above it.
    const dvz = (
      await firm.as.query(api.invoices.settings.get, { organizationId })
    ).series.find((series) => series.code === "DVZ");
    if (!dvz) {
      throw new Error("no DVZ series");
    }
    await expect(
      firm.as.mutation(api.invoices.settings.updateSeries, {
        seriesId: dvz._id,
        nextNumber: 1,
      }),
    ).rejects.toThrow(/nextNumber/);
    await expect(
      firm.as.mutation(api.invoices.settings.removeSeries, {
        seriesId: dvz._id,
      }),
    ).rejects.toThrow(/in_use/);
    await firm.as.mutation(api.invoices.settings.updateSeries, {
      seriesId: dvz._id,
      nextNumber: 5,
    });
    await firm.as.mutation(api.invoices.settings.updateSeries, {
      seriesId: avId,
      active: false,
    });
    const stornoId = await firm.as.mutation(
      api.invoices.invoices.createStorno,
      { invoiceId: advanceId },
    );
    // Before the last DVZ invoice, or in a series put away: refused.
    await expect(
      firm.as.mutation(api.invoices.invoices.issue, {
        invoiceId: stornoId,
        series: "DVZ",
        issueDate: "2026-10-22",
      }),
    ).rejects.toThrow(/issueDate/);
    await expect(
      firm.as.mutation(api.invoices.invoices.issue, {
        invoiceId: stornoId,
        series: "AV",
      }),
    ).rejects.toThrow(/series/);
    expect(
      (
        await firm.as.mutation(api.invoices.invoices.issue, {
          invoiceId: stornoId,
          series: "DVZ",
        })
      ).code,
    ).toBe("DVZ-0005");
  });

  test("another firm sees nothing, and a deleted Deviz takes its drafts along", async () => {
    setSystemTime(today);
    const t = setup();
    const { firm, estimateId, advanceId } = await issuedAdvance(t);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.query(api.invoices.invoices.get, { invoiceId: advanceId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.query(api.invoices.xml.forInvoice, { invoiceId: advanceId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.invoices.invoices.createFinal, { estimateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.invoices.invoices.createStorno, {
        invoiceId: advanceId,
      }),
    ).rejects.toThrow(/not_found/);
    expect(
      await firm.as.query(api.invoices.invoices.forStatement, {
        workStatementId: "nothing",
      }),
    ).toBeNull();

    // A Deviz with only drafts can go, and they go with it.
    const t2 = setup();
    const second = await billedDeviz(t2);
    const draftId = await second.firm.as.mutation(
      api.invoices.invoices.createAdvance,
      { estimateId: second.estimateId },
    );
    await second.firm.as.mutation(api.estimates.estimates.remove, {
      estimateId: second.estimateId,
    });
    await t2.finishAllScheduledFunctions(() => {});
    await expect(
      second.firm.as.query(api.invoices.invoices.get, { invoiceId: draftId }),
    ).rejects.toThrow(/not_found/);
  });
});

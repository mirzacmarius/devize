import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup } from "../test.helper";
import { cleanIban } from "./settings";

describe("invoice settings", () => {
  test("start from defaults and keep what the firm saves", async () => {
    const t = setup();
    const firm = await firmOwner(t, "Ana");
    const organizationId = firm.organizationId;
    const initial = await firm.as.query(api.invoices.settings.get, {
      organizationId,
    });
    expect(initial).toEqual({
      iban: null,
      bank: null,
      shareCapital: null,
      city: null,
      postalCode: null,
      paymentTermDays: 15,
      vatOnCollection: false,
      footer: null,
      series: [],
      canEdit: true,
    });

    await firm.as.mutation(api.invoices.settings.save, {
      organizationId,
      iban: "ro49 aaaa 1b31 0075 9384 0000",
      bank: "Banca Exemplu",
      shareCapital: 200,
      city: "Cluj-Napoca",
      postalCode: "400001",
      paymentTermDays: 30,
      vatOnCollection: true,
      footer: "Mulțumim!\n\nPlata prin transfer bancar.",
    });
    const saved = await firm.as.query(api.invoices.settings.get, {
      organizationId,
    });
    expect(saved).toMatchObject({
      iban: "RO49AAAA1B31007593840000",
      bank: "Banca Exemplu",
      shareCapital: 200,
      city: "Cluj-Napoca",
      postalCode: "400001",
      paymentTermDays: 30,
      vatOnCollection: true,
      footer: "Mulțumim!\n\nPlata prin transfer bancar.",
    });

    // Fields left out stay; null and "" clear.
    await firm.as.mutation(api.invoices.settings.save, {
      organizationId,
      shareCapital: null,
      footer: "",
      iban: "",
    });
    const cleared = await firm.as.query(api.invoices.settings.get, {
      organizationId,
    });
    expect(cleared).toMatchObject({
      iban: null,
      bank: "Banca Exemplu",
      shareCapital: null,
      footer: null,
      paymentTermDays: 30,
    });
  });

  test("refuses a wrong IBAN, term or capital", async () => {
    expect(cleanIban("RO49AAAA1B31007593840000")).toBe(
      "RO49AAAA1B31007593840000",
    );
    expect(cleanIban("  ")).toBeUndefined();
    // A wrong check digit, and too short.
    expect(() => cleanIban("RO49AAAA1B31007593840001")).toThrow(/iban/);
    expect(() => cleanIban("RO12")).toThrow(/iban/);

    const t = setup();
    const firm = await firmOwner(t, "Ana");
    const organizationId = firm.organizationId;
    await expect(
      firm.as.mutation(api.invoices.settings.save, {
        organizationId,
        paymentTermDays: 400,
      }),
    ).rejects.toThrow(/paymentTermDays/);
    await expect(
      firm.as.mutation(api.invoices.settings.save, {
        organizationId,
        shareCapital: -1,
      }),
    ).rejects.toThrow(/shareCapital/);
  });

  test("series: the first is the default, codes are unique and numbers only go up", async () => {
    const t = setup();
    const firm = await firmOwner(t, "Ana");
    const organizationId = firm.organizationId;
    const faId = await firm.as.mutation(api.invoices.settings.addSeries, {
      organizationId,
      code: "fa",
    });
    await expect(
      firm.as.mutation(api.invoices.settings.addSeries, {
        organizationId,
        code: "FA",
      }),
    ).rejects.toThrow(/in_use/);
    await expect(
      firm.as.mutation(api.invoices.settings.addSeries, {
        organizationId,
        code: "F A",
      }),
    ).rejects.toThrow(/series/);
    await expect(
      firm.as.mutation(api.invoices.settings.addSeries, {
        organizationId,
        code: "AV",
        nextNumber: 0,
      }),
    ).rejects.toThrow(/nextNumber/);
    const avId = await firm.as.mutation(api.invoices.settings.addSeries, {
      organizationId,
      code: "AV",
      nextNumber: 100,
    });
    let settings = await firm.as.query(api.invoices.settings.get, {
      organizationId,
    });
    expect(settings.series).toEqual([
      {
        _id: avId,
        code: "AV",
        nextNumber: 100,
        isDefault: false,
        active: true,
      },
      { _id: faId, code: "FA", nextNumber: 1, isDefault: true, active: true },
    ]);

    // The default moves; a number below 1 is refused.
    await firm.as.mutation(api.invoices.settings.updateSeries, {
      seriesId: avId,
      isDefault: true,
    });
    await expect(
      firm.as.mutation(api.invoices.settings.updateSeries, {
        seriesId: faId,
        nextNumber: 0,
      }),
    ).rejects.toThrow(/nextNumber/);
    await firm.as.mutation(api.invoices.settings.updateSeries, {
      seriesId: faId,
      nextNumber: 7,
      active: false,
    });
    settings = await firm.as.query(api.invoices.settings.get, {
      organizationId,
    });
    expect(settings.series).toEqual([
      { _id: avId, code: "AV", nextNumber: 100, isDefault: true, active: true },
      { _id: faId, code: "FA", nextNumber: 7, isDefault: false, active: false },
    ]);

    // Removing the default hands it to the series left.
    await firm.as.mutation(api.invoices.settings.removeSeries, {
      seriesId: avId,
    });
    settings = await firm.as.query(api.invoices.settings.get, {
      organizationId,
    });
    expect(settings.series).toEqual([
      { _id: faId, code: "FA", nextNumber: 7, isDefault: true, active: false },
    ]);

    // Another firm's owner sees and changes nothing.
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.query(api.invoices.settings.get, { organizationId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.invoices.settings.updateSeries, {
        seriesId: faId,
        active: true,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.invoices.settings.save, {
        organizationId,
        bank: "x",
      }),
    ).rejects.toThrow(/not_found/);
  });
});

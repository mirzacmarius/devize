import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup } from "../test.helper";
import { issuedAdvance } from "./test.helper";

// Made-up firms and clients, like every fixture.

const pageOpts = { numItems: 10, cursor: null };

describe("the invoice archive", () => {
  test("holds each numbered invoice with what its PDF prints and its XML, but no draft", async () => {
    const t = setup();
    const { firm, organizationId, estimateId, advanceId } =
      await issuedAdvance(t);
    await firm.as.mutation(api.invoices.invoices.createFinal, { estimateId });

    const result = await firm.as.query(api.invoices.archive.page, {
      organizationId,
      paginationOpts: pageOpts,
    });
    expect(result.isDone).toBe(true);
    expect(result.page).toHaveLength(1);
    const [advance] = result.page;
    expect(advance).toMatchObject({
      _id: advanceId,
      code: "DVZ-0001",
      kind: "advance",
      status: "issued",
      issuer: "Ana",
      estimate: { code: "DVZ-0001", title: "Baie apartament" },
      stornoOf: null,
      mentions: ["TVA la încasare", "Mulțumim!"],
    });
    expect(advance?.xml).toContain("<cbc:ID>DVZ-0001</cbc:ID>");
  });

  test("keeps a cancelled invoice's PDF but no XML, since it never went to ANAF", async () => {
    const t = setup();
    const { firm, organizationId, advanceId } = await issuedAdvance(t);
    await firm.as.mutation(api.invoices.invoices.cancel, {
      invoiceId: advanceId,
    });
    const result = await firm.as.query(api.invoices.archive.page, {
      organizationId,
      paginationOpts: pageOpts,
    });
    expect(result.page.map((row) => [row.status, row.xml])).toEqual([
      ["cancelled", null],
    ]);
  });

  test("is only for the firm's members", async () => {
    const t = setup();
    const { organizationId } = await issuedAdvance(t);
    const bogdan = await firmOwner(t, "Bogdan");
    await expect(
      bogdan.as.query(api.invoices.archive.page, {
        organizationId,
        paginationOpts: pageOpts,
      }),
    ).rejects.toThrow();
  });
});

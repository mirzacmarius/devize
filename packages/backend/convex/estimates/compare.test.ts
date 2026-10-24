import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { devizFor } from "../offers/test.helper";
import { firmOwner, setup } from "../test.helper";

describe("Comparare revizii", () => {
  test("shows what a revision changed, the earlier one first", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, ceilingId } = await devizFor(t);
    const first = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const revisionId = await firm.as.mutation(
      api.estimates.estimates.duplicate,
      { estimateId, asRevision: true },
    );
    const second = await firm.as.query(api.estimates.estimates.get, {
      estimateId: revisionId,
    });
    // Each article of the revision remembers the one it was copied from.
    expect(second.lineItems.map((item) => item.originId)).toEqual([
      tilingId,
      ceilingId,
    ]);
    const tiling = second.lineItems.find((item) => item.originId === tilingId);
    const ceiling = second.lineItems.find(
      (item) => item.originId === ceilingId,
    );
    if (!tiling || !ceiling) {
      throw new Error("The revision lacks an article");
    }
    await firm.as.mutation(api.estimates.lineItems.update, {
      lineItemId: tiling._id,
      quantity: 30,
      title: "Placare cu faianță, format mare",
    });
    await firm.as.mutation(api.estimates.lineItems.remove, {
      lineItemId: ceiling._id,
    });
    await firm.as.mutation(api.estimates.lineItems.addCustom, {
      estimateId: revisionId,
      title: "Curățenie finală",
      unit: "buc",
      quantity: 1,
      resources: [
        {
          kind: "labor",
          name: "Muncitor",
          unit: "ora",
          quantity: 4,
          unitPrice: 35,
        },
      ],
    });
    await firm.as.mutation(api.estimates.estimates.update, {
      estimateId: revisionId,
      markups: { ...first.markups, profit: first.markups.profit + 5 },
    });

    // The same answer from either revision.
    const fromSecond = await firm.as.query(api.estimates.compare.compare, {
      estimateId: revisionId,
      withId: estimateId,
    });
    const fromFirst = await firm.as.query(api.estimates.compare.compare, {
      estimateId,
      withId: revisionId,
    });
    expect(fromFirst).toEqual(fromSecond);
    const after = await firm.as.query(api.estimates.estimates.get, {
      estimateId: revisionId,
    });
    expect(fromSecond).toMatchObject({
      number: 1,
      before: {
        _id: estimateId,
        revision: 1,
        totals: first.totals,
        markups: first.markups,
      },
      after: {
        _id: revisionId,
        revision: 2,
        totals: after.totals,
        markups: { profit: first.markups.profit + 5 },
      },
    });
    const { lines } = fromSecond;
    expect(lines.unchanged).toBe(0);
    expect(lines.changed).toEqual([
      expect.objectContaining({
        _id: tiling._id,
        fields: ["title", "quantity"],
        before: expect.objectContaining({ quantity: 24 }),
        after: expect.objectContaining({
          quantity: 30,
          title: "Placare cu faianță, format mare",
        }),
      }),
    ]);
    const tilingChange = lines.changed[0];
    expect(tilingChange?.difference).toBeCloseTo(
      (tilingChange?.after?.total ?? 0) - (tilingChange?.before?.total ?? 0),
      2,
    );
    expect(lines.removed).toEqual([
      expect.objectContaining({
        _id: ceilingId,
        after: null,
        before: expect.objectContaining({
          title: "Tavan fals din gips-carton",
          quantity: 6,
        }),
      }),
    ]);
    expect(lines.added).toEqual([
      expect.objectContaining({
        before: null,
        after: expect.objectContaining({
          title: "Curățenie finală",
          unitPrice: 140,
          total: 140,
        }),
        difference: 140,
      }),
    ]);
  });

  test("a copy starts afresh, and only revisions of one number compare", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const copyId = await firm.as.mutation(api.estimates.estimates.duplicate, {
      estimateId,
    });
    const copy = await firm.as.query(api.estimates.estimates.get, {
      estimateId: copyId,
    });
    expect(copy.lineItems.map((item) => item.originId)).toEqual([
      undefined,
      undefined,
    ]);
    await expect(
      firm.as.query(api.estimates.compare.compare, {
        estimateId,
        withId: copyId,
      }),
    ).rejects.toThrow(/not_found/);
    await expect(
      firm.as.query(api.estimates.compare.compare, {
        estimateId,
        withId: estimateId,
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("another firm can't compare a firm's revisions", async () => {
    const t = setup();
    const { firm, estimateId } = await devizFor(t);
    const revisionId = await firm.as.mutation(
      api.estimates.estimates.duplicate,
      { estimateId, asRevision: true },
    );
    const other = await firmOwner(t, "Mihai");
    const mine = await other.as.mutation(api.estimates.estimates.create, {
      organizationId: other.organizationId,
      title: "Casa lui Mihai",
    });
    await expect(
      other.as.query(api.estimates.compare.compare, {
        estimateId: revisionId,
        withId: estimateId,
      }),
    ).rejects.toThrow();
    // Its own Deviz no. 1 doesn't open another firm's no. 1 either.
    await expect(
      other.as.query(api.estimates.compare.compare, {
        estimateId: mine,
        withId: estimateId,
      }),
    ).rejects.toThrow(/not_found/);
  });
});

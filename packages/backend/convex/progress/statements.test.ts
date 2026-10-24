import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { firmOwner, setup } from "../test.helper";
import { acceptedDeviz, statementFor } from "./test.helper";

describe("statements", () => {
  test("the first statement snapshots the contract and nothing is executed yet", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, ceilingId } = await acceptedDeviz(t);
    const before = await firm.as.query(api.progress.statements.forEstimate, {
      estimateId,
    });
    expect(before.accepted).toBe(true);
    expect(before.statements).toEqual([]);
    expect(before.contract.rows).toBe(2);
    expect(before.canCreate).toBe(true);
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    // The contract is the Deviz as accepted.
    expect(before.contract.subtotal).toBe(estimate.totals.subtotal);
    expect(before.contract.total).toBe(estimate.totals.total);
    expect(before.executed.subtotal).toBe(0);
    expect(before.remainingSubtotal).toBe(estimate.totals.subtotal);

    const { statementId, statement } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      date: "2026-11-30",
    });
    expect(statement.number).toBe(1);
    expect(statement.status).toBe("draft");
    expect(statement.editable).toBe(true);
    expect(statement.rows.map((row) => [row.lineItemId, row.position])).toEqual(
      [
        [tilingId, 1],
        [ceilingId, 2],
      ],
    );
    const tiling = estimate.lineItems.find((item) => item._id === tilingId);
    expect(statement.rows[0]).toMatchObject({
      code: "DV-FAI-01",
      unit: "mp",
      contractQuantity: 24,
      previousQuantity: 0,
      quantity: 0,
      unitCost: tiling?.unitCost,
      percent: 0,
      remainingQuantity: 24,
    });
    expect(statement.period.total).toBe(0);
    expect(statement.contract.subtotal).toBe(estimate.totals.subtotal);
    expect(statement.estimate.client?.name).toBe("Ion Popescu");

    // A second statement can't start while the first is a draft.
    await expect(
      firm.as.mutation(api.progress.statements.create, {
        estimateId,
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
      }),
    ).rejects.toThrow(/locked/);
    const after = await firm.as.query(api.progress.statements.forEstimate, {
      estimateId,
    });
    expect(after.canCreate).toBe(false);
    expect(after.statements.map((s) => s._id)).toEqual([statementId]);
    expect(after.nextPeriodStart).toBe("2026-12-01");
  });

  test("executed quantities add up through the statements, with the Atașament", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    const first = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    const [tiling, ceiling] = first.statement.rows;
    if (!tiling || !ceiling) {
      throw new Error("rows");
    }
    await firm.as.mutation(api.progress.statements.setQuantity, {
      rowId: tiling._id,
      quantity: 10,
    });
    // The Atașament: a wall less its door, applied to the row.
    await firm.as.mutation(api.progress.statements.setAttachment, {
      rowId: ceiling._id,
      rows: [
        { label: "Baie", count: 1, length: 2.5, width: 1.8, deduct: false },
        { label: "Trapă", count: 1, length: 0.6, width: 0.6, deduct: true },
      ],
      applyTotal: true,
    });
    let statement = await firm.as.query(api.progress.statements.get, {
      statementId: first.statementId,
    });
    expect(statement.rows[0]?.quantity).toBe(10);
    expect(statement.rows[0]?.cumulativeQuantity).toBe(10);
    expect(statement.rows[0]?.remainingQuantity).toBe(14);
    expect(statement.rows[0]?.percent).toBe(41.7);
    expect(statement.rows[1]?.quantity).toBe(4.14);
    expect(statement.rows[1]?.attachmentTotal).toBe(4.14);
    expect(statement.rows[1]?.attachment).toHaveLength(2);
    expect(statement.period.subtotal).toBeGreaterThan(0);
    expect(statement.totals).toEqual(statement.period);
    expect(statement.percent).toBeGreaterThan(0);

    // Sent, then approved by the beneficiary's diriginte.
    await firm.as.mutation(api.progress.statements.setStatus, {
      statementId: first.statementId,
      status: "sent",
    });
    await expect(
      firm.as.mutation(api.progress.statements.setQuantity, {
        rowId: tiling._id,
        quantity: 11,
      }),
    ).rejects.toThrow(/locked/);
    await firm.as.mutation(api.progress.statements.setStatus, {
      statementId: first.statementId,
      status: "approved",
      approvedBy: "ing. Vasile Pop, diriginte de șantier",
    });
    statement = await firm.as.query(api.progress.statements.get, {
      statementId: first.statementId,
    });
    expect(statement.status).toBe("approved");
    expect(statement.approvedBy).toBe("ing. Vasile Pop, diriginte de șantier");
    expect(statement.approvedAt).toBeDefined();
    expect(statement.editable).toBe(false);

    // The second statement starts from what the first reached.
    const second = await statementFor(firm, estimateId, {
      periodStart: "2026-12-01",
      periodEnd: "2026-12-15",
    });
    expect(second.statement.number).toBe(2);
    expect(second.statement.rows[0]).toMatchObject({
      previousQuantity: 10,
      quantity: 0,
      cumulativeQuantity: 10,
      remainingQuantity: 14,
    });
    expect(second.statement.rows[1]?.previousQuantity).toBe(4.14);
    // The first one is frozen now that a second exists.
    expect(
      (
        await firm.as.query(api.progress.statements.get, {
          statementId: first.statementId,
        })
      ).latest,
    ).toBe(false);
    await expect(
      firm.as.mutation(api.progress.statements.setStatus, {
        statementId: first.statementId,
        status: "draft",
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.progress.statements.remove, {
        statementId: first.statementId,
      }),
    ).rejects.toThrow(/locked/);

    // Everything left is done in this period.
    const changed = await firm.as.mutation(
      api.progress.statements.completeAll,
      {
        statementId: second.statementId,
      },
    );
    expect(changed).toBe(2);
    const done = await firm.as.query(api.progress.statements.get, {
      statementId: second.statementId,
    });
    expect(done.rows.map((row) => row.quantity)).toEqual([14, 1.86]);
    expect(done.rows.every((row) => row.remainingQuantity === 0)).toBe(true);
    expect(done.percent).toBe(100);
    expect(done.remainingSubtotal).toBe(0);
    const estimate = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    expect(done.cumulative.subtotal).toBe(estimate.totals.subtotal);
    expect(done.cumulative.total).toBe(estimate.totals.total);

    const summary = await firm.as.query(api.progress.statements.forEstimate, {
      estimateId,
    });
    expect(summary.executed.percent).toBe(100);
    expect(summary.approved?.subtotal).toBe(statement.cumulative.subtotal);
    expect(summary.statements.map((s) => s.status)).toEqual([
      "approved",
      "draft",
    ]);
  });

  test("more than the contract is allowed and flagged", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    const { statementId, statement } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    const row = statement.rows[0];
    if (!row) {
      throw new Error("row");
    }
    await firm.as.mutation(api.progress.statements.setQuantity, {
      rowId: row._id,
      quantity: 30,
    });
    const over = await firm.as.query(api.progress.statements.get, {
      statementId,
    });
    expect(over.rows[0]?.over).toBe(true);
    expect(over.rows[0]?.remainingQuantity).toBe(-6);
    expect(over.rows[0]?.percent).toBe(125);
    await expect(
      firm.as.mutation(api.progress.statements.setQuantity, {
        rowId: row._id,
        quantity: -1,
      }),
    ).rejects.toThrow(/quantity/);
    await expect(
      firm.as.mutation(api.progress.statements.update, {
        statementId,
        periodStart: "2026-12-01",
      }),
    ).rejects.toThrow(/period/);
    await firm.as.mutation(api.progress.statements.update, {
      statementId,
      periodEnd: "2026-12-31",
      notes: "Inclusiv lucrările suplimentare cerute pe șantier.",
    });
    const updated = await firm.as.query(api.progress.statements.get, {
      statementId,
    });
    expect(updated.periodEnd).toBe("2026-12-31");
    expect(updated.notes).toBe(
      "Inclusiv lucrările suplimentare cerute pe șantier.",
    );
  });

  test("only accepted devize have statements, only their firm sees them", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.query(api.progress.statements.forEstimate, { estimateId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.mutation(api.progress.statements.create, {
        estimateId,
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
      }),
    ).rejects.toThrow(/not_found/);
    const { statementId } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    await expect(
      other.as.query(api.progress.statements.get, { statementId }),
    ).rejects.toThrow(/not_found/);

    // A Deviz under execution can't go back to a draft.
    await expect(
      firm.as.mutation(api.estimates.estimates.setStatus, {
        estimateId,
        status: "draft",
      }),
    ).rejects.toThrow(/locked/);

    // A draft Deviz has none.
    const draftId = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Încă o ciornă",
    });
    await expect(
      firm.as.mutation(api.progress.statements.create, {
        estimateId: draftId,
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
      }),
    ).rejects.toThrow(/locked/);

    // Deleting the last statement, then the Deviz with everything.
    await firm.as.mutation(api.progress.statements.remove, { statementId });
    expect(
      (await firm.as.query(api.progress.statements.forEstimate, { estimateId }))
        .statements,
    ).toEqual([]);
    await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    await firm.as.mutation(api.estimates.estimates.remove, { estimateId });
    await t.finishAllScheduledFunctions(() => {});
    const left = await t.run(async (ctx) => ({
      statements: await ctx.db.query("workStatements").collect(),
      rows: await ctx.db.query("workStatementRows").collect(),
    }));
    expect(left).toEqual({ statements: [], rows: [] });
  });

  test("the contract is what the client accepted on the Ofertă's link", async () => {
    const t = setup();
    const { firm, estimateId, tilingId, ceilingId } = await acceptedDeviz(
      t,
      "Carmen",
    );
    // Back to sent, so an Ofertă can go out with the ceiling optional and a
    // pricier Variantă of the tiles.
    await t.run(async (ctx) => {
      await ctx.db.patch("estimates", estimateId, { status: "sent" });
      const item = await ctx.db.get("lineItems", tilingId);
      const tiles = item?.resources.find((r) => r.name === "Faianță");
      if (!item || !tiles) {
        throw new Error("no tiles");
      }
      await ctx.db.insert("variants", {
        organizationId: firm.organizationId,
        estimateId,
        name: "Premium",
        tier: "premium",
        position: 1,
        swaps: [
          {
            lineItemId: tilingId,
            resourceKey: tiles.key,
            name: "Faianță rectificată",
            unitPrice: 120,
            priceSource: "manual",
          },
        ],
      });
    });
    const variantId = (
      await t.run(async (ctx) => await ctx.db.query("variants").collect())
    )[0]?._id;
    if (!variantId) {
      throw new Error("variant");
    }
    const { token } = await firm.as.mutation(api.offers.offers.create, {
      estimateId,
      variantIds: [variantId],
      optionalItems: [{ lineItemId: ceilingId, included: false }],
    });
    await t.mutation(api.offers.public.choose, {
      token,
      variantId,
      excludedItemIds: [ceilingId],
    });
    await t.mutation(api.offers.public.accept, {
      token,
      variantId,
      excludedItemIds: [ceilingId],
      name: "Ion Popescu",
      signature: "M40 120 L60 80 L80 130 L100 70 L130 125 M150 90 L220 95",
    });
    const { statement } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    });
    // Only the tiling, at the Variantă's price.
    expect(statement.rows.map((row) => row.lineItemId)).toEqual([tilingId]);
    const item = await t.run(
      async (ctx) => await ctx.db.get("lineItems", tilingId),
    );
    expect(statement.rows[0]?.unitCost.material).toBeGreaterThan(
      item?.unitCost.material ?? 0,
    );
    const offer = await firm.as.query(api.offers.offers.forEstimate, {
      estimateId,
    });
    expect(statement.contract.total).toBe(offer?.choice?.totals.total ?? -1);
  });

  test("what an invoice reads", async () => {
    const t = setup();
    const { firm, estimateId, clientId } = await acceptedDeviz(t);
    await firm.as.mutation(api.progress.guarantees.set, {
      estimateId,
      percent: 5,
      method: "retention",
    });
    const { statementId, statement } = await statementFor(firm, estimateId, {
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      date: "2026-12-01",
    });
    const row = statement.rows[0];
    if (!row) {
      throw new Error("row");
    }
    await firm.as.mutation(api.progress.statements.setQuantity, {
      rowId: row._id,
      quantity: 12,
    });
    const data = await firm.as.query(api.progress.statements.forInvoice, {
      statementId,
    });
    expect(data.status).toBe("draft");
    expect(data.number).toBe(1);
    expect(data.periodStart).toBe("2026-11-01");
    expect(data.date).toBe("2026-12-01");
    expect(data.estimate).toMatchObject({
      number: 1,
      revision: 1,
      title: "Baie apartament",
      clientId,
      siteAddress: "Str. Lungă 10, Brașov",
    });
    expect(data.markups.vat).toBe(21);
    expect(data.rows).toHaveLength(2);
    expect(data.rows[0]).toMatchObject({
      lineItemId: row.lineItemId,
      code: "DV-FAI-01",
      unit: "mp",
      quantity: 12,
      unitPrice: row.unitPrice,
    });
    expect(data.rows[0]?.value).toBe(
      Math.round(row.unitPrice * 12 * 100) / 100,
    );
    expect(data.rows[1]?.value).toBe(0);
    expect(data.totals.subtotal).toBeGreaterThan(0);
    expect(data.totals.total).toBe(
      Math.round((data.totals.subtotal + data.totals.vat) * 100) / 100,
    );
    expect(data.retention).toEqual({
      percent: 5,
      amount: Math.round(data.totals.subtotal * 5) / 100,
    });
    expect(data.cumulative.subtotal).toBe(data.totals.subtotal);
    expect(data.contract.subtotal).toBe(statement.contract.subtotal);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.query(api.progress.statements.forInvoice, { statementId }),
    ).rejects.toThrow(/not_found/);
  });
});

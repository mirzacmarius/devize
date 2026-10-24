import { describe, expect, it } from "bun:test";
import { api } from "../_generated/api";
import { acceptedDeviz, statementFor } from "../progress/test.helper";
import { setup } from "../test.helper";
import { statementLine } from "./statements";

describe("the invoice of a Situație de lucrări", () => {
  it("bills an approved statement once, with its period and retention", async () => {
    const t = setup();
    const { firm, estimateId } = await acceptedDeviz(t);
    await firm.as.mutation(api.progress.guarantees.set, {
      estimateId,
      percent: 5,
      method: "retention",
    });
    const { statementId } = await statementFor(firm, estimateId, {
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
    });
    await firm.as.mutation(api.progress.statements.completeAll, {
      statementId,
    });

    // A statement the beneficiary hasn't confirmed can't be invoiced.
    await expect(
      firm.as.mutation(api.invoices.statements.fromStatement, {
        workStatementId: statementId,
      }),
    ).rejects.toThrow(/unapproved/);

    await firm.as.mutation(api.progress.statements.setStatus, {
      statementId,
      status: "sent",
    });
    await firm.as.mutation(api.progress.statements.setStatus, {
      statementId,
      status: "approved",
      approvedBy: "ing. Vasile Pop, diriginte de șantier",
    });
    const statement = await firm.as.query(api.progress.statements.forInvoice, {
      statementId,
    });
    expect(statement.totals.subtotal).toBeGreaterThan(0);
    expect(statement.retention.amount).toBeGreaterThan(0);

    const invoiceId = await firm.as.mutation(
      api.invoices.statements.fromStatement,
      { workStatementId: statementId },
    );
    const invoice = await firm.as.query(api.invoices.invoices.get, {
      invoiceId,
    });
    expect(invoice.kind).toBe("statement");
    expect(invoice.status).toBe("draft");
    expect(invoice.workStatementId).toBe(statementId);
    expect(invoice.period).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0]?.description).toContain(
      "Situației de lucrări nr. 1",
    );
    expect(invoice.lines[0]?.description).toContain("„Baie apartament”");
    expect(invoice.lines[0]?.unitPrice).toBe(statement.totals.subtotal);
    expect(invoice.totals.net).toBe(statement.totals.subtotal);
    expect(invoice.retention).toEqual({
      percent: 5,
      amount: statement.retention.amount,
    });
    expect(invoice.buyer.name).toBe("Ion Popescu");

    // The statement's page finds its invoice, and a second one is refused.
    const listed = await firm.as.query(api.invoices.invoices.forStatement, {
      workStatementId: statementId,
    });
    expect(listed?._id).toBe(invoiceId);
    await expect(
      firm.as.mutation(api.invoices.statements.fromStatement, {
        workStatementId: statementId,
      }),
    ).rejects.toThrow(/in_use/);

    // Deleting the draft frees the statement for another invoice.
    await firm.as.mutation(api.invoices.invoices.remove, { invoiceId });
    expect(
      await firm.as.query(api.invoices.invoices.forStatement, {
        workStatementId: statementId,
      }),
    ).toBeNull();
  });

  it("keeps the line's text within the XML's limit", () => {
    const statement = {
      number: 12,
      date: "2026-10-31",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
    };
    const short = statementLine(statement, {
      code: "DVZ-0001",
      title: "Baie apartament",
    });
    expect(short).toBe(
      "Lucrări executate conform Situației de lucrări nr. 12 din 31.10.2026, perioada 01.10.2026 – 31.10.2026, deviz DVZ-0001 „Baie apartament”",
    );
    const long = statementLine(statement, {
      code: "DVZ-0001-R2",
      title: "x".repeat(300),
    });
    expect(long.length).toBeLessThanOrEqual(200);
    expect(long.endsWith("…”")).toBe(true);
  });
});

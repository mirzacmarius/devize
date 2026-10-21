import { describe, expect, test } from "bun:test";
import { type CheckInput, runChecks } from "./checks";

const ready: CheckInput = {
  lineItems: [
    { resources: [{ name: "Adeziv", priceSource: "listing" }] },
    { resources: [{ name: "Manoperă", priceSource: "own" }] },
  ],
  client: { name: "Maria Ionescu" },
  vat: 21,
  vatPayer: true,
  updates: {
    priceChangeCount: 0,
    normUpdates: [],
    currentTotals: { total: 1000 },
    repricedTotals: { total: 1000 },
  },
};

const states = (input: CheckInput) =>
  Object.fromEntries(runChecks(input).map((check) => [check.id, check.state]));

describe("runChecks", () => {
  test("passes a priced Deviz with a client and the firm's VAT", () => {
    expect(Object.values(states(ready))).toEqual(Array(7).fill("passed"));
  });

  test("names each resource without a price once", () => {
    const checks = runChecks({
      ...ready,
      lineItems: [
        { resources: [{ name: "Adeziv", priceSource: "missing" }] },
        {
          resources: [
            { name: "Adeziv", priceSource: "missing" },
            { name: "Plasă", priceSource: "missing" },
          ],
        },
      ],
    });
    expect(checks.find((check) => check.id === "prices")).toEqual({
      id: "prices",
      state: "failed",
      missing: ["Adeziv", "Plasă"],
    });
  });

  test("warns about newer prices and norms, with the change in the total", () => {
    const checks = runChecks({
      ...ready,
      updates: {
        priceChangeCount: 3,
        normUpdates: [{}],
        currentTotals: { total: 1000.1 },
        repricedTotals: { total: 1120.3 },
      },
    });
    expect(checks.find((check) => check.id === "current")).toEqual({
      id: "current",
      state: "warning",
      count: 3,
      difference: 120.2,
    });
    expect(checks.find((check) => check.id === "norms")?.state).toBe("warning");
  });

  test("checks VAT against the firm, and waits while loading", () => {
    // 0% can be right for a VAT payer, with taxare inversă.
    expect(states({ ...ready, vat: 0 }).vat).toBe("warning");
    expect(states({ ...ready, vatPayer: false }).vat).toBe("failed");
    expect(states({ ...ready, vat: 0, vatPayer: false }).vat).toBe("passed");
    expect(states({ ...ready, vatPayer: undefined }).vat).toBe("pending");
    expect(states({ ...ready, updates: undefined }).current).toBe("pending");
  });

  test("flags an empty Deviz, a missing client and unconfirmed AI items", () => {
    expect(states({ ...ready, lineItems: [] }).items).toBe("failed");
    expect(states({ ...ready, client: null }).client).toBe("warning");
    const proposed = states({
      ...ready,
      lineItems: [{ confidence: "high", resources: [] }],
    });
    expect(proposed.ai).toBe("warning");
  });
});

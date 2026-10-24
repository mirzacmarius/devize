import { describe, expect, test } from "bun:test";
import { type CheckInput, runChecks } from "./checks";

type Resource = CheckInput["lineItems"][number]["resources"][number];

const adhesive: Resource = {
  name: "Adeziv",
  priceSource: "listing",
  kind: "material",
  unit: "kg",
  unitPrice: 2.4,
};
const labor: Resource = {
  name: "Manoperă",
  priceSource: "reference",
  kind: "labor",
  unit: "oră",
  unitPrice: 45,
};

const ready: CheckInput = {
  lineItems: [
    { resources: [adhesive] },
    { resources: [{ ...labor, priceSource: "own" }] },
  ],
  client: { name: "Maria Ionescu" },
  tender: false,
  omissions: {
    status: "applied",
    found: 2,
    questions: [],
    remarks: [],
    appliedCount: 1,
  },
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
    expect(Object.values(states(ready))).toEqual(Array(9).fill("passed"));
  });

  test("names each resource without a price once", () => {
    const checks = runChecks({
      ...ready,
      lineItems: [
        { resources: [{ ...adhesive, priceSource: "missing" }] },
        {
          resources: [
            { ...adhesive, priceSource: "missing" },
            { ...adhesive, name: "Plasă", priceSource: "missing" },
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

  test("names labour by the hour priced under the legal minimum, once", () => {
    const checks = runChecks({
      ...ready,
      lineItems: [
        { resources: [{ ...labor, name: "Zidar", unitPrice: 20 }] },
        {
          resources: [
            { ...labor, name: "Zidar", unitPrice: 25 },
            // Per m², the price says nothing about the wage behind it.
            { ...labor, name: "Faianțar", unit: "mp", unitPrice: 5 },
            { ...labor, name: "Dulgher", unitPrice: 30 },
          ],
        },
      ],
    });
    expect(checks.find((check) => check.id === "labor")).toEqual({
      id: "labor",
      state: "warning",
      names: ["Zidar"],
      floor: 27.71,
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
    // 0% can be right for a VAT payer, for exempt or reverse-charge supplies.
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

  test("follows the omissions check from its start to its review", () => {
    const omissions = (value: CheckInput["omissions"], tender = false) => {
      const check = runChecks({ ...ready, omissions: value, tender }).find(
        (found) => found.id === "omissions",
      );
      return check?.id === "omissions" ? check : undefined;
    };
    const check = {
      status: "ready" as const,
      found: 3,
      questions: ["Dușul are rigolă?"],
      remarks: [],
      appliedCount: 0,
    };
    expect(omissions(undefined)?.status).toBe("loading");
    expect(omissions(null)).toMatchObject({ state: "pending", status: "none" });
    expect(omissions({ ...check, status: "working" })?.state).toBe("pending");
    expect(omissions({ ...check, status: "failed" })?.state).toBe("warning");
    expect(omissions(check)).toEqual({
      id: "omissions",
      state: "warning",
      status: "found",
      works: 3,
      questions: 1,
      remarks: 0,
      tender: false,
    });
    // A tender's clarifications wait for review too.
    expect(
      omissions({ ...check, found: 0, questions: ["Lipsește molozul."] }, true),
    ).toMatchObject({ state: "warning", works: 0, questions: 1, tender: true });
    expect(omissions({ ...check, found: 0, questions: [] })?.status).toBe(
      "clear",
    );
    expect(
      omissions({ ...check, status: "applied", appliedCount: 2 }),
    ).toMatchObject({ state: "passed", status: "applied", works: 2 });
    // Set aside after review, or stopped before it found anything.
    expect(omissions({ ...check, status: "dismissed" })?.status).toBe(
      "reviewed",
    );
    expect(
      omissions({ ...check, status: "dismissed", found: 0, questions: [] }),
    ).toMatchObject({ state: "pending", status: "none" });
  });
});

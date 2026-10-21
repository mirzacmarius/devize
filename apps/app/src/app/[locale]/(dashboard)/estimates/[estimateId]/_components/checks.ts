// The checks a Deviz should pass before it goes to a client, always in this
// order. Each one says what is wrong in numbers, so the person can fix it.

export type CheckState = "passed" | "warning" | "failed" | "pending";

export type Check =
  | { id: "items"; state: "passed" | "failed"; count: number }
  | { id: "prices"; state: "passed" | "failed"; missing: string[] }
  | {
      id: "current";
      state: "passed" | "warning" | "pending";
      count: number;
      // Lei with VAT the total would change by at today's prices.
      difference: number;
    }
  | { id: "norms"; state: "passed" | "warning" | "pending"; count: number }
  | { id: "ai"; state: "passed" | "warning"; count: number }
  | { id: "client"; state: "passed" | "warning"; name?: string }
  | {
      id: "vat";
      // A VAT payer at 0% is only a warning: construction work between VAT
      // payers is invoiced with taxare inversă, at 0%.
      state: "passed" | "warning" | "failed" | "pending";
      vat: number;
      vatPayer?: boolean;
    };

export type CheckInput = {
  lineItems: readonly {
    confidence?: unknown;
    resources: readonly { name: string; priceSource: string }[];
  }[];
  client: { name: string } | null;
  vat: number;
  // Undefined while the firm loads.
  vatPayer: boolean | undefined;
  // Undefined while the backend compares with today's prices and norms.
  updates:
    | {
        priceChangeCount: number;
        normUpdates: readonly unknown[];
        currentTotals: { total: number };
        repricedTotals: { total: number };
      }
    | undefined;
};

export function runChecks(input: CheckInput): Check[] {
  const missing = [
    ...new Set(
      input.lineItems.flatMap((item) =>
        item.resources
          .filter((resource) => resource.priceSource === "missing")
          .map((resource) => resource.name),
      ),
    ),
  ];
  const proposed = input.lineItems.filter(
    (item) => item.confidence !== undefined,
  ).length;
  const { updates } = input;

  return [
    {
      id: "items",
      state: input.lineItems.length > 0 ? "passed" : "failed",
      count: input.lineItems.length,
    },
    { id: "prices", state: missing.length > 0 ? "failed" : "passed", missing },
    {
      id: "current",
      state: !updates
        ? "pending"
        : updates.priceChangeCount > 0
          ? "warning"
          : "passed",
      count: updates?.priceChangeCount ?? 0,
      difference: updates
        ? Math.round(
            (updates.repricedTotals.total - updates.currentTotals.total) * 100,
          ) / 100
        : 0,
    },
    {
      id: "norms",
      state: !updates
        ? "pending"
        : updates.normUpdates.length > 0
          ? "warning"
          : "passed",
      count: updates?.normUpdates.length ?? 0,
    },
    { id: "ai", state: proposed > 0 ? "warning" : "passed", count: proposed },
    {
      id: "client",
      state: input.client ? "passed" : "warning",
      name: input.client?.name,
    },
    {
      id: "vat",
      state:
        input.vatPayer === undefined
          ? "pending"
          : input.vatPayer
            ? input.vat > 0
              ? "passed"
              : "warning"
            : input.vat === 0
              ? "passed"
              : "failed",
      vat: input.vat,
      vatPayer: input.vatPayer,
    },
  ];
}

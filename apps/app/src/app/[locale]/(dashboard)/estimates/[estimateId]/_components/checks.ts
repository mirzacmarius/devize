// The checks a Deviz should pass before it goes to a client, always in this
// order. Each one says what is wrong in numbers, so the person can fix it.

export type CheckState = "passed" | "warning" | "failed" | "pending";

export type Check =
  | { id: "items"; state: "passed" | "failed"; count: number }
  | {
      id: "omissions";
      state: "passed" | "warning" | "pending";
      // none: never checked, or stopped before it found anything; found:
      // what it found waits for review; reviewed: set aside after review.
      status:
        | "loading"
        | "none"
        | "working"
        | "failed"
        | "found"
        | "clear"
        | "applied"
        | "reviewed";
      // The missing works found, or added once applied.
      works: number;
      // For the client, or for a tender's contracting authority.
      questions: number;
      remarks: number;
      tender: boolean;
    }
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
  tender: boolean;
  // The newest omissions check: null when there is none, undefined while
  // it loads.
  omissions:
    | {
        status:
          | "working"
          | "ready"
          | "applying"
          | "applied"
          | "dismissed"
          | "failed";
        found: number;
        questions: readonly string[];
        remarks: readonly string[];
        appliedCount: number;
      }
    | null
    | undefined;
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

function omissionsCheck(input: CheckInput): Check {
  const check = input.omissions;
  const counts = {
    works: check?.found ?? 0,
    questions: check?.questions.length ?? 0,
    remarks: check?.remarks.length ?? 0,
    tender: input.tender,
  };
  const found = counts.works + counts.questions + counts.remarks > 0;
  const status = (() => {
    switch (check?.status) {
      case undefined:
        return check === undefined ? "loading" : "none";
      case "working":
      case "applying":
        return "working";
      case "failed":
        return "failed";
      case "ready":
        return found ? "found" : "clear";
      case "applied":
        return "applied";
      case "dismissed":
        return found ? "reviewed" : "none";
    }
  })();
  return {
    id: "omissions",
    state:
      status === "found" || status === "failed"
        ? "warning"
        : status === "clear" || status === "applied" || status === "reviewed"
          ? "passed"
          : "pending",
    status,
    ...counts,
    works: status === "applied" ? (check?.appliedCount ?? 0) : counts.works,
  };
}

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
    omissionsCheck(input),
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

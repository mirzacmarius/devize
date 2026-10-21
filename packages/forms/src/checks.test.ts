import { describe, expect, test } from "bun:test";
import { computeRecap } from "@devize/backend/convex/estimates/recap";
import {
  type CheckOptions,
  checkForms,
  type FormCheck,
  offerValue,
} from "./checks";
import { amountsOf, rowLabelled, tablesOf } from "./documents.helper";
import { buildDocuments } from "./index";
import type { ExportData } from "./input";
import { lineItem, sampleData, schoolData } from "./sample.helper";

const options: CheckOptions = {
  withValues: true,
  kinds: ["F1", "F2", "F3"],
  beneficiary: "Comuna Exemplu",
  months: 2,
  monthsChosen: true,
};

function find<Id extends FormCheck["id"]>(
  checks: readonly FormCheck[],
  id: Id,
): Extract<FormCheck, { id: Id }> | undefined {
  return checks.find(
    (check): check is Extract<FormCheck, { id: Id }> => check.id === id,
  );
}

// A line of a made-up tender's list: the authority's position, unit and
// quantity, and the line's own. Without a position, the bidder added it.
type Position = {
  position?: string;
  unit?: string;
  quantity?: number;
  listUnit?: string;
  listQuantity?: number;
};

/** A made-up tender: one object with one category of works, its lines as given. */
function tenderData(positions: readonly Position[]): ExportData {
  const data = sampleData();
  data.estimate.kind = "tender";
  data.sections = [
    {
      _id: "hall",
      kind: "object",
      code: "01",
      name: "Sala de sport",
      position: 1,
    },
    {
      _id: "finishes",
      kind: "chapter",
      parentId: "hall",
      code: "02",
      name: "Finisaje",
      position: 2,
    },
  ];
  data.lineItems = positions.map((line, index) => {
    const unit = line.unit ?? "mp";
    const quantity = line.quantity ?? 10;
    return lineItem({
      sectionId: "finishes",
      code: `X${index + 1}`,
      title: `Lucrarea ${index + 1}`,
      unit,
      quantity,
      tenderRef: line.position
        ? {
            position: line.position,
            unit: line.listUnit ?? unit,
            quantity: line.listQuantity ?? quantity,
          }
        : undefined,
      resources: [
        {
          kind: "labor",
          name: "Muncitor",
          unit: "ora",
          quantity: 0.5,
          unitPrice: 40,
        },
      ],
    });
  });
  return data;
}

describe("offerValue", () => {
  test("is what F1 totals, with and without VAT", () => {
    const data = schoolData();
    const value = offerValue(data, {});
    const [f1] = buildDocuments(data, ["F1"], {
      withValues: true,
      date: "2026-10-21",
    });
    const table = tablesOf(f1)[0];
    expect(amountsOf(rowLabelled(table, "TOTAL fără TVA"))[0]).toBe(
      value.subtotal,
    );
    expect(amountsOf(rowLabelled(table, "TOTAL cu TVA"))[0]).toBe(value.total);
    expect(value.rate).toBe(21);
    expect(value.total).toBe(
      Math.round((value.subtotal + value.vat) * 100) / 100,
    );
  });

  test("says by how much the categories' own closings move it", () => {
    const data = schoolData();
    const own = computeRecap(data.lineItems, data.estimate.markups);
    const value = offerValue(data, {});
    expect(value.difference).toBe(
      Math.round((value.subtotal - own.subtotal) * 100) / 100,
    );
  });
});

describe("checkForms", () => {
  test("passes a priced Deviz with its works placed", () => {
    const checks = checkForms(schoolData(), {
      ...options,
      kinds: ["F1", "F2", "F3", "F4", "F5"],
    });
    expect(checks.map((check) => [check.id, check.state])).toEqual([
      ["unpriced", "passed"],
      ["placement", "passed"],
      ["procurement", "passed"],
      ["beneficiary", "passed"],
    ]);
    expect(find(checks, "procurement")?.count).toBe(2);
  });

  test("names the lines that would print without a value", () => {
    const data = schoolData();
    const glet = lineItem({
      sectionId: "architecture",
      code: "AX99",
      title: "Glet de ipsos",
      unit: "mp",
      quantity: 85,
      resources: [],
    });
    data.lineItems = [...data.lineItems, glet];
    const checks = checkForms(data, options);
    expect(find(checks, "unpriced")).toEqual({
      id: "unpriced",
      state: "failed",
      lines: [
        {
          id: glet._id,
          number: "2",
          title: "Glet de ipsos",
          category: "01 Corp școală · Arhitectură",
        },
      ],
    });
    // Lists without prices have nothing to value.
    expect(
      find(checkForms(data, { ...options, withValues: false }), "unpriced"),
    ).toBeUndefined();
  });

  test("leaves the tender checks out when nothing came from the authority's lists", () => {
    const ids = checkForms(schoolData(), options).map((check) => check.id);
    expect(ids).not.toContain("repeated");
    expect(ids).not.toContain("missing");
  });

  test("finds repeated and missing positions in the authority's list", () => {
    const checks = checkForms(
      tenderData([
        { position: "1" },
        { position: "2" },
        { position: "2." },
        { position: "5" },
        // A heading: its own positions follow.
        { position: "6.1" },
        { position: "6.2" },
        { position: "8" },
        // A list that jumps is numbered that way.
        { position: "40" },
      ]),
      options,
    );
    expect(find(checks, "repeated")).toEqual({
      id: "repeated",
      state: "failed",
      positions: [{ number: "2", category: "02 Finisaje", count: 2 }],
    });
    expect(
      find(checks, "missing")?.positions.map((position) => position.number),
    ).toEqual(["3", "4", "7"]);
  });

  test("keeps zeros and sub-positions when it names a missing one", () => {
    const checks = checkForms(
      tenderData([
        { position: "01" },
        { position: "02" },
        { position: "04" },
        { position: "3.1" },
        { position: "3.3" },
      ]),
      options,
    );
    expect(
      find(checks, "missing")?.positions.map((position) => position.number),
    ).toEqual(["03", "3.2"]);
  });

  test("numbers the bidder's own lines among the authority's", () => {
    const checks = checkForms(
      tenderData([{ position: "1" }, {}, { position: "3" }]),
      options,
    );
    expect(find(checks, "added")?.lines).toEqual([
      expect.objectContaining({ number: "2", title: "Lucrarea 2" }),
    ]);
    // Line 2 prints as "2", the position the import left to add by hand.
    expect(find(checks, "repeated")?.state).toBe("passed");
    expect(find(checks, "missing")?.state).toBe("passed");
  });

  test("finds a quantity changed from the list's, in the list's unit", () => {
    const checks = checkForms(
      tenderData([
        // 2,432 × 100 mp is the list's 243,2 mp.
        {
          position: "1",
          unit: "100 mp",
          quantity: 2.432,
          listUnit: "mp",
          listQuantity: 243.2,
        },
        // 25 mp where the list has 0,2 × 100 mp.
        {
          position: "2",
          quantity: 25,
          listUnit: "100 mp",
          listQuantity: 0.2,
        },
        // Pieces priced by area are the bidder's to count.
        { position: "3", quantity: 3, listUnit: "buc", listQuantity: 7 },
      ]),
      options,
    );
    expect(find(checks, "quantities")).toEqual({
      id: "quantities",
      state: "warning",
      lines: [
        expect.objectContaining({
          number: "2",
          quantity: 0.25,
          tendered: 0.2,
          unit: "100 mp",
        }),
      ],
    });
  });

  test("asks to place the works no name placed, until the person does", () => {
    const data = schoolData();
    // A copy: the sample's sections are shared with other tests.
    data.sections = data.sections.map((section) =>
      section._id === "architecture"
        ? { ...section, name: "Diverse" }
        : section,
    );
    expect(find(checkForms(data, options), "placement")).toEqual({
      id: "placement",
      state: "warning",
      categories: [{ key: "architecture", name: "01 Corp școală · Diverse" }],
    });
    expect(
      find(
        checkForms(data, {
          ...options,
          subchapters: { architecture: "4.1.3" },
        }),
        "placement",
      )?.state,
    ).toBe("passed");
    // Forms that do not total by subchapter don't need it.
    expect(
      find(checkForms(data, { ...options, kinds: ["F3", "C6"] }), "placement"),
    ).toBeUndefined();
  });

  test("asks for F4 when the works buy equipment", () => {
    const checks = checkForms(schoolData(), options);
    expect(find(checks, "procurement")).toEqual({
      id: "procurement",
      state: "warning",
      count: 2,
      listed: false,
    });
    const none = checkForms(sampleData(), { ...options, kinds: ["F4"] });
    expect(find(none, "procurement")).toEqual({
      id: "procurement",
      state: "passed",
      count: 0,
      listed: true,
    });
  });

  test("asks for the tender's duration until the person sets it", () => {
    const data = schoolData();
    const planned = checkForms(data, {
      ...options,
      kinds: ["F6"],
      monthsChosen: false,
    });
    expect(find(planned, "duration")).toEqual({
      id: "duration",
      state: "warning",
      months: 2,
      hours: 108,
    });
    expect(
      find(checkForms(data, { ...options, kinds: ["F6"] }), "duration")?.state,
    ).toBe("passed");
  });

  test("asks for a beneficiary when the forms would print none", () => {
    expect(
      find(
        checkForms(schoolData(), { ...options, beneficiary: " " }),
        "beneficiary",
      ),
    ).toEqual({ id: "beneficiary", state: "warning", name: "" });
  });
});

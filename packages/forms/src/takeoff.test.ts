import { describe, expect, test } from "bun:test";
import { rowLabelled, tablesOf } from "./documents.helper";
import { buildDocuments } from "./index";
import type { ExportOptions, TakeoffData } from "./input";
import { sampleData } from "./sample.helper";

const options: ExportOptions = { withValues: true, date: "2026-10-23" };

// A made-up bathroom, measured for the sample Deviz's tiling line.
function takeoff(lineItemId: string): TakeoffData {
  return {
    rooms: [
      {
        _id: "bath",
        name: "Baie",
        level: "Etaj 1",
        length: 2.5,
        width: 2,
        height: 2.4,
        openings: [{ kind: "door", count: 1, width: 0.8, height: 2.05 }],
        measures: {
          floor: 5,
          ceiling: 5,
          walls: 19.96,
          wallsAndCeiling: 24.96,
          perimeter: 9,
          skirting: 8.2,
          openings: 1.64,
          doors: 1,
          windows: 0,
        },
      },
    ],
    takeoffs: [
      {
        _id: "t1",
        lineItemId,
        method: "rooms",
        unit: "mp",
        measure: "walls",
        rows: [
          {
            label: "Baie: perimetru × înălțime",
            count: 1,
            length: 9,
            height: 2.4,
            deduct: false,
          },
          {
            label: "Baie: ușă 0,80 × 2,05",
            count: 1,
            length: 0.8,
            height: 2.05,
            deduct: true,
          },
        ],
        total: 19.96,
      },
      {
        _id: "t2",
        method: "manual",
        title: "Măsurat la fața locului",
        unit: "mp",
        rows: [{ count: 2, length: 1.5, deduct: false }],
        total: 3,
      },
    ],
  };
}

describe("Anexa Antemăsurătoare", () => {
  test("isn't drawn without rooms or takeoffs", () => {
    expect(buildDocuments(sampleData(), ["AM"], options)).toEqual([]);
    expect(
      buildDocuments(
        { ...sampleData(), takeoff: { rooms: [], takeoffs: [] } },
        ["AM"],
        options,
      ),
    ).toEqual([]);
  });

  test("lists the rooms, then each Articol's rows against its quantity", () => {
    const data = sampleData();
    const tiling = data.lineItems.find((item) => item.code === "FX10");
    if (!tiling) {
      throw new Error("sample tiling line");
    }
    const [document] = buildDocuments(
      { ...data, takeoff: takeoff(tiling._id) },
      ["AM"],
      options,
    );
    expect(document?.id).toBe("AM");
    expect(document?.name).toBe("Anexa Antemăsurătoare · DVZ-0142");
    const [rooms, items] = tablesOf(document);
    expect(rooms?.rows[0]?.cells.map((cell) => cell.text)).toEqual([
      "1",
      "Baie",
      "2,50",
      "2,00",
      "2,40",
      "1 ușă 0,80 × 2,05",
      "5,00",
      "19,96",
      "9,00",
    ]);
    expect(rowLabelled(rooms, "Total camere")?.cells.at(-2)?.value).toBe(19.96);
    // The tiling line, numbered as the Deviz prints it, with its rows.
    const group = items?.rows.find((row) => row.kind === "group");
    expect(group?.cells[1]?.text).toBe(tiling.title);
    expect(group?.cells.at(-1)?.value).toBe(tiling.quantity);
    const deduction = items?.rows.find((row) =>
      row.cells.some((cell) => cell.text.startsWith("Baie: ușă")),
    );
    expect(deduction?.cells.at(-1)?.text).toBe("−1,64");
    expect(deduction?.cells.at(-1)?.value).toBe(-1.64);
    // The sample prices 18,25 mp by hand; the rooms measure 19,96.
    const measured = items?.rows.find((row) =>
      row.cells.some((cell) => cell.text === "Total măsurat"),
    );
    expect(measured?.cells.at(-1)?.value).toBe(19.96);
    expect(
      items?.rows.some((row) =>
        row.cells.some((cell) =>
          cell.text.startsWith("Devizul prețuiește 18,25"),
        ),
      ),
    ).toBe(true);
    // The takeoff left without a line closes the table.
    const orphan = [...(items?.rows ?? [])]
      .reverse()
      .find((row) => row.kind === "group");
    expect(orphan?.cells[1]?.text).toBe("Măsurători fără articol în deviz");
  });

  test("prints after the Deviz, before the official forms", () => {
    const data = sampleData();
    const documents = buildDocuments(
      { ...data, takeoff: takeoff(data.lineItems[0]?._id ?? "") },
      ["DEVIZ", "AM", "OF"],
      options,
    );
    expect(documents.map((document) => document.id)).toEqual([
      "DEVIZ",
      "AM",
      "OF",
    ]);
  });
});

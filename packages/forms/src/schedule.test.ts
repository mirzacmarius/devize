import { describe, expect, test } from "bun:test";
import { amountsOf, fields, rowLabelled, tablesOf } from "./documents.helper";
import { buildDocuments } from "./index";
import type { ExportOptions, Subchapter } from "./input";
import { schoolData } from "./sample.helper";
import {
  clampWindow,
  plannedWindow,
  scheduleOf,
  suggestedMonths,
} from "./schedule";
import { placeCategories } from "./subchapters";
import { buildTree } from "./tree";

const options: ExportOptions = { withValues: true, date: "2026-10-21" };

const bani = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;

describe("planning the schedule", () => {
  test("suggests the months a crew of ten needs for the labour hours", () => {
    expect(suggestedMonths(schoolData())).toEqual({ hours: 108, months: 1 });
    const data = schoolData();
    const bigger = {
      ...data,
      lineItems: data.lineItems.map((item) => ({
        ...item,
        quantity: item.quantity * 50,
      })),
    };
    // 5.388 hours, at 1.680 a month.
    expect(suggestedMonths(bigger)).toEqual({ hours: 5388, months: 4 });
  });

  test.each([
    ["5.1.1", "Construcții provizorii", 1, 1],
    ["4.1.1", "Terasamente", 1, 3],
    ["4.1.1", "Amenajări exterioare și alei", 8, 10],
    ["4.1.2", "Structură de rezistență", 2, 6],
    ["4.1.3", "Arhitectură", 5, 10],
    ["4.1.3", "Demolări", 1, 2],
    ["4.1.4", "Instalații electrice", 4, 10],
    ["4.3", "Utilaje", 8, 10],
    ["2", "Branșamente utilități", 7, 10],
    ["1.3", "Aducerea terenului la starea inițială", 9, 10],
  ] as const)(
    "runs %s %s in months %d–%d of ten",
    (subchapter, name, start, end) => {
      expect(plannedWindow(subchapter as Subchapter, name, 10)).toEqual({
        start,
        end,
      });
    },
  );

  test("puts everything in the one month of a one-month schedule", () => {
    expect(plannedWindow("4.1.3", "Arhitectură", 1)).toEqual({
      start: 1,
      end: 1,
    });
    expect(plannedWindow("1.3", "Ecologizare", 1)).toEqual({
      start: 1,
      end: 1,
    });
  });

  test("keeps the person's months within the duration", () => {
    expect(clampWindow({ start: 3, end: 9 }, 6)).toEqual({ start: 3, end: 6 });
    expect(clampWindow({ start: 0, end: -2 }, 6)).toEqual({ start: 1, end: 1 });
    expect(clampWindow({ start: 8, end: 2 }, 6)).toEqual({ start: 6, end: 6 });
  });

  test("spreads each category's value over its months, to the ban", () => {
    const data = schoolData();
    const { months, categories } = scheduleOf(
      data,
      placeCategories(buildTree(data), {}),
      { schedule: { months: 6, windows: { boiler: { start: 2, end: 9 } } } },
    );
    expect(months).toBe(6);
    for (const entry of categories) {
      expect(entry.values).toHaveLength(6);
      expect(bani(entry.values)).toBe(entry.category.recap.subtotal);
      const running = entry.values.slice(
        entry.window.start - 1,
        entry.window.end,
      );
      // In bani, the months differ by one at most.
      const inBani = running.map((value) => Math.round(value * 100));
      expect(Math.max(...inBani) - Math.min(...inBani)).toBeLessThanOrEqual(1);
      expect(bani(running)).toBe(entry.category.recap.subtotal);
    }
    const boiler = categories.find((entry) => entry.category.key === "boiler");
    expect(boiler?.window).toEqual({ start: 2, end: 6 });
  });
});

describe("F6, the general schedule", () => {
  const schedule = { months: 6 };

  test("adds up month by month to F1's total", () => {
    const [f1, f6] = buildDocuments(schoolData(), ["F1", "F6"], {
      ...options,
      schedule,
    });
    const [table] = tablesOf(f6);
    const [f1Total] = amountsOf(rowLabelled(tablesOf(f1)[0], "TOTAL fără TVA"));
    const total = amountsOf(rowLabelled(table, "TOTAL"));
    expect(total.at(-1)).toBe(f1Total ?? Number.NaN);
    expect(bani(total.slice(0, -1))).toBe(f1Total ?? Number.NaN);
    expect(amountsOf(rowLabelled(table, "Valoare cumulată")).at(-1)).toBe(
      f1Total ?? Number.NaN,
    );
    expect(fields(f6).Obiectivul).toBe(
      "Reabilitarea școlii gimnaziale din Exemplu",
    );
    expect(f6?.orientation).toBe("landscape");
  });

  test("lists site organisation first and draws each category's bar", () => {
    const [f6] = buildDocuments(schoolData(), ["F6"], { ...options, schedule });
    const rows = tablesOf(f6)[0]?.rows ?? [];
    expect(rows.slice(0, 3).map((row) => row.cells[1]?.text)).toEqual([
      "02 Organizare de șantier",
      "Construcții provizorii",
      "Lucrări generale",
    ]);
    const earthworks = rows.find((row) => row.cells[1]?.text === "Terasamente");
    // Months 1 and 2 of 6, then the category's total.
    expect(
      earthworks?.cells.slice(2, 8).map((cell) => cell.bar ?? false),
    ).toEqual([true, true, false, false, false, false]);
    expect(amountsOf(earthworks)).toEqual([531.45, 531.44, 1062.89]);
  });

  test("gives each year its own table", () => {
    const [f6] = buildDocuments(schoolData(), ["F6"], {
      ...options,
      schedule: { months: 15 },
    });
    const tables = tablesOf(f6);
    expect(tables.map((table) => table.header[0]?.[2]?.text)).toEqual([
      "Anul 1",
      "Anul 2",
    ]);
    expect(tables.map((table) => table.header[1]?.length)).toEqual([12, 3]);
    const years = tables.map(
      (table) => amountsOf(rowLabelled(table, "TOTAL")).at(-1) ?? 0,
    );
    const cumulated = amountsOf(rowLabelled(tables[1], "Valoare cumulată"));
    expect(cumulated.at(-1)).toBe(bani(years));
  });

  test("leaves the months blank for a designer", () => {
    const [f6] = buildDocuments(schoolData(), ["F6"], {
      ...options,
      withValues: false,
      schedule,
    });
    const rows = tablesOf(f6)[0]?.rows ?? [];
    expect(rows.flatMap((row) => row.cells).some((cell) => cell.bar)).toBe(
      false,
    );
    expect(rows.flatMap(amountsOf)).toEqual([]);
    expect(rowLabelled(tablesOf(f6)[0], "TOTAL")).toBeUndefined();
  });
});

import type { ExportData, ExportOptions } from "../input";
import type { Cell, FormDocument, HeaderCell, Row, Table } from "../model";
import { type ScheduledCategory, scheduleOf } from "../schedule";
import { placeCategories } from "../subchapters";
import { buildTree, type WorkObject } from "../tree";
import { countOf } from "../words";
import {
  categoryName,
  closingBlocks,
  currencyNote,
  empty,
  footerOf,
  formLabel,
  money,
  objectName,
  partyFields,
} from "./common";

// The general schedule of the works (HG 907/2016, Anexa 10, F6): each object
// and category of works over the months of the duration, as a bar through
// the months it runs in, with what it is worth in each, so the schedule is
// physical and in value at once. A table for each year of twelve months.

// The width the twelve months of a year share on a landscape page.
const monthsWidth = 540;

type Group = { object: WorkObject; categories: ScheduledCategory[] };

/**
 * The objects in the schedule's order: site organisation first, as F6
 * lists it, then the others as the Deviz does.
 */
function groupsOf(
  tree: readonly WorkObject[],
  categories: readonly ScheduledCategory[],
): Group[] {
  const groups = tree
    .map((object) => ({
      object,
      categories: categories.filter((entry) => entry.object === object),
    }))
    .filter((group) => group.categories.length > 0);
  const site = (group: Group) =>
    group.categories.every((entry) => entry.subchapter === "5.1.1");
  return [
    ...groups.filter((group) => site(group)),
    ...groups.filter((group) => !site(group)),
  ];
}

const sum = (values: readonly number[]) =>
  values.reduce((bani, value) => bani + Math.round(value * 100), 0) / 100;

/** What some categories are worth in each month, added up in bani. */
function monthTotals(categories: readonly ScheduledCategory[], months: number) {
  return Array.from({ length: months }, (_, month) =>
    sum(categories.map((entry) => entry.values[month] ?? 0)),
  );
}

function yearTable(
  groups: readonly Group[],
  months: number,
  year: number,
  options: ExportOptions,
): Table {
  const first = year * 12;
  const count = Math.min(12, months - first);
  const inYear = <T>(values: readonly T[]) =>
    values.slice(first, first + count);
  const width = Math.min(60, monthsWidth / count);
  const withValues = options.withValues;
  const amount = (value: number, bold?: boolean): Cell =>
    withValues && value !== 0 ? money(value, { bold }) : empty;

  const named =
    groups.length > 1 || groups.some((group) => !group.object.implicit);
  const rows: Row[] = [];
  groups.forEach((group, index) => {
    const number = String(index + 1);
    if (named) {
      const totals = inYear(monthTotals(group.categories, months));
      rows.push({
        kind: "item",
        keepWithNext: true,
        cells: [
          { text: number, align: "center", bold: true },
          { text: objectName(group.object), bold: true },
          ...totals.map((value) => amount(value, true)),
          amount(sum(totals), true),
        ],
      });
    }
    group.categories.forEach((entry, position) => {
      const values = inYear(entry.values);
      rows.push({
        kind: "item",
        cells: [
          {
            text: named ? `${number}.${position + 1}` : String(position + 1),
            align: "center",
          },
          { text: categoryName(entry.category) },
          ...values.map((value, month): Cell => {
            const running =
              first + month + 1 >= entry.window.start &&
              first + month + 1 <= entry.window.end;
            return withValues && running
              ? { ...amount(value), bar: true }
              : empty;
          }),
          amount(sum(values)),
        ],
      });
    });
  });

  // With prices, the value of each month and how much of the whole is done
  // by its end.
  const all = groups.flatMap((group) => group.categories);
  const totals = monthTotals(all, months);
  let done = sum(totals.slice(0, first));
  const cumulated = inYear(totals).map((value) => {
    done = sum([done, value]);
    return done;
  });
  if (withValues)
    rows.push(
      {
        kind: "total",
        keepWithNext: true,
        cells: [
          empty,
          { text: "TOTAL", bold: true },
          ...inYear(totals).map((value) => amount(value, true)),
          amount(sum(inYear(totals)), true),
        ],
      },
      {
        kind: "item",
        cells: [
          empty,
          { text: "Valoare cumulată" },
          ...cumulated.map((value) => amount(value)),
          empty,
        ],
      },
    );

  const header: HeaderCell[][] = [
    [
      { text: "Nr. crt.", rowSpan: 2 },
      { text: "Denumirea obiectului / categoriei de lucrări", rowSpan: 2 },
      { text: `Anul ${year + 1}`, colSpan: count },
      { text: `Total anul ${year + 1}`, rowSpan: 2 },
    ],
    Array.from({ length: count }, (_, month) => ({
      text: `Luna ${month + 1}`,
    })),
  ];
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 24, align: "center" },
      { width: 1, flex: true },
      ...Array.from({ length: count }, () => ({
        width,
        align: "right" as const,
      })),
      { width: 62, align: "right" },
    ],
    header,
    numbers: Array.from({ length: count + 3 }, (_, index) => String(index)),
    rows,
    fontSize: 7,
  };
}

/** F6: the works over the months of the duration, a table for each year. */
export function f6Documents(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const tree = buildTree(data);
  const { months, categories } = scheduleOf(
    data,
    placeCategories(tree, options),
    options,
  );
  const groups = groupsOf(tree, categories);
  const label = formLabel(options, "F6");
  const years = Math.ceil(months / 12);
  return [
    {
      id: "F6",
      label,
      name: label,
      orientation: "landscape",
      footer: footerOf(data, label),
      blocks: [
        partyFields(data, options, {}),
        {
          type: "title",
          lines: ["GRAFICUL GENERAL", "de realizare a investiției publice"],
        },
        {
          type: "text",
          text: `Durata de execuție: ${countOf(months, "lună", "luni")}`,
          align: "center",
          size: 8.5,
        },
        ...(options.withValues ? [currencyNote] : []),
        ...Array.from({ length: years }, (_, year) => [
          ...(year > 0 ? [{ type: "space" as const, height: 10 }] : []),
          yearTable(groups, months, year, options),
        ]).flat(),
        ...closingBlocks(data, options),
      ],
    },
  ];
}

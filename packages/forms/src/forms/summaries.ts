import { roundLei } from "@devize/backend/convex/estimates/recap";
import { formatPercent } from "../format";
import {
  type ExportData,
  type ExportOptions,
  type Subchapter,
  subchapters,
} from "../input";
import type { Cell, FormDocument, Row, Table } from "../model";
import {
  baseInvestment,
  constructionWorks,
  type PlacedCategory,
  placeCategories,
  subchapterNames,
  vatOf,
  worthOf,
} from "../subchapters";
import { buildTree, type WorkObject } from "../tree";
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

// The centralizers of a tender's financial offer (HG 907/2016, Anexa 10): F1
// for the whole objective, by the Deviz general's subchapters, and F2 for
// each object, by its categories of works, each valued as its F3 closes.

/** The parts of an object's works, as F2 and the object's Deviz total them. */
export const objectParts = [
  {
    title: "I. Construcții și instalații",
    total: "TOTAL I – subcapitolul 4.1",
    among: ["4.1.1", "4.1.2", "4.1.3", "4.1.4"],
  },
  {
    title: "II. Montaj",
    total: "TOTAL II – subcapitolul 4.2",
    among: ["4.2"],
  },
  {
    title: "III. Procurare",
    total: "TOTAL III – subcapitolele 4.3 + 4.4 + 4.5 + 4.6",
    among: ["4.3", "4.4", "4.5", "4.6"],
  },
] as const satisfies readonly {
  title: string;
  total: string;
  among: readonly Subchapter[];
}[];

/**
 * The objects that have works in the base investment, each with its own
 * categories, or every object when none has, so the form still prints.
 */
export function baseObjects(
  tree: readonly WorkObject[],
  placed: readonly PlacedCategory[],
): { object: WorkObject; placed: PlacedCategory[] }[] {
  const all = tree.map((object) => ({
    object,
    placed: placed.filter((entry) => entry.object === object),
  }));
  const based = all.filter((entry) =>
    entry.placed.some((one) => baseInvestment.includes(one.subchapter)),
  );
  return based.length > 0 ? based : all;
}

function f1Table(
  data: ExportData,
  options: ExportOptions,
  tree: readonly WorkObject[],
  placed: readonly PlacedCategory[],
): Table {
  const value = (amount: number, bold?: boolean): Cell =>
    options.withValues ? money(amount, { bold }) : empty;
  const values = (
    among: readonly Subchapter[],
    entries: readonly PlacedCategory[] = placed,
    bold?: boolean,
  ) => [
    value(worthOf(entries, among), bold),
    value(
      worthOf(
        entries,
        among.filter((one) => constructionWorks.includes(one)),
      ),
      bold,
    ),
  ];
  const line = (number: number, code: Subchapter): Row => ({
    kind: "item",
    cells: [
      { text: String(number), align: "center" },
      { text: code, align: "center" },
      { text: subchapterNames[code] },
      ...values([code]),
    ],
  });

  // The objects with works under chapter 4, unless the Deviz has no objects.
  const alone = tree.length === 1 && tree[0]?.implicit;
  const objects = alone
    ? []
    : tree
        .map((object) => ({
          object,
          placed: placed.filter((entry) => entry.object === object),
        }))
        .filter((entry) =>
          entry.placed.some((one) => baseInvestment.includes(one.subchapter)),
        );
  const rows: Row[] = [
    line(1, "1.2"),
    line(2, "1.3"),
    line(3, "1.4"),
    line(4, "2"),
    {
      kind: "item",
      keepWithNext: objects.length > 0,
      cells: [
        { text: "5", align: "center" },
        { text: "4", align: "center" },
        { text: "Cheltuieli pentru investiția de bază, din care:", bold: true },
        ...values(baseInvestment, placed, true),
      ],
    },
    ...objects.map(
      ({ object, placed: own }, index): Row => ({
        kind: "detail",
        keepWithNext: index < objects.length - 1,
        cells: [
          empty,
          empty,
          { text: `– ${objectName(object)}` },
          ...values(baseInvestment, own),
        ],
      }),
    ),
    line(6, "5.1.1"),
  ];
  // With prices, VAT and the total with it follow.
  const rate = options.withValues ? data.estimate.markups.vat : 0;
  rows.push({
    kind: rate > 0 ? "subtotal" : "total",
    keepWithNext: rate > 0,
    cells: [
      empty,
      { text: "TOTAL fără TVA", bold: true, colSpan: 2 },
      ...values(subchapters, placed, true),
    ],
  });
  if (rate > 0) {
    const total = worthOf(placed, subchapters);
    const vat = vatOf(placed, subchapters, rate);
    rows.push(
      {
        kind: "item",
        keepWithNext: true,
        cells: [
          empty,
          { text: `TVA (${formatPercent(rate)})`, colSpan: 2 },
          money(vat),
          empty,
        ],
      },
      {
        kind: "total",
        cells: [
          empty,
          { text: "TOTAL cu TVA", bold: true, colSpan: 2 },
          money(roundLei(total + vat), { bold: true }),
          empty,
        ],
      },
    );
  }
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 30, align: "center" },
      { width: 62, align: "center" },
      { width: 1, flex: true },
      { width: 84, align: "right" },
      { width: 84, align: "right" },
    ],
    header: [
      [
        { text: "Nr. crt." },
        { text: "Cap./subcap. deviz general" },
        { text: "Denumirea capitolelor și subcapitolelor de cheltuieli" },
        { text: "Valoare (exclusiv TVA) lei" },
        { text: "din care C+M lei" },
      ],
    ],
    numbers: ["0", "1", "2", "3", "4"],
    rows,
  };
}

/** F1: what the objective's works are worth, by the Deviz general's subchapters. */
export function f1Documents(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const tree = buildTree(data);
  const placed = placeCategories(tree, options);
  const label = formLabel(options, "F1");
  return [
    {
      id: "F1",
      label,
      name: label,
      orientation: "portrait",
      footer: footerOf(data, label),
      blocks: [
        partyFields(data, options, {}),
        {
          type: "title",
          lines: ["CENTRALIZATORUL CHELTUIELILOR", "pe obiectiv"],
        },
        ...(options.withValues ? [currencyNote] : []),
        f1Table(data, options, tree, placed),
        ...closingBlocks(data, options),
      ],
    },
  ];
}

function f2Table(
  options: ExportOptions,
  placed: readonly PlacedCategory[],
): Table {
  const value = (amount: number, bold?: boolean): Cell =>
    options.withValues ? money(amount, { bold }) : empty;
  const rows: Row[] = [];
  let number = 0;
  for (const part of objectParts) {
    rows.push({
      kind: "group",
      keepWithNext: true,
      cells: [{ text: part.title, bold: true, colSpan: 4 }],
    });
    // In the order of the subchapters, then as the Deviz lists them.
    for (const subchapter of part.among) {
      for (const entry of placed) {
        if (entry.subchapter !== subchapter) {
          continue;
        }
        number += 1;
        rows.push({
          kind: "item",
          cells: [
            { text: String(number), align: "center" },
            { text: subchapter, align: "center" },
            { text: categoryName(entry.category) },
            value(entry.category.recap.subtotal),
          ],
        });
      }
    }
    rows.push({
      kind: "subtotal",
      cells: [
        empty,
        { text: part.total, bold: true, colSpan: 2 },
        value(worthOf(placed, part.among), true),
      ],
    });
  }
  rows.push({
    kind: "total",
    cells: [
      empty,
      {
        text: "TOTAL (TOTAL I + TOTAL II + TOTAL III)",
        bold: true,
        colSpan: 2,
      },
      value(worthOf(placed, baseInvestment), true),
    ],
  });
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 30, align: "center" },
      { width: 56, align: "center" },
      { width: 1, flex: true },
      { width: 92, align: "right" },
    ],
    header: [
      [
        { text: "Nr. crt." },
        { text: "Nr. cap./subcap. deviz pe obiect" },
        {
          text: "Denumirea capitolelor și subcapitolelor de cheltuieli (categorii de lucrări)",
        },
        { text: "Valoare (exclusiv TVA) lei" },
      ],
    ],
    numbers: ["0", "1", "2", "3"],
    rows,
  };
}

/** F2: one for each object, its categories of works by subchapter. */
export function f2Documents(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const tree = buildTree(data);
  const label = formLabel(options, "F2");
  return baseObjects(tree, placeCategories(tree, options)).map(
    ({ object, placed }) => {
      const name = `${label} · ${objectName(object)}`;
      return {
        id: "F2",
        label,
        name,
        orientation: "portrait",
        footer: footerOf(data, name),
        blocks: [
          partyFields(data, options, { object: objectName(object) }),
          {
            type: "title",
            lines: [
              "CENTRALIZATORUL CHELTUIELILOR",
              "pe categorii de lucrări, pe obiecte",
            ],
          },
          ...(options.withValues ? [currencyNote] : []),
          f2Table(options, placed),
          ...closingBlocks(data, options),
        ],
      };
    },
  );
}

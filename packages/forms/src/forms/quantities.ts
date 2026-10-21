import { resourceKinds } from "@devize/backend/convex/estimates/recap";
import type { ExportData, ExportOptions } from "../input";
import { listedLine } from "../listed";
import type { Cell, FormDocument, Row, Table } from "../model";
import { buildTree, type Category, type WorkObject } from "../tree";
import {
  categoryName,
  closingBlocks,
  closingRows,
  currencyNote,
  empty,
  footerOf,
  formLabel,
  kindLabels,
  money,
  objectName,
  partyFields,
  quantity,
} from "./common";

// The lists of quantities: F3 (HG 907/2016, Anexa 10), one per category of
// works, and C5, its detailed form from Ordinul 1014/2001.

function codeAndTitle(code: string, title: string): Cell {
  return code
    ? { text: code, bold: true, more: [{ text: title }] }
    : { text: title };
}

function f3Table(category: Category, data: ExportData, options: ExportOptions) {
  const rows: Row[] = [];
  category.items.forEach((item, index) => {
    const line = listedLine(item, index + 1);
    rows.push({
      kind: "item",
      keepWithNext: options.withValues,
      cells: [
        { text: line.number, align: "center" },
        codeAndTitle(line.code, line.title),
        { text: line.unit, align: "center" },
        quantity(line.quantity),
        options.withValues ? money(line.unitPrice, { bold: true }) : empty,
        options.withValues ? money(line.totals.total, { bold: true }) : empty,
      ],
    });
    if (options.withValues) {
      resourceKinds.forEach((kind, position) => {
        rows.push({
          kind: "detail",
          keepWithNext: position < resourceKinds.length - 1,
          cells: [
            empty,
            { text: kindLabels[kind], align: "right", muted: true, size: 7 },
            empty,
            empty,
            money(line.unitCost[kind], { size: 7 }),
            money(line.totals[kind], { size: 7 }),
          ],
        });
      });
    }
  });
  if (options.withValues) {
    rows.push(
      ...closingRows(
        category.recap,
        data.estimate.markups,
        (label, value, bold) => [
          empty,
          { text: label, bold, colSpan: 4 },
          money(value, { bold }),
        ],
        { breakdown: true },
      ),
    );
  }
  const table: Table = {
    type: "table",
    style: "grid",
    columns: [
      { width: 30, align: "center" },
      { width: 1, flex: true },
      { width: 36, align: "center" },
      { width: 60, align: "right" },
      { width: 76, align: "right" },
      { width: 88, align: "right" },
    ],
    header: [
      [
        { text: "Nr. crt." },
        { text: "Capitol de lucrări" },
        { text: "U.M." },
        { text: "Cantitatea" },
        { text: "Prețul unitar (lei/U.M.)" },
        { text: "Total (lei)" },
      ],
    ],
    numbers: ["0", "1", "2", "3", "4", "5 = 3 × 4"],
    rows,
  };
  return table;
}

function f3(
  data: ExportData,
  options: ExportOptions,
  object: WorkObject,
  category: Category,
): FormDocument {
  const label = formLabel(options, "F3");
  const name = `${label} · ${categoryName(category)}`;
  return {
    id: "F3",
    label,
    name,
    orientation: "portrait",
    footer: footerOf(data, name),
    blocks: [
      partyFields(data, options, { object: objectName(object) }),
      {
        type: "title",
        lines: [
          "LISTA",
          "cu cantități de lucrări, pe categorii de lucrări",
          `Categoria de lucrări: ${categoryName(category)}`,
        ],
      },
      ...(options.withValues ? [currencyNote] : []),
      f3Table(category, data, options),
      ...closingBlocks(data, options),
    ],
  };
}

function c5Table(category: Category, data: ExportData, options: ExportOptions) {
  const value = (amount: number, bold = false) =>
    options.withValues ? money(amount, { bold }) : empty;
  const rows: Row[] = category.items.map((item, index) => {
    const line = listedLine(item, index + 1);
    return {
      kind: "item",
      cells: [
        { text: line.number, align: "center" },
        { text: line.code, bold: true },
        { text: line.title },
        { text: line.unit, align: "center" },
        quantity(line.quantity),
        ...resourceKinds.map((kind) => value(line.unitCost[kind])),
        ...resourceKinds.map((kind) => value(line.totals[kind])),
        value(line.totals.total, true),
      ],
    };
  });
  if (options.withValues) {
    const { recap } = category;
    rows.push({
      kind: "subtotal",
      keepWithNext: true,
      cells: [
        empty,
        { text: "TOTAL", bold: true, colSpan: 8 },
        ...resourceKinds.map((kind) => money(recap[kind], { bold: true })),
        money(
          recap.material + recap.labor + recap.equipment + recap.transport,
          {
            bold: true,
          },
        ),
      ],
    });
    rows.push(
      ...closingRows(
        recap,
        data.estimate.markups,
        (label, amount, bold) => [
          empty,
          { text: label, bold, colSpan: 12 },
          money(amount, { bold }),
        ],
        { breakdown: false },
      ),
    );
  }
  const table: Table = {
    type: "table",
    style: "grid",
    columns: [
      { width: 24, align: "center" },
      { width: 58 },
      { width: 1, flex: true },
      { width: 28, align: "center" },
      { width: 48, align: "right" },
      ...resourceKinds.map(() => ({ width: 44, align: "right" as const })),
      ...resourceKinds.map(() => ({ width: 52, align: "right" as const })),
      { width: 58, align: "right" },
    ],
    header: [
      [
        { text: "Nr. crt.", rowSpan: 2 },
        { text: "Cod articol", rowSpan: 2 },
        { text: "Denumirea articolului", rowSpan: 2 },
        { text: "U.M.", rowSpan: 2 },
        { text: "Cantitatea", rowSpan: 2 },
        { text: "Prețul unitar (lei/U.M.)", colSpan: 4 },
        { text: "Valoarea (lei)", colSpan: 5 },
      ],
      [
        { text: "Material" },
        { text: "Manoperă" },
        { text: "Utilaj" },
        { text: "Transport" },
        { text: "Material" },
        { text: "Manoperă" },
        { text: "Utilaj" },
        { text: "Transport" },
        { text: "Total" },
      ],
    ],
    numbers: [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9 = 4 × 5",
      "10 = 4 × 6",
      "11 = 4 × 7",
      "12 = 4 × 8",
      "13 = 9 + … + 12",
    ],
    rows,
    fontSize: 7,
  };
  return table;
}

function c5(
  data: ExportData,
  options: ExportOptions,
  object: WorkObject,
  category: Category,
): FormDocument {
  const label = formLabel(options, "C5");
  const name = `${label} · ${categoryName(category)}`;
  return {
    id: "C5",
    label,
    name,
    orientation: "landscape",
    footer: footerOf(data, name),
    blocks: [
      partyFields(data, options, { object: objectName(object) }),
      {
        type: "title",
        lines: [
          "LISTA",
          "cuprinzând cantitățile de lucrări",
          `Categoria de lucrări: ${categoryName(category)}`,
        ],
      },
      ...(options.withValues ? [currencyNote] : []),
      c5Table(category, data, options),
      ...closingBlocks(data, options),
    ],
  };
}

/** One F3 per category of works, in print order. */
export function f3Documents(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  return buildTree(data).flatMap((object) =>
    object.categories.map((category) => f3(data, options, object, category)),
  );
}

/** One C5 per category of works, in print order. */
export function c5Documents(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  return buildTree(data).flatMap((object) =>
    object.categories.map((category) => c5(data, options, object, category)),
  );
}

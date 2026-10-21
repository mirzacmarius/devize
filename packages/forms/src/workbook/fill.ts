import {
  type Amounts,
  applyMarkups,
  lineTotals,
  type Recap,
  type ResourceKind,
  resourceKinds,
  roundLei,
} from "@devize/backend/convex/estimates/recap";
import type { LineItemInput, Markups, WorksData } from "../input";
import { listedLine } from "../listed";
import type { ClosingLine, FillPlan, PriceBasis, SheetPlan } from "./plan";
import type { Workbook } from "./read";
import { type SheetWrites, writeWorkbook } from "./write";

// The prices written into an authority's list: the ones F3 prints, as the
// direct costs of the tender's own U.M. and quantity. The list's
// Recapitulație adds each of the Cote it has a row for, and the unit prices
// carry the others, so the list comes to the offer's value either way; or,
// when the person asks, the unit prices carry them all.

/** What the person chose for a sheet, over what was found. */
export type SheetChoice = {
  // A column letter, or null to write no unit price or no total.
  unitPrice?: string | null;
  total?: string | null;
  basis?: PriceBasis;
};

/** A position's prices: per unit and in all, for each kind and together. */
export type LineValues = {
  unitByKind: Amounts;
  unitPrice: number;
  totalByKind: Amounts;
  total: number;
};

/** The Cote that come before the VAT, in the order a Recapitulație adds them. */
export const closingMarkups = ["cam", "indirect", "profit"] as const;
export type ClosingMarkup = (typeof closingMarkups)[number];

/** A sheet's Cote: the ones its unit prices carry, and the ones its Recapitulație adds. */
export type SheetMarkups = { unit: Markups; closing: Markups };

/** The Cote a sheet's Recapitulație has rows for. */
export function addedMarkups(sheet: SheetPlan): ClosingMarkup[] {
  return closingMarkups.filter((markup) =>
    sheet.closing.some((row) => row.line === markup),
  );
}

/**
 * How a sheet's prices carry the Deviz's Cote. On direct costs, its
 * Recapitulație adds each one it has a row for, and the unit prices carry
 * the others. With everything in the unit prices, it adds only the VAT.
 */
export function sheetMarkups(
  sheet: SheetPlan,
  basis: PriceBasis,
  markups: Markups,
): SheetMarkups {
  const unit: Markups = { ...markups, vat: 0 };
  const closing: Markups = { cam: 0, indirect: 0, profit: 0, vat: markups.vat };
  if (basis === "direct") {
    for (const markup of addedMarkups(sheet)) {
      unit[markup] = 0;
      closing[markup] = markups[markup];
    }
  }
  return { unit, closing };
}

/**
 * A position's prices, with the Cote its unit prices carry: CAM on its
 * labour, then the indirect costs and the profit on every kind, as the
 * Recapitulație would add them.
 */
export function lineValues(item: LineItemInput, unit: Markups): LineValues {
  const line = listedLine(item, 1);
  const closing = (1 + unit.indirect / 100) * (1 + unit.profit / 100);
  const unitByKind: Amounts = {
    material: roundLei(line.unitCost.material * closing),
    labor: roundLei(line.unitCost.labor * (1 + unit.cam / 100) * closing),
    equipment: roundLei(line.unitCost.equipment * closing),
    transport: roundLei(line.unitCost.transport * closing),
  };
  const totals = lineTotals({
    unitCost: unitByKind,
    quantity: line.quantity,
    laborHours: 0,
  });
  return {
    unitByKind,
    unitPrice: roundLei(
      unitByKind.material +
        unitByKind.labor +
        unitByKind.equipment +
        unitByKind.transport,
    ),
    totalByKind: {
      material: totals.material,
      labor: totals.labor,
      equipment: totals.equipment,
      transport: totals.transport,
    },
    total: totals.total,
  };
}

/** A group of positions' Recapitulație, adding the Cote its rows add. */
function groupRecap(lines: readonly LineValues[], closing: Markups): Recap {
  const amounts: Amounts = {
    material: 0,
    labor: 0,
    equipment: 0,
    transport: 0,
  };
  for (const line of lines) {
    for (const kind of resourceKinds) {
      amounts[kind] = roundLei(amounts[kind] + line.totalByKind[kind]);
    }
  }
  return applyMarkups(amounts, 0, closing);
}

/** What a Recapitulație row says, on a basis; nothing for a row it hasn't. */
function closingValue(
  recap: Recap,
  line: ClosingLine,
  basis: PriceBasis,
): number | undefined {
  switch (line) {
    case "items":
      return roundLei(
        recap.material + recap.labor + recap.equipment + recap.transport,
      );
    case "material":
    case "labor":
    case "equipment":
    case "transport":
      return recap[line];
    case "subtotal":
    case "vat":
    case "total":
      return recap[line];
    default:
      // CAM, the direct and indirect costs and the profit are in the unit
      // prices when they carry everything.
      return basis === "direct" ? recap[line] : undefined;
  }
}

function itemsById(data: WorksData) {
  return new Map(data.lineItems.map((item) => [item._id, item]));
}

/** A sheet's price columns, with what the person chose over them. */
export function chosenColumns(sheet: SheetPlan, choice: SheetChoice = {}) {
  const pick = (
    found: string | undefined,
    chosen: string | null | undefined,
  ) => (chosen === undefined ? found : (chosen ?? undefined));
  return {
    ...sheet.columns,
    unitPrice: pick(sheet.columns.unitPrice, choice.unitPrice),
    total: pick(sheet.columns.total, choice.total),
  };
}

// The rows of a Recapitulație that add a percentage.
const percentLines: readonly ClosingLine[] = [
  "cam",
  "indirect",
  "profit",
  "vat",
];

/**
 * The rows of a sheet's Recapitulație where the authority's own formula
 * works out a percentage, which Excel computes again with its numbers over
 * the prices written in.
 */
export function formulaRows(
  workbook: Workbook,
  sheet: SheetPlan,
  choice: SheetChoice = {},
): number[] {
  const column = chosenColumns(sheet, choice).total;
  const source = workbook.sheets.find((found) => found.path === sheet.path);
  const cells = new Map(source?.rows.map((row) => [row.row, row.cells]));
  return column
    ? sheet.closing
        .filter(
          (row) =>
            percentLines.includes(row.line) &&
            cells.get(row.row)?.[column]?.formula,
        )
        .map((row) => row.row)
    : [];
}

/**
 * What a sheet's positions come to without VAT, on a basis: with the CAM,
 * indirect costs and profit in their unit prices or added by the sheet's
 * Recapitulație, which is the offer's value but for rounding.
 */
export function sheetTotal(
  sheet: SheetPlan,
  data: WorksData,
  basis: PriceBasis,
): number {
  const items = itemsById(data);
  const { unit, closing } = sheetMarkups(sheet, basis, data.estimate.markups);
  const lines = sheet.positions.flatMap((position) => {
    const item = items.get(position.lineItemId);
    return item ? [lineValues(item, unit)] : [];
  });
  return groupRecap(lines, closing).subtotal;
}

/**
 * The numbers to write into one sheet: each position's prices, its rows
 * a)–d) and its list's Recapitulație. A cell that holds text is left alone,
 * as is the quantities' column.
 */
export function sheetWrites(
  workbook: Workbook,
  sheet: SheetPlan,
  data: WorksData,
  choice: SheetChoice = {},
): SheetWrites {
  const source = workbook.sheets.find((found) => found.path === sheet.path);
  const cells = new Map(source?.rows.map((row) => [row.row, row.cells]));
  const basis = choice.basis ?? sheet.basis;
  const { unit, closing } = sheetMarkups(sheet, basis, data.estimate.markups);
  const columns = chosenColumns(sheet, choice);
  const items = itemsById(data);
  const values = new Map<string, LineValues>();
  for (const position of sheet.positions) {
    const item = items.get(position.lineItemId);
    if (item) {
      values.set(item._id, lineValues(item, unit));
    }
  }

  const writes = new Map<number, Map<string, number>>();
  const write = (row: number, column: string | undefined, value?: number) => {
    if (!column || value === undefined || column === sheet.quantityColumn) {
      return;
    }
    const cell = cells.get(row)?.[column];
    if (cell && cell.value === undefined && !cell.formula) {
      return;
    }
    const list = writes.get(row) ?? new Map<string, number>();
    list.set(column, value);
    writes.set(row, list);
  };
  const byKind = (
    row: number,
    targets: Partial<Record<ResourceKind, string>>,
    amounts: Amounts,
  ) => {
    for (const kind of resourceKinds) {
      write(row, targets[kind], amounts[kind]);
    }
  };

  for (const position of sheet.positions) {
    const line = values.get(position.lineItemId);
    if (!line) {
      continue;
    }
    write(position.row, columns.unitPrice, line.unitPrice);
    write(position.row, columns.total, line.total);
    byKind(position.row, columns.unitByKind, line.unitByKind);
    byKind(position.row, columns.totalByKind, line.totalByKind);
  }
  for (const detail of sheet.details) {
    const line = values.get(detail.lineItemId);
    if (line) {
      write(detail.row, columns.unitPrice, line.unitByKind[detail.kind]);
      write(detail.row, columns.total, line.totalByKind[detail.kind]);
    }
  }
  const recaps = sheet.groups.map((group) =>
    groupRecap(
      group.flatMap((id) => {
        const line = values.get(id);
        return line ? [line] : [];
      }),
      closing,
    ),
  );
  const all = groupRecap([...values.values()], closing);
  // A Recapitulație without a total of its positions splits its direct
  // costs by kind.
  const totalled = new Set(
    sheet.closing.filter((row) => row.line === "items").map((row) => row.group),
  );
  for (const row of sheet.closing) {
    const recap = row.group === undefined ? all : recaps[row.group];
    if (!recap) {
      continue;
    }
    const value = closingValue(recap, row.line, basis);
    write(row.row, columns.total, value);
    if (
      row.line === "items" ||
      (row.line === "direct" && value !== undefined && !totalled.has(row.group))
    ) {
      byKind(row.row, columns.totalByKind, recap);
    }
  }
  return writes;
}

/**
 * The authority's workbook with the Deviz's prices written into the sheets
 * of the plan, as the person chose for each sheet by its path.
 */
export function fillWorkbook(
  workbook: Workbook,
  plan: FillPlan,
  data: WorksData,
  choices: Readonly<Record<string, SheetChoice>> = {},
): Uint8Array {
  const writes = new Map<string, SheetWrites>();
  for (const sheet of plan.sheets) {
    writes.set(
      sheet.path,
      sheetWrites(workbook, sheet, data, choices[sheet.path]),
    );
  }
  return writeWorkbook(workbook, writes);
}

import { type Recap, roundLei } from "@devize/backend/convex/estimates/recap";
import {
  estimateCode,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatQuantity,
} from "../format";
import {
  type DocumentKind,
  defaultLabel,
  type ExportData,
  type ExportOptions,
  type Markups,
} from "../input";
import type { Block, Cell, Row } from "../model";
import type { Category } from "../tree";

// What every form shares: the lines naming the parties and the works, the
// closing of a list of quantities and the signatures.

/** The contracting authority or the client, unless the person typed another. */
export function beneficiaryOf(data: ExportData, options: ExportOptions) {
  return (
    options.beneficiary?.trim() ||
    (data.estimate.kind === "tender"
      ? data.estimate.tender?.authority?.trim()
      : undefined) ||
    data.client?.name ||
    ""
  );
}

/**
 * The lines at the top of a form, leaving out the ones with nothing to say,
 * such as an object named like the whole objective.
 */
export function partyFields(
  data: ExportData,
  options: ExportOptions,
  works: { object?: string; objective?: boolean },
): Block {
  const objective = data.estimate.title;
  const items = [
    { label: "Beneficiar", value: beneficiaryOf(data, options) },
    { label: "Ofertant", value: options.withValues ? data.firm.name : "" },
    { label: "Proiectant", value: options.designer?.trim() ?? "" },
    // Left out where the form's title names the objective.
    { label: "Obiectivul", value: works.objective === false ? "" : objective },
    {
      label: "Obiectul",
      value: works.object && works.object !== objective ? works.object : "",
    },
  ];
  return { type: "fields", items: items.filter((item) => item.value) };
}

/** A category of works with its code in front: "02 Zidărie". */
export function categoryName(category: Category) {
  return category.code ? `${category.code} ${category.name}` : category.name;
}

/** What the corner of a form says: the tender's own name for it, or ours. */
export function formLabel(options: ExportOptions, kind: DocumentKind) {
  return options.labels?.[kind]?.trim() || defaultLabel(kind);
}

/** The footer of every page of a form: the Deviz's code and the form. */
export function footerOf(data: ExportData, label: string) {
  return `${estimateCode(data.estimate.number, data.estimate.revision)} · ${label}`;
}

/** Above a priced list, on the right. */
export const currencyNote: Block = {
  type: "text",
  text: "– lei, fără TVA –",
  align: "right",
  size: 7.5,
};

/** Above a Deviz general or an object's Deviz, which add VAT. */
export function priceDateNote(data: ExportData): Block {
  return {
    type: "text",
    text: `– lei, prețuri la data de ${formatDate(data.estimate.priceDate)} –`,
    align: "right",
    size: 7.5,
  };
}

/** An object as the forms name it, with its code in front: "01 Corp A". */
export function objectName(object: { code?: string; name: string }) {
  return object.code ? `${object.code} ${object.name}` : object.name;
}

/** The date and who signs: the bidder, or whoever drew up a list without prices. */
export function closingBlocks(
  data: ExportData,
  options: ExportOptions,
): Block[] {
  return [
    { type: "space", height: 14 },
    {
      type: "signatures",
      date: `Data: ${formatDate(options.date)}`,
      items: options.withValues
        ? [
            {
              role: "Ofertant,",
              name: data.firm.name,
              hint: "(semnătura autorizată și ștampila)",
            },
          ]
        : [
            {
              role: "Întocmit,",
              name: options.designer?.trim() || data.firm.name,
              hint: "(numele, prenumele și semnătura)",
            },
          ],
    },
  ];
}

/** A cell with nothing in it. */
export const empty: Cell = { text: "" };

export function money(value: number, style: Partial<Cell> = {}): Cell {
  return { text: formatMoney(value), value, align: "right", ...style };
}

export function quantity(value: number, style: Partial<Cell> = {}): Cell {
  return { text: formatQuantity(value), value, align: "right", ...style };
}

/** A resource's price, which can have more decimals than bani: 0,355. */
export function price(value: number, style: Partial<Cell> = {}): Cell {
  return { text: formatNumber(value, 2, 4), value, align: "right", ...style };
}

/**
 * The closing of a list of quantities, as the Recapitulație adds it up: the
 * line items' total and what it is made of, CAM on labour, indirect costs and
 * profit, without VAT. A list whose columns already split the total by kind
 * leaves the first lines out. `row` lays a label and a value out in the
 * table's columns.
 */
export function closingRows(
  recap: Recap,
  markups: Markups,
  row: (label: string, value: number, bold: boolean) => Cell[],
  options: { breakdown: boolean },
): Row[] {
  const lines: { label: string; value: number; kind: Row["kind"] }[] = [
    ...(options.breakdown
      ? [
          {
            label: "Total articole, din care:",
            value: roundLei(
              recap.material + recap.labor + recap.equipment + recap.transport,
            ),
            kind: "subtotal" as const,
          },
          {
            label: kindLabels.material,
            value: recap.material,
            kind: "detail" as const,
          },
          {
            label: kindLabels.labor,
            value: recap.labor,
            kind: "detail" as const,
          },
          {
            label: kindLabels.equipment,
            value: recap.equipment,
            kind: "detail" as const,
          },
          {
            label: kindLabels.transport,
            value: recap.transport,
            kind: "detail" as const,
          },
        ]
      : []),
    {
      label: `CAM (${formatPercent(markups.cam)} din manoperă)`,
      value: recap.cam,
      kind: "item",
    },
    {
      label: "Total cheltuieli directe",
      value: recap.direct,
      kind: "subtotal",
    },
    {
      label: `Cheltuieli indirecte (${formatPercent(markups.indirect)} din cheltuielile directe)`,
      value: recap.indirect,
      kind: "item",
    },
    {
      label: `Profit (${formatPercent(markups.profit)} din cheltuielile directe și indirecte)`,
      value: recap.profit,
      kind: "item",
    },
    { label: "TOTAL fără TVA", value: recap.subtotal, kind: "total" },
  ];
  return lines.map((line, index) => ({
    kind: line.kind,
    cells: row(
      line.label,
      line.value,
      line.kind === "subtotal" || line.kind === "total",
    ),
    keepWithNext: index < lines.length - 1,
  }));
}

/** "a) materiale" and the rest: how official forms name the four kinds. */
export const kindLabels = {
  material: "a) materiale",
  labor: "b) manoperă",
  equipment: "c) utilaj",
  transport: "d) transport",
} as const;

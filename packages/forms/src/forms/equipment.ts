import { computeRecap, roundLei } from "@devize/backend/convex/estimates/recap";
import type {
  DocumentKind,
  ExportData,
  ExportOptions,
  LineItemInput,
  Subchapter,
} from "../input";
import { type ListedLine, listedLine } from "../listed";
import type { FormDocument, Row, Table } from "../model";
import { storeName } from "../resources";
import {
  type PlacedCategory,
  placeCategories,
  procurement,
  subchapterNames,
  worthOf,
} from "../subchapters";
import { buildTree, type WorkObject } from "../tree";
import {
  closingBlocks,
  currencyNote,
  empty,
  footerOf,
  formLabel,
  money,
  objectName,
  partyFields,
  quantity,
} from "./common";

// F4, the list of equipment, furnishings and intangible assets an offer
// procures, and F5, a technical sheet for each (HG 907/2016, Anexa 10). They
// list the line items of the categories placed under subchapters 4.3 to 4.6.

type Equipment = {
  line: ListedLine;
  // Lei per unit with the category's CAM, indirect costs and profit, as an
  // offer prices what it supplies, and that price times the quantity.
  unitPrice: number;
  value: number;
  store?: string;
  // Its technical sheet's number, across the whole export.
  sheet: number;
};

type EquipmentList = {
  object: WorkObject;
  groups: { subchapter: Subchapter; lines: Equipment[] }[];
  // What the categories are worth in the object's Deviz.
  total: number;
  rounding: number;
};

/** The retailer an item's every material comes from, when there is one. */
function storeOf(item: LineItemInput): string | undefined {
  const stores = new Set(
    item.resources
      .filter((resource) => resource.kind === "material")
      .map((resource) => resource.store),
  );
  const [store, ...others] = [...stores];
  return store && others.length === 0 ? storeName(store) : undefined;
}

/**
 * The equipment of each object that has some, in print order. The prices
 * include each item's share of the closing, so a list adds up, with a line
 * for rounding, to subchapters 4.3 to 4.6 of its object's Deviz.
 */
function equipmentLists(data: ExportData, options: ExportOptions) {
  const tree = buildTree(data);
  const placed = placeCategories(tree, options);
  const markups = data.estimate.markups;
  let sheet = 0;
  const lists: EquipmentList[] = [];
  for (const object of tree) {
    const own: PlacedCategory[] = placed.filter(
      (entry) =>
        entry.object === object && procurement.includes(entry.subchapter),
    );
    if (own.length === 0) {
      continue;
    }
    const groups = procurement.flatMap((subchapter) => {
      const lines = own
        .filter((entry) => entry.subchapter === subchapter)
        .flatMap((entry) =>
          entry.category.items.map((item, index): Equipment => {
            const line = listedLine(item, index + 1);
            const closed = computeRecap([line], markups).subtotal;
            const unitPrice =
              line.quantity > 0 ? roundLei(closed / line.quantity) : 0;
            sheet += 1;
            return {
              line,
              unitPrice,
              value: roundLei(unitPrice * line.quantity),
              store: storeOf(item),
              sheet,
            };
          }),
        );
      return lines.length > 0 ? [{ subchapter, lines }] : [];
    });
    const total = worthOf(own, procurement);
    const listed = groups.reduce(
      (bani, group) =>
        group.lines.reduce(
          (sum, line) => sum + Math.round(line.value * 100),
          bani,
        ),
      0,
    );
    lists.push({
      object,
      groups,
      total,
      rounding: (Math.round(total * 100) - listed) / 100,
    });
  }
  return lists;
}

function f4Table(
  list: EquipmentList | undefined,
  options: ExportOptions,
  sheets: boolean,
): Table {
  const rows: Row[] = [];
  let number = 0;
  for (const group of list?.groups ?? []) {
    rows.push({
      kind: "group",
      keepWithNext: true,
      cells: [
        {
          text: `${group.subchapter} ${subchapterNames[group.subchapter]}`,
          bold: true,
          colSpan: 8,
        },
      ],
    });
    for (const equipment of group.lines) {
      number += 1;
      rows.push({
        kind: "item",
        cells: [
          { text: String(number), align: "center" },
          { text: equipment.line.title },
          { text: equipment.line.unit, align: "center" },
          quantity(equipment.line.quantity),
          options.withValues ? money(equipment.unitPrice) : empty,
          options.withValues ? money(equipment.value) : empty,
          { text: options.withValues ? (equipment.store ?? "") : "" },
          {
            text: sheets ? `nr. ${equipment.sheet}` : "",
            align: "center",
          },
        ],
      });
    }
  }
  if (rows.length === 0) {
    rows.push({
      kind: "item",
      cells: [
        empty,
        { text: "Nu este cazul.", muted: true, colSpan: 5 },
        empty,
        empty,
      ],
    });
  }
  if (options.withValues) {
    if (list && list.rounding !== 0) {
      rows.push({
        kind: "subtotal",
        keepWithNext: true,
        cells: [
          empty,
          { text: "Diferențe din rotunjirea prețurilor unitare", colSpan: 4 },
          money(list.rounding),
          empty,
          empty,
        ],
      });
    }
    rows.push({
      kind: "total",
      cells: [
        empty,
        { text: "TOTAL", bold: true, colSpan: 4 },
        money(list?.total ?? 0, { bold: true }),
        empty,
        empty,
      ],
    });
  }
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 26, align: "center" },
      { width: 1, flex: true },
      { width: 30, align: "center" },
      { width: 46, align: "right" },
      { width: 62, align: "right" },
      { width: 66, align: "right" },
      { width: 62 },
      { width: 44, align: "center" },
    ],
    header: [
      [
        { text: "Nr. crt." },
        { text: "Denumirea" },
        { text: "U.M." },
        { text: "Cantitatea" },
        { text: "Prețul unitar (lei/U.M.)" },
        { text: "Valoarea (lei)" },
        { text: "Furnizorul" },
        { text: "Fișa tehnică atașată" },
      ],
    ],
    numbers: ["0", "1", "2", "3", "4", "5 = 3 × 4", "6", "7"],
    rows,
  };
}

/**
 * F4: one for each object that procures equipment, furnishings or
 * intangible assets, or one saying there are none.
 */
export function f4Documents(
  data: ExportData,
  options: ExportOptions,
  kinds: ReadonlySet<DocumentKind>,
): FormDocument[] {
  const lists = equipmentLists(data, options);
  const label = formLabel(options, "F4");
  return (lists.length > 0 ? lists : [undefined]).map((list) => {
    const where = list && objectName(list.object);
    const name = where ? `${label} · ${where}` : label;
    return {
      id: "F4",
      label,
      name,
      orientation: "portrait",
      footer: footerOf(data, name),
      blocks: [
        partyFields(data, options, { object: where }),
        {
          type: "title",
          lines: [
            "LISTA",
            "cuprinzând cantitățile de utilaje, echipamente tehnologice și funcționale, dotări și active necorporale",
          ],
        },
        ...(options.withValues ? [currencyNote] : []),
        f4Table(list, options, kinds.has("F5")),
        ...closingBlocks(data, options),
      ],
    };
  });
}

const sheetRows = [
  "Parametri tehnici și funcționali",
  "Specificații de performanță și condiții privind siguranța în exploatare",
  "Condiții privind conformitatea cu standardele relevante",
  "Condiții de garanție și postgaranție",
  "Alte condiții cu caracter tehnic",
];

function sheetDocument(
  data: ExportData,
  options: ExportOptions,
  equipment?: { object: WorkObject; line: ListedLine; sheet: number },
): FormDocument {
  const label = formLabel(options, "F5");
  const title = equipment
    ? `FIȘA TEHNICĂ nr. ${equipment.sheet}`
    : "FIȘA TEHNICĂ";
  const name = equipment ? `${label} · nr. ${equipment.sheet}` : label;
  return {
    id: "F5",
    label,
    name,
    orientation: "portrait",
    footer: footerOf(data, name),
    blocks: [
      partyFields(data, options, {
        object: equipment && objectName(equipment.object),
      }),
      { type: "title", lines: [title] },
      {
        type: "fields",
        items: [
          {
            label: "Utilajul, echipamentul tehnologic",
            value: equipment?.line.title ?? "",
          },
        ],
      },
      {
        type: "table",
        style: "grid",
        columns: [
          { width: 30, align: "center" },
          { width: 1, flex: true },
          { width: 1, flex: true },
          { width: 90 },
        ],
        header: [
          [
            { text: "Nr. crt." },
            { text: "Specificații tehnice impuse prin Caietul de sarcini" },
            {
              text: "Corespondența propunerii tehnice cu specificațiile tehnice impuse prin Caietul de sarcini",
            },
            { text: "Producător" },
          ],
        ],
        rows: sheetRows.map((text, index) => ({
          kind: "item",
          minHeight: 64,
          cells: [
            { text: String(index + 1), align: "center" },
            { text },
            empty,
            empty,
          ],
        })),
      },
      ...closingBlocks(data, options),
    ],
  };
}

/** F5: a technical sheet for each item F4 lists, numbered as it refers to them. */
export function f5Documents(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const sheets = equipmentLists(data, options).flatMap((list) =>
    list.groups.flatMap((group) =>
      group.lines.map((equipment) => ({
        object: list.object,
        line: equipment.line,
        sheet: equipment.sheet,
      })),
    ),
  );
  return sheets.length > 0
    ? sheets.map((equipment) => sheetDocument(data, options, equipment))
    : [sheetDocument(data, options)];
}

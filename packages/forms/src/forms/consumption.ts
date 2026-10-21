import type { ResourceKind } from "@devize/backend/convex/estimates/recap";
import { formatUnit } from "../format";
import type {
  DocumentKind,
  ExportData,
  ExportOptions,
  LineItemInput,
} from "../input";
import type { Cell, FormDocument, Row, Table } from "../model";
import { type ResourceList, resourceList } from "../resources";
import { buildTree } from "../tree";
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
  price,
  quantity,
} from "./common";

// The resource lists of Ordinul 1014/2001: C6 for materials, C7 for labour,
// C8 for equipment and C9 for transport, each for the whole Deviz, an object
// or a category of works.

const lists: Record<
  ResourceKind,
  {
    kind: DocumentKind;
    title: string;
    name: string;
    quantity: string;
    price: string;
    // C6 names where each material is bought.
    supplier: boolean;
  }
> = {
  material: {
    kind: "C6",
    title: "cuprinzând consumurile de resurse materiale",
    name: "Denumirea resursei materiale",
    quantity: "Cantitatea",
    price: "Prețul unitar (lei/U.M.)",
    supplier: true,
  },
  labor: {
    kind: "C7",
    title: "cuprinzând consumurile cu mâna de lucru",
    name: "Denumirea meseriei",
    quantity: "Consumul de manoperă",
    price: "Tariful (lei/U.M.)",
    supplier: false,
  },
  equipment: {
    kind: "C8",
    title:
      "cuprinzând consumurile de ore de funcționare a utilajelor de construcții",
    name: "Denumirea utilajului",
    quantity: "Ore de funcționare",
    price: "Tariful (lei/U.M.)",
    supplier: false,
  },
  transport: {
    kind: "C9",
    title: "cuprinzând consumurile privind transporturile",
    name: "Denumirea mijlocului de transport",
    quantity: "Cantitatea",
    price: "Tariful (lei/U.M.)",
    supplier: false,
  },
};

/** The works one list covers. */
type Scope = { object?: string; category?: string; items: LineItemInput[] };

function scopesOf(data: ExportData, options: ExportOptions): Scope[] {
  const tree = buildTree(data);
  switch (options.resourceScope ?? "object") {
    case "estimate": {
      const items = tree.flatMap((object) =>
        object.categories.flatMap((category) => category.items),
      );
      return items.length > 0 ? [{ items }] : [];
    }
    case "object":
      return tree.map((object) => ({
        object: objectName(object),
        items: object.categories.flatMap((category) => category.items),
      }));
    case "category":
      return tree.flatMap((object) =>
        object.categories.map((category) => ({
          object: objectName(object),
          category: categoryName(category),
          items: category.items,
        })),
      );
  }
}

function listTable(
  list: ResourceList,
  options: ExportOptions,
  supplier: boolean,
  header: { name: string; quantity: string; price: string },
): Table {
  const last = (cell: Cell): Cell[] => (supplier ? [cell] : []);
  const rows: Row[] = list.lines.map((line, index) => ({
    kind: "item",
    cells: [
      { text: String(index + 1), align: "center" },
      { text: line.name },
      { text: formatUnit(line.unit), align: "center" },
      line.quantity === undefined ? empty : quantity(line.quantity),
      options.withValues && line.unitPrice !== undefined
        ? price(line.unitPrice)
        : empty,
      options.withValues ? money(line.value) : empty,
      ...last({ text: line.store ?? "" }),
    ],
  }));
  if (rows.length === 0) {
    rows.push({
      kind: "item",
      cells: [
        empty,
        { text: "Nu este cazul.", muted: true, colSpan: 5 },
        ...last(empty),
      ],
    });
  }
  if (options.withValues) {
    if (list.rounding !== 0) {
      rows.push({
        kind: "subtotal",
        keepWithNext: true,
        cells: [
          empty,
          { text: "Diferențe din rotunjirea prețurilor unitare", colSpan: 4 },
          money(list.rounding),
          ...last(empty),
        ],
      });
    }
    rows.push({
      kind: "total",
      cells: [
        empty,
        { text: "TOTAL", bold: true, colSpan: 4 },
        money(list.total, { bold: true }),
        ...last(empty),
      ],
    });
  }
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 30, align: "center" },
      { width: 1, flex: true },
      { width: 36, align: "center" },
      { width: 62, align: "right" },
      { width: 66, align: "right" },
      { width: 74, align: "right" },
      ...(supplier ? [{ width: 72 }] : []),
    ],
    header: [
      [
        { text: "Nr. crt." },
        { text: header.name },
        { text: "U.M." },
        { text: header.quantity },
        { text: header.price },
        { text: "Valoarea (lei)" },
        ...(supplier ? [{ text: "Furnizorul" }] : []),
      ],
    ],
    numbers: ["0", "1", "2", "3", "4", "5 = 3 × 4", ...(supplier ? ["6"] : [])],
    rows,
  };
}

function listDocument(
  data: ExportData,
  options: ExportOptions,
  kind: ResourceKind,
  scope: Scope,
): FormDocument {
  const spec = lists[kind];
  const label = formLabel(options, spec.kind);
  const where = scope.category ?? scope.object;
  const name = where ? `${label} · ${where}` : label;
  return {
    id: spec.kind,
    label,
    name,
    orientation: "portrait",
    footer: footerOf(data, name),
    blocks: [
      partyFields(data, options, { object: scope.object }),
      {
        type: "title",
        lines: [
          "LISTA",
          spec.title,
          ...(scope.category
            ? [`Categoria de lucrări: ${scope.category}`]
            : []),
        ],
      },
      ...(options.withValues ? [currencyNote] : []),
      listTable(resourceList(scope.items, kind), options, spec.supplier, spec),
      ...closingBlocks(data, options),
    ],
  };
}

/** One list of a kind of resource for each scope, in print order. */
export function resourceDocuments(
  data: ExportData,
  options: ExportOptions,
  kind: ResourceKind,
): FormDocument[] {
  return scopesOf(data, options).map((scope) =>
    listDocument(data, options, kind, scope),
  );
}

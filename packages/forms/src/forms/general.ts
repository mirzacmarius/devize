import { roundLei } from "@devize/backend/convex/estimates/recap";
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
import { buildTree } from "../tree";
import {
  closingBlocks,
  empty,
  footerOf,
  formLabel,
  money,
  objectName,
  partyFields,
  priceDateNote,
} from "./common";
import { baseObjects, objectParts } from "./summaries";

// The Deviz general of the objective (HG 907/2016, Anexa 7, as HG 1116/2023
// replaced it) and each object's Deviz (Anexa 8), with VAT. The works fill
// the subchapters they fall under; what a Deviz has no works for, such as
// design fees or the budget margin, is the beneficiary's to add.

type Line =
  | { kind: "group"; text: string }
  | {
      kind: "item" | "subtotal" | "total";
      code?: string;
      name: string;
      // The subchapters whose works the line adds up, or none when no works
      // of a Deviz can fall under it.
      among?: readonly Subchapter[];
      bold?: boolean;
    };

const item = (
  code: string,
  name: string,
  among?: readonly Subchapter[],
): Extract<Line, { name: string }> => ({ kind: "item", code, name, among });

const works = (code: Subchapter): Line =>
  item(code, subchapterNames[code], [code]);

const buildings: readonly Subchapter[] = ["4.1.1", "4.1.2", "4.1.3", "4.1.4"];

const generalLines: readonly Line[] = [
  {
    kind: "group",
    text: "CAPITOLUL 1 – Cheltuieli pentru obținerea și amenajarea terenului",
  },
  item("1.1", "Obținerea terenului"),
  works("1.2"),
  works("1.3"),
  works("1.4"),
  { kind: "subtotal", name: "Total capitol 1", among: ["1.2", "1.3", "1.4"] },
  {
    kind: "group",
    text: "CAPITOLUL 2 – Cheltuieli pentru asigurarea utilităților necesare obiectivului de investiții",
  },
  { kind: "subtotal", name: "Total capitol 2", among: ["2"] },
  {
    kind: "group",
    text: "CAPITOLUL 3 – Cheltuieli pentru proiectare și asistență tehnică",
  },
  item("3.1", "Studii"),
  item("3.1.1", "Studii de teren"),
  item("3.1.2", "Raport privind impactul asupra mediului"),
  item("3.1.3", "Alte studii specifice"),
  item(
    "3.2",
    "Documentații-suport și cheltuieli pentru obținerea de avize, acorduri și autorizații",
  ),
  item("3.3", "Expertizare tehnică"),
  item(
    "3.4",
    "Certificarea performanței energetice și auditul energetic al clădirilor",
  ),
  item("3.5", "Proiectare"),
  item("3.5.1", "Temă de proiectare"),
  item("3.5.2", "Studiu de prefezabilitate"),
  item(
    "3.5.3",
    "Studiu de fezabilitate/documentație de avizare a lucrărilor de intervenții și deviz general",
  ),
  item(
    "3.5.4",
    "Documentațiile tehnice necesare în vederea obținerii avizelor/acordurilor/autorizațiilor",
  ),
  item(
    "3.5.5",
    "Verificarea tehnică de calitate a proiectului tehnic și a detaliilor de execuție",
  ),
  item("3.5.6", "Proiect tehnic și detalii de execuție"),
  item("3.6", "Organizarea procedurilor de achiziție"),
  item("3.7", "Consultanță"),
  item("3.7.1", "Managementul de proiect pentru obiectivul de investiții"),
  item("3.7.2", "Auditul financiar"),
  item("3.8", "Asistență tehnică"),
  item("3.8.1", "Asistență tehnică din partea proiectantului"),
  item("3.8.1.1", "pe perioada de execuție a lucrărilor"),
  item(
    "3.8.1.2",
    "pentru participarea proiectantului la fazele incluse în programul de control al lucrărilor de execuție, avizat de către Inspectoratul de Stat în Construcții",
  ),
  item("3.8.2", "Dirigenție de șantier"),
  { kind: "subtotal", name: "Total capitol 3" },
  {
    kind: "group",
    text: "CAPITOLUL 4 – Cheltuieli pentru investiția de bază",
  },
  item("4.1", "Construcții și instalații", buildings),
  works("4.2"),
  works("4.3"),
  works("4.4"),
  works("4.5"),
  works("4.6"),
  { kind: "subtotal", name: "Total capitol 4", among: baseInvestment },
  { kind: "group", text: "CAPITOLUL 5 – Alte cheltuieli" },
  item("5.1", "Organizare de șantier", ["5.1.1"]),
  works("5.1.1"),
  item("5.1.2", "Cheltuieli conexe organizării șantierului"),
  item("5.2", "Comisioane, cote, taxe, costul creditului"),
  item(
    "5.2.1",
    "Comisioanele și dobânzile aferente creditului băncii finanțatoare",
  ),
  item(
    "5.2.2",
    "Cota aferentă ISC pentru controlul calității lucrărilor de construcții",
  ),
  item(
    "5.2.3",
    "Cota aferentă ISC pentru controlul statului în amenajarea teritoriului, urbanism și pentru autorizarea lucrărilor de construcții",
  ),
  item("5.2.4", "Cota aferentă Casei Sociale a Constructorilor – CSC"),
  item(
    "5.2.5",
    "Taxe pentru acorduri, avize conforme și autorizația de construire/desființare",
  ),
  item("5.3", "Cheltuieli diverse și neprevăzute"),
  item("5.4", "Cheltuieli pentru informare și publicitate"),
  { kind: "subtotal", name: "Total capitol 5", among: ["5.1.1"] },
  {
    kind: "group",
    text: "CAPITOLUL 6 – Cheltuieli pentru probe tehnologice și teste",
  },
  item("6.1", "Pregătirea personalului de exploatare"),
  item("6.2", "Probe tehnologice și teste"),
  { kind: "subtotal", name: "Total capitol 6" },
  {
    kind: "group",
    text: "CAPITOLUL 7 – Cheltuieli aferente marjei de buget și pentru constituirea rezervei de implementare pentru ajustarea de preț",
  },
  item("7.1", "Cheltuieli aferente marjei de buget"),
  item(
    "7.2",
    "Cheltuieli pentru constituirea rezervei de implementare pentru ajustarea de preț",
  ),
  { kind: "subtotal", name: "Total capitol 7" },
  { kind: "total", name: "TOTAL GENERAL", among: subchapters },
  {
    kind: "item",
    name: "din care: C + M (1.2 + 1.3 + 1.4 + 2 + 4.1 + 4.2 + 5.1.1)",
    among: constructionWorks,
  },
];

const [constructions, assembly, purchases] = objectParts;

const objectLines: readonly Line[] = [
  {
    kind: "group",
    text: "CAPITOLUL 4 – Cheltuieli pentru investiția de bază",
  },
  { ...item("4.1", "Construcții și instalații"), bold: true },
  ...constructions.among.map(works),
  { kind: "subtotal", name: constructions.total, among: constructions.among },
  ...assembly.among.map(works),
  { kind: "subtotal", name: assembly.total, among: assembly.among },
  ...purchases.among.map(works),
  { kind: "subtotal", name: purchases.total, among: purchases.among },
  {
    kind: "total",
    name: "TOTAL DEVIZ PE OBIECT (TOTAL I + TOTAL II + TOTAL III)",
    among: baseInvestment,
  },
];

/** A Deviz's table: each line's value without VAT, its VAT and both together. */
function devizTable(
  lines: readonly Line[],
  placed: readonly PlacedCategory[],
  data: ExportData,
  options: ExportOptions,
): Table {
  const rate = data.estimate.markups.vat;
  const rows = lines.map((line): Row => {
    if (line.kind === "group") {
      return {
        kind: "group",
        keepWithNext: true,
        cells: [{ text: line.text, bold: true, colSpan: 5 }],
      };
    }
    const bold = line.bold ?? (line.kind !== "item" || !line.code);
    let values: Cell[] = [empty, empty, empty];
    if (options.withValues && line.among) {
      const value = worthOf(placed, line.among);
      const vat = vatOf(placed, line.among, rate);
      values = [
        money(value, { bold }),
        money(vat, { bold }),
        money(roundLei(value + vat), { bold }),
      ];
    }
    return {
      kind: line.kind,
      cells: line.code
        ? [{ text: line.code }, { text: line.name, bold }, ...values]
        : [{ text: line.name, bold, colSpan: 2 }, ...values],
    };
  });
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 40 },
      { width: 1, flex: true },
      { width: 78, align: "right" },
      { width: 66, align: "right" },
      { width: 78, align: "right" },
    ],
    header: [
      [
        { text: "Nr. crt." },
        { text: "Denumirea capitolelor și subcapitolelor de cheltuieli" },
        { text: "Valoare (fără TVA) lei" },
        { text: "TVA lei" },
        { text: "Valoare cu TVA lei" },
      ],
    ],
    numbers: ["1", "2", "3", "4", "5"],
    rows,
  };
}

/** The Deviz general of the objective, with every chapter it has. */
export function generalDocuments(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const placed = placeCategories(buildTree(data), options);
  const label = formLabel(options, "DG");
  return [
    {
      id: "DG",
      label,
      name: label,
      orientation: "portrait",
      footer: footerOf(data, label),
      blocks: [
        partyFields(data, options, { objective: false }),
        {
          type: "title",
          lines: [
            "DEVIZ GENERAL",
            "al obiectivului de investiții",
            data.estimate.title,
          ],
        },
        ...(options.withValues ? [priceDateNote(data)] : []),
        devizTable(generalLines, placed, data, options),
        ...(options.withValues
          ? [
              { type: "space" as const, height: 6 },
              {
                type: "text" as const,
                text: "Au valori subcapitolele lucrărilor din acest deviz, cu CAM, cheltuieli indirecte și profit. Celelalte cheltuieli ale obiectivului se adaugă de beneficiar.",
                size: 7.5,
                muted: true,
              },
            ]
          : []),
        ...closingBlocks(data, options),
      ],
    },
  ];
}

/** One Deviz for each object with works in the base investment. */
export function objectDocuments(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const tree = buildTree(data);
  const label = formLabel(options, "DO");
  return baseObjects(tree, placeCategories(tree, options)).map(
    ({ object, placed }) => {
      const name = `${label} · ${objectName(object)}`;
      return {
        id: "DO",
        label,
        name,
        orientation: "portrait",
        footer: footerOf(data, name),
        blocks: [
          partyFields(data, options, {}),
          {
            type: "title",
            lines: ["DEVIZUL OBIECTULUI", objectName(object)],
          },
          ...(options.withValues ? [priceDateNote(data)] : []),
          devizTable(objectLines, placed, data, options),
          ...closingBlocks(data, options),
        ],
      };
    },
  );
}

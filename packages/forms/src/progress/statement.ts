import { roundLei } from "@devize/backend/convex/estimates/recap";
import {
  attachmentRowQuantity,
  attachmentTotal,
  rowFigures,
  statementTotals,
} from "@devize/backend/convex/progress/arithmetic";
import {
  estimateCode,
  formatDate,
  formatNumber,
  formatPercent,
  formatUnit,
} from "../format";
import { empty, kindLabels, money, quantity } from "../forms/common";
import type { Block, CellPart, FormDocument, Row, Table } from "../model";
import type { StatementData, StatementOptions } from "./input";

// A Situație de lucrări as the beneficiary gets it: each Articol of the
// contract with what was executed before, in this period and in all, what
// remains, and what the period is worth with the Deviz's Cote; then the
// Atașament, the measurements behind every quantity.

function statementName(data: StatementData) {
  return `Situația de lucrări nr. ${data.statement.number}`;
}

function period(data: StatementData) {
  const { periodStart, periodEnd } = data.statement;
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`;
}

/** The lines at the top: who, for whom, which works and which period. */
function headBlocks(data: StatementData, title: string): Block[] {
  const { estimate, statement } = data;
  const code = estimateCode(estimate.number, estimate.revision);
  const site = [estimate.siteAddress, estimate.county].filter(Boolean);
  const firmLines: CellPart[] = [
    { text: data.firm.name, bold: true, size: 11 },
    ...[
      data.firm.cui && `CUI ${data.firm.cui}`,
      data.firm.address,
      [data.firm.phone, data.firm.email].filter(Boolean).join(" · "),
    ]
      .filter((line): line is string => Boolean(line))
      .map((text) => ({ text, muted: true, size: 8 })),
  ];
  return [
    {
      type: "columns",
      columns: [
        { lines: firmLines },
        {
          align: "right",
          lines: [
            { text: title, bold: true, size: 13 },
            { text: `Perioada ${period(data)}`, bold: true, size: 9 },
            {
              text: `Data: ${formatDate(statement.date)}`,
              muted: true,
              size: 8,
            },
          ],
        },
      ],
    },
    { type: "rule" },
    {
      type: "fields",
      items: [
        { label: "Beneficiar", value: data.client?.name ?? "" },
        { label: "Lucrarea", value: `${estimate.title} (deviz ${code})` },
        { label: "Adresa", value: site.join(", ") },
      ].filter((item) => item.value),
    },
  ];
}

/** The rows of the statement, grouped as the Deviz is. */
function rowsTable(data: StatementData): Table {
  const rows: Row[] = [];
  let group: string | undefined;
  let periodBani = 0;
  let cumulativeBani = 0;
  for (const row of data.rows) {
    if (row.group !== group) {
      group = row.group;
      if (group) {
        rows.push({
          kind: "group",
          keepWithNext: true,
          cells: [{ text: group, bold: true, colSpan: 12 }],
        });
      }
    }
    const figures = rowFigures(row);
    periodBani += Math.round(figures.value * 100);
    cumulativeBani += Math.round(figures.cumulativeValue * 100);
    rows.push({
      kind: "item",
      cells: [
        { text: String(row.position), align: "right" },
        {
          text: row.title,
          more: row.code
            ? [{ text: row.code, muted: true, size: 7 }]
            : undefined,
        },
        { text: formatUnit(row.unit), align: "center" },
        money(figures.unitPrice),
        quantity(row.contractQuantity),
        quantity(row.previousQuantity),
        quantity(row.quantity, { bold: row.quantity !== 0 }),
        quantity(figures.cumulativeQuantity),
        {
          text: formatPercent(figures.percent),
          value: figures.percent,
          align: "right",
          bold: figures.over,
        },
        quantity(Math.max(0, figures.remainingQuantity)),
        money(figures.value),
        money(figures.cumulativeValue),
      ],
    });
  }
  rows.push({
    kind: "total",
    cells: [
      empty,
      { text: "Total articole, la costul direct", bold: true, colSpan: 9 },
      money(periodBani / 100, { bold: true }),
      money(cumulativeBani / 100, { bold: true }),
    ],
  });
  return {
    type: "table",
    style: "grid",
    fontSize: 7.5,
    columns: [
      { width: 22, align: "right" },
      { width: 1, flex: true },
      { width: 30, align: "center" },
      { width: 56, align: "right" },
      { width: 54, align: "right" },
      { width: 54, align: "right" },
      { width: 54, align: "right" },
      { width: 54, align: "right" },
      { width: 38, align: "right" },
      { width: 54, align: "right" },
      { width: 64, align: "right" },
      { width: 64, align: "right" },
    ],
    header: [
      [
        { text: "Nr.", rowSpan: 2 },
        { text: "Denumirea lucrării", rowSpan: 2 },
        { text: "U.M.", rowSpan: 2 },
        { text: "Preț unitar (lei)", rowSpan: 2 },
        { text: "Cantități", colSpan: 6 },
        { text: "Valoare (lei)", colSpan: 2 },
      ],
      [
        { text: "Contract" },
        { text: "Executat anterior" },
        { text: "Executat în perioadă" },
        { text: "Cumulat" },
        { text: "%" },
        { text: "Rest" },
        { text: "În perioadă" },
        { text: "Cumulat" },
      ],
    ],
    numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
    rows,
  };
}

/** The period's Recapitulație: the Deviz's Cote on the executed works. */
function recapTable(data: StatementData): Table {
  const { markups } = data.statement;
  const totals = statementTotals(data.rows, markups);
  const recap = totals.period;
  const lines: { label: string; value: number; kind: Row["kind"] }[] = [
    {
      label: "Total articole, din care:",
      value: roundLei(
        recap.material + recap.labor + recap.equipment + recap.transport,
      ),
      kind: "subtotal",
    },
    { label: kindLabels.material, value: recap.material, kind: "detail" },
    { label: kindLabels.labor, value: recap.labor, kind: "detail" },
    { label: kindLabels.equipment, value: recap.equipment, kind: "detail" },
    { label: kindLabels.transport, value: recap.transport, kind: "detail" },
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
      label: `Cheltuieli indirecte (${formatPercent(markups.indirect)})`,
      value: recap.indirect,
      kind: "item",
    },
    {
      label: `Profit (${formatPercent(markups.profit)})`,
      value: recap.profit,
      kind: "item",
    },
    { label: "TOTAL fără TVA", value: recap.subtotal, kind: "subtotal" },
    {
      label: `TVA (${formatPercent(markups.vat)})`,
      value: recap.vat,
      kind: "item",
    },
    { label: "TOTAL cu TVA", value: recap.total, kind: "total" },
  ];
  const retention = data.statement.retention;
  if (retention > 0) {
    const percent = data.guarantee?.percent;
    lines.push({
      label: percent
        ? `Garanție de bună execuție reținută (${formatPercent(percent)} din valoarea fără TVA)`
        : "Garanție de bună execuție reținută",
      value: retention,
      kind: "item",
    });
  }
  return {
    type: "table",
    style: "lines",
    width: 330,
    columns: [
      { width: 1, flex: true },
      { width: 90, align: "right" },
    ],
    header: [[{ text: "Recapitulația perioadei" }, { text: "lei" }]],
    rows: lines.map((line, index) => ({
      kind: line.kind,
      keepWithNext: index < lines.length - 1,
      cells: [
        {
          text: line.label,
          bold: line.kind === "subtotal" || line.kind === "total",
        },
        money(line.value, {
          bold: line.kind === "subtotal" || line.kind === "total",
        }),
      ],
    })),
  };
}

/** Where the works stand after this statement, without VAT. */
function progressFields(data: StatementData): Block {
  const totals = statementTotals(data.rows, data.statement.markups);
  return {
    type: "fields",
    items: [
      {
        label: "Valoarea contractului",
        value: `${formatNumber(totals.contract.subtotal, 2)} lei fără TVA`,
      },
      {
        label: "Executat cumulat",
        value: `${formatNumber(totals.cumulative.subtotal, 2)} lei fără TVA (${formatPercent(totals.percent)})`,
      },
      {
        label: "Rest de executat",
        value: `${formatNumber(totals.remainingSubtotal, 2)} lei fără TVA`,
      },
    ],
  };
}

function signatureBlocks(data: StatementData): Block[] {
  const { statement } = data;
  const confirmed =
    statement.status === "approved"
      ? [
          {
            type: "text" as const,
            text: `Confirmat de beneficiar: ${statement.approvedBy ?? "–"}${
              statement.approvedAt
                ? `, la ${formatDate(new Date(statement.approvedAt).toISOString().slice(0, 10))}`
                : ""
            }.`,
            size: 8,
          },
        ]
      : [];
  return [
    ...confirmed,
    { type: "space", height: 20 },
    {
      type: "signatures",
      items: [
        {
          role: "Executant,",
          name: data.firm.name,
          hint: "(semnătura și ștampila)",
        },
        {
          role: "Diriginte de șantier,",
          hint: "(numele și semnătura)",
        },
        {
          role: "Beneficiar,",
          name: data.client?.name,
          hint: "(semnătura)",
        },
      ],
    },
  ];
}

/** The Situație de lucrări, landscape for its twelve columns. */
export function statementDocument(data: StatementData): FormDocument {
  const code = estimateCode(data.estimate.number, data.estimate.revision);
  const name = statementName(data);
  return {
    id: "SL",
    label: name,
    name: `${name} · ${code}`,
    orientation: "landscape",
    footer: `${code} · ${name}`,
    blocks: [
      ...headBlocks(data, "SITUAȚIE DE LUCRĂRI"),
      { type: "space", height: 10 },
      rowsTable(data),
      { type: "space", height: 10 },
      progressFields(data),
      recapTable(data),
      {
        type: "text",
        text: "Valorile sunt în lei. Prețurile unitare sunt la costul direct, fără TVA; cotele se aplică pe totaluri, ca în deviz.",
        muted: true,
        size: 7.5,
      },
      ...(data.statement.notes
        ? [{ type: "text" as const, text: data.statement.notes, size: 8 }]
        : []),
      ...signatureBlocks(data),
    ],
  };
}

function side(value: number | undefined) {
  return value === undefined ? empty : quantity(value);
}

/** The Atașament: one table, each Articol's measurements under its name. */
function attachmentTable(data: StatementData): Table {
  const rows: Row[] = [];
  for (const row of data.rows) {
    if (row.quantity === 0 && row.attachment.length === 0) {
      continue;
    }
    rows.push({
      kind: "group",
      keepWithNext: true,
      cells: [
        {
          text: `${row.position}. ${row.title}`,
          bold: true,
          colSpan: 6,
          more: row.code
            ? [{ text: row.code, muted: true, size: 7 }]
            : undefined,
        },
        { text: formatUnit(row.unit), bold: true, align: "right" },
      ],
    });
    row.attachment.forEach((line, index) => {
      rows.push({
        kind: "item",
        cells: [
          { text: String(index + 1), align: "right" },
          { text: `${line.deduct ? "– " : ""}${line.label ?? ""}`.trim() },
          quantity(line.count),
          side(line.length),
          side(line.width),
          side(line.height),
          quantity(attachmentRowQuantity(line)),
        ],
      });
    });
    const measured = attachmentTotal(row.attachment);
    const differs =
      row.attachment.length > 0 && Math.abs(measured - row.quantity) > 0.0005;
    rows.push({
      kind: "subtotal",
      cells: [
        empty,
        {
          text:
            row.attachment.length === 0
              ? "Cantitate executată în perioadă, conform măsurătorilor de pe șantier"
              : differs
                ? `Total măsurat ${formatNumber(measured, 2, 3)} ${formatUnit(row.unit)}; executat în perioadă`
                : "Total executat în perioadă",
          bold: true,
          colSpan: 5,
        },
        quantity(row.quantity, { bold: true }),
      ],
    });
  }
  return {
    type: "table",
    style: "grid",
    columns: [
      { width: 24, align: "right" },
      { width: 1, flex: true },
      { width: 48, align: "right" },
      { width: 58, align: "right" },
      { width: 58, align: "right" },
      { width: 58, align: "right" },
      { width: 66, align: "right" },
    ],
    header: [
      [
        { text: "Nr." },
        { text: "Descrierea măsurătorii" },
        { text: "Buc." },
        { text: "Lungime" },
        { text: "Lățime" },
        { text: "Înălțime" },
        { text: "Cantitate" },
      ],
    ],
    rows,
  };
}

/** The Atașament of a statement, portrait. */
export function attachmentDocument(data: StatementData): FormDocument {
  const code = estimateCode(data.estimate.number, data.estimate.revision);
  const name = statementName(data);
  return {
    id: "AT",
    label: "Atașament",
    name: `Atașament · ${name}`,
    orientation: "portrait",
    footer: `${code} · Atașament la ${name.toLowerCase()}`,
    blocks: [
      ...headBlocks(data, "ATAȘAMENT"),
      {
        type: "text",
        text: `Măsurătorile din spatele cantităților executate în perioada ${period(data)}, pe fiecare articol al situației de lucrări nr. ${data.statement.number}. O linie cu „–” se scade.`,
        muted: true,
        size: 8,
      },
      { type: "space", height: 8 },
      attachmentTable(data),
      { type: "space", height: 20 },
      {
        type: "signatures",
        items: [
          {
            role: "Executant,",
            name: data.firm.name,
            hint: "(numele și semnătura)",
          },
          { role: "Diriginte de șantier,", hint: "(numele și semnătura)" },
        ],
      },
    ],
  };
}

/** The statement, and its Atașament when asked for. */
export function statementDocuments(
  data: StatementData,
  options: StatementOptions,
): FormDocument[] {
  return [
    statementDocument(data),
    ...(options.attachment ? [attachmentDocument(data)] : []),
  ];
}

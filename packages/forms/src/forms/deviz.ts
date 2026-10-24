import {
  computeRecap,
  lineTotals,
  type Recap,
  roundLei,
} from "@devize/backend/convex/estimates/recap";
import { normalizeText } from "@devize/backend/convex/lib/text";
import { estimateCode, formatDate, formatPercent, formatUnit } from "../format";
import type {
  ExportData,
  ExportOptions,
  LineItemInput,
  Markups,
  PartyInput,
  SectionInput,
} from "../input";
import type { CellPart, FormDocument, Row, Table } from "../model";
import { beneficiaryOf, money, quantity } from "./common";
import {
  acceptanceBlocks,
  consumerBlocks,
  formatMoment,
  paymentBlocks,
} from "./terms";

// The Deviz as the client gets it: the firm's letterhead, the line items by
// object and chapter at their direct cost, then the Recapitulație that adds
// CAM, indirect costs, profit and VAT, and room for both to sign.

/** The lines under a firm's or a client's name: codes, address, contact. */
function partyLines(party: PartyInput): CellPart[] {
  const codes = [party.cui && `CUI ${party.cui}`, party.tradeRegister];
  const county =
    party.county &&
    !normalizeText(party.address ?? "").includes(normalizeText(party.county))
      ? party.county
      : undefined;
  return [
    codes.filter(Boolean).join(" · "),
    [party.address, county].filter(Boolean).join(", "),
    [party.phone, party.email].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .map((text) => ({ text, muted: true, size: 8 }));
}

const byPosition = <T extends { position: number }>(a: T, b: T) =>
  a.position - b.position;

/** What some line items add up to before markups, in lei. */
function directCost(items: readonly LineItemInput[]) {
  return (
    items.reduce(
      (bani, item) => bani + Math.round(lineTotals(item).total * 100),
      0,
    ) / 100
  );
}

function sectionName(section: SectionInput) {
  return section.code ? `${section.code} ${section.name}` : section.name;
}

/**
 * The line items in the order and with the numbers the Deviz's page shows:
 * items outside any section first, then each object or chapter, with its
 * own subtotal. Empty sections are left out.
 */
function itemsTable(data: ExportData): Table {
  const sections = [...data.sections].sort(byPosition);
  const known = new Set(sections.map((section) => section._id));
  const objects = new Set(
    sections
      .filter((section) => section.kind === "object")
      .map((section) => section._id),
  );
  const bySection = new Map<string, LineItemInput[]>();
  const loose: LineItemInput[] = [];
  for (const item of [...data.lineItems].sort(byPosition)) {
    if (item.sectionId && known.has(item.sectionId)) {
      bySection.set(item.sectionId, [
        ...(bySection.get(item.sectionId) ?? []),
        item,
      ]);
    } else {
      loose.push(item);
    }
  }

  const rows: Row[] = [];
  let number = 0;
  const itemRows = (items: readonly LineItemInput[]) => {
    for (const item of items) {
      number += 1;
      const { unitCost } = item;
      rows.push({
        kind: "item",
        cells: [
          { text: String(number), align: "right" },
          {
            text: item.title,
            more: item.code
              ? [{ text: item.code, muted: true, size: 7 }]
              : undefined,
          },
          { text: formatUnit(item.unit), align: "center" },
          quantity(item.quantity),
          money(
            roundLei(
              unitCost.material +
                unitCost.labor +
                unitCost.equipment +
                unitCost.transport,
            ),
          ),
          money(lineTotals(item).total),
        ],
      });
    }
  };
  // Top-level sections are shaded; the chapters of an object are bold lines.
  const heading = (section: SectionInput, nested: boolean) =>
    rows.push({
      kind: nested ? "item" : "group",
      keepWithNext: true,
      cells: [{ text: sectionName(section), bold: true, colSpan: 6 }],
    });
  const subtotal = (section: SectionInput, value: number) =>
    rows.push({
      kind: "subtotal",
      cells: [
        { text: "" },
        { text: `Total ${sectionName(section)}`, bold: true, colSpan: 4 },
        money(value, { bold: true }),
      ],
    });

  itemRows(loose);
  for (const section of sections) {
    const nested =
      section.kind === "chapter" &&
      section.parentId !== undefined &&
      objects.has(section.parentId);
    if (nested) {
      continue;
    }
    const own = bySection.get(section._id) ?? [];
    const chapters = sections
      .filter(
        (chapter) =>
          section.kind === "object" &&
          chapter.kind === "chapter" &&
          chapter.parentId === section._id,
      )
      .map((chapter) => ({
        chapter,
        items: bySection.get(chapter._id) ?? [],
      }))
      .filter(({ items }) => items.length > 0);
    if (own.length === 0 && chapters.length === 0) {
      continue;
    }
    heading(section, false);
    itemRows(own);
    for (const { chapter, items } of chapters) {
      heading(chapter, true);
      itemRows(items);
      subtotal(chapter, directCost(items));
    }
    subtotal(
      section,
      directCost([...own, ...chapters.flatMap(({ items }) => items)]),
    );
  }
  return {
    type: "table",
    style: "lines",
    columns: [
      { width: 22, align: "right" },
      { width: 1, flex: true },
      { width: 34, align: "center" },
      { width: 56, align: "right" },
      { width: 66, align: "right" },
      { width: 74, align: "right" },
    ],
    header: [
      [
        { text: "Nr." },
        { text: "Denumirea lucrării" },
        { text: "U.M." },
        { text: "Cantitatea" },
        { text: "Preț unitar" },
        { text: "Valoare" },
      ],
    ],
    rows,
  };
}

function recapTable(recap: Recap, markups: Markups): Table {
  const lines: { label: string; value: number; kind: Row["kind"] }[] = [];
  const add = (label: string, value: number, kind: Row["kind"] = "item") =>
    lines.push({ label, value, kind });
  const direct = [
    { label: "Materiale", value: recap.material },
    { label: "Manoperă", value: recap.labor },
    { label: "Utilaj", value: recap.equipment },
    { label: "Transport", value: recap.transport },
    {
      label: `CAM (${formatPercent(markups.cam)} din manoperă)`,
      value: recap.cam,
    },
  ];
  for (const line of direct) {
    if (line.value !== 0) {
      add(line.label, line.value);
    }
  }
  const marked = recap.indirect !== 0 || recap.profit !== 0;
  if (marked) {
    add("Total cheltuieli directe", recap.direct, "subtotal");
    if (recap.indirect !== 0) {
      add(
        `Cheltuieli indirecte (${formatPercent(markups.indirect)})`,
        recap.indirect,
      );
    }
    if (recap.profit !== 0) {
      add(`Profit (${formatPercent(markups.profit)})`, recap.profit);
    }
  }
  if (recap.vat !== 0) {
    add("Total fără TVA", recap.subtotal, "subtotal");
    add(`TVA (${formatPercent(markups.vat)})`, recap.vat);
    add("TOTAL cu TVA", recap.total, "total");
  } else {
    add("TOTAL", recap.total, "total");
  }
  return {
    type: "table",
    style: "lines",
    width: 280,
    columns: [
      { width: 1, flex: true },
      { width: 90, align: "right" },
    ],
    header: [[{ text: "Recapitulație" }, { text: "lei" }]],
    rows: lines.map((line, index) => ({
      kind: line.kind,
      keepWithNext: index < lines.length - 1,
      cells: [
        { text: line.label, bold: line.kind !== "item" },
        money(line.value, { bold: line.kind !== "item" }),
      ],
    })),
  };
}

/** The Deviz to send the client, as one document. */
export function devizDocument(
  data: ExportData,
  options: ExportOptions,
): FormDocument {
  const { estimate } = data;
  const code = estimateCode(estimate.number, estimate.revision);
  const beneficiary = beneficiaryOf(data, options);
  // The client's address and codes, unless the person named someone else.
  const client =
    data.client && data.client.name === beneficiary ? data.client : undefined;
  const site = [estimate.siteAddress, estimate.county].filter(Boolean);
  const recap = computeRecap(data.lineItems, estimate.markups);
  const signature = data.offer?.signature;
  return {
    id: "DEVIZ",
    name: `Deviz ${code}`,
    orientation: "portrait",
    footer: `${code} · ${estimate.title}`,
    blocks: [
      {
        type: "columns",
        columns: [
          {
            lines: [
              { text: data.firm.name, bold: true, size: 11 },
              ...partyLines(data.firm),
            ],
          },
          {
            align: "right",
            lines: [
              { text: "DEVIZ", bold: true, size: 15 },
              { text: code, bold: true, size: 9 },
              {
                text: `Data: ${formatDate(options.date)}`,
                muted: true,
                size: 8,
              },
            ],
          },
        ],
      },
      { type: "rule" },
      {
        type: "columns",
        columns: [
          {
            lines: [
              { text: "BENEFICIAR", bold: true, muted: true, size: 7 },
              { text: beneficiary || "–", bold: true, size: 9 },
              ...(client ? partyLines(client) : []),
            ],
          },
          {
            lines: [
              { text: "LUCRAREA", bold: true, muted: true, size: 7 },
              { text: estimate.title, bold: true, size: 9 },
              ...(site.length > 0
                ? [{ text: site.join(", "), muted: true, size: 8 }]
                : []),
              {
                text: `Prețuri la data de ${formatDate(estimate.priceDate)}`,
                muted: true,
                size: 8,
              },
            ],
          },
        ],
      },
      { type: "space", height: 16 },
      itemsTable(data),
      { type: "space", height: 12 },
      recapTable(recap, estimate.markups),
      { type: "space", height: 8 },
      {
        type: "text",
        text:
          recap.vat !== 0
            ? "Valorile sunt în lei. Prețurile unitare nu includ TVA."
            : "Valorile sunt în lei.",
        muted: true,
        size: 7.5,
      },
      ...paymentBlocks(data, recap.total),
      ...consumerBlocks(data),
      ...acceptanceBlocks(data),
      { type: "space", height: 24 },
      {
        type: "signatures",
        items: [
          {
            role: "Executant,",
            name: data.firm.name,
            hint: "(semnătura și ștampila)",
          },
          {
            role: "Beneficiar,",
            name: signature?.name ?? beneficiary,
            hint: signature
              ? `(semnat electronic pe ${formatMoment(signature.signedAt)})`
              : "(semnătura)",
          },
        ],
      },
    ],
  };
}

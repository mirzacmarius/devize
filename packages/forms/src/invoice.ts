import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { roundLei } from "@devize/backend/convex/estimates/recap";
import { lineVat } from "@devize/backend/convex/invoices/money";
import { formatDate, formatMoney, formatPercent, formatUnit } from "./format";
import { money, quantity } from "./forms/common";
import type { Block, CellPart, FormDocument, Row, Table } from "./model";

// A Factură as the client gets it on paper or as a PDF: the firm's
// letterhead, the number and dates, the client, the lines with VAT by rate,
// the totals and what the firm states under them. Legea 227/2015 art. 319
// says what an invoice carries; this prints all of it and nothing it has to
// make up. The same row becomes the e-Factura XML in the backend.

type InvoiceDoc = Doc<"invoices">;
type Party = InvoiceDoc["seller"];

export type InvoiceReference = { code: string | null; issueDate: string };

/** An invoice as the document reads it: the row, plus names for what it refers to. */
export type InvoiceInput = Pick<
  InvoiceDoc,
  | "kind"
  | "status"
  | "series"
  | "number"
  | "issueDate"
  | "dueDate"
  | "seller"
  | "buyer"
  | "lines"
  | "totals"
  | "retention"
  | "notes"
  | "payments"
  | "paidAmount"
  | "advancePercent"
> & {
  mentions?: readonly string[];
  efactura?: { uploadIndex?: string };
  estimate?: { code: string; title: string } | null;
  stornoOf?: InvoiceReference | null;
  // Who drew the invoice up, printed under "Întocmit de".
  issuer?: string;
};

/** An invoice's number as the app writes it: DVZ-0017. */
export function invoiceCode(series: string, number: number): string {
  return `${series}-${String(number).padStart(4, "0")}`;
}

/** The number, or null while the invoice is a draft. */
export function invoiceCodeOf(
  invoice: Pick<InvoiceInput, "series" | "number">,
): string | null {
  return invoice.series !== undefined && invoice.number !== undefined
    ? invoiceCode(invoice.series, invoice.number)
    : null;
}

const muted = (text: string): CellPart => ({ text, muted: true, size: 8 });

/** "CIF RO2816464" for a firm registered for VAT, "CUI 2816464" otherwise, "CNP …" for a person. */
function identifier(party: Party): string | undefined {
  if (!party.cui) {
    return undefined;
  }
  if (party.kind === "person") {
    return `CNP ${party.cui}`;
  }
  return party.vatRegistered ? `CIF RO${party.cui}` : `CUI ${party.cui}`;
}

/** The address in one line, without saying the county twice. */
function addressLine(party: Party): string | undefined {
  const town = [party.postalCode, party.city].filter(Boolean).join(" ");
  const county =
    party.county && party.county.toLowerCase() !== party.city?.toLowerCase()
      ? party.county
      : undefined;
  const line = [party.address, town, county].filter(Boolean).join(", ");
  return line || undefined;
}

/** What goes under a party's name: identifiers, address, contact. */
function partyLines(party: Party): CellPart[] {
  return [
    [identifier(party), party.tradeRegister].filter(Boolean).join(" · "),
    addressLine(party),
    [party.phone, party.email].filter(Boolean).join(" · "),
  ]
    .filter((text): text is string => Boolean(text))
    .map(muted);
}

/** The letterhead: the party lines, then what Legea 31/1990 wants said of a firm. */
function sellerLines(seller: Party): CellPart[] {
  const bank = [seller.iban && `IBAN ${seller.iban}`, seller.bank]
    .filter(Boolean)
    .join(" · ");
  return [
    ...partyLines(seller),
    ...(seller.shareCapital !== undefined
      ? [muted(`Capital social: ${formatMoney(seller.shareCapital)} lei`)]
      : []),
    ...(bank ? [muted(bank)] : []),
  ];
}

const kindLabels: Record<InvoiceDoc["kind"], string> = {
  advance: "Factură de avans",
  statement: "Factură pentru situație de lucrări",
  final: "Factură finală",
  storno: "Factură de stornare",
};

/** How a line's VAT shows in its column: the rate, or why there is none. */
function vatLabel(line: InvoiceDoc["lines"][number]): string {
  switch (line.vatCategory) {
    case "S":
    case "Z":
      return formatPercent(line.vatRate);
    case "E":
      return "scutit";
    case "AE":
      return "taxare inversă";
    default:
      return "neimpozabil";
  }
}

function linesTable(invoice: InvoiceInput): Table {
  const rows: Row[] = invoice.lines.map((line, index) => ({
    kind: "item",
    cells: [
      { text: String(index + 1), align: "right" },
      { text: line.description },
      { text: formatUnit(line.unit), align: "center" },
      quantity(line.quantity),
      money(line.unitPrice),
      money(line.net),
      { text: vatLabel(line), align: "center" },
      money(lineVat(line)),
    ],
  }));
  return {
    type: "table",
    style: "lines",
    columns: [
      { width: 22, align: "right" },
      { width: 1, flex: true },
      { width: 30, align: "center" },
      { width: 46, align: "right" },
      { width: 62, align: "right" },
      { width: 66, align: "right" },
      { width: 44, align: "center" },
      { width: 60, align: "right" },
    ],
    header: [
      [
        { text: "Nr." },
        { text: "Denumirea produselor sau a serviciilor" },
        { text: "U.M." },
        { text: "Cant." },
        { text: "Preț unitar" },
        { text: "Valoare" },
        { text: "TVA" },
        { text: "Valoare TVA" },
      ],
    ],
    rows,
  };
}

/** The totals, VAT by rate, then what is withheld or already paid. */
function totalsTable(invoice: InvoiceInput): Table {
  const { totals, retention } = invoice;
  const lines: { label: string; value: number; kind: Row["kind"] }[] = [
    { label: "Total fără TVA", value: totals.net, kind: "subtotal" },
  ];
  const rated = totals.byRate.filter(
    (group) => group.vatCategory === "S" || group.vatCategory === "Z",
  );
  if (rated.length === 0) {
    lines.push({ label: "TVA", value: 0, kind: "item" });
  }
  for (const group of rated) {
    lines.push({
      label:
        rated.length > 1
          ? `TVA ${formatPercent(group.vatRate)} (din ${formatMoney(group.net)})`
          : `TVA ${formatPercent(group.vatRate)}`,
      value: group.vat,
      kind: "item",
    });
  }
  lines.push({ label: "TOTAL DE PLATĂ", value: totals.total, kind: "total" });
  if (retention && retention.amount > 0) {
    lines.push(
      {
        label: `Garanție de bună execuție reținută ${formatPercent(retention.percent)}`,
        value: -retention.amount,
        kind: "item",
      },
      {
        label: "Rest de plată",
        value: roundLei(totals.total - retention.amount),
        kind: "total",
      },
    );
  }
  if (invoice.status !== "draft" && invoice.paidAmount > 0) {
    lines.push(
      { label: "Achitat", value: -invoice.paidAmount, kind: "item" },
      {
        label: "Rest de achitat",
        value: roundLei(totals.total - invoice.paidAmount),
        kind: "total",
      },
    );
  }
  return {
    type: "table",
    style: "lines",
    width: 300,
    columns: [
      { width: 1, flex: true },
      { width: 96, align: "right" },
    ],
    header: [[{ text: "Recapitulație" }, { text: "lei" }]],
    rows: lines.map((line, index) => ({
      kind: line.kind,
      keepWithNext: index < lines.length - 1,
      cells: [
        { text: line.label, bold: line.kind === "total" },
        money(line.value, { bold: line.kind === "total" }),
      ],
    })),
  };
}

/** What the invoice states under its totals, each line as given. */
function mentionBlocks(invoice: InvoiceInput): Block[] {
  const texts = [
    ...(invoice.notes ? [invoice.notes] : []),
    ...(invoice.seller.vatRegistered ? [] : ["Neplătitor de TVA."]),
    ...(invoice.mentions ?? []),
    ...(invoice.efactura?.uploadIndex
      ? [`e-Factura: index de încărcare ANAF ${invoice.efactura.uploadIndex}.`]
      : []),
  ].filter((text) => text.trim());
  return texts.map((text) => ({ type: "text", text, muted: true, size: 8 }));
}

/** The lines on the right of the client: what the invoice is for and when it is due. */
function detailLines(invoice: InvoiceInput): CellPart[] {
  const kind =
    invoice.kind === "advance" && invoice.advancePercent !== undefined
      ? `${kindLabels.advance} ${formatPercent(invoice.advancePercent)}`
      : kindLabels[invoice.kind];
  const lines: (string | undefined)[] = [
    kind,
    invoice.estimate ? `Lucrarea: ${invoice.estimate.title}` : undefined,
    invoice.estimate ? `Deviz: ${invoice.estimate.code}` : undefined,
    invoice.stornoOf
      ? `Stornează factura ${invoice.stornoOf.code ?? "–"} din ${formatDate(invoice.stornoOf.issueDate)}`
      : undefined,
    `Termen de plată: ${formatDate(invoice.dueDate)}`,
  ];
  return lines.filter((text): text is string => Boolean(text)).map(muted);
}

/** The Factură as one document. */
export function invoiceDocument(invoice: InvoiceInput): FormDocument {
  const code = invoiceCodeOf(invoice);
  const draft = invoice.status === "draft";
  const numberLines: CellPart[] = code
    ? [
        {
          text: `Seria ${invoice.series} nr. ${String(invoice.number).padStart(4, "0")}`,
          bold: true,
          size: 9,
        },
      ]
    : [{ text: "CIORNĂ – fără număr", bold: true, size: 9 }];
  const blocks: Block[] = [
    {
      type: "columns",
      columns: [
        {
          lines: [
            { text: invoice.seller.name, bold: true, size: 11 },
            ...sellerLines(invoice.seller),
          ],
        },
        {
          align: "right",
          lines: [
            { text: "FACTURĂ", bold: true, size: 15 },
            ...numberLines,
            muted(`Data emiterii: ${formatDate(invoice.issueDate)}`),
            muted(`Scadență: ${formatDate(invoice.dueDate)}`),
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
            { text: "CLIENT", bold: true, muted: true, size: 7 },
            { text: invoice.buyer.name || "–", bold: true, size: 9 },
            ...partyLines(invoice.buyer),
          ],
        },
        {
          lines: [
            { text: "DETALII", bold: true, muted: true, size: 7 },
            ...detailLines(invoice),
          ],
        },
      ],
    },
    { type: "space", height: 16 },
    { type: "text", text: "– lei –", align: "right", size: 7.5 },
    linesTable(invoice),
    { type: "space", height: 12 },
    totalsTable(invoice),
    { type: "space", height: 10 },
    ...mentionBlocks(invoice),
    { type: "space", height: 6 },
    {
      type: "text",
      text: "Factura circulă fără semnătură și ștampilă (Codul fiscal, art. 319 alin. (29)).",
      muted: true,
      size: 7.5,
    },
    ...(invoice.issuer
      ? [
          {
            type: "text" as const,
            text: `Întocmit de: ${invoice.issuer}`,
            muted: true,
            size: 7.5,
          },
        ]
      : []),
  ];
  const label = draft ? "Ciornă" : (code ?? "");
  return {
    id: "FACTURA",
    name: code ? `Factura ${code}` : "Factură (ciornă)",
    orientation: "portrait",
    footer: `${label} · ${invoice.seller.name}`,
    blocks,
  };
}

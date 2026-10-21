import { offerValue } from "../checks";
import { addDays, formatDate } from "../format";
import type { ExportData, ExportOptions } from "../input";
import type { Block, FormDocument } from "../model";
import { scheduledMonths } from "../schedule";
import { countInFiguresAndWords, leiInFiguresAndWords } from "../words";
import { beneficiaryOf, footerOf, formLabel } from "./common";

// The offer form that opens a tender's financial offer: the bidder's letter
// to the contracting authority, in the standard wording of the forms for
// works. Devize fills its blanks from the other forms: the price without VAT
// and the VAT as F1 totals them, in figures and in words, and the duration
// F6 plans. Without prices, it is the blank form a tender's documentation
// publishes.

const size = 10;

const paragraph = (text: string): Block => ({ type: "text", text, size });
const gap: Block = { type: "space", height: 6 };

/** A blank to fill in by hand, with what goes in it: "…… (ziua/luna/anul)". */
function blank(hint: string, length = 50): string {
  return `${".".repeat(length)} (${hint})`;
}

/** The offer form, filled from the Deviz and the sheet, or blank. */
export function offerFormDocuments(
  data: ExportData,
  options: ExportOptions,
): FormDocument[] {
  const label = formLabel(options, "OF");
  const priced = options.withValues;
  const firm = priced ? data.firm.name.trim() : "";
  const value = priced ? offerValue(data, options) : undefined;
  const months = priced ? scheduledMonths(data, options) : undefined;
  const validity = priced ? options.offer?.validity : undefined;
  const deadline = data.estimate.tender?.deadline;
  const until =
    validity !== undefined && deadline
      ? addDays(deadline, validity)
      : undefined;
  const signer = priced ? options.offer?.signer?.trim() : undefined;
  const role = priced ? options.offer?.role?.trim() : undefined;

  // The authority, and its address when it is the Deviz's client.
  const beneficiary = beneficiaryOf(data, options);
  const address =
    data.client?.name === beneficiary ? data.client.address?.trim() : undefined;
  const to = beneficiary
    ? [beneficiary, address].filter(Boolean).join(", ")
    : blank("denumirea autorității contractante și adresa completă", 80);

  const amount = (lei: number | undefined) =>
    lei === undefined
      ? blank("suma în litere și în cifre", 90)
      : leiInFiguresAndWords(lei);
  // A firm that charges no VAT offers its price alone.
  const vat =
    value?.rate === 0
      ? ""
      : `, la care se adaugă taxa pe valoarea adăugată în valoare de ${amount(value?.vat)}`;
  const duration =
    months === undefined
      ? `${blank("perioada în litere și în cifre")} luni calendaristice`
      : countInFiguresAndWords(
          months,
          "feminine",
          "lună calendaristică",
          "luni calendaristice",
        );
  const days =
    validity === undefined
      ? `${".".repeat(25)} zile (durata în litere și în cifre)`
      : countInFiguresAndWords(validity, "feminine", "zi", "zile");
  const box = (ticked: boolean) => (ticked ? "[x]" : "[ ]");

  return [
    {
      id: "OF",
      label,
      name: label,
      orientation: "portrait",
      footer: footerOf(data, label),
      blocks: [
        {
          type: "columns",
          columns: [
            {
              lines: [
                { text: "OFERTANTUL", bold: true },
                ...(firm
                  ? [{ text: firm }]
                  : [
                      { text: ".".repeat(50) },
                      { text: "(denumirea/numele)", muted: true, size: 7 },
                    ]),
              ],
            },
          ],
        },
        { type: "space", height: 18 },
        { type: "title", lines: ["FORMULAR DE OFERTĂ"] },
        { type: "space", height: 6 },
        paragraph(`Către ${to}`),
        { type: "space", height: 10 },
        paragraph("Domnilor,"),
        gap,
        paragraph(
          `1. Examinând documentația de atribuire, subsemnații, reprezentanți ai ofertantului ${firm || blank("denumirea/numele ofertantului")}, ne oferim ca, în conformitate cu prevederile și cerințele cuprinse în documentația mai sus menționată, să executăm ${data.estimate.title.trim() || blank("denumirea lucrării")} pentru suma de ${amount(value?.subtotal)}, plătibilă după recepția lucrărilor${vat}.`,
        ),
        gap,
        paragraph(
          `2. Ne angajăm ca, în cazul în care oferta noastră este stabilită câștigătoare, să începem lucrările cât mai curând posibil după primirea ordinului de începere și să terminăm lucrările în conformitate cu graficul de execuție anexat în ${duration}.`,
        ),
        gap,
        paragraph(
          `3. Ne angajăm să menținem această ofertă valabilă pentru o durată de ${days}, respectiv până la data de ${until ? formatDate(until) : blank("ziua/luna/anul", 30)}, și ea va rămâne obligatorie pentru noi și poate fi acceptată oricând înainte de expirarea perioadei de valabilitate.`,
        ),
        gap,
        paragraph(
          "4. Până la încheierea și semnarea contractului de achiziție publică această ofertă, împreună cu comunicarea transmisă de dumneavoastră, prin care oferta noastră este stabilită câștigătoare, vor constitui un contract angajant între noi.",
        ),
        gap,
        paragraph("5. Precizăm că:"),
        paragraph(
          `${box(false)} depunem ofertă alternativă, ale cărei detalii sunt prezentate într-un formular de ofertă separat, marcat în mod clar „alternativă”;`,
        ),
        paragraph(`${box(priced)} nu depunem ofertă alternativă.`),
        ...(priced
          ? []
          : [
              {
                type: "text" as const,
                text: "(se bifează opțiunea corespunzătoare)",
                muted: true,
                size: 8,
              },
            ]),
        gap,
        paragraph(
          "6. Am înțeles și consimțim ca, în cazul în care oferta noastră este stabilită ca fiind câștigătoare, să constituim garanția de bună execuție în conformitate cu prevederile din documentația de atribuire.",
        ),
        gap,
        paragraph(
          "7. Înțelegem că nu sunteți obligați să acceptați oferta cu cel mai scăzut preț sau orice altă ofertă pe care o puteți primi.",
        ),
        { type: "space", height: 14 },
        paragraph(
          `Data: ${priced ? formatDate(options.date) : "........../........../...................."}`,
        ),
        gap,
        paragraph(
          `${signer || blank("numele și prenumele")}, în calitate de ${role || blank("funcția", 35)}, legal autorizat să semnez oferta pentru și în numele ${firm || blank("denumirea/numele operatorului economic")}.`,
        ),
        { type: "space", height: 10 },
        {
          type: "signatures",
          items: [
            {
              role: "Ofertant,",
              name: firm || undefined,
              hint: "(semnătura autorizată și ștampila)",
            },
          ],
        },
      ],
    },
  ];
}

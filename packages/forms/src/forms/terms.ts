import {
  formatBucharest,
  WITHDRAWAL_DAYS,
} from "@devize/backend/convex/offers/consumer";
import { stageAmount } from "@devize/backend/convex/offers/payments";
import { formatMoney, formatPercent } from "../format";
import type { ExportData, PaymentTriggerInput } from "../input";
import type { Block, Row } from "../model";

// The terms the client's Deviz prints under its Recapitulație: how the price
// is paid, what a consumer's rights are (OUG 34/2014) and, once the client
// has accepted on the link, the record of their electronic signature.

const size = 8.5;
const note = (text: string): Block => ({
  type: "text",
  text,
  size,
  muted: true,
});
const paragraph = (text: string): Block => ({ type: "text", text, size });

/** The moments of payment as the documents name them. */
export const triggerLabels: Record<PaymentTriggerInput, string> = {
  signing: "la semnarea ofertei",
  start: "la începerea lucrărilor",
  statement: "pe situații de lucrări",
  completion: "la recepția lucrărilor",
  final: "la recepția finală",
};

/** A moment as Romania reads it: 24.10.2026, 14:05. */
export function formatMoment(at: number): string {
  const { date, time } = formatBucharest(at);
  return `${date}, ${time}`;
}

/** "Condiții de plată": each stage, when it is due and what it comes to. */
export function paymentBlocks(data: ExportData, total: number): Block[] {
  const stages = data.offer?.paymentSchedule;
  if (!stages || stages.length === 0) {
    return [];
  }
  const rows: Row[] = stages.map((stage) => ({
    kind: "item",
    cells: [
      { text: stage.stage },
      { text: triggerLabels[stage.trigger] },
      {
        text: stage.percent !== undefined ? formatPercent(stage.percent) : "",
        align: "right",
      },
      {
        text: formatMoney(stageAmount(stage, total)),
        value: stageAmount(stage, total),
        align: "right",
      },
    ],
  }));
  return [
    { type: "space", height: 12 },
    { type: "heading", text: "Condiții de plată" },
    {
      type: "table",
      style: "lines",
      fontSize: size,
      columns: [
        { width: 1, flex: true },
        { width: 150 },
        { width: 50, align: "right" },
        { width: 80, align: "right" },
      ],
      header: [
        [
          { text: "Etapa" },
          { text: "Scadentă" },
          { text: "Cota" },
          { text: "Lei, cu TVA" },
        ],
      ],
      rows,
    },
    note(
      "Sumele sunt calculate din totalul cu TVA al ofertei acceptate; o etapă pe situații de lucrări se facturează pe măsura execuției.",
    ),
  ];
}

/**
 * What a consumer is told before and after accepting: the contract is made
 * at a distance, they may withdraw for 14 days, and what happens when the
 * works begin in that time (OUG 34/2014, art. 6, 8, 9 and 14).
 */
export function consumerBlocks(data: ExportData): Block[] {
  if (!data.offer?.consumer) {
    return [];
  }
  const firm = data.firm;
  const contact = [firm.email, firm.phone].filter(Boolean).join(", ");
  return [
    { type: "space", height: 12 },
    { type: "heading", text: "Informare pentru consumator (OUG 34/2014)" },
    paragraph(
      `Oferta acceptată pe linkul trimis de ${firm.name} este un contract încheiat la distanță. Aveți dreptul să vă retrageți din el fără să dați un motiv în ${WITHDRAWAL_DAYS} zile de la acceptare, printr-o declarație neechivocă trimisă firmei${
        contact ? ` (${contact})` : ""
      }; puteți folosi formularul de retragere de la sfârșitul acestui document.`,
    ),
    paragraph(
      "Dacă cereți expres începerea lucrărilor înainte de expirarea acestui termen și vă retrageți apoi, plătiți lucrările executate până la retragere, proporțional cu prețul ofertei. După executarea completă a lucrărilor cu acordul dumneavoastră expres, dreptul de retragere se pierde.",
    ),
    note(
      "Construirea de clădiri noi și transformarea substanțială a unor clădiri existente nu intră sub OUG 34/2014 (art. 3). Pentru reclamații vă puteți adresa Autorității Naționale pentru Protecția Consumatorilor, anpc.ro.",
    ),
  ];
}

/** The record of the client's acceptance on the link, once given. */
export function acceptanceBlocks(data: ExportData): Block[] {
  const signature = data.offer?.signature;
  if (!signature) {
    return [];
  }
  const evidence = signature.evidence ?? {};
  const facts = [
    `Semnată electronic de ${signature.name}, pe ${formatMoment(signature.signedAt)} (ora României), pe pagina ofertei.`,
    signature.contentHash &&
      `Codul de verificare al documentului semnat (SHA-256): ${signature.contentHash}.`,
    evidence.address && `Adresa de rețea: ${evidence.address}.`,
    evidence.userAgent && `Browserul: ${evidence.userAgent}.`,
    [
      evidence.language && `limba ${evidence.language}`,
      evidence.timeZone && `fusul orar ${evidence.timeZone}`,
      evidence.screen && `ecran ${evidence.screen}`,
    ]
      .filter(Boolean)
      .join(", "),
    data.offer?.confirmation &&
      `Confirmarea a fost trimisă pe email la ${data.offer.confirmation.email}, pe ${formatMoment(
        data.offer.confirmation.sentAt,
      )}.`,
    data.offer?.consumer &&
      signature.withdrawalUntil !== undefined &&
      `Consumatorul ${
        signature.earlyStart
          ? "a cerut începerea lucrărilor înainte de expirarea termenului de retragere; se poate retrage"
          : "se poate retrage"
      } până pe ${formatBucharest(signature.withdrawalUntil).date}.`,
  ].filter(
    (fact): fact is string => typeof fact === "string" && fact.length > 0,
  );
  return [
    { type: "space", height: 12 },
    { type: "heading", text: "Acceptare electronică" },
    ...facts.map((fact) => paragraph(fact)),
    note(
      "Semnătură electronică simplă (Legea 214/2024): dovezile de mai sus însoțesc numele și momentul semnării.",
    ),
  ];
}

import { estimateCode, formatDate } from "../format";
import type { ExportData } from "../input";
import type { Block, FormDocument } from "../model";
import { formatMoment } from "./terms";

// The withdrawal form of OUG 34/2014, Anexa B, filled with the firm and the
// Ofertă, for the consumer who changes their mind within 14 days. Printed
// after the client's Deviz when the client is a consumer.

const size = 9.5;
const line = (text: string): Block => ({ type: "text", text, size });
const gap: Block = { type: "space", height: 8 };

/** A blank to fill in by hand. */
const blank = (length = 40) => ".".repeat(length);

export function withdrawalDocument(data: ExportData): FormDocument {
  const { estimate, firm, client } = data;
  const code = estimateCode(estimate.number, estimate.revision);
  const to = [
    firm.name,
    firm.address && [firm.address, firm.county].filter(Boolean).join(", "),
    firm.email,
    firm.phone,
  ].filter(Boolean);
  const signedAt = data.offer?.signature?.signedAt;
  return {
    id: "RETRAGERE",
    label: "Anexa B, OUG 34/2014",
    name: "Formular de retragere",
    orientation: "portrait",
    footer: `${code} · Formular de retragere`,
    blocks: [
      { type: "title", lines: ["FORMULAR DE RETRAGERE"] },
      {
        type: "text",
        text: "(Prezentul formular se trimite înapoi completat doar dacă doriți să vă retrageți din contract.)",
        size: 8.5,
        muted: true,
        align: "center",
      },
      { type: "space", height: 16 },
      line(`– Către: ${to.join(", ")}`),
      gap,
      line(
        `– Vă informez/informăm prin prezenta cu privire la retragerea mea/noastră din contractul referitor la prestarea următoarelor servicii: lucrările din oferta ${code} „${estimate.title}”${
          estimate.siteAddress ? `, la ${estimate.siteAddress}` : ""
        }.`,
      ),
      gap,
      line(
        `– Comandate la data: ${
          signedAt !== undefined ? formatMoment(signedAt) : blank(30)
        }`,
      ),
      gap,
      line(
        `– Numele consumatorului/consumatorilor: ${client?.name ?? blank(50)}`,
      ),
      gap,
      line(
        `– Adresa consumatorului/consumatorilor: ${client?.address ?? blank(60)}`,
      ),
      gap,
      line(
        "– Semnătura consumatorului/consumatorilor (doar în cazul în care acest formular este notificat pe hârtie):",
      ),
      { type: "space", height: 28 },
      line(`– Data: ${blank(30)}`),
      { type: "space", height: 24 },
      {
        type: "text",
        text: `Formular pus la dispoziție de ${firm.name} pentru oferta ${code}, cu prețuri la data de ${formatDate(
          estimate.priceDate,
        )}. Îl puteți trimite și prin email, fără semnătură, de la adresa dumneavoastră.`,
        size: 8,
        muted: true,
      },
    ],
  };
}

import { roundLei } from "@devize/backend/convex/estimates/recap";
import { estimateCode, formatDate, formatMoney } from "../format";
import type { Block, FormDocument } from "../model";
import type { ReceptionData, ReceptionPerson } from "./input";

// The Proces-verbal de recepție la terminarea lucrărilor and the
// Proces-verbal de recepție finală, laid out like the models in the annexes
// of the regulation on the reception of construction works (HG 273/1994 as
// replaced by HG 343/2017): the works and their contract, the permit, the
// committee and its period, what it found, the objections with their
// deadlines, what it proposes and the signatures. A blank is left where the
// firm has not said something yet, so the form can be finished by hand.

const size = 9.5;

const paragraph = (
  text: string,
  style: Partial<Block & { type: "text" }> = {},
): Block => ({
  type: "text",
  text,
  size,
  ...style,
});
const gap: Block = { type: "space", height: 5 };

/** A blank to fill in by hand, with what goes in it: "…… (data)". */
function blank(hint?: string, length = 30): string {
  const dots = ".".repeat(length);
  return hint ? `${dots} (${hint})` : dots;
}

function dateOr(value: string | undefined, hint = "ziua/luna/anul") {
  return value ? formatDate(value) : blank(hint, 20);
}

function box(ticked: boolean) {
  return ticked ? "[X]" : "[ ]";
}

const roleLabels: Record<ReceptionPerson["role"], string> = {
  president: "Președinte",
  member: "Membru",
  secretary: "Secretar",
  executant: "Executant",
  designer: "Proiectant",
  supervisor: "Diriginte de șantier",
  invited: "Invitat",
};

function personLine(person: ReceptionPerson) {
  return person.organization
    ? `${person.name} – ${person.organization}`
    : person.name;
}

function named(
  people: readonly ReceptionPerson[],
  role: ReceptionPerson["role"],
): string[] {
  return people.filter((person) => person.role === role).map(personLine);
}

function list(lines: string[], hint: string): string {
  return lines.length > 0 ? lines.join("; ") : blank(hint, 40);
}

/** The committee as the form lists it: Președinte, Membri, Secretar. */
function committeeBlocks(data: ReceptionData): Block[] {
  const { people } = data.reception;
  const members = named(people, "member");
  return [
    paragraph(
      `Președinte: ${list(named(people, "president"), "numele și prenumele")}`,
    ),
    paragraph(
      `Membri: ${members.length > 0 ? members.join("; ") : blank("numele și prenumele, calitatea în care participă", 40)}`,
    ),
    paragraph(
      `Secretar: ${list(named(people, "secretary"), "numele și prenumele")}`,
    ),
  ];
}

/** Who signs, in rows of at most three, so names keep their room. */
function signatureRows(
  items: { role: string; name?: string; hint?: string }[],
): Block[] {
  const blocks: Block[] = [];
  for (let start = 0; start < items.length; start += 3) {
    blocks.push({
      type: "signatures",
      items: items.slice(start, start + 3),
    });
    blocks.push({ type: "space", height: 8 });
  }
  return blocks;
}

function signatureBlocks(data: ReceptionData): Block[] {
  const { people } = data.reception;
  const hint = "(numele, prenumele și semnătura)";
  const committee: { role: string; name?: string; hint?: string }[] = people
    .filter((person) =>
      ["president", "member", "secretary"].includes(person.role),
    )
    .map((person) => ({
      role: `${roleLabels[person.role]},`,
      name: personLine(person),
      hint,
    }));
  if (committee.length === 0) {
    committee.push(
      { role: "Președinte,", hint },
      { role: "Membru,", hint },
      { role: "Secretar,", hint },
    );
  }
  const executant = people.filter((person) => person.role === "executant");
  const others: { role: string; name?: string; hint?: string }[] = [
    ...(executant.length > 0
      ? executant.map((person) => ({
          role: "Executant,",
          name: `${data.firm.name} – ${personLine(person)}`,
          hint,
        }))
      : [{ role: "Executant,", name: data.firm.name, hint }]),
    ...people
      .filter((person) =>
        ["designer", "supervisor", "invited"].includes(person.role),
      )
      .map((person) => ({
        role: `${roleLabels[person.role]},`,
        name: personLine(person),
        hint,
      })),
  ];
  return [
    { type: "space", height: 10 },
    paragraph(
      data.reception.kind === "final"
        ? "Comisia de recepție finală:"
        : "Comisia de recepție:",
      { bold: true },
    ),
    ...signatureRows(committee),
    paragraph("Alți participanți:", { bold: true }),
    ...signatureRows(others),
    {
      type: "space",
      height: 4,
    },
    {
      type: "signatures",
      items: [
        {
          role: "Investitor/Beneficiar,",
          name: data.client?.name,
          hint: "(numele, prenumele, semnătura și ștampila)",
        },
      ],
    },
  ];
}

/** The objections, each with its deadline, as the annex the form refers to. */
function objectionBlocks(data: ReceptionData): Block[] {
  const { objections } = data.reception;
  if (objections.length === 0) {
    return [];
  }
  return [
    gap,
    {
      type: "table",
      style: "lines",
      fontSize: 8.5,
      columns: [
        { width: 24, align: "right" },
        { width: 1, flex: true },
        { width: 110, align: "center" },
      ],
      header: [
        [
          { text: "Nr." },
          { text: "Obiecțiuni (lucrări neexecutate sau cu deficiențe)" },
          { text: "Termen de remediere" },
        ],
      ],
      rows: objections.map((objection, index) => ({
        kind: "item" as const,
        cells: [
          { text: String(index + 1), align: "right" as const },
          { text: objection.text },
          {
            text: objection.deadline ? formatDate(objection.deadline) : "–",
            align: "center" as const,
          },
        ],
      })),
    },
  ];
}

/** The value of the works, without and with VAT, as the form writes it. */
function valueText(data: ReceptionData) {
  const vat = roundLei((data.value * data.vatRate) / 100);
  const total = roundLei(data.value + vat);
  return data.vatRate > 0
    ? `${formatMoney(data.value)} lei fără TVA (${formatMoney(total)} lei cu TVA)`
    : `${formatMoney(data.value)} lei`;
}

/** The sentence about the permit, or the one saying none was needed. */
function permitText(data: ReceptionData) {
  const { permit } = data.reception;
  if (!permit) {
    return "Lucrările nu au necesitat autorizație de construire.";
  }
  const parts = [
    `Lucrările au fost executate în baza autorizației de construire nr. ${permit.number}`,
    permit.issuer ? `eliberată de ${permit.issuer}` : undefined,
    permit.date ? `la data de ${formatDate(permit.date)}` : undefined,
    permit.validUntil
      ? `cu valabilitate până la data de ${formatDate(permit.validUntil)}`
      : undefined,
  ].filter(Boolean);
  return `${parts.join(", ")}.`;
}

/** The proposal the committee makes, with its box ticked. */
function decisionBlocks(data: ReceptionData, point: number): Block[] {
  const { decision, kind } = data.reception;
  const what = kind === "final" ? "RECEPȚIEI FINALE" : "RECEPȚIEI";
  const who =
    kind === "final" ? "comisia de recepție finală" : "comisia de recepție";
  return [
    paragraph(`${point}. În urma constatărilor făcute, ${who} propune:`),
    paragraph(`${box(decision === "admitted")} ADMITEREA ${what}`),
    paragraph(`${box(decision === "postponed")} AMÂNAREA ${what}`),
    paragraph(`${box(decision === "rejected")} RESPINGEREA ${what}`),
  ];
}

/** The PV's heading: who the investor is, the form's name and number. */
function headBlocks(data: ReceptionData, title: string): Block[] {
  const { reception } = data;
  return [
    {
      type: "columns",
      columns: [
        {
          lines: [
            { text: "INVESTITOR/BENEFICIAR", bold: true, size: 8 },
            { text: data.client?.name ?? blank("denumirea", 40), size },
            ...(data.client?.address
              ? [{ text: data.client.address, muted: true, size: 8 }]
              : []),
          ],
        },
        {
          align: "right",
          lines: [
            { text: "EXECUTANT", bold: true, size: 8 },
            { text: data.firm.name, size },
            ...(data.firm.cui
              ? [{ text: `CUI ${data.firm.cui}`, muted: true, size: 8 }]
              : []),
          ],
        },
      ],
    },
    { type: "space", height: 8 },
    {
      type: "title",
      lines: [
        title,
        `Nr. ${reception.number ?? "......"} din ${formatDate(reception.date)}`,
      ],
    },
  ];
}

/** The sentence under the title: the investment and its contract. */
function subjectText(data: ReceptionData) {
  const { estimate, reception } = data;
  const code = estimateCode(estimate.number, estimate.revision);
  const contract = reception.contract
    ? `contractului nr. ${reception.contract.number}${reception.contract.date ? ` din ${formatDate(reception.contract.date)}` : ""}`
    : `contractului nr. ${blank(undefined, 12)} din ${blank(undefined, 12)}`;
  return `privind execuția lucrărilor de construcții aferente investiției „${estimate.title}” (deviz ${code}), lucrări executate în cadrul ${contract}, încheiat între ${data.client?.name ?? blank("investitor/beneficiar", 30)} și ${data.firm.name}.`;
}

function siteText(data: ReceptionData) {
  const site = [data.estimate.siteAddress, data.estimate.county]
    .filter(Boolean)
    .join(", ");
  return `1. Imobilul care face obiectul investiției se identifică după cum urmează: adresa administrativă ${site || blank("adresa", 40)}; număr cadastral/număr topografic ${blank(undefined, 15)}; număr carte funciară ${blank(undefined, 15)}.`;
}

function committeePeriod(data: ReceptionData) {
  const { committeeStart, committeeEnd } = data.reception;
  if (committeeStart && committeeEnd && committeeStart !== committeeEnd) {
    return `${formatDate(committeeStart)} – ${formatDate(committeeEnd)}`;
  }
  return dateOr(committeeStart ?? committeeEnd);
}

function executionPeriod(data: ReceptionData) {
  const { executionStart, executionEnd } = data.reception;
  return `${dateOr(executionStart)} – ${dateOr(executionEnd)}`;
}

function closingText(data: ReceptionData, point: number) {
  const { reception } = data;
  const annexes = reception.objections.length > 0 ? 1 : 0;
  return `${point}. Prezentul proces-verbal, conținând ${blank(undefined, 6)} file și ${annexes} ${annexes === 1 ? "anexă" : "anexe"}, a fost încheiat astăzi, ${formatDate(reception.date)}, la ${reception.place ?? blank("locul", 25)}, în ${reception.copies ?? blank(undefined, 6)} exemplare.`;
}

function invitedText(data: ReceptionData, point: number) {
  const invited = named(data.reception.people, "invited");
  return `${point}. Au mai participat la recepție (în calitate de invitați): ${invited.length > 0 ? invited.join("; ") : "–"}.`;
}

function supervisedText(data: ReceptionData) {
  const supervisors = named(data.reception.people, "supervisor");
  return supervisors.length > 0
    ? ` Lucrările au fost supravegheate de dirigintele de șantier ${supervisors.join("; ")}.`
    : "";
}

/** The PV at the end of the works. */
function completionBlocks(data: ReceptionData): Block[] {
  const { reception } = data;
  return [
    ...headBlocks(data, "PROCES-VERBAL DE RECEPȚIE LA TERMINAREA LUCRĂRILOR"),
    paragraph(subjectText(data)),
    gap,
    paragraph(siteText(data)),
    gap,
    paragraph(`2. ${permitText(data)}`),
    gap,
    paragraph(
      `3. Comisia de recepție și-a desfășurat activitatea în perioada ${committeePeriod(data)}, fiind formată din:`,
    ),
    ...committeeBlocks(data),
    gap,
    paragraph(invitedText(data, 4)),
    gap,
    paragraph(
      "5. În urma examinării documentației prezentate și a cercetării pe teren a lucrărilor executate, comisia de recepție a constatat:",
    ),
    paragraph(
      `5.1. Lucrările pentru care s-a solicitat recepția au fost executate de ${data.firm.name} în perioada ${executionPeriod(data)} și au o valoare de ${valueText(data)}, conform situațiilor de lucrări confirmate.${supervisedText(data)}`,
    ),
    paragraph(
      "5.2. Lucrările au fost executate în conformitate cu prevederile contractului, ale documentației de execuție și ale reglementărilor specifice, cu respectarea exigențelor esențiale, conform legii, cu următoarele constatări:",
    ),
    paragraph(reception.findings?.trim() || blank("constatările comisiei", 60)),
    paragraph(
      `5.3. Obiecțiuni: ${
        reception.objections.length > 0
          ? `${reception.objections.length} ${reception.objections.length === 1 ? "obiecțiune, cu termenul de remediere" : "obiecțiuni, cu termenele de remediere"} din anexă.`
          : "nu s-au consemnat obiecțiuni."
      }`,
    ),
    ...objectionBlocks(data),
    gap,
    ...decisionBlocks(data, 6),
    gap,
    paragraph(
      `7. Comisia de recepție motivează propunerea făcută prin: ${reception.reasons?.trim() || (reception.decision === "admitted" ? "–" : blank("motivele amânării sau respingerii", 50))}`,
    ),
    gap,
    paragraph(
      `8. Comisia de recepție recomandă luarea următoarelor măsuri: ${reception.measures?.trim() || "–"}`,
    ),
    gap,
    paragraph(closingText(data, 9)),
    gap,
    paragraph(
      `10. Alte mențiuni: perioada de garanție a lucrărilor este de ${reception.warrantyMonths ?? blank(undefined, 6)} luni de la data admiterii recepției la terminarea lucrărilor.`,
    ),
    ...signatureBlocks(data),
  ];
}

/** The PV at the end of the warranty, after the first one. */
function finalBlocks(data: ReceptionData): Block[] {
  const { reception, completion } = data;
  const completionRef = completion
    ? `procesul-verbal de recepție la terminarea lucrărilor nr. ${completion.number ?? "......"} din ${formatDate(completion.date)}`
    : `procesul-verbal de recepție la terminarea lucrărilor nr. ${blank(undefined, 8)} din ${blank(undefined, 12)}`;
  return [
    ...headBlocks(data, "PROCES-VERBAL DE RECEPȚIE FINALĂ"),
    paragraph(subjectText(data)),
    gap,
    paragraph(siteText(data)),
    gap,
    paragraph(`2. ${permitText(data)}`),
    gap,
    paragraph(
      `3. Comisia de recepție finală și-a desfășurat activitatea în perioada ${committeePeriod(data)}, fiind formată din:`,
    ),
    ...committeeBlocks(data),
    gap,
    paragraph(invitedText(data, 4)),
    gap,
    paragraph(
      "5. În urma examinării documentației prezentate și a cercetării pe teren a lucrărilor executate, comisia de recepție finală a constatat:",
    ),
    paragraph(
      `5.1. Lucrările au fost executate de ${data.firm.name} în perioada ${executionPeriod(data)}, au o valoare de ${valueText(data)} și au fost recepționate prin ${completionRef}.${supervisedText(data)}`,
    ),
    paragraph(
      `5.2. Perioada de garanție a fost de ${reception.warrantyMonths ?? blank(undefined, 6)} luni de la data admiterii recepției la terminarea lucrărilor${completion ? `, respectiv de la ${formatDate(completion.date)}` : ""}.`,
    ),
    paragraph(
      "5.3. Comportarea construcției în perioada de garanție, viciile apărute și remedierea lor, precum și îndeplinirea obiecțiunilor din procesul-verbal de recepție la terminarea lucrărilor:",
    ),
    paragraph(reception.findings?.trim() || blank("constatările comisiei", 60)),
    paragraph(
      `5.4. Obiecțiuni: ${
        reception.objections.length > 0
          ? `${reception.objections.length} ${reception.objections.length === 1 ? "obiecțiune, cu termenul de remediere" : "obiecțiuni, cu termenele de remediere"} din anexă.`
          : "nu s-au consemnat obiecțiuni."
      }`,
    ),
    ...objectionBlocks(data),
    gap,
    ...decisionBlocks(data, 6),
    gap,
    paragraph(
      `7. Comisia de recepție finală motivează propunerea făcută prin: ${reception.reasons?.trim() || (reception.decision === "admitted" ? "–" : blank("motivele amânării sau respingerii", 50))}`,
    ),
    gap,
    paragraph(
      `8. Comisia de recepție finală recomandă luarea următoarelor măsuri: ${reception.measures?.trim() || "–"}`,
    ),
    gap,
    paragraph(closingText(data, 9)),
    gap,
    paragraph(
      "10. Alte mențiuni: odată cu admiterea recepției finale, executantul este liberat de obligațiile din perioada de garanție, iar garanția de bună execuție rămasă se restituie potrivit contractului.",
    ),
    ...signatureBlocks(data),
  ];
}

/** A Proces-verbal de recepție, at the end of the works or final. */
export function receptionDocument(data: ReceptionData): FormDocument {
  const { estimate, reception } = data;
  const code = estimateCode(estimate.number, estimate.revision);
  const final = reception.kind === "final";
  const name = final
    ? "Proces-verbal de recepție finală"
    : "Proces-verbal de recepție la terminarea lucrărilor";
  const label = final
    ? "PV de recepție finală"
    : "PV de recepție la terminarea lucrărilor";
  return {
    id: final ? "PVRF" : "PVRT",
    label,
    name: `${label} · ${code}`,
    orientation: "portrait",
    footer: `${code} · ${name}`,
    blocks: final ? finalBlocks(data) : completionBlocks(data),
  };
}

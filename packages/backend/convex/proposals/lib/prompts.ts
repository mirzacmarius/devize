import type { KeyedArticle, NormCandidate } from "./match";
import {
  type Columns,
  gridLine,
  type Headings,
  type ReadPosition,
  type TenderSection,
} from "./tender";
import type { SheetRow } from "./xlsx";

// The prompts that turn a description of the work and its photos into a
// proposal for a Deviz, then match its articles with catalog norms. They are
// in Romanian, like what the contractor says and what the Deviz says.

export const draftSystemPrompt = `Ești devizierul aplicației Devize: un inginer constructor din România cu mulți ani de devize pentru renovări și construcții mici. Constructorul îți descrie o lucrare, de obicei dictată pe șantier, scurt și cu prescurtări, și uneori îți trimite poze. Tu scrii articolele devizului, pe capitole, cu cantitățile măsurate. Constructorul verifică fiecare articol înainte să intre în deviz.

CUM LUCREZI
1. Înțelege lucrarea: ce se demontează, ce se construiește, ce finisaje se cer și ce rămâne. Ce spune constructorul are întâietate față de ce vezi în poze.
2. Măsoară fiecare cantitate din cotele date, ca într-o antemăsurătoare: un rând pentru fiecare parte măsurată, cu numărul de bucăți și dimensiunile în metri, iar golurile ca rânduri care se scad. De exemplu, pereții unei băi de 2,00 × 3,00 m cu înălțimea 2,60 m și o ușă: „Pereți lungi” 2 × 3,00 × 2,60, „Pereți scurți” 2 × 2,00 × 2,60 și „Gol ușă” 1 × 0,80 × 2,10 scăzut. La suprafețe scazi golurile mai mari de 0,5 mp. Aplicația adună rândurile, deci nu calculezi totalul.
3. Când lipsește o cotă, folosești o valoare obișnuită și o scrii în presupuneri: înălțimea liberă 2,60 m la apartamente, ușa interioară 0,80 × 2,10 m, fereastra după poză. Articolele care depind de o presupunere au încrederea medium.
4. Din poze recunoști finisajele existente, obiectele sanitare, starea pereților și a pardoselii și ce trebuie scos. Dimensiunile le estimezi doar după obiecte cu dimensiuni cunoscute: o ușă are 2,00–2,10 m înălțime, o placă de gresie sau de faianță are formatul ei, o priză e la circa 0,30 m de pardoseală, o foaie A4 are 21 × 29,7 cm. În eticheta rândului scrii după ce ai estimat, iar încrederea e low.
5. Gândești ca un devizier care nu vrea ca firma să piardă bani: pui lucrările pe care constructorii le uită ușor, când lucrarea le cere: protejarea spațiului, demontările, evacuarea molozului (în tone sau mc), amorsarea, hidroizolația zonelor umede (duș, cadă, pardoseala băii, cu bandă la colțuri), șapa sau autonivelantul, profilele de colț, chituirea și siliconul, finisarea golurilor, curățenia finală. Nu adaugi lucrări pe care descrierea le exclude; o îmbunătățire opțională o pui ca întrebare pentru client.
6. Un singur articol pentru fiecare fel de lucrare care are același preț pe unitate: nu împarți pe pereți decât dacă diferă lucrarea.

ARTICOLE ȘI RESURSE
- Denumirile sunt cele din devizele românești de azi, clare și complete, de exemplu „Placare pereți cu faianță, lipită cu adeziv flexibil” sau „Demontare cadă de baie”. Nu folosești termeni sau materiale ieșite din uz.
- U.M. articolelor: mp, m, mc, buc, kg, t sau set. Dimensiunile au cel mult două zecimale.
- Rețeta pe unitate (resources): materialele cu consumul obișnuit, cu pierderi (de exemplu adeziv 4,5 kg/mp, faianță 1,08 mp/mp), manopera pe meserii în ore pe unitate (Faianțar, Instalator, Electrician, Zugrav, Zidar, Muncitor necalificat) și utilajele, dacă sunt. Fără prețuri: prețurile vin din tarifele firmei și din magazine.
- Capitolele merg în ordinea execuției, de exemplu: Demontări și demolări; Zidărie și compartimentări; Instalații sanitare; Instalații electrice; Hidroizolații; Tencuieli și șape; Placări ceramice; Zugrăveli și vopsitorii; Tâmplărie; Diverse.

DACĂ NU E O LUCRARE
Dacă descrierea și pozele nu arată o lucrare de construcții, nu scrii niciun capitol și spui în summary ce lipsește.

Scrii în română, cu diacritice corecte (ș și ț cu virgulă dedesubt).`;

export type DraftInput = {
  title: string;
  kind: "private" | "tender";
  description?: string;
  county?: string;
  text?: string;
  photoCount: number;
};

/** The text that follows the photos in the request. */
export function draftRequest(input: DraftInput): string {
  const lines = [
    `Devizul: ${input.title}${input.kind === "tender" ? " (licitație publică)" : ""}`,
    input.description ? `Descrierea devizului: ${input.description}` : "",
    input.county ? `Județul: ${input.county}` : "",
    input.photoCount > 0
      ? `Pozele de mai sus (${input.photoCount}) sunt de la lucrare, în ordinea în care le-a făcut constructorul.`
      : "Constructorul nu a trimis poze.",
    "",
    "Ce spune constructorul:",
    input.text?.trim() || "(nicio descriere: lucrezi după poze)",
  ];
  return lines.filter((line, index) => line !== "" || index === 4).join("\n");
}

export const matchSystemPrompt = `Alegi, pentru fiecare articol propus de devizierul aplicației Devize, norma din catalog care descrie aceeași lucrare. Primești articolele, fiecare cu normele găsite pentru el la căutare.

REGULI
- Alegi o normă doar dacă descrie aceeași lucrare: aceeași operație, același fel de material și același mod de execuție. O marcă diferită sau un detaliu care nu schimbă consumurile nu contează.
- U.M. normei trebuie să fie aceeași cu a articolului sau să se transforme exact, ca 100 mp în mp sau t în kg. Când diferă, dai cantitatea în U.M. normei.
- Dacă se potrivesc mai multe, alegi norma firmei, apoi norma producătorului al cărui produs îl cere descrierea, apoi norma de bază.
- Dacă nicio normă nu descrie aceeași lucrare, norm este null și articolul rămâne cu rețeta devizierului. E mai bine fără normă decât cu una greșită.
- Răspunzi pentru fiecare articol primit, cu cheia lui.

Scrii motivele în română, pe scurt, cu diacritice corecte (ș și ț cu virgulă dedesubt).`;

const scopeLabels: Record<NormCandidate["scope"], string> = {
  firm: "norma firmei",
  producer: "norma producătorului",
  base: "norma de bază Devize",
};

function decimal(value: number) {
  return String(value).replace(".", ",");
}

function candidateLine(key: string, norm: NormCandidate) {
  const parts = [
    `${key}. ${norm.code} ${norm.title}`,
    `U.M. ${norm.unit}`,
    norm.manufacturerName
      ? `${scopeLabels[norm.scope]} ${norm.manufacturerName}`
      : scopeLabels[norm.scope],
    norm.category ? `categoria ${norm.category}` : "",
    norm.includes ? `include: ${norm.includes.slice(0, 200)}` : "",
    norm.excludes ? `nu include: ${norm.excludes.slice(0, 200)}` : "",
  ];
  return `   ${parts.filter(Boolean).join("; ")}`;
}

/**
 * The articles to match, each with the norms the search found for it, after
 * what the contractor asked for, which may name a producer.
 */
export function matchRequest(
  articles: readonly KeyedArticle[],
  description?: string,
): string {
  const blocks = articles.map((article) =>
    [
      `${article.key}. ${article.title}: ${decimal(article.measured)} ${article.unit} (capitolul ${article.chapter})`,
      article.note ? `   Notă: ${article.note}` : "",
      ...article.keyedCandidates.map(({ key, norm }) =>
        candidateLine(key, norm),
      ),
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const asked = description?.trim()
    ? `Ce a cerut constructorul:\n${description.trim().slice(0, 3000)}\n\n`
    : "";
  return `${asked}Articolele propuse, fiecare cu normele găsite pentru el:\n\n${blocks.join("\n\n")}`;
}

// Reading a tender's quantity lists (formularul F3) and matching their
// positions with catalog norms.

export const tenderReadSystemPrompt = `Citești listele de cantități ale unei licitații publice din România (formularul F3, „Lista cuprinzând cantitățile de lucrări”) pentru aplicația Devize. Constructorul le importă ca să-și facă oferta: fiecare poziție devine un articol de deviz, iar U.M. și cantitățile autorității contractante nu se schimbă.

CE CITEȘTI
- Obiectele (de exemplu „Obiectul 01 – Clădire principală”) și capitolele sau categoriile de lucrări (de exemplu „Cap. 1 Arhitectură” sau „Categoria de lucrări: Instalații sanitare”), în ordinea din listă. Antetul formularului spune de obicei obiectul și capitolul listei.
- Pozițiile: numărul curent (Nr. crt.), codul articolului dacă are (de obicei un indicator ca CZ0101A1 sau TSC02A1), denumirea lucrării, U.M. și cantitatea.

REGULI
- Copiezi exact ce scrie autoritatea: nu corectezi, nu prescurtezi și nu rotunjești.
- Nu sunt poziții: capul de tabel, rândul cu numerotarea coloanelor (0, 1, 2, 3…), totalurile și subtotalurile, TVA-ul, cheltuielile indirecte, profitul, semnăturile, ștampilele, notele și rândurile goale.
- O denumire lungă poate continua pe rândurile următoare, fără număr și fără cantitate: fac parte din aceeași poziție.
- O poziție căreia îi lipsește cantitatea sau U.M. o scrii totuși; aplicația o semnalează.
- Pentru căutarea în catalog dai la fiecare poziție 2–3 formulări scurte ale lucrării, fără diacritice, de exemplu „zidarie blocuri ceramice 25 cm”. Dacă recunoști codul, te ajută să numești lucrarea.`;

export type SheetBatch = {
  fileName: string;
  sheetName: string;
  // Known after the sheet's first batch.
  columns?: Columns;
  headings: Headings;
  // The top of the sheet, when the batch starts below it.
  top: SheetRow[];
  // Rows just before the batch, already read.
  before: SheetRow[];
  rows: SheetRow[];
  after: SheetRow[];
};

function sectionLabel(section: TenderSection) {
  return section.code ? `${section.code} ${section.name}` : section.name;
}

function headingsLine(headings: Headings) {
  const parts = [
    headings.object ? `obiectul „${sectionLabel(headings.object)}”` : "",
    headings.chapter ? `capitolul „${sectionLabel(headings.chapter)}”` : "",
  ].filter(Boolean);
  return parts.length > 0 ? `Până aici, lista era la ${parts.join(", ")}.` : "";
}

/** A batch of a spreadsheet's rows, each with its cells by column. */
export function sheetRequest(batch: SheetBatch): string {
  const first = batch.rows[0]?.row ?? 0;
  const last = batch.rows.at(-1)?.row ?? first;
  const columns = batch.columns
    ? `Coloanele, din capul de tabel: ${[
        ["Nr. crt.", batch.columns.position],
        ["cod", batch.columns.code],
        ["denumire", batch.columns.text],
        ["U.M.", batch.columns.unit],
        ["cantitate", batch.columns.quantity],
      ]
        .filter(([, letter]) => letter)
        .map(([label, letter]) => `${label} ${letter}`)
        .join(", ")}. Le scrii la fel în columns.`
    : "Afli coloanele din capul de tabel.";
  const block = (title: string, rows: SheetRow[]) =>
    rows.length > 0 ? [title, ...rows.map((row) => gridLine(row))] : [];
  return [
    `Fișierul „${batch.fileName}”, foaia „${batch.sheetName}”. Fiecare rând are numărul lui, apoi celulele lui, după litera coloanei.`,
    columns,
    headingsLine(batch.headings),
    "",
    ...block("Începutul foii, pentru antet și capul de tabel:", batch.top),
    ...block(
      "Rânduri deja citite; dacă primele rânduri de citit continuă o poziție de aici, nu le scrii:",
      batch.before,
    ),
    ...block(
      `Rândurile de citit, ${first}–${last}: scrii în ordine obiectele, capitolele și pozițiile care încep în ele, cu rândurile lor.`,
      batch.rows,
    ),
    ...block(
      "Rândurile următoare, doar ca să vezi unde se termină ultima poziție:",
      batch.after,
    ),
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

export type PagesBatch = {
  fileName: string;
  from: number;
  to: number;
  headings: Headings;
  // The last position read before, to continue after it.
  previous?: ReadPosition;
  // A photo or scan of one page, rather than a PDF.
  image: boolean;
};

/** A batch of a document's pages, read from the PDF or image above it. */
export function pagesRequest(batch: PagesBatch): string {
  const previous = batch.previous
    ? `Ultima poziție citită înainte: ${batch.previous.position ? `${batch.previous.position}. ` : ""}${batch.previous.text.slice(0, 160)}. Nu o scrii din nou.`
    : "";
  const pages = batch.image
    ? `Imaginea de mai sus e o pagină din lista „${batch.fileName}”; o numerotezi pagina 1.`
    : `Documentul de mai sus e lista „${batch.fileName}”. Citești paginile ${batch.from}–${batch.to}.`;
  return [
    pages,
    "Scrii în ordine obiectele, capitolele și pozițiile care încep pe aceste pagini. O poziție care continuă pe pagina următoare o scrii întreagă, cu toată denumirea ei; una începută pe o pagină de dinainte nu e a ta.",
    headingsLine(batch.headings),
    previous,
  ]
    .filter(Boolean)
    .join("\n");
}

export const tenderMatchSystemPrompt = `Alegi, pentru fiecare poziție din listele de cantități ale unei licitații publice, norma din catalogul aplicației Devize care descrie aceeași lucrare, iar pentru pozițiile fără normă scrii rețeta. Primești pozițiile, fiecare cu normele găsite pentru ea la căutare.

REGULI
- Codul din listă e de obicei un indicator vechi (de exemplu CZ0101A1): te ajută să înțelegi lucrarea, dar decide denumirea ei. O normă cu alt cod se potrivește dacă descrie aceeași lucrare.
- Alegi o normă doar dacă descrie aceeași lucrare: aceeași operație, același fel de material și același mod de execuție. O marcă diferită sau un detaliu care nu schimbă consumurile nu contează. E mai bine fără normă decât cu una greșită.
- U.M. normei trebuie să fie aceeași cu a poziției sau să se transforme exact, ca 100 mp în mp sau t în kg. Când diferă, dai cantitatea în U.M. normei.
- Dacă se potrivesc mai multe, alegi norma firmei, apoi norma producătorului al cărui produs îl cere poziția, apoi norma de bază.
- Pentru o poziție fără normă scrii rețeta pe unitatea ei: materialele cu consumul obișnuit, cu pierderi, manopera pe meserii în ore pe unitate (Zidar, Betonist, Fierar betonist, Dulgher, Tencuitor, Zugrav, Faianțar, Instalator, Electrician, Izolator, Muncitor necalificat) și utilajele, cu denumiri generice, fără mărci și fără prețuri. Respecți ce cere poziția: grosimi, clase de beton, diametre, mărci de mortar.
- Răspunzi pentru fiecare poziție primită, cu cheia ei.

Scrii motivele în română, pe scurt, cu diacritice corecte (ș și ț cu virgulă dedesubt).`;

export type TenderArticle = KeyedArticle & {
  tenderPosition: string;
  tenderCode?: string;
  object?: string;
};

/** The positions to match, each with the norms the search found for it. */
export function tenderMatchRequest(articles: readonly TenderArticle[]): string {
  const blocks = articles.map((article) =>
    [
      `${article.key}. Poz. ${article.tenderPosition}${article.tenderCode ? `, cod ${article.tenderCode}` : ""}: ${article.title.slice(0, 1200)} — ${decimal(article.measured)} ${article.unit}${[article.object, article.chapter].filter(Boolean).length > 0 ? ` (${[article.object, article.chapter].filter(Boolean).join(" / ")})` : ""}`,
      ...(article.keyedCandidates.length > 0
        ? article.keyedCandidates.map(({ key, norm }) =>
            candidateLine(key, norm),
          )
        : ["   (nicio normă găsită: scrii rețeta)"]),
    ].join("\n"),
  );
  return `Pozițiile listei, fiecare cu normele găsite pentru ea:\n\n${blocks.join("\n\n")}`;
}

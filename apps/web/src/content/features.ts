import {
  Camera,
  FileSpreadsheet,
  Layers,
  type LucideIcon,
  Package,
  PenLine,
  Sparkles,
  Store,
  Tags,
  TriangleAlert,
} from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** What a Constructor gets, in the order the work happens. */
export const features: Feature[] = [
  {
    icon: Sparkles,
    title: "Deviz din descriere, poze sau dictare",
    description:
      "Descrii lucrarea, pui câteva poze sau dictezi de pe șantier. Devize AI propune articolele, cu norme și cantități, iar tu confirmi ce intră în deviz.",
  },
  {
    icon: Store,
    title: "Norme publicate de producători",
    description:
      "Consumurile vin din fișele tehnice ale produselor reale, scrise și confirmate de producători. Norma de producător apare prima când cauți o lucrare.",
  },
  {
    icon: Tags,
    title: "Prețuri din magazine, cu data citirii",
    description:
      "Prețul unui material se citește din Dedeman, Leroy Merlin, Hornbach sau BRICO când ai nevoie de el și se verifică zilnic cât timp îl folosești.",
  },
  {
    icon: TriangleAlert,
    title: "Detector de omisiuni",
    description:
      "Devize AI citește devizul ca un inginer de șantier și spune ce lipsește: hidroizolația de sub gresie, evacuarea molozului, amorsa dinaintea gletului.",
  },
  {
    icon: Layers,
    title: "Sisteme compatibile",
    description:
      "Devize știe ce merge împreună și ce nu: adeziv rigid pe încălzire în pardoseală, faianță la exterior. Îți propune restul sistemului, cu cantitățile calculate.",
  },
  {
    icon: Package,
    title: "Lista de cumpărături în ambalaje întregi",
    description:
      "Materialele devizului, adunate și rotunjite la saci, găleți și cutii întregi, cu pierderile din modul de montaj. Coșul le împarte pe magazine la cel mai mic total.",
  },
  {
    icon: PenLine,
    title: "Ofertă pe link, semnată de client",
    description:
      "Clientul deschide un link fără cont, alege între variante, bifează lucrările opționale, întreabă asistentul și semnează. Tu vezi când a deschis-o.",
  },
  {
    icon: FileSpreadsheet,
    title: "Formularele oficiale, gata de depus",
    description:
      "F1–F6, DG, DO, C5–C9 și formularul de ofertă, în PDF și Excel, verificate înainte de descărcare. Listele autorității se completează chiar în fișierul ei.",
  },
];

/** The three reasons Devize is not another deviz program. */
export const pillars = [
  {
    icon: Store,
    title: "Norme din 2026, nu din 1981",
    description:
      "Indicatoarele vechi vorbesc despre var stins și materiale care nu se mai vând. Devize pornește de la un catalog propriu, scris acum, și de la normele publicate chiar de producători, din fișele tehnice ale produselor lor.",
  },
  {
    icon: Tags,
    title: "Prețul de azi, cu data lui",
    description:
      "Fiecare preț din magazin poartă ziua în care a fost citit. Devizele trimise sunt verificate în fiecare dimineață și primești o alertă când totalul lor s-ar schimba cu mai mult decât pragul tău.",
  },
  {
    icon: Sparkles,
    title: "AI-ul propune, tu aplici",
    description:
      "Tot ce scrie Devize AI poartă semnul lui, spune de unde are datele și intră în deviz doar după ce îl confirmi. Nicio cantitate și niciun preț nu se schimbă singure.",
  },
] satisfies Feature[];

/** How a Deviz is made, in four steps. */
export const steps = [
  {
    title: "Descrii lucrarea",
    description:
      "În cuvintele tale, cu poze de pe șantier sau cu lista de cantități a licitației, din Excel, PDF sau poze.",
  },
  {
    title: "Devize AI propune articolele",
    description:
      "Cu norme potrivite din catalog, cantități și prețuri. Verifici fiecare rând și confirmi ce intră în deviz.",
  },
  {
    title: "Verifici prețurile și omisiunile",
    description:
      "Opt verificări înainte de trimitere, detectorul de omisiuni și sistemele compatibile îți arată ce mai lipsește.",
  },
  {
    title: "Trimiți oferta sau formularele",
    description:
      "Clientul semnează pe link. Pentru licitații, descarci formularele oficiale verificate, în PDF și Excel.",
  },
] as const;

/** Features on the way, so the site says only what is true. */
export const roadmap = [
  {
    title: "Catalog de bază extins",
    description:
      "Câteva sute de norme scrise de noi, în toate categoriile uzuale, cu răsfoire pe categorii.",
  },
  {
    title: "Antemăsurătoare pe camere",
    description:
      "Scrii camerele și golurile, iar suprafețele curg singure în articole, cu rândurile de calcul tipărite ca dovadă.",
  },
  {
    title: "Situații de lucrări și recepție",
    description:
      "Procentul executat pe articol, pe perioade, atașamentul, procesele-verbale de recepție și garanția de bună execuție.",
  },
  {
    title: "Facturare și e-Factura",
    description:
      "Factura de avans din oferta acceptată, factura din situația de lucrări și XML-ul pentru SPV.",
  },
  {
    title: "Normă nouă cu Devize AI",
    description:
      "Când căutarea nu găsește nimic, AI scrie norma ca normă proprie de verificat, refolosibilă.",
  },
  {
    title: "Șabloane de deviz",
    description:
      "Salvezi orice deviz ca șablon și pornești de la baie, bucătărie, zugrăveli, termosistem sau acoperiș.",
  },
] as const;

export { Camera };

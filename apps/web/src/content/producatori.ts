import {
  ChartColumn,
  FileCheck,
  Layers,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import type { Feature } from "./features";

export const reasons = [
  {
    title: "Un singur loc, nu un portal plătit",
    description:
      "Alte programe vând producătorilor portaluri separate, pe care constructorii trebuie să le caute. În Devize, norma ta apare în catalogul pe care îl folosesc toți, prima când se potrivește lucrării.",
  },
  {
    title: "Consumul corect, din fișa ta tehnică",
    description:
      "Nu o medie din 1981 pusă pe produsul tău, ci consumul pe metru pătrat din fișa tehnică, cu pagina de unde vine fiecare cifră. Constructorul cumpără cât trebuie, nici mai mult, nici mai puțin.",
  },
  {
    title: "Produsul tău, în devizul acceptat",
    description:
      "Când constructorul alege norma ta, produsele tale intră în articole, în lista de cumpărături și în coșul pe magazine. Nu doar în ofertă, ci în ce se cumpără.",
  },
] as const;

export const steps = [
  {
    title: "Îți revendici profilul",
    description:
      "Cu linkul primit pe e-mail de la noi, pe loc cu o adresă de pe domeniul firmei, sau printr-o cerere pe care o verificăm după CUI la ANAF.",
  },
  {
    title: "Încarci fișa tehnică",
    description:
      "Devize AI scrie ciorna normei: resursele, consumurile pe unitate și pagina din fișă pentru fiecare cifră. Corectezi ce nu e cum trebuie.",
  },
  {
    title: "Echipa Devize verifică și publică",
    description:
      "Norma e verificată înainte să ajungă în catalog, sau se întoarce la tine cu o notă. Publicăm doar cu acordul tău scris.",
  },
  {
    title: "Vezi cum e folosită",
    description:
      "Lună de lună: adăugări în devize, devize trimise și acceptate cu produsele tale, cantități, valoare și județe. Niciodată care firmă.",
  },
] as const;

export const producerFeatures: Feature[] = [
  {
    icon: Store,
    title: "Profilul de producător",
    description:
      "Normele și produsele tale, câteva rânduri despre firmă, site-ul și un contact tehnic. Apare odată cu prima normă publicată.",
  },
  {
    icon: Sparkles,
    title: "Normă din fișa tehnică",
    description:
      "Încarci PDF-ul fișei, Devize AI scrie ciorna cu pagina fiecărei cifre, tu o corectezi și o trimiți la verificare.",
  },
  {
    icon: FileCheck,
    title: "Norme cu versiuni",
    description:
      "Când produsul se schimbă, publici o versiune nouă. Devizele deja trimise își păstrează versiunea lor; cele noi o iau pe ultima.",
  },
  {
    icon: Layers,
    title: "Sisteme compatibile proprii",
    description:
      "Spui ce produse ale tale merg împreună și unde se potrivesc sau nu. Constructorul care a ales o parte din sistem primește restul lui.",
  },
  {
    icon: ChartColumn,
    title: "Statistici de utilizare",
    description:
      "Lunar, pe ultimul an: cât de des îți sunt adăugate normele, câte devize cu produsele tale sunt trimise și acceptate, ce cantități conțin și cât valorează partea acceptată.",
  },
  {
    icon: ShieldCheck,
    title: "Acord scris și eliminare la cerere",
    description:
      "Nicio normă nu se publică fără consimțământul tău scris. Profilul se elimină la cerere, iar județele apar doar de la trei firme în sus.",
  },
];

export const statSample = [
  {
    label: "Norme adăugate în devize",
    value: "128",
    meta: "+14% față de luna trecută",
  },
  {
    label: "Devize acceptate cu produsele tale",
    value: "41",
    meta: "din 96 trimise",
  },
  {
    label: "Valoarea acceptată",
    value: "612.480 lei",
    meta: "fără TVA, în octombrie",
  },
  { label: "Județe", value: "7", meta: "de la cel puțin 3 firme fiecare" },
] as const;

export const producerFaq = [
  {
    question: "Cine scrie norma: noi sau Devize?",
    answer:
      "Tu, cu ajutor. Devize AI scrie ciorna din fișa tehnică și arată pagina fiecărei cifre; firma ta o corectează și o trimite; echipa Devize o verifică înainte să ajungă în catalog.",
  },
  {
    question: "Normele vechi din alte programe se pot aduce?",
    answer:
      "Da, dacă le ai ca document sau tabel. Le importăm noi, cu consimțământul tău scris, și le publicăm sub profilul tău, cu produsele tale.",
  },
  {
    question: "Ce nu vedeți despre firmele care ne folosesc normele?",
    answer:
      "Nimic nominal. Statisticile numără devize și cantități, nu firme; un județ apare doar când cel puțin trei firme din el au folosit normele tale.",
  },
  {
    question: "Cât costă?",
    answer:
      "Profilul, normele și sistemele compatibile sunt gratuite și rămân așa. Statisticile de utilizare sunt singurul serviciu plătit, cu prețul stabilit cu primii producători.",
  },
] as const;

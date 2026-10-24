import type { BaseNorm } from "./norm";
import {
  automacara,
  betonC8,
  betonC16,
  betonC20,
  betonC25,
  betoniera,
  betonist,
  cherestea,
  ciment,
  cuie,
  dulgher,
  elicopterBeton,
  fierar,
  foliePolietilena,
  masinaFasonat,
  masinaTaiatRosturi,
  material,
  mortarZidarie,
  necalificat,
  nisip,
  otelBeton,
  pietris,
  placajFilmat,
  plasaSudata,
  pompaBeton,
  pompaSapa,
  popiCofraje,
  sarma,
  smallMaterials,
  uleiDecofrare,
  vibrator,
  zidar,
} from "./resources";

const category = "Betoane și armături";

const cofrajModular = material(
  "Cofraj modular din panouri, chirie pe o lună",
  "mp",
  35,
);
const carcasa = material("Carcasă de armătură prefabricată", "kg", 4.6);
const buiandrug = material(
  "Buiandrug prefabricat din beton armat, 12 × 20 cm",
  "m",
  45,
);
const cuart = material("Durificator de suprafață cu cuarț", "kg", 2.2);
const chitPoliuretanic = material(
  "Chit poliuretanic pentru rosturi, cartuș de 600 ml",
  "buc",
  35,
);
const betonUsor = material(
  "Beton ușor de pantă cu granule de polistiren",
  "mc",
  520,
);
const grindaPlanseu = material("Grindă prefabricată pentru planșee", "m", 65);
const corpUmplutura = material(
  "Corp de umplutură ceramic pentru planșee",
  "buc",
  9,
);
const piatraBruta = material("Piatră brută pentru beton ciclopian", "mc", 110);

export const betoane: BaseNorm[] = [
  {
    code: "DV-BET-01",
    category,
    title: "Beton simplu C8/10 în egalizări și umpluturi, turnat fără pompă",
    unit: "mc",
    includes:
      "Primirea betonului din autobetonieră, turnarea direct din jgheab sau cu roaba, nivelarea și protejarea suprafeței.",
    excludes: "Cofrajele.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [betonC8(1.03), betonist(1.2), necalificat(0.8)],
  },
  {
    code: "DV-BET-02",
    category,
    title: "Beton C16/20 în fundații, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului, compactarea prin vibrare, nivelarea fețelor și protejarea betonului proaspăt.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC16(1.02),
      betonist(1),
      necalificat(0.6),
      pompaBeton(0.08),
      vibrator(0.25),
    ],
  },
  {
    code: "DV-BET-03",
    category,
    title: "Beton C20/25 în stâlpi, grinzi și centuri, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului în straturi, compactarea prin vibrare și protejarea betonului proaspăt.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC20(1.02),
      betonist(2.2),
      necalificat(1),
      pompaBeton(0.1),
      vibrator(0.5),
    ],
  },
  {
    code: "DV-BET-04",
    category,
    title: "Beton C20/25 în plăci, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului, compactarea prin vibrare, finisarea suprafeței cu dreptarul, protejarea și udarea betonului.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC20(1.02),
      betonist(1.6),
      necalificat(0.8),
      pompaBeton(0.08),
      vibrator(0.4),
    ],
  },
  {
    code: "DV-BET-05",
    category,
    title: "Cofraje din placaj și cherestea pentru fundații și pereți",
    unit: "mp",
    includes:
      "Confecționarea și montarea cofrajului cu sprijinirile lui, ungerea cu ulei de decofrare, decofrarea și curățarea materialelor pentru refolosire.",
    excludes: "Schela de lucru.",
    measurement: "Suprafața cofrajului în contact cu betonul.",
    resources: [
      placajFilmat(0.3),
      cherestea(0.012),
      cuie(0.15),
      uleiDecofrare(0.1),
      dulgher(1),
      necalificat(0.45),
    ],
  },
  {
    code: "DV-BET-06",
    category,
    title: "Cofraje din placaj și cherestea pentru stâlpi, grinzi și centuri",
    unit: "mp",
    includes:
      "Confecționarea și montarea cofrajului cu sprijinirile lui, ungerea cu ulei de decofrare, decofrarea și curățarea materialelor pentru refolosire.",
    excludes: "Schela de lucru.",
    measurement: "Suprafața cofrajului în contact cu betonul.",
    resources: [
      placajFilmat(0.35),
      cherestea(0.018),
      cuie(0.2),
      uleiDecofrare(0.1),
      dulgher(1.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-BET-07",
    category,
    title: "Cofraje din placaj pentru plăci, pe popi metalici",
    unit: "mp",
    includes:
      "Montarea popilor și a grinzilor, așezarea placajului, ungerea cu ulei de decofrare, decofrarea și curățarea materialelor.",
    excludes: "Cofrajul marginilor plăcii.",
    measurement: "Suprafața plăcii cofrate, măsurată pe fața de jos.",
    resources: [
      placajFilmat(0.3),
      cherestea(0.008),
      cuie(0.08),
      uleiDecofrare(0.1),
      popiCofraje(1),
      dulgher(0.9),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-BET-08",
    category,
    title: "Armături din oțel beton BST500S, fasonate și montate",
    unit: "kg",
    includes:
      "Tăierea și fasonarea barelor, montarea și legarea lor cu sârmă, distanțierii pentru stratul de acoperire.",
    excludes: "Plasele sudate.",
    measurement: "Masa armăturilor după extrasul de armare din proiect.",
    resources: [
      otelBeton(1.03),
      sarma(0.01),
      smallMaterials(1),
      fierar(0.032),
      necalificat(0.012),
      masinaFasonat(0.002),
    ],
  },
  {
    code: "DV-BET-09",
    category,
    title: "Armături din plase sudate, montate",
    unit: "kg",
    includes:
      "Tăierea plaselor, montarea lor cu suprapuneri, legarea cu sârmă și distanțierii.",
    measurement: "Masa plaselor după proiect, fără suprapuneri.",
    resources: [
      plasaSudata(1.05),
      sarma(0.005),
      smallMaterials(1),
      fierar(0.015),
      necalificat(0.006),
    ],
  },
  {
    code: "DV-BET-10",
    category,
    title: "Beton C25/30 în pereți și diafragme, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului în straturi de cel mult 50 cm, compactarea prin vibrare și protejarea betonului proaspăt.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect, fără goluri.",
    resources: [
      betonC25(1.02),
      betonist(2),
      necalificat(1),
      pompaBeton(0.1),
      vibrator(0.5),
    ],
  },
  {
    code: "DV-BET-11",
    category,
    title: "Beton C16/20 în plăci pe sol de 10–15 cm, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului, compactarea prin vibrare, nivelarea pe repere și finisarea cu dreptarul, protejarea și udarea betonului.",
    excludes: "Folia, stratul de balast și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC16(1.02),
      betonist(1.4),
      necalificat(0.7),
      pompaBeton(0.07),
      vibrator(0.3),
    ],
  },
  {
    code: "DV-BET-12",
    category,
    title: "Beton C20/25 în scări și podeste, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului de la treapta de jos în sus, compactarea prin vibrare, finisarea treptelor și protejarea betonului.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, cu treptele, după dimensiunile din proiect.",
    resources: [
      betonC20(1.02),
      betonist(2.6),
      necalificat(1.2),
      pompaBeton(0.1),
      vibrator(0.5),
    ],
  },
  {
    code: "DV-BET-13",
    category,
    title:
      "Beton C16/20 preparat la fața locului cu betoniera, turnat cu roaba",
    unit: "mc",
    includes:
      "Dozarea și amestecarea cimentului, a nisipului și a pietrișului, transportul cu roaba, turnarea, vibrarea și protejarea betonului.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      ciment(330),
      nisip(0.5),
      pietris(0.8),
      betonist(1.5),
      necalificat(3),
      betoniera(1.2),
      vibrator(0.3),
    ],
  },
  {
    code: "DV-BET-14",
    category,
    title:
      "Placă din beton C16/20 de 12 cm pe sol, armată cu plasă sudată, pe folie",
    unit: "mp",
    includes:
      "Așezarea foliei cu petreceri, montarea plasei pe distanțieri, turnarea, vibrarea și finisarea betonului cu dreptarul, protejarea lui.",
    excludes: "Stratul de balast; cofrajul marginilor; rosturile tăiate.",
    measurement: "Suprafața plăcii.",
    resources: [
      foliePolietilena(1.1),
      plasaSudata(3.5),
      betonC16(0.123),
      betonist(0.3),
      fierar(0.05),
      necalificat(0.35),
      vibrator(0.04),
    ],
  },
  {
    code: "DV-BET-15",
    category,
    title: "Cofraje din placaj și cherestea pentru scări și podeste",
    unit: "mp",
    includes:
      "Confecționarea și montarea cofrajului rampei, al podestului și al contratreptelor, cu sprijinirile, ungerea, decofrarea și curățarea materialelor.",
    measurement:
      "Suprafața cofrajului în contact cu betonul, cu contratreptele.",
    resources: [
      placajFilmat(0.4),
      cherestea(0.025),
      cuie(0.25),
      uleiDecofrare(0.1),
      dulgher(2),
      necalificat(0.7),
    ],
  },
  {
    code: "DV-BET-16",
    category,
    title: "Cofraje modulare din panouri pentru pereți, închiriate",
    unit: "mp",
    includes:
      "Montarea panourilor cu tiranții, sprijinirile și pasarelele lor, ungerea cu ulei de decofrare, decofrarea și curățarea panourilor.",
    excludes: "Transportul panourilor la și de la șantier.",
    measurement: "Suprafața cofrajului în contact cu betonul.",
    resources: [
      cofrajModular(1),
      uleiDecofrare(0.1),
      smallMaterials(3),
      dulgher(0.6),
      necalificat(0.3),
      automacara(0.02),
    ],
  },
  {
    code: "DV-BET-17",
    category,
    title: "Cofraje din dulapi de rășinoase pentru fundații și elevații",
    unit: "mp",
    includes:
      "Montarea dulapilor pe montanți, cu sprijinirile și distanțierii lor, decofrarea și curățarea lemnului pentru refolosire.",
    measurement: "Suprafața cofrajului în contact cu betonul.",
    resources: [cherestea(0.03), cuie(0.2), dulgher(0.8), necalificat(0.4)],
  },
  {
    code: "DV-BET-18",
    category,
    title: "Carcase de armătură prefabricate pentru stâlpi și grinzi, montate",
    unit: "kg",
    includes:
      "Descărcarea și ridicarea carcaselor, așezarea lor în cofraj, legarea de armăturile de așteptare și distanțierii.",
    measurement: "Masa carcaselor după extrasul de armare din proiect.",
    resources: [
      carcasa(1.02),
      sarma(0.005),
      fierar(0.012),
      necalificat(0.008),
      automacara(0.002),
    ],
  },
  {
    code: "DV-BET-19",
    category,
    title: "Buiandrugi prefabricați din beton armat peste goluri în zidărie",
    unit: "m",
    includes:
      "Așezarea buiandrugului pe pat de mortar, cu rezemarea de cel puțin 25 cm pe fiecare parte, și sprijinirea lui până la zidirea de deasupra.",
    measurement: "Lungimea buiandrugilor.",
    resources: [
      buiandrug(1),
      mortarZidarie(0.003),
      zidar(0.4),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-BET-20",
    category,
    title: "Buiandrugi din beton armat turnați pe loc, cu cofraj și armătură",
    unit: "m",
    includes:
      "Cofrajul cu sprijinirile lui, armarea cu bare și etrieri, turnarea și vibrarea betonului, decofrarea, pentru o secțiune de 25 × 25 cm.",
    measurement: "Lungimea buiandrugilor, cu rezemările.",
    resources: [
      betonC20(0.065),
      otelBeton(6),
      placajFilmat(0.25),
      cherestea(0.006),
      cuie(0.1),
      dulgher(0.7),
      fierar(0.2),
      betonist(0.3),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-BET-21",
    category,
    title:
      "Beton C20/25 în stâlpișori și centuri, turnat cu bena sau cu găleata",
    unit: "mc",
    includes:
      "Primirea betonului din autobetonieră, turnarea cu bena sau cu găleata în straturi, compactarea prin vibrare și protejarea betonului.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [betonC20(1.03), betonist(3), necalificat(1.5), vibrator(0.6)],
  },
  {
    code: "DV-BET-22",
    category,
    title:
      "Finisarea mecanică a plăcilor de beton cu elicopterul, cu durificator de cuarț",
    unit: "mp",
    includes:
      "Împrăștierea durificatorului pe betonul proaspăt, drișcuirea și lustruirea mecanică în treceri succesive, protejarea suprafeței.",
    excludes: "Turnarea betonului; tăierea rosturilor.",
    measurement: "Suprafața finisată.",
    resources: [
      cuart(4),
      betonist(0.15),
      necalificat(0.05),
      elicopterBeton(0.08),
    ],
  },
  {
    code: "DV-BET-23",
    category,
    title:
      "Rosturi de contracție tăiate în plăci de beton, umplute cu chit poliuretanic",
    unit: "m",
    includes:
      "Trasarea și tăierea rostului pe o treime din grosimea plăcii, curățarea, fondul de rost și chitul.",
    measurement: "Lungimea rosturilor.",
    resources: [
      chitPoliuretanic(0.08),
      necalificat(0.08),
      masinaTaiatRosturi(0.06),
    ],
  },
  {
    code: "DV-BET-24",
    category,
    title: "Beton ușor de pantă pe terase, pompat și nivelat la pantă",
    unit: "mc",
    includes:
      "Prepararea și pomparea betonului ușor, trasarea pantelor spre gurile de scurgere, nivelarea și drișcuirea suprafeței.",
    excludes: "Bariera de vapori; șapa de protecție de deasupra.",
    measurement:
      "Volumul betonului pus în operă, din grosimea medie înmulțită cu suprafața.",
    resources: [betonUsor(1.03), betonist(1.8), necalificat(1), pompaSapa(0.3)],
  },
  {
    code: "DV-BET-25",
    category,
    title:
      "Planșeu din grinzi prefabricate și corpuri de umplutură ceramice, cu suprabetonare de 5 cm",
    unit: "mp",
    includes:
      "Sprijinirea provizorie, așezarea grinzilor și a corpurilor de umplutură, plasa sudată, turnarea și vibrarea suprabetonării, descintrarea.",
    excludes:
      "Centurile și grinzile monolite; armăturile de rezemare din proiect.",
    measurement: "Suprafața planșeului, între reazeme.",
    resources: [
      grindaPlanseu(1.7),
      corpUmplutura(7),
      plasaSudata(2.5),
      betonC20(0.07),
      cherestea(0.003),
      popiCofraje(1),
      betonist(0.5),
      fierar(0.05),
      dulgher(0.3),
      necalificat(0.6),
      vibrator(0.05),
      pompaBeton(0.006),
    ],
  },
  {
    code: "DV-BET-26",
    category,
    title: "Strat de egalizare din beton C8/10 de 10 cm sub fundații și plăci",
    unit: "mp",
    includes:
      "Turnarea betonului din jgheab sau cu roaba, nivelarea la cotă și protejarea suprafeței.",
    excludes: "Stratul de balast de dedesubt.",
    measurement: "Suprafața egalizată.",
    resources: [betonC8(0.103), betonist(0.12), necalificat(0.1)],
  },
  {
    code: "DV-BET-27",
    category,
    title: "Beton ciclopian C8/10 cu 30 % piatră brută, în fundații",
    unit: "mc",
    includes:
      "Turnarea betonului în straturi, înglobarea pietrelor spălate, îndesarea și nivelarea ultimului strat.",
    excludes: "Cofrajele.",
    measurement: "Volumul fundației, după dimensiunile din proiect.",
    resources: [
      betonC8(0.75),
      piatraBruta(0.35),
      betonist(1.4),
      necalificat(1.2),
    ],
  },
];

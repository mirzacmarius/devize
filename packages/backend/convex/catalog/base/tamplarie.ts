import type { BaseNorm } from "./norm";
import {
  ancoraTamplarie,
  bandaTamplarie,
  dibluCui,
  dibluMetalic,
  dibluTamplarie,
  electrician,
  fereastraPvc,
  feronerie,
  glaf,
  material,
  montatorGips,
  montatorTamplarie,
  mortarZidarie,
  necalificat,
  pervaz,
  silicon,
  smallMaterials,
  spuma,
  surubLemn,
  surubTabla,
  tinichigiu,
  usaInterioara,
  usaMetalica,
} from "./resources";

const category = "Tâmplărie";

const fereastraTripan = material(
  "Fereastră din PVC cu geam termoizolant tripan",
  "mp",
  780,
);
const fereastraAluminiu = material(
  "Fereastră din aluminiu cu rupere de punte termică și geam termoizolant",
  "mp",
  1400,
);
const fereastraLemn = material(
  "Fereastră din lemn stratificat cu geam termoizolant",
  "mp",
  1600,
);
const usaGlisantaPvc = material(
  "Ușă glisantă din PVC cu geam termoizolant",
  "mp",
  900,
);
const usaExteriorPvc = material(
  "Ușă de exterior din PVC cu panel",
  "buc",
  2600,
);
const usaAntiefractie = material(
  "Ușă de exterior antiefracție, cu toc",
  "buc",
  3200,
);
const usaAntifoc = material(
  "Ușă metalică rezistentă la foc EI60, cu toc și dispozitiv de autoînchidere",
  "buc",
  2800,
);
const usaFurniruita = material(
  "Ușă interioară furniruită, cu toc și pervazuri",
  "buc",
  1300,
);
const usaSticla = material(
  "Ușă interioară din sticlă securizată, cu feronerie",
  "buc",
  1900,
);
const casetaGlisanta = material(
  "Casetă metalică pentru ușă glisantă în perete",
  "buc",
  1100,
);
const foaieGlisanta = material("Foaie de ușă pentru ușă glisantă", "buc", 650);
const feronerieGlisanta = material(
  "Set de feronerie pentru ușă glisantă",
  "set",
  250,
);
const usaGaraj = material(
  "Ușă de garaj secțională de 2,5 × 2,1 m, cu motor",
  "buc",
  6500,
);
const rulou = material(
  "Rulou exterior din aluminiu cu casetă, acționat electric",
  "mp",
  650,
);
const plasaInsecte = material(
  "Plasă împotriva insectelor cu ramă fixă",
  "mp",
  120,
);
const jaluzele = material(
  "Jaluzele interioare, verticale sau orizontale",
  "mp",
  150,
);
const pervazLemn = material("Pervaz interior din lemn", "m", 70);
const glafTabla = material("Glaf exterior din tablă vopsită", "m", 28);
const geamTripan = material("Geam termoizolant tripan", "mp", 350);
const baghetaGeam = material(
  "Baghetă din PVC pentru geam termoizolant",
  "m",
  6,
);
const scaraPod = material("Scară escamotabilă de pod, cu chepeng", "buc", 900);
const pereteSticla = material(
  "Perete despărțitor din sticlă securizată cu profile de aluminiu",
  "mp",
  750,
);
const yala = material("Yală suplimentară de siguranță", "buc", 180);
const inchizator = material("Închizător hidraulic de ușă", "buc", 220);
const sprayGresare = material("Spray de gresare pentru feronerie", "buc", 25);

export const tamplarie: BaseNorm[] = [
  {
    code: "DV-TAM-01",
    category,
    title:
      "Fereastră din PVC cu geam termoizolant, cu montaj, spumă și benzi de etanșare",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare și montarea cercevelelor.",
    excludes: "Pervazul și glaful; finisarea golului.",
    measurement: "Suprafața ferestrei, măsurată la exteriorul tocului.",
    resources: [
      fereastraPvc(1),
      spuma(0.35),
      bandaTamplarie(3.3),
      dibluTamplarie(4),
      montatorTamplarie(1.2),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TAM-02",
    category,
    title: "Pervaz interior din PVC, montat",
    unit: "m",
    includes: "Tăierea, fixarea cu spumă și etanșarea pervazului cu silicon.",
    measurement: "Lungimea pervazului.",
    resources: [
      pervaz(1.05),
      spuma(0.05),
      silicon(0.05),
      montatorTamplarie(0.35),
    ],
  },
  {
    code: "DV-TAM-03",
    category,
    title: "Glaf exterior din aluminiu, montat",
    unit: "m",
    includes:
      "Tăierea, fixarea cu spumă, capacele laterale și etanșarea glafului cu silicon.",
    measurement: "Lungimea glafului.",
    resources: [glaf(1.05), spuma(0.05), silicon(0.05), montatorTamplarie(0.3)],
  },
  {
    code: "DV-TAM-04",
    category,
    title: "Ușă interioară cu toc reglabil și feronerie, cu montaj",
    unit: "buc",
    includes:
      "Asamblarea și fixarea tocului cu spumă, montarea foii de ușă, a pervazurilor de toc și a feroneriei, reglarea.",
    measurement: "Numărul de uși.",
    resources: [
      usaInterioara(1),
      feronerie(1),
      spuma(0.5),
      montatorTamplarie(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TAM-05",
    category,
    title: "Ușă metalică de exterior, cu montaj",
    unit: "buc",
    includes:
      "Fixarea tocului cu ancore, reglarea, spumarea și etanșarea rostului, reglarea feroneriei.",
    excludes: "Finisarea golului.",
    measurement: "Numărul de uși.",
    resources: [
      usaMetalica(1),
      ancoraTamplarie(8),
      spuma(0.7),
      silicon(0.2),
      montatorTamplarie(3.5),
      necalificat(1),
    ],
  },
  {
    code: "DV-TAM-06",
    category,
    title:
      "Fereastră din PVC cu geam termoizolant tripan, cu montaj, spumă și benzi de etanșare",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare și montarea cercevelelor.",
    excludes: "Pervazul și glaful; finisarea golului.",
    measurement: "Suprafața ferestrei, măsurată la exteriorul tocului.",
    resources: [
      fereastraTripan(1),
      spuma(0.35),
      bandaTamplarie(3.3),
      dibluTamplarie(4),
      montatorTamplarie(1.25),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TAM-07",
    category,
    title:
      "Fereastră din aluminiu cu rupere de punte termică și geam termoizolant, cu montaj",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare și montarea cercevelelor.",
    excludes: "Pervazul și glaful; finisarea golului.",
    measurement: "Suprafața ferestrei, măsurată la exteriorul tocului.",
    resources: [
      fereastraAluminiu(1),
      spuma(0.35),
      bandaTamplarie(3.3),
      dibluTamplarie(4),
      montatorTamplarie(1.4),
      necalificat(0.45),
    ],
  },
  {
    code: "DV-TAM-08",
    category,
    title:
      "Fereastră din lemn stratificat cu geam termoizolant, cu montaj, spumă și benzi de etanșare",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare și montarea cercevelelor.",
    excludes: "Pervazul și glaful; finisarea golului.",
    measurement: "Suprafața ferestrei, măsurată la exteriorul tocului.",
    resources: [
      fereastraLemn(1),
      spuma(0.35),
      bandaTamplarie(3.3),
      dibluTamplarie(4),
      montatorTamplarie(1.4),
      necalificat(0.45),
    ],
  },
  {
    code: "DV-TAM-09",
    category,
    title:
      "Ușă glisantă de balcon sau terasă din PVC cu geam termoizolant, cu montaj",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare, montarea și reglarea canatului glisant.",
    excludes: "Pervazul și glaful; finisarea golului.",
    measurement: "Suprafața ușii, măsurată la exteriorul tocului.",
    resources: [
      usaGlisantaPvc(1),
      spuma(0.3),
      bandaTamplarie(3),
      dibluTamplarie(4),
      montatorTamplarie(1.3),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TAM-10",
    category,
    title: "Ușă de exterior din PVC cu panel, cu montaj",
    unit: "buc",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare, montarea foii și reglarea feroneriei.",
    excludes: "Pragul special; finisarea golului.",
    measurement: "Numărul de uși.",
    resources: [
      usaExteriorPvc(1),
      spuma(0.7),
      bandaTamplarie(6),
      dibluTamplarie(8),
      montatorTamplarie(3),
      necalificat(0.8),
    ],
  },
  {
    code: "DV-TAM-11",
    category,
    title: "Ușă de exterior antiefracție, cu toc, cu montaj",
    unit: "buc",
    includes:
      "Fixarea tocului cu ancore, reglarea, spumarea și etanșarea rostului, montarea foii și reglarea feroneriei.",
    excludes: "Finisarea golului.",
    measurement: "Numărul de uși.",
    resources: [
      usaAntiefractie(1),
      ancoraTamplarie(8),
      spuma(0.7),
      silicon(0.2),
      montatorTamplarie(3.5),
      necalificat(1),
    ],
  },
  {
    code: "DV-TAM-12",
    category,
    title:
      "Ușă metalică rezistentă la foc EI60, cu toc și autoînchidere, cu montaj",
    unit: "buc",
    includes:
      "Fixarea tocului cu ancore, umplerea tocului cu mortar, montarea foii, reglarea și verificarea închiderii automate.",
    excludes: "Finisarea golului.",
    measurement: "Numărul de uși.",
    resources: [
      usaAntifoc(1),
      ancoraTamplarie(8),
      mortarZidarie(0.01),
      montatorTamplarie(3.5),
      necalificat(1),
    ],
  },
  {
    code: "DV-TAM-13",
    category,
    title: "Ușă interioară furniruită, cu toc și pervazuri, cu montaj",
    unit: "buc",
    includes:
      "Asamblarea și fixarea tocului cu spumă, montarea foii de ușă, a pervazurilor și a feroneriei, reglarea.",
    measurement: "Numărul de uși.",
    resources: [
      usaFurniruita(1),
      feronerie(1),
      spuma(0.5),
      montatorTamplarie(2.8),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TAM-14",
    category,
    title: "Ușă interioară din sticlă securizată, cu feronerie, cu montaj",
    unit: "buc",
    includes:
      "Montarea balamalelor sau a sistemului de glisare pe toc sau perete, agățarea foii de sticlă, montarea broaștei și reglarea.",
    measurement: "Numărul de uși.",
    resources: [usaSticla(1), montatorTamplarie(3), necalificat(0.5)],
  },
  {
    code: "DV-TAM-15",
    category,
    title:
      "Ușă glisantă în perete, cu casetă metalică montată în perete de gips-carton, foaie și feronerie",
    unit: "buc",
    includes:
      "Montarea casetei în structura peretelui, placarea ei odată cu peretele, montarea foii de ușă pe șină, a feroneriei și a profilelor de finisare.",
    excludes: "Peretele de gips-carton și gletul lui.",
    measurement: "Numărul de uși.",
    resources: [
      casetaGlisanta(1),
      foaieGlisanta(1),
      feronerieGlisanta(1),
      montatorTamplarie(4),
      montatorGips(2),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TAM-16",
    category,
    title: "Ușă de garaj secțională de 2,5 × 2,1 m, cu motor, cu montaj",
    unit: "buc",
    includes:
      "Montarea șinelor și a arcurilor, asamblarea panourilor, montarea motorului și a telecomenzilor, reglarea și proba.",
    excludes: "Alimentarea electrică până la motor.",
    measurement: "Numărul de uși.",
    resources: [
      usaGaraj(1),
      dibluMetalic(12),
      montatorTamplarie(8),
      electrician(1.5),
      necalificat(3),
    ],
  },
  {
    code: "DV-TAM-17",
    category,
    title:
      "Rulou exterior din aluminiu cu casetă, acționat electric, cu montaj",
    unit: "mp",
    includes:
      "Fixarea casetei și a ghidajelor, montarea lamelelor și a motorului, legarea la comandă și reglarea capetelor de cursă.",
    excludes: "Alimentarea electrică până la rulou.",
    measurement: "Suprafața ruloului, cu caseta.",
    resources: [
      rulou(1),
      dibluTamplarie(3),
      montatorTamplarie(1.2),
      electrician(0.4),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-TAM-18",
    category,
    title: "Plasă împotriva insectelor cu ramă fixă, montată pe fereastră",
    unit: "mp",
    includes: "Măsurarea, potrivirea ramei și fixarea ei pe tocul ferestrei.",
    measurement: "Suprafața plasei.",
    resources: [plasaInsecte(1), montatorTamplarie(0.4)],
  },
  {
    code: "DV-TAM-19",
    category,
    title: "Jaluzele interioare, verticale sau orizontale, montate",
    unit: "mp",
    includes: "Fixarea suporților, montarea șinei și a lamelelor, reglarea.",
    measurement: "Suprafața jaluzelelor.",
    resources: [jaluzele(1), dibluCui(3), montatorTamplarie(0.3)],
  },
  {
    code: "DV-TAM-20",
    category,
    title: "Pervaz interior din lemn, montat",
    unit: "m",
    includes: "Tăierea, fixarea cu spumă și etanșarea pervazului cu silicon.",
    measurement: "Lungimea pervazului.",
    resources: [
      pervazLemn(1.05),
      spuma(0.05),
      silicon(0.05),
      montatorTamplarie(0.4),
    ],
  },
  {
    code: "DV-TAM-21",
    category,
    title: "Glaf exterior din tablă vopsită, montat",
    unit: "m",
    includes:
      "Tăierea și fălțuirea capetelor, fixarea glafului sub toc cu șuruburi și etanșarea cu silicon.",
    measurement: "Lungimea glafului.",
    resources: [glafTabla(1.05), surubTabla(3), silicon(0.05), tinichigiu(0.3)],
  },
  {
    code: "DV-TAM-22",
    category,
    title:
      "Înlocuirea geamului termoizolant cu geam tripan, în tâmplăria existentă",
    unit: "mp",
    includes:
      "Scoaterea baghetelor și a geamului vechi, așezarea geamului nou pe cale, montarea baghetelor noi potrivite grosimii geamului și reglarea cercevelei.",
    excludes:
      "Evacuarea geamului vechi. Se aplică numai la profilele care primesc grosimea geamului tripan.",
    measurement: "Suprafața geamului.",
    resources: [
      geamTripan(1),
      baghetaGeam(4.5),
      smallMaterials(2),
      montatorTamplarie(0.8),
    ],
  },
  {
    code: "DV-TAM-23",
    category,
    title: "Scară escamotabilă de pod cu chepeng, montată în planșeu",
    unit: "buc",
    includes:
      "Fixarea cutiei în gol cu șuruburi, spumarea rostului, reglarea scării la înălțimea încăperii și a chepengului.",
    excludes: "Golul în planșeu; finisarea lui.",
    measurement: "Numărul de scări.",
    resources: [
      scaraPod(1),
      surubLemn(20),
      spuma(0.5),
      montatorTamplarie(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TAM-24",
    category,
    title:
      "Perete despărțitor din sticlă securizată cu profile de aluminiu, pentru birouri",
    unit: "mp",
    includes:
      "Fixarea profilelor de pardoseală, tavan și pereți, așezarea foilor de sticlă, garniturile și etanșarea rosturilor cu silicon.",
    excludes: "Ușile din perete.",
    measurement: "Suprafața peretelui.",
    resources: [
      pereteSticla(1),
      dibluMetalic(2),
      silicon(0.2),
      montatorTamplarie(1.5),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TAM-25",
    category,
    title:
      "Montajul ferestrelor și al ușilor exterioare furnizate separat, cu spumă și benzi de etanșare",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare și montarea cercevelelor sau a foii.",
    excludes: "Tâmplăria; pervazul și glaful; finisarea golului.",
    measurement: "Suprafața tâmplăriei, măsurată la exteriorul tocului.",
    resources: [
      spuma(0.35),
      bandaTamplarie(3.3),
      dibluTamplarie(4),
      montatorTamplarie(1.2),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TAM-26",
    category,
    title: "Yală suplimentară de siguranță, montată pe ușă existentă",
    unit: "buc",
    includes:
      "Trasarea, găurirea și frezarea foii și a tocului, montarea yalei și a contraplăcii.",
    measurement: "Numărul de yale.",
    resources: [yala(1), montatorTamplarie(0.8)],
  },
  {
    code: "DV-TAM-27",
    category,
    title: "Închizător hidraulic de ușă, montat și reglat",
    unit: "buc",
    includes:
      "Trasarea după șablon, fixarea corpului și a brațului, reglarea vitezei de închidere.",
    measurement: "Numărul de închizătoare.",
    resources: [inchizator(1), montatorTamplarie(0.6)],
  },
  {
    code: "DV-TAM-28",
    category,
    title: "Reglarea feroneriei ferestrelor și ușilor existente, cu gresare",
    unit: "buc",
    includes:
      "Reglarea balamalelor și a punctelor de închidere, gresarea feroneriei și verificarea etanșării.",
    measurement: "Numărul de ferestre sau uși reglate.",
    resources: [sprayGresare(0.05), montatorTamplarie(0.4)],
  },
];

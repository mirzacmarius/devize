import type { BaseNorm } from "./norm";
import {
  aparatSudura,
  bandaAvertizare,
  brataraMetalica,
  discAbraziv,
  electrician,
  electrozi,
  grundAnticoroziv,
  instalator,
  material,
  mortarZidarie,
  necalificat,
  nisip,
  polizor,
  presaFitinguri,
  smallMaterials,
  sudor,
  suduraPe,
  zidar,
} from "./resources";

const category = "Instalații de gaze";

// Instalațiile de utilizare a gazelor naturale se execută numai de firme
// autorizate ANRE, pe proiect avizat; normele acoperă lucrările obișnuite
// dintr-o locuință. Postul de reglare-măsurare îl livrează distribuitorul.

const tevaOtelGaz = material('Țeavă din oțel pentru gaze, 1/2" – 1"', "m", 22);
const tevaOtelGazMare = material(
  'Țeavă din oțel pentru gaze, 1 1/4" – 2"',
  "m",
  42,
);
const fitingGaz = material(
  "Fiting din oțel pentru instalații de gaze",
  "buc",
  12,
);
const vopseaGalbena = material("Email galben pentru conducte de gaz", "kg", 28);
const multistratGaz = material("Țeavă multistrat pentru gaze Ø20", "m", 12);
const fitingPresareGaz = material(
  "Fiting de presare pentru țeavă multistrat de gaze Ø20",
  "buc",
  25,
);
const tevaPeGaz = material("Țeavă PE100 SDR11 pentru gaze, Ø32", "m", 9);
const fitingElectrofuziune = material(
  "Fiting de electrofuziune pentru PE Ø32",
  "buc",
  45,
);
const robinetGaz = material('Robinet de gaz cu sferă, 1/2" – 3/4"', "buc", 35);
const firida = material(
  "Firidă metalică pentru postul de reglare-măsurare",
  "buc",
  450,
);
const racordFlexibilGaz = material(
  "Racord flexibil pentru gaz, din inox, cu garnituri",
  "buc",
  65,
);
const detectorGaz = material(
  "Detector de gaz metan cu electrovană de închidere",
  "set",
  650,
);
const tubProtectie = material(
  "Tub de protecție din oțel pentru trecerea țevii de gaz prin perete",
  "buc",
  25,
);

export const gaze: BaseNorm[] = [
  {
    code: "DV-GAZ-01",
    category,
    title:
      'Conductă din oțel pentru gaze 1/2" – 1", montată aparent, sudată, vopsită galben',
    unit: "m",
    includes:
      "Tăierea, pregătirea capetelor, sudarea sau filetarea, fixarea cu brățări, grunduirea și vopsirea în galben, proba de etanșeitate.",
    excludes: "Robineții (DV-GAZ-05) și trecerile prin pereți (DV-GAZ-09).",
    measurement: "Lungimea conductei montate.",
    resources: [
      tevaOtelGaz(1.02),
      fitingGaz(0.4),
      electrozi(0.1),
      grundAnticoroziv(0.05),
      vopseaGalbena(0.08),
      brataraMetalica(0.6),
      discAbraziv(0.05),
      instalator(0.7),
      sudor(0.3),
      aparatSudura(0.3),
      polizor(0.1),
    ],
  },
  {
    code: "DV-GAZ-02",
    category,
    title:
      'Conductă din oțel pentru gaze 1 1/4" – 2", montată aparent, sudată, vopsită galben',
    unit: "m",
    includes:
      "Tăierea, pregătirea capetelor, sudarea, fixarea cu brățări, grunduirea și vopsirea în galben, proba de etanșeitate.",
    excludes: "Robineții și trecerile prin pereți.",
    measurement: "Lungimea conductei montate.",
    resources: [
      tevaOtelGazMare(1.02),
      fitingGaz(0.3),
      electrozi(0.2),
      grundAnticoroziv(0.1),
      vopseaGalbena(0.15),
      brataraMetalica(0.5),
      discAbraziv(0.08),
      instalator(0.9),
      sudor(0.4),
      necalificat(0.2),
      aparatSudura(0.4),
      polizor(0.15),
    ],
  },
  {
    code: "DV-GAZ-03",
    category,
    title:
      "Conductă multistrat pentru gaze Ø20 cu fitinguri de presare, montată aparent",
    unit: "m",
    includes:
      "Tăierea, calibrarea, fitingurile presate, fixarea cu brățări la distanțele cerute și proba de etanșeitate.",
    measurement: "Lungimea conductei montate.",
    resources: [
      multistratGaz(1.02),
      fitingPresareGaz(0.25),
      brataraMetalica(0.7),
      smallMaterials(2),
      instalator(0.3),
      presaFitinguri(0.05),
    ],
  },
  {
    code: "DV-GAZ-04",
    category,
    title:
      "Branșament din PE100 Ø32 îngropat, de la rețea la postul de reglare",
    unit: "m",
    includes:
      "Pozarea țevii pe pat de nisip, îmbinările prin electrofuziune, acoperirea cu nisip, banda de avertizare și proba de presiune.",
    excludes:
      "Săpătura și umplutura (categoria Terasamente), racordul la rețea și refacerea trotuarului.",
    measurement: "Lungimea branșamentului.",
    resources: [
      tevaPeGaz(1.02),
      fitingElectrofuziune(0.15),
      nisip(0.08),
      bandaAvertizare(1),
      instalator(0.3),
      necalificat(0.3),
      suduraPe(0.1),
    ],
  },
  {
    code: "DV-GAZ-05",
    category,
    title: "Robinet de gaz cu sferă, montat pe conductă",
    unit: "buc",
    includes:
      "Filetarea capetelor, montarea robinetului cu etanșare omologată pentru gaz și proba de etanșeitate.",
    measurement: "Numărul de robineți montați.",
    resources: [robinetGaz(1), smallMaterials(2), instalator(0.5)],
  },
  {
    code: "DV-GAZ-06",
    category,
    title:
      "Firidă pentru postul de reglare-măsurare, montată în gard sau în perete, cu racordarea conductei",
    unit: "buc",
    includes:
      "Spargerea golului sau zidirea locașului, fixarea firidei, racordarea conductei de intrare și de ieșire și finisarea rostului.",
    excludes:
      "Regulatorul și contorul, montate de distribuitor, și branșamentul (DV-GAZ-04).",
    measurement: "Numărul de firide montate.",
    resources: [
      firida(1),
      mortarZidarie(0.02),
      smallMaterials(2),
      zidar(1),
      instalator(2),
    ],
  },
  {
    code: "DV-GAZ-07",
    category,
    title: "Racordarea unui aparat consumator cu racord flexibil și robinet",
    unit: "buc",
    includes:
      "Montarea robinetului de aparat, a racordului flexibil omologat, verificarea etanșeității și a arderii.",
    measurement: "Numărul de aparate racordate.",
    resources: [
      racordFlexibilGaz(1),
      robinetGaz(1),
      smallMaterials(2),
      instalator(1.5),
    ],
  },
  {
    code: "DV-GAZ-08",
    category,
    title: "Detector de gaz metan cu electrovană de închidere, montat și legat",
    unit: "set",
    includes:
      "Montarea electrovanei pe conductă, a detectorului la înălțimea cerută, cablarea între ele și la alimentare, proba de declanșare.",
    measurement: "Numărul de seturi montate.",
    resources: [
      detectorGaz(1),
      smallMaterials(2),
      instalator(1),
      electrician(1),
    ],
  },
  {
    code: "DV-GAZ-09",
    category,
    title: "Trecerea conductei de gaz prin perete, în tub de protecție etanșat",
    unit: "buc",
    includes:
      "Străpungerea peretelui, montarea tubului de protecție, trecerea conductei și etanșarea capetelor cu material elastic.",
    measurement: "Numărul de treceri.",
    resources: [
      tubProtectie(1),
      smallMaterials(3),
      instalator(0.5),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-GAZ-10",
    category,
    title:
      "Proba de rezistență și de etanșeitate a instalației de gaze, cu documentele de recepție",
    unit: "buc",
    includes:
      "Închiderea capetelor, proba de rezistență și proba de etanșeitate la presiunile din normativ, cu manometru înregistrator, întocmirea procesului-verbal și pregătirea documentelor pentru punerea în funcțiune.",
    measurement: "Numărul de instalații probate.",
    resources: [instalator(4)],
  },
];

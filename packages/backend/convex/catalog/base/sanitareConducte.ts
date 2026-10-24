import type { BaseNorm } from "./norm";
import {
  apometru,
  automacara,
  bandaAluminiu,
  bandaAvertizare,
  bandaFolii,
  baterieLavoar,
  betonC16,
  boiler,
  bratara,
  clema,
  cutieDistribuitor,
  electrician,
  fitingCanal40,
  fitingCanal50,
  fitingCanal110,
  fitingPehd32,
  fitingPpr20,
  fitingPpr25,
  fitingPresare16,
  fitingPresare20,
  instalator,
  izolatieTeava,
  izolatieTeava13,
  lavoar,
  material,
  mortarZidarie,
  necalificat,
  nisip,
  presaFitinguri,
  racordFlexibil,
  racordInox,
  racordWc,
  robinetColtar,
  robinetSferic,
  robinetSferic1,
  setPrindere,
  sifonLavoar,
  siliconSanitar,
  smallMaterials,
  suduraPe,
  suduraPpr,
  supapa,
  tevaCanal40,
  tevaCanal50,
  tevaCanal110,
  tevaPehd32,
  tevaPexAl16,
  tevaPexAl20,
  tevaPpr20,
  tevaPpr25,
  vasWc,
} from "./resources";

const category = "Instalații sanitare";

const tevaPpr32 = material("Țeavă PPR Ø32", "m", 7.5);
const fitingPpr32 = material("Fiting PPR Ø32", "buc", 4);
const tevaPpr40 = material("Țeavă PPR Ø40", "m", 11);
const fitingPpr40 = material("Fiting PPR Ø40", "buc", 7);
const tevaPprFibra25 = material("Țeavă PPR cu fibră compozită Ø25", "m", 7);
const tevaPexTub = material("Țeavă PEX Ø16 în tub de protecție", "m", 5);
const distribuitor = material(
  "Distribuitor sanitar din alamă cu 4 circuite",
  "buc",
  180,
);
const tevaCupru = material("Țeavă de cupru Ø15–22", "m", 32);
const fitingCupru = material("Fiting de cupru pentru lipit", "buc", 12);
const tevaPehd63 = material("Țeavă PEHD Ø63 PN10", "m", 16);
const fitingPehd63 = material(
  "Fiting de electrofuziune pentru PEHD Ø63",
  "buc",
  55,
);
const tevaCanal75 = material("Țeavă de canalizare PP Ø75", "m", 10);
const fitingCanal75 = material("Fiting de canalizare Ø75", "buc", 6);
const tevaKg110 = material("Țeavă PVC-KG Ø110 SN4", "m", 18);
const fitingKg110 = material("Fiting PVC-KG Ø110", "buc", 15);
const tevaKg160 = material("Țeavă PVC-KG Ø160 SN4", "m", 32);
const fitingKg160 = material("Fiting PVC-KG Ø160", "buc", 32);
const tevaKg200 = material("Țeavă PVC-KG Ø200 SN4", "m", 48);
const fitingKg200 = material("Fiting PVC-KG Ø200", "buc", 55);
const caminPvc = material(
  "Cămin de canalizare din PVC Ø400, cu capac",
  "buc",
  750,
);
const caminBeton = material(
  "Cămin de vizitare din elemente de beton Ø1000, cu capac carosabil",
  "buc",
  1800,
);
const fosa = material("Fosă septică din polietilenă de 3 mc", "buc", 4500);
const statieEpurare = material(
  "Ministație de epurare pentru 6 persoane",
  "buc",
  9500,
);
const separatorGrasimi = material("Separator de grăsimi de 2 l/s", "buc", 3800);
const caminApometru = material(
  "Cămin de apometru din PE, cu capac",
  "buc",
  650,
);
const filtru = material('Filtru de impurități cu sită, 3/4"', "buc", 60);
const reductor = material('Reductor de presiune de 3/4"', "buc", 220);
const hidrofor = material("Grup de pompare cu hidrofor de 50 l", "buc", 1400);
const pompaSubmersibila = material(
  "Pompă submersibilă pentru puț forat",
  "buc",
  1800,
);
const cabluSubmersibil = material(
  "Cablu electric submersibil 3 × 1,5 mm²",
  "m",
  9,
);
const cabluSiguranta = material(
  "Cablu de siguranță din inox pentru pompe",
  "m",
  6,
);
const capPut = material("Cap de puț cu etanșare", "buc", 250);
const clapeta = material("Clapetă antiretur de canalizare Ø110", "buc", 380);
const sifonPardoseala = material(
  "Sifon de pardoseală cu grătar inox",
  "buc",
  65,
);
const rigolaDus = material("Rigolă de duș din inox, 80 cm", "buc", 650);
const aerisitor = material(
  "Ventil de aerisire pentru coloane de canalizare",
  "buc",
  60,
);
const piesaCuratire = material("Piesă de curățire Ø110", "buc", 35);
const racordPex16 = material(
  "Racord de compresiune pentru țeavă PEX Ø16",
  "buc",
  12,
);
const cotPeretePex16 = material(
  "Cot de perete pentru țeavă PEX Ø16",
  "buc",
  18,
);
const dezinfectant = material(
  "Soluție de dezinfectare pentru instalații de apă",
  "l",
  30,
);
const cabluDegivrare = material(
  "Cablu de degivrare autoreglabil pentru conducte",
  "m",
  45,
);

export const sanitareConducte: BaseNorm[] = [
  {
    code: "DV-SAN-01",
    category,
    title:
      "Conductă din polipropilenă PPR Ø20 pentru apă rece și caldă, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPpr20(1.02),
      fitingPpr20(0.6),
      clema(1),
      instalator(0.35),
      necalificat(0.1),
      suduraPpr(0.05),
    ],
  },
  {
    code: "DV-SAN-02",
    category,
    title:
      "Conductă din polipropilenă PPR Ø25 pentru apă rece și caldă, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPpr25(1.02),
      fitingPpr25(0.5),
      clema(1),
      instalator(0.4),
      necalificat(0.1),
      suduraPpr(0.05),
    ],
  },
  {
    code: "DV-SAN-03",
    category,
    title: "Conductă de canalizare din PP Ø50, în interior",
    unit: "m",
    includes:
      "Montarea țevilor și a fitingurilor cu mufe și garnituri, fixarea cu brățări și verificarea etanșeității.",
    excludes: "Șlițurile și astuparea lor.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCanal50(1.02),
      fitingCanal50(0.6),
      bratara(0.8),
      instalator(0.3),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-SAN-04",
    category,
    title: "Conductă de canalizare din PP Ø110, în interior",
    unit: "m",
    includes:
      "Montarea țevilor și a fitingurilor cu mufe și garnituri, fixarea cu brățări și verificarea etanșeității.",
    excludes: "Șlițurile și astuparea lor.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCanal110(1.02),
      fitingCanal110(0.4),
      bratara(0.8),
      instalator(0.35),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-SAN-05",
    category,
    title: "Vas WC cu rezervor, cu montaj și racorduri",
    unit: "buc",
    includes:
      "Fixarea vasului de pardoseală, racordarea la canalizare și la apă, etanșarea cu silicon și proba de funcționare.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      vasWc(1),
      racordFlexibil(1),
      robinetColtar(1),
      racordWc(1),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-06",
    category,
    title: "Lavoar cu baterie și sifon, cu montaj",
    unit: "buc",
    includes:
      "Fixarea lavoarului, montarea bateriei și a sifonului, racordarea la apă și la canalizare, proba de funcționare.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      lavoar(1),
      baterieLavoar(1),
      sifonLavoar(1),
      racordFlexibil(2),
      robinetColtar(2),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.2),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-SAN-07",
    category,
    title: "Boiler electric de 80 l, cu montaj",
    unit: "buc",
    includes:
      "Fixarea boilerului pe perete, racordarea la apă rece și caldă cu supapa de siguranță, umplerea și proba de funcționare.",
    excludes: "Circuitul electric de alimentare.",
    measurement: "Numărul de boilere montate.",
    resources: [
      boiler(1),
      supapa(1),
      racordFlexibil(2),
      setPrindere(1),
      instalator(2),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-08",
    category,
    title: "Conductă din polipropilenă PPR Ø32 pentru apă, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPpr32(1.02),
      fitingPpr32(0.4),
      clema(0.8),
      instalator(0.45),
      necalificat(0.12),
      suduraPpr(0.06),
    ],
  },
  {
    code: "DV-SAN-09",
    category,
    title: "Conductă din polipropilenă PPR Ø40 pentru apă, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPpr40(1.02),
      fitingPpr40(0.3),
      clema(0.7),
      instalator(0.5),
      necalificat(0.15),
      suduraPpr(0.07),
    ],
  },
  {
    code: "DV-SAN-10",
    category,
    title:
      "Conductă din PPR cu fibră compozită Ø25 pentru apă caldă și recirculare, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme cu loc pentru dilatare și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPprFibra25(1.02),
      fitingPpr25(0.5),
      clema(1),
      instalator(0.4),
      necalificat(0.1),
      suduraPpr(0.05),
    ],
  },
  {
    code: "DV-SAN-11",
    category,
    title:
      "Conductă din țeavă multistrat PEX-Al-PEX Ø16, cu fitinguri de presare",
    unit: "m",
    includes:
      "Tăierea și calibrarea țevii, presarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPexAl16(1.03),
      fitingPresare16(0.5),
      clema(1),
      instalator(0.25),
      necalificat(0.05),
      presaFitinguri(0.05),
    ],
  },
  {
    code: "DV-SAN-12",
    category,
    title:
      "Conductă din țeavă multistrat PEX-Al-PEX Ø20, cu fitinguri de presare",
    unit: "m",
    includes:
      "Tăierea și calibrarea țevii, presarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPexAl20(1.03),
      fitingPresare20(0.4),
      clema(1),
      instalator(0.28),
      necalificat(0.05),
      presaFitinguri(0.05),
    ],
  },
  {
    code: "DV-SAN-13",
    category,
    title:
      "Conductă din PEX Ø16 în tub de protecție, pozată în șapă, de la distribuitor la consumator",
    unit: "m",
    includes:
      "Derularea și fixarea țevii în tubul ei pe traseu, fără îmbinări în șapă, și proba de presiune înainte de turnarea șapei.",
    excludes: "Distribuitorul și racordurile de la capete (DV-SAN-14).",
    measurement: "Lungimea conductei.",
    resources: [tevaPexTub(1.05), instalator(0.12), necalificat(0.05)],
  },
  {
    code: "DV-SAN-14",
    category,
    title:
      "Distribuitor sanitar din alamă cu 4 circuite, montat în cutie îngropată, cu robineți",
    unit: "buc",
    includes:
      "Fixarea cutiei în zidărie, montarea distribuitorului cu robineții de închidere, racordarea circuitelor la distribuitor și coturile de perete de la consumatori, proba.",
    excludes: "Conductele de alimentare și circuitele.",
    measurement: "Numărul de distribuitoare.",
    resources: [
      distribuitor(1),
      cutieDistribuitor(1),
      robinetSferic(2),
      racordPex16(4),
      cotPeretePex16(4),
      instalator(1.5),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-SAN-15",
    category,
    title: "Conductă din țeavă de cupru Ø15–22, cu fitinguri lipite",
    unit: "m",
    includes:
      "Tăierea și debavurarea țevii, lipirea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCupru(1.03),
      fitingCupru(0.6),
      clema(1),
      smallMaterials(3),
      instalator(0.4),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-SAN-16",
    category,
    title:
      "Branșament de apă din țeavă PEHD Ø32, pozat în șanț, cu fitinguri de compresiune",
    unit: "m",
    includes:
      "Derularea țevii pe patul de nisip, fitingurile de compresiune la capete, banda de avertizare și proba de presiune.",
    excludes: "Săpătura, patul de nisip și umplutura; căminul de apometru.",
    measurement: "Lungimea conductei.",
    resources: [
      tevaPehd32(1.03),
      fitingPehd32(0.1),
      bandaAvertizare(1),
      instalator(0.15),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-SAN-17",
    category,
    title:
      "Conductă exterioară de apă din țeavă PEHD Ø63, cu fitinguri de electrofuziune, pozată în șanț",
    unit: "m",
    includes:
      "Așezarea țevii pe patul de nisip, sudarea fitingurilor prin electrofuziune, banda de avertizare și proba de presiune.",
    excludes: "Săpătura, patul de nisip și umplutura; căminele.",
    measurement: "Lungimea conductei.",
    resources: [
      tevaPehd63(1.03),
      fitingPehd63(0.1),
      bandaAvertizare(1),
      instalator(0.2),
      necalificat(0.12),
      suduraPe(0.05),
    ],
  },
  {
    code: "DV-SAN-18",
    category,
    title: "Conductă de canalizare din PP Ø40, în interior",
    unit: "m",
    includes:
      "Montarea țevilor și a fitingurilor cu mufe și garnituri, fixarea cu brățări și verificarea etanșeității.",
    excludes: "Șlițurile și astuparea lor.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCanal40(1.02),
      fitingCanal40(0.6),
      bratara(0.8),
      instalator(0.28),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-SAN-19",
    category,
    title: "Conductă de canalizare din PP Ø75, în interior",
    unit: "m",
    includes:
      "Montarea țevilor și a fitingurilor cu mufe și garnituri, fixarea cu brățări și verificarea etanșeității.",
    excludes: "Șlițurile și astuparea lor.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCanal75(1.02),
      fitingCanal75(0.5),
      bratara(0.8),
      instalator(0.32),
      necalificat(0.12),
    ],
  },
  {
    code: "DV-SAN-20",
    category,
    title:
      "Canalizare exterioară din țeavă PVC-KG Ø110, pozată în șanț la pantă",
    unit: "m",
    includes:
      "Așezarea țevilor pe patul de nisip la panta cerută, îmbinarea cu mufe și garnituri, fitingurile și proba de etanșeitate.",
    excludes: "Săpătura, patul de nisip și umplutura; căminele.",
    measurement: "Lungimea conductei, în axul ei.",
    resources: [
      tevaKg110(1.03),
      fitingKg110(0.15),
      instalator(0.2),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-SAN-21",
    category,
    title:
      "Canalizare exterioară din țeavă PVC-KG Ø160, pozată în șanț la pantă",
    unit: "m",
    includes:
      "Așezarea țevilor pe patul de nisip la panta cerută, îmbinarea cu mufe și garnituri, fitingurile și proba de etanșeitate.",
    excludes: "Săpătura, patul de nisip și umplutura; căminele.",
    measurement: "Lungimea conductei, în axul ei.",
    resources: [
      tevaKg160(1.03),
      fitingKg160(0.12),
      instalator(0.25),
      necalificat(0.25),
    ],
  },
  {
    code: "DV-SAN-22",
    category,
    title:
      "Canalizare exterioară din țeavă PVC-KG Ø200, pozată în șanț la pantă",
    unit: "m",
    includes:
      "Așezarea țevilor pe patul de nisip la panta cerută, îmbinarea cu mufe și garnituri, fitingurile și proba de etanșeitate.",
    excludes: "Săpătura, patul de nisip și umplutura; căminele.",
    measurement: "Lungimea conductei, în axul ei.",
    resources: [
      tevaKg200(1.03),
      fitingKg200(0.1),
      instalator(0.3),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-SAN-23",
    category,
    title: "Cămin de canalizare din PVC Ø400, cu capac, montat pe pat de beton",
    unit: "buc",
    includes:
      "Așezarea bazei pe pat de beton, racordarea țevilor, montarea coloanei tăiate la cotă și a capacului.",
    excludes: "Săpătura și umplutura; țevile.",
    measurement: "Numărul de cămine.",
    resources: [caminPvc(1), betonC16(0.1), instalator(1.5), necalificat(1.5)],
  },
  {
    code: "DV-SAN-24",
    category,
    title:
      "Cămin de vizitare din elemente de beton Ø1000, cu capac carosabil, montat cu macaraua",
    unit: "buc",
    includes:
      "Radierul de beton, așezarea elementelor cu macaraua și etanșarea rosturilor, racordarea țevilor, rama și capacul la cotă.",
    excludes: "Săpătura și umplutura; țevile.",
    measurement: "Numărul de cămine, de până la 2 m adâncime.",
    resources: [
      caminBeton(1),
      betonC16(0.2),
      mortarZidarie(0.02),
      instalator(2),
      necalificat(4),
      automacara(0.6),
    ],
  },
  {
    code: "DV-SAN-25",
    category,
    title:
      "Fosă septică din polietilenă de 3 mc, montată în săpătură pe placă de beton, cu umplutură de nisip",
    unit: "buc",
    includes:
      "Placa de beton de la bază, coborârea fosei cu macaraua, ancorarea, racordarea conductelor, umplerea cu apă și umplutura de nisip în jurul ei.",
    excludes: "Săpătura; câmpul de drenaj sau puțul absorbant.",
    measurement: "Numărul de fose.",
    resources: [
      fosa(1),
      betonC16(0.6),
      nisip(3.5),
      instalator(4),
      necalificat(8),
      automacara(0.5),
    ],
  },
  {
    code: "DV-SAN-26",
    category,
    title:
      "Ministație de epurare pentru 6 persoane, montată în săpătură, cu racorduri și punere în funcțiune",
    unit: "buc",
    includes:
      "Placa de beton de la bază, coborârea stației, ancorarea, racordarea conductelor și a suflantei la tablou, umplutura de nisip și punerea în funcțiune.",
    excludes:
      "Săpătura; evacuarea apei epurate; circuitul electric până la stație.",
    measurement: "Numărul de stații.",
    resources: [
      statieEpurare(1),
      betonC16(0.8),
      nisip(4.5),
      instalator(8),
      electrician(2),
      necalificat(10),
      automacara(0.6),
    ],
  },
  {
    code: "DV-SAN-27",
    category,
    title: "Separator de grăsimi de 2 l/s, îngropat, cu racorduri",
    unit: "buc",
    includes:
      "Patul de beton, așezarea separatorului, racordarea la canalizare, prelungitorul și capacul la cotă.",
    excludes: "Săpătura și umplutura.",
    measurement: "Numărul de separatoare.",
    resources: [
      separatorGrasimi(1),
      betonC16(0.3),
      instalator(4),
      necalificat(4),
    ],
  },
  {
    code: "DV-SAN-28",
    category,
    title: "Cămin de apometru din PE, cu apometru, robineți și filtru, montat",
    unit: "buc",
    includes:
      "Așezarea căminului în săpătură, montarea apometrului cu robineții și filtrul, racordarea branșamentului și a conductei spre casă, capacul la cotă.",
    excludes: "Săpătura și umplutura; branșamentul.",
    measurement: "Numărul de cămine.",
    resources: [
      caminApometru(1),
      apometru(1),
      robinetSferic(2),
      filtru(1),
      instalator(3),
      necalificat(2),
    ],
  },
  {
    code: "DV-SAN-29",
    category,
    title: "Grup de pompare cu hidrofor de 50 l, montat și pus în funcțiune",
    unit: "buc",
    includes:
      "Așezarea grupului, racordarea la aspirație și refulare cu robineți și racorduri flexibile, legarea la priză, reglarea presostatului.",
    excludes: "Conductele până la grup; priza electrică.",
    measurement: "Numărul de grupuri.",
    resources: [
      hidrofor(1),
      robinetSferic1(2),
      racordInox(2),
      instalator(3),
      electrician(1),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-30",
    category,
    title:
      "Pompă submersibilă în puț forat, cu coloană din PEHD Ø32, cablu și cap de puț, până la 30 m",
    unit: "buc",
    includes:
      "Asamblarea pompei cu coloana, cablul electric și cablul de siguranță, coborârea în puț, capul de puț și legarea la tablou, proba.",
    excludes: "Forajul; tabloul de automatizare și hidroforul.",
    measurement: "Numărul de pompe.",
    resources: [
      pompaSubmersibila(1),
      tevaPehd32(32),
      cabluSubmersibil(35),
      cabluSiguranta(32),
      capPut(1),
      fitingPehd32(2),
      smallMaterials(3),
      instalator(6),
      electrician(2),
      necalificat(3),
    ],
  },
  {
    code: "DV-SAN-31",
    category,
    title:
      "Reductor de presiune cu filtru și robinet, la intrarea apei în locuință",
    unit: "buc",
    includes:
      "Montarea robinetului, a filtrului și a reductorului pe conductă, reglarea presiunii și proba.",
    measurement: "Numărul de reductoare.",
    resources: [reductor(1), filtru(1), robinetSferic(1), instalator(1.2)],
  },
  {
    code: "DV-SAN-32",
    category,
    title: "Clapetă antiretur de canalizare Ø110, montată pe conductă",
    unit: "buc",
    includes:
      "Tăierea conductei, montarea clapetei cu acces pentru curățare și verificarea sensului de curgere.",
    measurement: "Numărul de clapete.",
    resources: [clapeta(1), instalator(1.5), necalificat(0.5)],
  },
  {
    code: "DV-SAN-33",
    category,
    title: "Sifon de pardoseală cu grătar inox, montat și racordat",
    unit: "buc",
    includes:
      "Așezarea sifonului la cota pardoselii, racordarea la canalizare și etanșarea cu hidroizolația.",
    excludes: "Hidroizolația și placajul din jur.",
    measurement: "Numărul de sifoane.",
    resources: [
      sifonPardoseala(1),
      tevaCanal50(0.5),
      instalator(1),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-SAN-34",
    category,
    title: "Rigolă de duș din inox de 80 cm, montată și racordată",
    unit: "buc",
    includes:
      "Așezarea rigolei la cotă pe picioare reglabile, racordarea sifonului la canalizare, înglobarea în șapă și proba de etanșeitate.",
    excludes: "Hidroizolația și placajul din jur.",
    measurement: "Numărul de rigole.",
    resources: [rigolaDus(1), instalator(2.5), necalificat(0.5)],
  },
  {
    code: "DV-SAN-35",
    category,
    title: "Ventil de aerisire pentru coloane de canalizare, montat",
    unit: "buc",
    includes: "Montarea ventilului la capătul coloanei, într-un loc accesibil.",
    measurement: "Numărul de ventile.",
    resources: [aerisitor(1), instalator(0.4)],
  },
  {
    code: "DV-SAN-36",
    category,
    title: "Piesă de curățire Ø110 pe coloana de canalizare, montată",
    unit: "buc",
    includes: "Intercalarea piesei pe coloană și verificarea accesului la ea.",
    measurement: "Numărul de piese.",
    resources: [piesaCuratire(1), instalator(0.5)],
  },
  {
    code: "DV-SAN-37",
    category,
    title:
      "Izolarea conductelor de apă de până la Ø25 cu tuburi din spumă de polietilenă de 9 mm",
    unit: "m",
    includes:
      "Îmbrăcarea conductei cu tubul despicat și lipirea rosturilor cu bandă.",
    measurement: "Lungimea conductei izolate.",
    resources: [izolatieTeava(1.05), bandaFolii(0.3), instalator(0.06)],
  },
  {
    code: "DV-SAN-38",
    category,
    title:
      "Izolarea conductelor de apă de Ø28–35 cu tuburi din spumă de polietilenă de 13 mm",
    unit: "m",
    includes:
      "Îmbrăcarea conductei cu tubul despicat și lipirea rosturilor cu bandă.",
    measurement: "Lungimea conductei izolate.",
    resources: [izolatieTeava13(1.05), bandaFolii(0.3), instalator(0.07)],
  },
  {
    code: "DV-SAN-39",
    category,
    title:
      "Spălarea și dezinfectarea instalației de apă a unei locuințe, înainte de punerea în funcțiune",
    unit: "buc",
    includes:
      "Umplerea și aerisirea instalației, spălarea și dezinfectarea conductelor, golirea și procesul-verbal.",
    excludes: "Proba de presiune, cuprinsă în normele conductelor.",
    measurement:
      "Numărul de instalații spălate și dezinfectate, pentru o locuință sau un apartament.",
    resources: [dezinfectant(0.5), instalator(2)],
  },
  {
    code: "DV-SAN-40",
    category,
    title:
      "Protecția la îngheț a conductelor exterioare cu cablu de degivrare autoreglabil, sub izolație",
    unit: "m",
    includes:
      "Fixarea cablului pe conductă cu bandă de aluminiu, legarea la termostat și verificarea.",
    excludes:
      "Izolația conductei; termostatul și kiturile de conectare și de capăt ale cablului; circuitul electric până la cablu.",
    measurement: "Lungimea conductei protejate.",
    resources: [
      cabluDegivrare(1.05),
      bandaAluminiu(2),
      instalator(0.1),
      electrician(0.1),
    ],
  },
];

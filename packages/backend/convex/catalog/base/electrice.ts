import type { BaseNorm } from "./norm";
import {
  aparatSudura,
  bandaAvertizare,
  betonC16,
  cablu15,
  cablu25,
  canalCablu,
  corpIluminat,
  dibluCui,
  dibluMetalic,
  diferential,
  dozaAparat,
  dozaDerivatie,
  electrician,
  electrozi,
  ipsos,
  masinaSlituit,
  material,
  necalificat,
  nisip,
  priza,
  sigurantaAutomata,
  smallMaterials,
  tablou,
  tubFlexibil,
} from "./resources";

const category = "Instalații electrice";

// Circuite, aparataj, iluminat, tablouri, legarea la pământ și paratrăsnet,
// fotovoltaice, stații de încărcare și degivrare. Curenții slabi (date,
// interfon, alarmă, camere) sunt în curentiSlabi.ts.

const tubFlexibil25 = material("Tub flexibil de protecție Ø25", "m", 1.6);
const tubFlexibil32 = material("Tub flexibil de protecție Ø32", "m", 2.2);
const tubRigid = material("Tub rigid din PVC Ø20, cu accesorii", "m", 3.5);
const tubRigid32 = material("Tub rigid din PVC Ø32, cu accesorii", "m", 5.5);
const tubRigid50 = material("Tub rigid din PVC Ø50, cu accesorii", "m", 10);
const cablu4 = material("Cablu CYY-F 3 × 4 mm²", "m", 9.5);
const cablu6 = material("Cablu CYY-F 3 × 6 mm²", "m", 14);
const cablu10 = material("Cablu CYY-F 3 × 10 mm²", "m", 24);
const cablu5x25 = material("Cablu CYY-F 5 × 2,5 mm²", "m", 10);
const cablu5x6 = material("Cablu CYY-F 5 × 6 mm²", "m", 22);
const cablu5x16 = material("Cablu CYY-F 5 × 16 mm²", "m", 55);
const cabluArmat = material("Cablu armat CYAbY-F 5 × 10 mm²", "m", 42);
const dozaAparenta = material("Doză aparentă IP55", "buc", 6);
const dozaDubla = material("Doză dublă pentru aparataj", "buc", 3);
const canalCabluMare = material(
  "Canal de cablu din PVC, 100 × 50 mm, cu accesorii",
  "m",
  22,
);
const patCablu = material(
  "Pat de cablu din tablă zincată perforată, 200 × 60 mm, cu accesorii",
  "m",
  48,
);
const colierCablu = material("Colier de cablu", "buc", 0.1);
const prizaDubla = material("Priză dublă cu ramă", "buc", 32);
const prizaExterior = material("Priză etanșă IP44, aparentă", "buc", 35);
const prizaTrifazata = material("Priză trifazată 5 × 16 A", "buc", 65);
const variator = material("Variator de intensitate (dimmer)", "buc", 120);
const senzorMiscare = material(
  "Senzor de mișcare PIR pentru iluminat",
  "buc",
  75,
);
const spotLed = material("Spot LED încastrat, 7 W", "buc", 45);
const bandaLed = material(
  "Bandă LED 12 V, 9,6 W/m, în profil din aluminiu cu difuzor",
  "m",
  45,
);
const sursaLed = material("Sursă de alimentare 12 V, 60 W", "buc", 120);
const aplicaExterior = material(
  "Aplică exterioară LED cu senzor, IP44",
  "buc",
  180,
);
const proiectorLed = material("Proiector LED exterior, 50 W", "buc", 160);
const stalpIluminat = material(
  "Stâlp de iluminat din aluminiu, 3 m, cu lampă LED",
  "set",
  1800,
);
const lampaUrgenta = material(
  "Lampă de siguranță pentru evacuare, LED, autonomie 3 h",
  "buc",
  150,
);
const tablou24 = material("Tablou electric cu 24 de module", "buc", 160);
const tablou36 = material(
  "Tablou electric cu 36 de module, îngropat",
  "buc",
  260,
);
const tablouExterior = material(
  "Tablou electric de exterior IP65 cu 12 module",
  "buc",
  220,
);
const rcbo = material(
  "Întrerupător diferențial cu protecție la suprasarcină (RCBO)",
  "buc",
  180,
);
const rcboTrifazat = material(
  "Întrerupător diferențial cu protecție la suprasarcină, tetrapolar",
  "buc",
  320,
);
const descarcator = material("Descărcător de supratensiune tip 2", "buc", 450);
const contactor = material("Contactor modular 25 A", "buc", 120);
const electrod = material(
  "Electrod de împământare din oțel zincat, 1,5 m",
  "buc",
  65,
);
const platbanda = material("Platbandă din oțel zincat 40 × 4 mm", "m", 14);
const piesaSeparatie = material(
  "Piesă de separație pentru priza de pământ",
  "buc",
  45,
);
const conductorCupru = material("Conductor de cupru flexibil 16 mm²", "m", 18);
const baraEgalizare = material("Bară de egalizare a potențialelor", "buc", 85);
const tijaCaptare = material(
  "Tijă de captare pentru paratrăsnet, 3 m, cu suport",
  "set",
  950,
);
const conductorAluminiu = material(
  "Conductor rotund din aluminiu Ø8 pentru paratrăsnet",
  "m",
  9,
);
const suportCoborare = material(
  "Suport de fixare pentru conductorul de coborâre",
  "buc",
  8,
);
const cutieVerificare = material(
  "Cutie de verificare pentru coborârea paratrăsnetului",
  "buc",
  110,
);
const panouFv = material("Panou fotovoltaic monocristalin, 450 Wp", "buc", 650);
const structuraFv = material(
  "Structură din aluminiu pentru un panou, pe acoperiș înclinat",
  "set",
  180,
);
const cabluSolar = material("Cablu solar 6 mm²", "m", 5);
const conectorMc4 = material("Conector MC4", "pereche", 12);
const invertorHibrid = material("Invertor hibrid trifazat, 10 kW", "buc", 9500);
const invertorMono = material("Invertor monofazat, 5 kW", "buc", 5500);
const tablouFv = material(
  "Tablou de protecție DC și AC pentru fotovoltaice",
  "buc",
  950,
);
const baterie = material("Baterie LiFePO4 de 5 kWh", "buc", 4500);
const cabluBaterie = material(
  "Cablu de baterie 25 mm² cu papuci, set",
  "set",
  180,
);
const statieEv = material(
  "Stație de încărcare pentru vehicule electrice, 7,4 kW, monofazată",
  "buc",
  3800,
);
const statieEv11 = material(
  "Stație de încărcare pentru vehicule electrice, 11 kW, trifazată",
  "buc",
  4500,
);
const cabluDegivrare = material(
  "Cablu de degivrare autoreglabil, 30 W/m",
  "m",
  65,
);
const clemaDegivrare = material(
  "Clemă de fixare pentru cablul de degivrare",
  "buc",
  3,
);
const termostatDegivrare = material(
  "Termostat cu senzori de temperatură și umiditate pentru degivrare",
  "buc",
  950,
);

// A Ø32 tube needs a slot of about 5 × 5 cm, larger than DV-ELE-03's.
const slituriTub32 =
  "Șlițurile și astuparea lor (tubul Ø32 cere un șliț de circa 5 × 5 cm, mai mare decât cel din DV-ELE-03); aparatajul.";

function circuit(
  code: string,
  title: string,
  tub: ReturnType<typeof material>,
  cablu: ReturnType<typeof material>,
  ore: number,
  necalificatOre: number,
  excludes = "Șlițurile și astuparea lor (DV-ELE-03); aparatajul.",
): BaseNorm {
  return {
    code,
    category,
    title,
    unit: "m",
    includes:
      "Pozarea tubului în șliț sau pe traseu, tragerea cablului, legăturile în doze și verificarea circuitului.",
    excludes,
    measurement:
      "Lungimea circuitului, de la tablou până la ultimul consumator.",
    resources: [
      tub(1.05),
      cablu(1.05),
      dozaDerivatie(0.05),
      electrician(ore),
      necalificat(necalificatOre),
    ],
  };
}

export const electrice: BaseNorm[] = [
  {
    code: "DV-ELE-01",
    category,
    title:
      "Circuit electric de prize cu cablu CYY-F 3 × 2,5 mm² în tub flexibil, îngropat",
    unit: "m",
    includes:
      "Pozarea tubului în șliț, tragerea cablului, legăturile în doze și verificarea circuitului.",
    excludes: "Șlițurile și astuparea lor; prizele.",
    measurement: "Lungimea circuitului, de la tablou până la ultima priză.",
    resources: [
      tubFlexibil(1.05),
      cablu25(1.05),
      dozaDerivatie(0.1),
      electrician(0.15),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ELE-02",
    category,
    title:
      "Circuit electric de iluminat cu cablu CYY-F 3 × 1,5 mm² în tub flexibil, îngropat",
    unit: "m",
    includes:
      "Pozarea tubului în șliț, tragerea cablului, legăturile în doze și verificarea circuitului.",
    excludes:
      "Șlițurile și astuparea lor; întrerupătoarele și corpurile de iluminat.",
    measurement:
      "Lungimea circuitului, de la tablou până la ultimul punct de lumină.",
    resources: [
      tubFlexibil(1.05),
      cablu15(1.05),
      dozaDerivatie(0.1),
      electrician(0.13),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ELE-03",
    category,
    title: "Șlițuri în zidărie pentru tuburi și conducte, cu astuparea lor",
    unit: "m",
    includes:
      "Trasarea, tăierea și scobirea șliței de cel mult 3 × 3 cm, astuparea cu ipsos după montaj și strângerea resturilor.",
    measurement: "Lungimea șlițurilor.",
    resources: [ipsos(1), necalificat(0.25), masinaSlituit(0.08)],
  },
  {
    code: "DV-ELE-04",
    category,
    title: "Priză sau întrerupător îngropat, cu doză de aparat",
    unit: "buc",
    includes: "Fixarea dozei, conectarea și montarea aparatului cu rama lui.",
    measurement: "Numărul de aparate.",
    resources: [dozaAparat(1), priza(1), electrician(0.35)],
  },
  {
    code: "DV-ELE-05",
    category,
    title: "Corp de iluminat LED aplicat, cu montaj",
    unit: "buc",
    includes:
      "Fixarea corpului de iluminat, conectarea lui și proba de funcționare.",
    measurement: "Numărul de corpuri de iluminat.",
    resources: [corpIluminat(1), dibluCui(2), electrician(0.6)],
  },
  {
    code: "DV-ELE-06",
    category,
    title: "Tablou electric de apartament cu 12 module, echipat și montat",
    unit: "buc",
    includes:
      "Fixarea tabloului, montarea aparatelor pe șină, conectarea și etichetarea circuitelor, verificarea funcționării.",
    excludes:
      "Branșamentul și coloana de alimentare; măsurătorile prizei de pământ.",
    measurement: "Numărul de tablouri.",
    resources: [
      tablou(1),
      sigurantaAutomata(8),
      diferential(1),
      smallMaterials(5),
      electrician(4),
    ],
  },
  circuit(
    "DV-ELE-07",
    "Circuit electric dedicat cu cablu CYY-F 3 × 4 mm² în tub flexibil, îngropat",
    tubFlexibil,
    cablu4,
    0.17,
    0.05,
  ),
  circuit(
    "DV-ELE-08",
    "Circuit electric dedicat cu cablu CYY-F 3 × 6 mm² în tub flexibil Ø25, îngropat",
    tubFlexibil25,
    cablu6,
    0.2,
    0.06,
  ),
  circuit(
    "DV-ELE-09",
    "Circuit electric cu cablu CYY-F 3 × 10 mm² în tub flexibil Ø32, îngropat",
    tubFlexibil32,
    cablu10,
    0.25,
    0.08,
    slituriTub32,
  ),
  circuit(
    "DV-ELE-10",
    "Circuit trifazat cu cablu CYY-F 5 × 2,5 mm² în tub flexibil Ø25, îngropat",
    tubFlexibil25,
    cablu5x25,
    0.2,
    0.06,
  ),
  circuit(
    "DV-ELE-11",
    "Circuit trifazat cu cablu CYY-F 5 × 6 mm² în tub flexibil Ø32, îngropat",
    tubFlexibil32,
    cablu5x6,
    0.25,
    0.08,
    slituriTub32,
  ),
  {
    code: "DV-ELE-12",
    category,
    title:
      "Coloană de alimentare cu cablu CYY-F 5 × 16 mm² în tub rigid Ø50, de la blocul de măsură la tablou",
    unit: "m",
    includes:
      "Pozarea tubului rigid cu accesorii, tragerea cablului, legarea la blocul de măsură și la tablou și verificarea.",
    excludes: "Blocul de măsură și protecție, montat de distribuitor.",
    measurement: "Lungimea coloanei.",
    resources: [
      tubRigid50(1.05),
      cablu5x16(1.05),
      dibluCui(2),
      electrician(0.35),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-ELE-13",
    category,
    title:
      "Cablu armat CYAbY-F 5 × 10 mm² îngropat în șanț, cu pat de nisip și bandă",
    unit: "m",
    includes:
      "Pozarea cablului pe pat de nisip, acoperirea cu nisip, banda de avertizare și verificarea izolației.",
    excludes:
      "Săpătura și umplutura (categoria Terasamente) și tuburile de protecție la treceri.",
    measurement: "Lungimea cablului pozat.",
    resources: [
      cabluArmat(1.05),
      nisip(0.06),
      bandaAvertizare(1),
      electrician(0.2),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-ELE-14",
    category,
    title:
      "Circuit aparent în tub rigid din PVC Ø20, cu cablu CYY-F 3 × 2,5 mm²",
    unit: "m",
    includes:
      "Fixarea tubului cu cleme și accesorii, tragerea cablului, dozele aparente și legăturile.",
    excludes: "Aparatajul.",
    measurement: "Lungimea circuitului.",
    resources: [
      tubRigid(1.05),
      cablu25(1.05),
      dozaAparenta(0.1),
      dibluCui(2),
      electrician(0.25),
    ],
  },
  {
    code: "DV-ELE-15",
    category,
    title:
      "Circuit în canal de cablu din PVC 40 × 25 mm, cu cablu CYY-F 3 × 2,5 mm²",
    unit: "m",
    includes:
      "Fixarea canalului pe perete, pozarea cablului, închiderea capacului și legăturile.",
    excludes: "Aparatajul.",
    measurement: "Lungimea circuitului.",
    resources: [canalCablu(1.05), cablu25(1.05), dibluCui(2), electrician(0.2)],
  },
  {
    code: "DV-ELE-16",
    category,
    title: "Canal de cablu din PVC 100 × 50 mm cu accesorii, fără cabluri",
    unit: "m",
    includes:
      "Trasarea, fixarea canalului și a accesoriilor (colțuri, capete), pregătirea pentru cabluri.",
    measurement: "Lungimea canalului.",
    resources: [canalCabluMare(1.05), dibluCui(3), electrician(0.2)],
  },
  {
    code: "DV-ELE-17",
    category,
    title: "Pat de cablu din tablă zincată perforată 200 × 60 mm, suspendat",
    unit: "m",
    includes:
      "Montarea consolelor sau a tijelor cu ancore, a patului de cablu cu îmbinări și accesorii, legarea la pământ a tronsoanelor.",
    measurement: "Lungimea patului de cablu.",
    resources: [
      patCablu(1.05),
      dibluMetalic(1.4),
      smallMaterials(5),
      electrician(0.4),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-ELE-18",
    category,
    title: "Pozarea cablurilor pe pat de cablu, până la 5 × 10 mm²",
    unit: "m",
    includes:
      "Derularea, așezarea și fixarea cablului pe pat cu coliere, etichetarea la capete.",
    excludes: "Cablul.",
    measurement: "Lungimea fiecărui cablu pozat.",
    resources: [colierCablu(2), electrician(0.06)],
  },
  {
    code: "DV-ELE-19",
    category,
    title: "Punct de priză complet: circuit mediu de 8 m, doză și priză",
    unit: "buc",
    includes:
      "Circuitul în tub flexibil cu cablu 3 × 2,5 mm² pe o lungime medie de 8 m, doza de derivație aferentă, doza de aparat, priza și verificarea.",
    excludes: "Șlițurile (DV-ELE-03) și tabloul.",
    measurement:
      "Numărul de prize; pentru trasee lungi se folosește DV-ELE-01.",
    resources: [
      tubFlexibil(8),
      cablu25(8.4),
      dozaDerivatie(0.3),
      dozaAparat(1),
      priza(1),
      electrician(1.5),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-ELE-20",
    category,
    title:
      "Punct de lumină complet: circuit mediu de 10 m, întrerupător și doze",
    unit: "buc",
    includes:
      "Circuitul în tub flexibil cu cablu 3 × 1,5 mm² pe o lungime medie de 10 m, doza de derivație, doza de aparat, întrerupătorul și verificarea.",
    excludes: "Șlițurile (DV-ELE-03), corpul de iluminat și tabloul.",
    measurement:
      "Numărul de puncte de lumină; pentru trasee lungi se folosește DV-ELE-02.",
    resources: [
      tubFlexibil(10),
      cablu15(10.5),
      dozaDerivatie(0.5),
      dozaAparat(1),
      priza(1),
      electrician(1.6),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-ELE-21",
    category,
    title: "Priză dublă îngropată, cu doză dublă",
    unit: "buc",
    includes: "Fixarea dozei duble, conectarea și montarea prizei cu rama ei.",
    measurement: "Numărul de prize duble.",
    resources: [dozaDubla(1), prizaDubla(1), electrician(0.45)],
  },
  {
    code: "DV-ELE-22",
    category,
    title: "Priză etanșă IP44 aparentă, pentru exterior sau spații umede",
    unit: "buc",
    includes: "Fixarea pe perete, conectarea cu presetupă și proba.",
    measurement: "Numărul de prize.",
    resources: [prizaExterior(1), dibluCui(2), electrician(0.5)],
  },
  {
    code: "DV-ELE-23",
    category,
    title: "Priză trifazată 5 × 16 A, aparentă",
    unit: "buc",
    includes: "Fixarea, conectarea celor cinci conductoare și proba de fază.",
    measurement: "Numărul de prize.",
    resources: [prizaTrifazata(1), dibluCui(2), electrician(0.7)],
  },
  {
    code: "DV-ELE-24",
    category,
    title: "Variator de intensitate (dimmer) îngropat, cu doză",
    unit: "buc",
    includes: "Fixarea dozei, conectarea variatorului, montarea și reglarea.",
    measurement: "Numărul de variatoare.",
    resources: [variator(1), dozaAparat(1), electrician(0.5)],
  },
  {
    code: "DV-ELE-25",
    category,
    title: "Senzor de mișcare pentru iluminat, cu montaj și reglare",
    unit: "buc",
    includes:
      "Fixarea senzorului, conectarea pe circuitul de iluminat, reglarea sensibilității și a timpului.",
    measurement: "Numărul de senzori.",
    resources: [senzorMiscare(1), dibluCui(2), electrician(0.7)],
  },
  {
    code: "DV-ELE-26",
    category,
    title: "Spot LED încastrat în tavan de gips-carton, cu decupare",
    unit: "buc",
    includes:
      "Decuparea tavanului, tragerea cablului de la doză, conectarea cu cleme și montarea spotului.",
    measurement: "Numărul de spoturi.",
    resources: [spotLed(1), cablu15(1.5), smallMaterials(3), electrician(0.4)],
  },
  {
    code: "DV-ELE-27",
    category,
    title:
      "Bandă LED în profil din aluminiu cu difuzor, cu sursă de alimentare",
    unit: "m",
    includes:
      "Fixarea profilului, lipirea benzii, montarea difuzorului, legarea la sursa de 12 V și proba.",
    measurement: "Lungimea benzii montate.",
    resources: [
      bandaLed(1.05),
      sursaLed(0.2),
      smallMaterials(2),
      electrician(0.35),
    ],
  },
  {
    code: "DV-ELE-28",
    category,
    title: "Aplică exterioară LED cu senzor, IP44, cu montaj",
    unit: "buc",
    includes: "Fixarea pe perete, conectarea etanșă și reglarea senzorului.",
    measurement: "Numărul de aplice.",
    resources: [aplicaExterior(1), dibluCui(2), electrician(0.7)],
  },
  {
    code: "DV-ELE-29",
    category,
    title: "Proiector LED exterior de 50 W, cu montaj pe perete sau stâlp",
    unit: "buc",
    includes: "Fixarea suportului, orientarea, conectarea etanșă și proba.",
    measurement: "Numărul de proiectoare.",
    resources: [proiectorLed(1), dibluMetalic(2), electrician(1)],
  },
  {
    code: "DV-ELE-30",
    category,
    title: "Stâlp de iluminat din aluminiu de 3 m cu lampă LED, pe fundație",
    unit: "buc",
    includes:
      "Turnarea fundației cu șuruburile de ancorare, ridicarea stâlpului, montarea lămpii, conectarea cablului și proba.",
    excludes:
      "Săpătura (categoria Terasamente) și cablul de alimentare îngropat (DV-ELE-13, cu secțiunea cablului adaptată).",
    measurement: "Numărul de stâlpi.",
    resources: [
      stalpIluminat(1),
      betonC16(0.15),
      smallMaterials(3),
      electrician(2),
      necalificat(2.5),
    ],
  },
  {
    code: "DV-ELE-31",
    category,
    title: "Lampă de siguranță pentru evacuare, LED, cu montaj",
    unit: "buc",
    includes:
      "Fixarea lămpii, conectarea pe circuitul permanent, pictograma și proba.",
    measurement: "Numărul de lămpi.",
    resources: [lampaUrgenta(1), dibluCui(2), electrician(0.7)],
  },
  {
    code: "DV-ELE-32",
    category,
    title: "Tablou electric cu 24 de module, echipat cu descărcător și montat",
    unit: "buc",
    includes:
      "Fixarea tabloului, montarea siguranțelor, a diferențialelor și a descărcătorului, conectarea și etichetarea circuitelor, verificarea.",
    excludes: "Coloana de alimentare (DV-ELE-12).",
    measurement: "Numărul de tablouri.",
    resources: [
      tablou24(1),
      sigurantaAutomata(14),
      diferential(2),
      descarcator(1),
      smallMaterials(5),
      electrician(7),
    ],
  },
  {
    code: "DV-ELE-33",
    category,
    title: "Tablou electric îngropat cu 36 de module, echipat și montat",
    unit: "buc",
    includes:
      "Spargerea nișei și fixarea tabloului în perete, montarea siguranțelor, a diferențialelor, a RCBO-urilor, a descărcătorului și a contactorului, conectarea și etichetarea, verificarea.",
    excludes:
      "Coloana de alimentare (DV-ELE-12) și finisajul în jurul tabloului.",
    measurement: "Numărul de tablouri.",
    resources: [
      tablou36(1),
      sigurantaAutomata(20),
      diferential(3),
      rcbo(2),
      descarcator(1),
      contactor(1),
      ipsos(3),
      smallMaterials(5),
      electrician(10),
      necalificat(1),
    ],
  },
  {
    code: "DV-ELE-34",
    category,
    title: "Tablou electric de exterior IP65 cu 12 module, echipat și montat",
    unit: "buc",
    includes:
      "Fixarea tabloului, montarea siguranțelor și a diferențialului, presetupele, conectarea și etichetarea, verificarea.",
    measurement: "Numărul de tablouri.",
    resources: [
      tablouExterior(1),
      sigurantaAutomata(6),
      diferential(1),
      smallMaterials(5),
      electrician(4),
    ],
  },
  {
    code: "DV-ELE-35",
    category,
    title: "Descărcător de supratensiune tip 2, montat în tablou existent",
    unit: "buc",
    includes:
      "Montarea pe șină, legarea la fază, nul și bara de pământ cu conductoare scurte, verificarea.",
    measurement: "Numărul de descărcătoare.",
    resources: [descarcator(1), smallMaterials(3), electrician(1)],
  },
  {
    code: "DV-ELE-36",
    category,
    title:
      "Siguranță automată montată în tablou existent, cu legarea circuitului",
    unit: "buc",
    includes:
      "Montarea pe șină, legarea circuitului nou la siguranță și la barele de nul și pământ, etichetarea.",
    measurement: "Numărul de siguranțe.",
    resources: [sigurantaAutomata(1), smallMaterials(2), electrician(0.5)],
  },
  {
    code: "DV-ELE-37",
    category,
    title: "Priză de pământ cu 3 electrozi și platbandă, cu piesă de separație",
    unit: "set",
    includes:
      "Baterea electrozilor, sudarea platbandei de electrozi, piesa de separație și măsurarea rezistenței de dispersie.",
    excludes:
      "Săpătura și umplutura șanțului (DV-TER-11, DV-TER-03); tratarea solului cu bentonită, dacă rezistența o cere.",
    measurement: "Numărul de prize de pământ.",
    resources: [
      electrod(3),
      platbanda(12),
      piesaSeparatie(1),
      electrozi(0.3),
      electrician(4),
      necalificat(4),
      aparatSudura(1),
    ],
  },
  {
    code: "DV-ELE-38",
    category,
    title:
      "Bară de egalizare a potențialelor, cu legături la conducte și armături",
    unit: "set",
    includes:
      "Montarea barei, legăturile cu conductor de cupru la conductele metalice, la cadă și la armăturile pardoselii, cu cleme, și legarea la priza de pământ.",
    measurement: "Numărul de bare montate.",
    resources: [
      baraEgalizare(1),
      conductorCupru(15),
      smallMaterials(3),
      electrician(3),
    ],
  },
  {
    code: "DV-ELE-39",
    category,
    title:
      "Instalație de paratrăsnet cu tijă de captare și două coborâri, pentru o casă",
    unit: "set",
    includes:
      "Montarea tijei de captare cu suport pe coamă sau pe coș, conductoarele de coborâre fixate pe suporți, cutiile de verificare și legarea la priza de pământ.",
    excludes: "Priza de pământ (DV-ELE-37) și schela sau platforma.",
    measurement: "Numărul de instalații.",
    resources: [
      tijaCaptare(1),
      conductorAluminiu(40),
      suportCoborare(40),
      cutieVerificare(2),
      smallMaterials(3),
      electrician(12),
      necalificat(6),
    ],
  },
  {
    code: "DV-ELE-40",
    category,
    title:
      "Panou fotovoltaic de 450 Wp pe acoperiș înclinat, cu structură și cablare în șir",
    unit: "buc",
    includes:
      "Montarea cârligelor și a șinelor structurii, așezarea și fixarea panoului, conectarea în șir cu conectori MC4 și pozarea cablului solar până la invertor.",
    excludes:
      "Invertorul și tabloul (DV-ELE-41, DV-ELE-42), schela sau liftul și dosarul de prosumator.",
    measurement: "Numărul de panouri montate.",
    resources: [
      panouFv(1),
      structuraFv(1),
      cabluSolar(4),
      conectorMc4(0.5),
      electrician(1.2),
      necalificat(0.8),
    ],
  },
  {
    code: "DV-ELE-41",
    category,
    title:
      "Invertor hibrid trifazat de 10 kW cu tablou de protecție DC și AC, montat și pus în funcțiune",
    unit: "buc",
    includes:
      "Fixarea invertorului și a tabloului, legarea șirurilor, a coloanei AC și a împământării, configurarea, punerea în funcțiune și monitorizarea.",
    excludes:
      "Panourile (DV-ELE-40), bateria (DV-ELE-43) și dosarul de prosumator.",
    measurement: "Numărul de invertoare.",
    resources: [
      invertorHibrid(1),
      tablouFv(1),
      cablu5x6(10),
      tubRigid32(10),
      dibluMetalic(4),
      smallMaterials(3),
      electrician(10),
      necalificat(1),
    ],
  },
  {
    code: "DV-ELE-42",
    category,
    title:
      "Invertor monofazat de 5 kW cu tablou de protecție DC și AC, montat și pus în funcțiune",
    unit: "buc",
    includes:
      "Fixarea invertorului și a tabloului, legarea șirurilor, a coloanei AC și a împământării, configurarea, punerea în funcțiune și monitorizarea.",
    excludes: "Panourile (DV-ELE-40) și dosarul de prosumator.",
    measurement: "Numărul de invertoare.",
    resources: [
      invertorMono(1),
      tablouFv(1),
      cablu6(10),
      tubRigid32(10),
      dibluMetalic(4),
      smallMaterials(3),
      electrician(7),
      necalificat(1),
    ],
  },
  {
    code: "DV-ELE-43",
    category,
    title: "Baterie LiFePO4 de 5 kWh, conectată la invertor hibrid",
    unit: "buc",
    includes:
      "Așezarea sau fixarea bateriei, cablurile de putere și de comunicație către invertor, configurarea și proba de încărcare.",
    measurement: "Numărul de baterii.",
    resources: [baterie(1), cabluBaterie(1), smallMaterials(2), electrician(2)],
  },
  {
    code: "DV-ELE-44",
    category,
    title:
      "Stație de încărcare pentru vehicule electrice de 7,4 kW, cu circuit dedicat de până la 15 m și protecție",
    unit: "buc",
    includes:
      "Fixarea stației, circuitul 3 × 6 mm² în tub rigid pe o lungime de până la 15 m, RCBO-ul în tablou, configurarea și proba de încărcare.",
    excludes:
      "Lungimea circuitului peste 15 m (DV-ELE-08) și extinderea tabloului.",
    measurement: "Numărul de stații.",
    resources: [
      statieEv(1),
      cablu6(15),
      tubRigid32(15),
      rcbo(1),
      dibluMetalic(4),
      smallMaterials(3),
      electrician(6),
      necalificat(1),
    ],
  },
  {
    code: "DV-ELE-45",
    category,
    title:
      "Stație de încărcare pentru vehicule electrice de 11 kW trifazată, cu circuit dedicat de până la 15 m și protecție",
    unit: "buc",
    includes:
      "Fixarea stației, circuitul 5 × 6 mm² în tub rigid pe o lungime de până la 15 m, protecția diferențială tetrapolară în tablou, configurarea și proba.",
    excludes:
      "Lungimea circuitului peste 15 m (DV-ELE-11) și extinderea tabloului.",
    measurement: "Numărul de stații.",
    resources: [
      statieEv11(1),
      cablu5x6(15),
      tubRigid32(15),
      rcboTrifazat(1),
      dibluMetalic(4),
      smallMaterials(3),
      electrician(7),
      necalificat(1),
    ],
  },
  {
    code: "DV-ELE-46",
    category,
    title: "Cablu de degivrare autoreglabil în jgheaburi și burlane, cu cleme",
    unit: "m",
    includes:
      "Pozarea cablului în jgheab și în burlan, fixarea cu cleme, legătura la cutia de conexiuni.",
    excludes: "Termostatul (DV-ELE-47) și circuitul de alimentare.",
    measurement: "Lungimea cablului montat.",
    resources: [cabluDegivrare(1), clemaDegivrare(1.5), electrician(0.3)],
  },
  {
    code: "DV-ELE-47",
    category,
    title:
      "Termostat cu senzori de temperatură și umiditate pentru degivrare, cu montaj",
    unit: "buc",
    includes:
      "Montarea termostatului în tablou sau cutie, senzorii în jgheab și în exterior, cablarea și reglarea pragurilor.",
    measurement: "Numărul de termostate.",
    resources: [termostatDegivrare(1), smallMaterials(3), electrician(2.5)],
  },
  {
    code: "DV-ELE-48",
    category,
    title:
      "Verificări și măsurători ale instalației electrice, cu buletin de încercări",
    unit: "buc",
    includes:
      "Măsurarea continuității, a rezistenței de izolație, a prizei de pământ și a timpului de declanșare a diferențialelor, întocmirea buletinului.",
    measurement: "Numărul de instalații verificate, pe locuință sau pe tablou.",
    resources: [electrician(4)],
  },
];

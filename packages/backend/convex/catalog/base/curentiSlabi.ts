import type { BaseNorm } from "./norm";
import {
  cabluUtp,
  canalCablu,
  dibluCui,
  dibluMetalic,
  dozaAparat,
  material,
  necalificat,
  smallMaterials,
  tehnicianCurentiSlabi,
  tubFlexibil,
} from "./resources";

const category = "Curenți slabi";

// Rețele de date, TV, interfon, alarmă antiefracție, camere de supraveghere,
// detecție de incendiu, sonerie și automatizări simple.

const prizaDate = material("Priză de date RJ45 cat. 6, cu ramă", "buc", 35);
const rack = material("Rack de perete 9U, 600 × 450 mm", "buc", 650);
const patchPanel = material("Patch panel 24 porturi cat. 6", "buc", 220);
const patchCord = material("Patch cord cat. 6, 1 m", "buc", 8);
const switchRetea = material("Switch gigabit cu 24 de porturi", "buc", 900);
const routerWifi = material("Router Wi-Fi 6 cu 4 porturi gigabit", "buc", 450);
const accessPoint = material(
  "Punct de acces Wi-Fi 6 de tavan, alimentat PoE",
  "buc",
  650,
);
const cabluCoaxial = material("Cablu coaxial RG6", "m", 2.2);
const prizaTv = material("Priză TV/SAT, cu ramă", "buc", 32);
const cabluFtp = material("Cablu FTP cat. 6 de exterior", "m", 3.2);
const cabluAlarma = material("Cablu de alarmă 6 × 0,22 mm² ecranat", "m", 1.6);
const centralaAlarma = material(
  "Centrală de alarmă cu 8 zone, cu tastatură, acumulator și sirenă interioară",
  "set",
  1400,
);
const detectorPir = material(
  "Detector de mișcare PIR pentru alarmă",
  "buc",
  120,
);
const contactMagnetic = material(
  "Contact magnetic pentru ușă sau fereastră",
  "buc",
  25,
);
const sirenaExterioara = material(
  "Sirenă exterioară cu flash și acumulator",
  "buc",
  280,
);
const interfon = material(
  "Set de interfon audio pentru o familie, cu post exterior și yală electromagnetică",
  "set",
  650,
);
const videointerfon = material(
  'Set de videointerfon pentru o familie, cu monitor de 7" și yală electromagnetică',
  "set",
  1500,
);
const cabluInterfon = material("Cablu de interfon 8 × 0,5 mm²", "m", 2.8);
const cameraIp = material(
  "Cameră IP de exterior, 4 MP, alimentată PoE",
  "buc",
  550,
);
const nvr = material(
  "Înregistrator video de rețea (NVR) cu 8 canale PoE și HDD de 2 TB",
  "set",
  2200,
);
const detectorFum = material(
  "Detector de fum optic cu baterie, interconectabil",
  "buc",
  140,
);
const detectorFumAdresabil = material(
  "Detector de fum adresabil cu soclu",
  "buc",
  260,
);
const centralaIncendiu = material(
  "Centrală de detecție incendiu adresabilă cu o buclă",
  "buc",
  4500,
);
const butonIncendiu = material("Buton manual de alarmare", "buc", 150);
const sirenaIncendiu = material("Sirenă de incendiu adresabilă", "buc", 220);
const cabluIncendiu = material(
  "Cablu rezistent la foc JE-H(St)H 2 × 2 × 0,8 mm",
  "m",
  4.5,
);
const sonerie = material("Sonerie cu buton și transformator", "set", 120);
const sonerieVideo = material(
  "Sonerie video Wi-Fi cu transformator",
  "set",
  650,
);
const termostatSmart = material(
  "Termostat inteligent cu control din aplicație",
  "buc",
  750,
);
const releuSmart = material(
  "Releu inteligent pentru doză, cu control din aplicație",
  "buc",
  110,
);
const senzorInundatie = material(
  "Senzor de inundație wireless cu electrovană",
  "set",
  850,
);
const antenaSat = material(
  "Antenă de satelit de 80 cm cu LNB și suport",
  "set",
  350,
);

export const curentiSlabi: BaseNorm[] = [
  {
    code: "DV-CSL-01",
    category,
    title: "Cablu UTP cat. 6 în tub flexibil, îngropat, de la rack la priză",
    unit: "m",
    includes:
      "Pozarea tubului în șliț, tragerea cablului fără îndoiri strânse, etichetarea capetelor.",
    excludes: "Șlițurile (DV-ELE-03), prizele și rack-ul.",
    measurement: "Lungimea fiecărui cablu.",
    resources: [
      tubFlexibil(1.05),
      cabluUtp(1.05),
      tehnicianCurentiSlabi(0.1),
      necalificat(0.04),
    ],
  },
  {
    code: "DV-CSL-02",
    category,
    title: "Cablu UTP cat. 6 în canal de cablu din PVC, aparent",
    unit: "m",
    includes:
      "Fixarea canalului, pozarea cablului, închiderea capacului, etichetarea.",
    measurement: "Lungimea fiecărui cablu.",
    resources: [
      canalCablu(1.05),
      cabluUtp(1.05),
      dibluCui(2),
      tehnicianCurentiSlabi(0.15),
    ],
  },
  {
    code: "DV-CSL-03",
    category,
    title: "Priză de date RJ45 cat. 6 îngropată, cu sertizare și testare",
    unit: "buc",
    includes:
      "Fixarea dozei, sertizarea cablului în modulul keystone, montarea prizei cu rama ei și testarea legăturii.",
    measurement: "Numărul de prize.",
    resources: [prizaDate(1), dozaAparat(1), tehnicianCurentiSlabi(0.5)],
  },
  {
    code: "DV-CSL-04",
    category,
    title:
      "Rack de perete 9U cu patch panel de 24 de porturi, sertizat și etichetat",
    unit: "buc",
    includes:
      "Fixarea rack-ului, montarea patch panel-ului și a organizatorului, sertizarea cablurilor sosite, etichetarea și testarea fiecărui port.",
    excludes: "Echipamentele active (DV-CSL-05, DV-CSL-06).",
    measurement: "Numărul de rack-uri.",
    resources: [
      rack(1),
      patchPanel(1),
      patchCord(24),
      dibluMetalic(4),
      smallMaterials(2),
      tehnicianCurentiSlabi(6),
    ],
  },
  {
    code: "DV-CSL-05",
    category,
    title:
      "Switch gigabit cu 24 de porturi și router Wi-Fi, montate în rack și configurate",
    unit: "set",
    includes:
      "Montarea în rack, legarea porturilor cu patch corduri, configurarea routerului și a rețelei, verificarea legăturilor.",
    measurement: "Numărul de seturi.",
    resources: [
      switchRetea(1),
      routerWifi(1),
      smallMaterials(2),
      tehnicianCurentiSlabi(3),
    ],
  },
  {
    code: "DV-CSL-06",
    category,
    title:
      "Punct de acces Wi-Fi de tavan alimentat PoE, cu montaj și configurare",
    unit: "buc",
    includes:
      "Fixarea pe tavan, legarea la cablul UTP, configurarea rețelelor și verificarea acoperirii.",
    excludes: "Cablul UTP (DV-CSL-01).",
    measurement: "Numărul de puncte de acces.",
    resources: [accessPoint(1), dibluCui(2), tehnicianCurentiSlabi(1.2)],
  },
  {
    code: "DV-CSL-07",
    category,
    title: "Cablu coaxial RG6 în tub flexibil, îngropat, cu priză TV/SAT",
    unit: "m",
    includes:
      "Pozarea tubului, tragerea cablului, conectorii F la capete; priza TV este cuprinsă proporțional la 15 m de cablu.",
    excludes: "Șlițurile (DV-ELE-03).",
    measurement: "Lungimea cablului.",
    resources: [
      tubFlexibil(1.05),
      cabluCoaxial(1.05),
      prizaTv(0.07),
      dozaAparat(0.07),
      smallMaterials(2),
      tehnicianCurentiSlabi(0.12),
      necalificat(0.04),
    ],
  },
  {
    code: "DV-CSL-08",
    category,
    title: "Antenă de satelit de 80 cm cu LNB, montată și orientată",
    unit: "buc",
    includes:
      "Fixarea suportului pe perete sau acoperiș, montarea antenei și a LNB-ului, orientarea cu aparatul de măsură și legarea cablului coaxial.",
    excludes: "Cablul coaxial (DV-CSL-07) și receptorul.",
    measurement: "Numărul de antene.",
    resources: [antenaSat(1), dibluMetalic(4), tehnicianCurentiSlabi(2)],
  },
  {
    code: "DV-CSL-09",
    category,
    title: "Cablu de alarmă ecranat 6 × 0,22 mm² în tub flexibil, îngropat",
    unit: "m",
    includes: "Pozarea tubului, tragerea cablului și etichetarea capetelor.",
    excludes: "Șlițurile (DV-ELE-03).",
    measurement: "Lungimea fiecărui cablu.",
    resources: [
      tubFlexibil(1.05),
      cabluAlarma(1.05),
      tehnicianCurentiSlabi(0.08),
      necalificat(0.04),
    ],
  },
  {
    code: "DV-CSL-10",
    category,
    title:
      "Sistem de alarmă antiefracție cu centrală de 8 zone, tastatură, 4 detectoare, 2 contacte și sirenă exterioară, programat",
    unit: "set",
    includes:
      "Montarea centralei, a tastaturii, a detectoarelor de mișcare, a contactelor magnetice și a sirenei exterioare, legarea cablurilor, programarea zonelor și a utilizatorilor, instruirea.",
    excludes: "Cablurile (DV-CSL-09) și abonamentul de monitorizare.",
    measurement: "Numărul de sisteme.",
    resources: [
      centralaAlarma(1),
      detectorPir(4),
      contactMagnetic(2),
      sirenaExterioara(1),
      dibluCui(16),
      smallMaterials(2),
      tehnicianCurentiSlabi(10),
    ],
  },
  {
    code: "DV-CSL-11",
    category,
    title:
      "Detector de mișcare sau contact magnetic suplimentar pentru alarmă, montat și programat",
    unit: "buc",
    includes:
      "Fixarea detectorului, legarea la cablul sosit și programarea zonei.",
    measurement: "Numărul de detectoare.",
    resources: [detectorPir(1), dibluCui(2), tehnicianCurentiSlabi(0.8)],
  },
  {
    code: "DV-CSL-12",
    category,
    title:
      "Interfon audio pentru o familie, cu post exterior și yală electromagnetică",
    unit: "set",
    includes:
      "Montarea postului exterior la poartă, a postului interior, a yalei electromagnetice și a sursei, cablul de interfon de până la 30 m în tub, programarea și proba.",
    excludes:
      "Șanțul sau tubul îngropat până la poartă (categoria Terasamente).",
    measurement: "Numărul de seturi.",
    resources: [
      interfon(1),
      cabluInterfon(30),
      tubFlexibil(30),
      smallMaterials(3),
      tehnicianCurentiSlabi(5),
      necalificat(1),
    ],
  },
  {
    code: "DV-CSL-13",
    category,
    title:
      "Videointerfon pentru o familie, cu monitor, post exterior și yală electromagnetică",
    unit: "set",
    includes:
      "Montarea postului exterior cu cameră, a monitorului, a yalei electromagnetice și a sursei, cablul de până la 30 m în tub, configurarea și proba.",
    excludes:
      "Șanțul sau tubul îngropat până la poartă (categoria Terasamente).",
    measurement: "Numărul de seturi.",
    resources: [
      videointerfon(1),
      cabluFtp(30),
      tubFlexibil(30),
      smallMaterials(3),
      tehnicianCurentiSlabi(6),
      necalificat(1),
    ],
  },
  {
    code: "DV-CSL-14",
    category,
    title:
      "Cameră IP de exterior de 4 MP alimentată PoE, cu montaj și configurare",
    unit: "buc",
    includes:
      "Fixarea camerei pe perete sau stâlp, legarea la cablul FTP, orientarea, configurarea în înregistrator și verificarea imaginii.",
    excludes: "Cablul FTP (DV-CSL-15) și înregistratorul (DV-CSL-16).",
    measurement: "Numărul de camere.",
    resources: [
      cameraIp(1),
      dibluMetalic(2),
      smallMaterials(2),
      tehnicianCurentiSlabi(1.5),
    ],
  },
  {
    code: "DV-CSL-15",
    category,
    title:
      "Cablu FTP cat. 6 de exterior pentru camere, în tub, aparent sau îngropat",
    unit: "m",
    includes: "Pozarea tubului, tragerea cablului, mufarea și testarea.",
    excludes: "Șanțul (categoria Terasamente).",
    measurement: "Lungimea fiecărui cablu.",
    resources: [
      tubFlexibil(1.05),
      cabluFtp(1.05),
      dibluCui(1),
      tehnicianCurentiSlabi(0.12),
      necalificat(0.04),
    ],
  },
  {
    code: "DV-CSL-16",
    category,
    title:
      "Înregistrator video de rețea cu 8 canale PoE și HDD de 2 TB, montat și configurat cu acces de la distanță",
    unit: "buc",
    includes:
      "Montarea în rack sau pe raft, legarea camerelor, configurarea înregistrării, a utilizatorilor și a accesului din aplicație, instruirea.",
    measurement: "Numărul de înregistratoare.",
    resources: [nvr(1), smallMaterials(2), tehnicianCurentiSlabi(4)],
  },
  {
    code: "DV-CSL-17",
    category,
    title: "Detector de fum optic cu baterie, interconectabil, montat pe tavan",
    unit: "buc",
    includes:
      "Fixarea soclului, montarea detectorului, împerecherea cu celelalte și proba.",
    measurement: "Numărul de detectoare.",
    resources: [detectorFum(1), dibluCui(2), tehnicianCurentiSlabi(0.4)],
  },
  {
    code: "DV-CSL-18",
    category,
    title:
      "Instalație de detecție incendiu adresabilă cu o buclă: centrală, 10 detectoare, 2 butoane și 2 sirene, programată",
    unit: "set",
    includes:
      "Montarea centralei, a detectoarelor cu socluri, a butoanelor și a sirenelor, legarea buclei, adresarea și programarea, proba fiecărui element și instruirea.",
    excludes: "Cablul buclei (DV-CSL-19) și avizarea la pompieri.",
    measurement:
      "Numărul de instalații; pentru alt număr de elemente se ajustează cantitățile.",
    resources: [
      centralaIncendiu(1),
      detectorFumAdresabil(10),
      butonIncendiu(2),
      sirenaIncendiu(2),
      dibluCui(30),
      smallMaterials(2),
      tehnicianCurentiSlabi(24),
    ],
  },
  {
    code: "DV-CSL-19",
    category,
    title:
      "Cablu rezistent la foc pentru bucla de detecție incendiu, în tub, îngropat sau aparent",
    unit: "m",
    includes:
      "Pozarea tubului, tragerea cablului cu păstrarea ecranului continuu, etichetarea.",
    excludes: "Șlițurile (DV-ELE-03).",
    measurement: "Lungimea cablului.",
    resources: [
      tubFlexibil(1.05),
      cabluIncendiu(1.05),
      dibluCui(1),
      tehnicianCurentiSlabi(0.12),
      necalificat(0.04),
    ],
  },
  {
    code: "DV-CSL-20",
    category,
    title: "Sonerie cu buton și transformator, cu montaj și cablare",
    unit: "set",
    includes:
      "Montarea butonului la poartă sau ușă, a soneriei și a transformatorului în tablou, cablul de până la 15 m în tub și proba.",
    measurement: "Numărul de seturi.",
    resources: [
      sonerie(1),
      cabluAlarma(15),
      tubFlexibil(15),
      smallMaterials(2),
      tehnicianCurentiSlabi(1.5),
    ],
  },
  {
    code: "DV-CSL-21",
    category,
    title: "Sonerie video Wi-Fi cu transformator, montată și configurată",
    unit: "set",
    includes:
      "Montarea soneriei la intrare, a transformatorului, legarea la cablul existent sau nou de până la 15 m, configurarea în aplicație și proba.",
    measurement: "Numărul de seturi.",
    resources: [
      sonerieVideo(1),
      cabluAlarma(15),
      tubFlexibil(15),
      smallMaterials(2),
      tehnicianCurentiSlabi(2),
    ],
  },
  {
    code: "DV-CSL-22",
    category,
    title:
      "Termostat inteligent cu control din aplicație, montat și configurat",
    unit: "buc",
    includes:
      "Montarea termostatului în locul celui existent sau pe cablu nou, legarea la centrală, configurarea în aplicație și proba.",
    excludes: "Cablul nou până la centrală, în tub, și șlițurile.",
    measurement: "Numărul de termostate.",
    resources: [
      termostatSmart(1),
      smallMaterials(2),
      tehnicianCurentiSlabi(1.5),
    ],
  },
  {
    code: "DV-CSL-23",
    category,
    title:
      "Releu inteligent în doză pentru comanda iluminatului sau a prizelor, configurat",
    unit: "buc",
    includes:
      "Montarea releului în doza aparatului, legarea la circuit și la întrerupător, configurarea în aplicație și proba.",
    measurement: "Numărul de relee.",
    resources: [releuSmart(1), smallMaterials(2), tehnicianCurentiSlabi(0.7)],
  },
  {
    code: "DV-CSL-24",
    category,
    title:
      "Senzor de inundație wireless cu electrovană pe alimentarea cu apă, configurat",
    unit: "set",
    includes:
      "Montarea electrovanei pe conducta de alimentare, a senzorilor în zonele cu risc, împerecherea, configurarea și proba de închidere.",
    measurement: "Numărul de seturi.",
    resources: [
      senzorInundatie(1),
      smallMaterials(3),
      tehnicianCurentiSlabi(2.5),
    ],
  },
];

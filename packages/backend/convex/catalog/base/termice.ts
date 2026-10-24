import type { BaseNorm } from "./norm";
import {
  aparatSudura,
  bandaAluminiu,
  brataraMetalica,
  cutieDistribuitor,
  dibluCui,
  dibluMetalic,
  discAbraziv,
  electrician,
  electrozi,
  fitingOtel,
  fitingPresare16,
  fitingPresare20,
  frigotehnist,
  grundAnticoroziv,
  instalator,
  izolatieTeava,
  izolatieTeava13,
  material,
  mortarZidarie,
  necalificat,
  polizor,
  pompaVid,
  presaFitinguri,
  racordInox,
  robinetSferic,
  smallMaterials,
  sudor,
  supapa,
  tevaOtelNegru,
  tevaPexAl16,
  tevaPexAl20,
  tubFlexibil,
  zidar,
} from "./resources";

const category = "Instalații termice";

// Sursele de căldură, corpurile de încălzire, distribuția, încălzirea în
// pardoseală, coșurile de fum și probele. Alimentarea cu gaz este în gaze.ts,
// circuitele electrice în electrice.ts.

const centralaCondensare = material(
  "Centrală termică murală pe gaz, în condensare, 24 kW",
  "buc",
  5500,
);
const kitEvacuare = material(
  "Kit de evacuare coaxial Ø60/100 pentru centrală în condensare",
  "set",
  350,
);
const filtruMagnetic = material("Filtru magnetic antinămol", "buc", 350);
const neutralizator = material("Neutralizator de condens", "buc", 250);
const centralaPeleti = material(
  "Centrală pe peleți cu buncăr, 25 kW",
  "buc",
  12000,
);
const cazanLemne = material(
  "Cazan pe lemne cu gazeificare, 25 kW",
  "buc",
  9000,
);
const ventilTermic = material(
  "Ventil termic de siguranță pentru cazan pe combustibil solid",
  "buc",
  280,
);
const centralaElectrica = material(
  "Centrală electrică murală, 9 kW",
  "buc",
  2200,
);
const pompaCaldura = material(
  "Pompă de căldură aer-apă monobloc, 10 kW",
  "buc",
  28000,
);
const pompaCalduraSplit = material(
  "Pompă de căldură aer-apă split, 8 kW, cu unitate interioară",
  "set",
  26000,
);
const suportPompa = material(
  "Suport antivibrant pentru unitatea exterioară",
  "set",
  450,
);
const boilerIndirect = material("Boiler cu serpentină, 200 l", "buc", 2800);
const vasExpansiuneAcm = material(
  "Vas de expansiune pentru apă caldă menajeră, 12 l",
  "buc",
  120,
);
const puffer = material(
  "Puffer (acumulator de căldură) izolat, 500 l",
  "buc",
  3200,
);
const vasExpansiune = material(
  "Vas de expansiune închis pentru încălzire, 24 l",
  "buc",
  150,
);
const grupSiguranta = material(
  "Grup de siguranță pentru încălzire, 3 bar",
  "buc",
  120,
);
const pompaCirculatie = material(
  "Pompă de circulație electronică, 25-60",
  "buc",
  650,
);
const dezaerator = material("Separator de aer automat", "buc", 180);
const kitUmplere = material(
  "Kit de umplere automată cu reductor de presiune",
  "buc",
  220,
);
const butelie = material(
  "Butelie de egalizare a presiunii cu distribuitor pentru 3 circuite",
  "set",
  1900,
);
const radiatorOtel = material(
  "Radiator din oțel tip 22, 600 × 1000 mm",
  "buc",
  450,
);
const radiatorAluminiu = material(
  "Radiator din aluminiu, element de 600 mm",
  "buc",
  55,
);
const portprosop = material(
  "Radiator portprosop din oțel, 500 × 1200 mm",
  "buc",
  380,
);
const robinetTermostatic = material(
  "Robinet termostatic cu cap termostatat",
  "set",
  85,
);
const robinetRetur = material("Robinet de retur (detentor)", "buc", 35);
const consoleRadiator = material("Set de console pentru radiator", "set", 25);
const tevaPexAl26 = material("Țeavă multistrat PEX-Al-PEX Ø26", "m", 10);
const fitingPresare26 = material(
  "Fiting de presare pentru țeavă multistrat Ø26",
  "buc",
  20,
);
const izolatieElastomerica = material(
  "Izolație din cauciuc elastomeric pentru țevi, 19 mm",
  "m",
  9,
);
const adezivElastomeric = material(
  "Adeziv pentru izolație elastomerică",
  "l",
  60,
);
const cochilieVata = material(
  "Cochilie din vată minerală cu folie de aluminiu pentru țevi",
  "m",
  28,
);
const distribuitorRadiatoare = material(
  "Distribuitor-colector din alamă pentru încălzire, 6 circuite",
  "buc",
  450,
);
const tevaOtelMare = material('Țeavă din oțel negru, 1 1/4" – 2"', "m", 38);
const fitingOtelMare = material(
  'Fiting din oțel pentru sudură, 1 1/4" – 2"',
  "buc",
  18,
);
const placaNuturi = material(
  "Placă cu nuturi din EPS, 30 mm, pentru încălzire în pardoseală",
  "mp",
  32,
);
const tevaPert = material("Țeavă PE-RT cu barieră de oxigen Ø16", "m", 3.2);
const racordStrangere16 = material(
  "Racord de strângere (eurocon) pentru țeavă PE-RT Ø16",
  "buc",
  10,
);
const vanaAnticondens = material(
  'Vană termostatică anticondens cu trei căi pentru protecția returului, 1"',
  "buc",
  300,
);
const garnituriRadiator = material(
  "Set de garnituri și material de etanșare pentru racordurile radiatorului",
  "set",
  15,
);
const linieFrigorifica = material(
  'Linie frigorifică izolată din cupru, 3/8" – 5/8"',
  "m",
  95,
);
const distribuitorPardoseala = material(
  "Distribuitor-colector din inox cu debitmetre, 8 circuite",
  "buc",
  950,
);
const grupPompare = material(
  "Grup de pompare și amestec pentru încălzire în pardoseală",
  "buc",
  1500,
);
const termostatWireless = material(
  "Termostat de ambient programabil, wireless",
  "buc",
  350,
);
const actuator = material("Actuator termic pentru distribuitor", "buc", 90);
const termostatFir = material(
  "Termostat de ambient programabil, cu fir",
  "buc",
  180,
);
const cabluComanda = material("Cablu de comandă 2 × 0,75 mm²", "m", 2);
const cosInox = material(
  "Coș de fum din inox cu perete dublu izolat, Ø200",
  "m",
  420,
);
const bratraCos = material("Brățară de perete pentru coș din inox", "buc", 85);
const accesoriiCos = material(
  "Accesorii pentru coș din inox (teu, capac de curățare, colector de condens, pălărie, placă de bază)",
  "set",
  1200,
);
const cosCeramic = material(
  "Sistem de coș de fum ceramic cu manta din beton ușor, Ø200",
  "m",
  650,
);
const aeroterma = material("Aerotermă cu apă caldă, 20 kW", "buc", 2200);
const convector = material("Convector electric de perete, 2 kW", "buc", 450);
const focar = material("Focar de șemineu pe lemne, 12 kW", "buc", 4500);
const inhibitor = material(
  "Inhibitor de coroziune pentru instalații de încălzire, 1 l",
  "buc",
  90,
);

export const termice: BaseNorm[] = [
  {
    code: "DV-INC-01",
    category,
    title:
      "Centrală murală pe gaz în condensare, 24 kW, cu montaj, racordare și punere în funcțiune",
    unit: "buc",
    includes:
      "Fixarea centralei pe perete, racordarea hidraulică la tur, retur și apă caldă menajeră cu robineți de izolare, filtrul magnetic pe retur, kitul de evacuare coaxial prin perete, neutralizatorul și evacuarea condensului, umplerea și punerea în funcțiune.",
    excludes:
      "Racordul de gaz (categoria Instalații de gaze), circuitul electric și termostatul (DV-INC-29).",
    measurement: "Numărul de centrale montate.",
    resources: [
      centralaCondensare(1),
      kitEvacuare(1),
      filtruMagnetic(1),
      neutralizator(1),
      robinetSferic(4),
      racordInox(2),
      dibluMetalic(2),
      smallMaterials(3),
      instalator(8),
      necalificat(1),
    ],
  },
  {
    code: "DV-INC-02",
    category,
    title: "Centrală pe peleți cu buncăr, 25 kW, cu montaj și racordare",
    unit: "buc",
    includes:
      "Aducerea în centrala termică, asamblarea buncărului, racordarea hidraulică cu robineți de izolare și ventil termic de siguranță, racordarea la coșul de fum, umplerea și punerea în funcțiune.",
    excludes:
      "Coșul de fum (DV-INC-30 – DV-INC-32), pufferul (DV-INC-08) și circuitul electric.",
    measurement: "Numărul de centrale montate.",
    resources: [
      centralaPeleti(1),
      ventilTermic(1),
      robinetSferic(4),
      racordInox(2),
      smallMaterials(3),
      instalator(12),
      necalificat(4),
    ],
  },
  {
    code: "DV-INC-03",
    category,
    title: "Cazan pe lemne cu gazeificare, 25 kW, cu montaj și racordare",
    unit: "buc",
    includes:
      "Aducerea în centrala termică, așezarea pe postament, racordarea hidraulică cu robineți de izolare, ventil termic de siguranță și vană anticondens pe retur, racordarea la coșul de fum, umplerea și punerea în funcțiune.",
    excludes:
      "Coșul de fum, pufferul obligatoriu (DV-INC-08), pompa circuitului cazanului (DV-INC-10), postamentul și circuitul electric.",
    measurement: "Numărul de cazane montate.",
    resources: [
      cazanLemne(1),
      ventilTermic(1),
      vanaAnticondens(1),
      robinetSferic(4),
      racordInox(2),
      smallMaterials(3),
      instalator(12),
      necalificat(4),
    ],
  },
  {
    code: "DV-INC-04",
    category,
    title: "Centrală electrică murală de 9 kW, cu montaj și racordare",
    unit: "buc",
    includes:
      "Fixarea pe perete, racordarea hidraulică cu robineți de izolare, legarea la circuitul electric dedicat, umplerea și punerea în funcțiune.",
    excludes: "Circuitul electric trifazat (categoria Instalații electrice).",
    measurement: "Numărul de centrale montate.",
    resources: [
      centralaElectrica(1),
      robinetSferic(2),
      racordInox(2),
      dibluMetalic(2),
      smallMaterials(3),
      instalator(4),
      electrician(1),
    ],
  },
  {
    code: "DV-INC-05",
    category,
    title:
      "Pompă de căldură aer-apă monobloc, 10 kW, cu montaj și punere în funcțiune",
    unit: "buc",
    includes:
      "Așezarea unității pe suportul antivibrant, racordarea hidraulică cu racorduri flexibile din inox și robineți de izolare, izolarea conductelor exterioare, legarea la tabloul electric, umplerea, aerisirea și punerea în funcțiune cu reglarea curbei de încălzire.",
    excludes:
      "Platforma sau fundația unității, circuitul electric până la unitate, pufferul și boilerul.",
    measurement: "Numărul de pompe de căldură montate.",
    resources: [
      pompaCaldura(1),
      suportPompa(1),
      racordInox(2),
      robinetSferic(2),
      izolatieElastomerica(6),
      smallMaterials(3),
      instalator(16),
      frigotehnist(2),
      electrician(2),
      necalificat(4),
    ],
  },
  {
    code: "DV-INC-06",
    category,
    title:
      "Pompă de căldură aer-apă split, 8 kW, cu linie frigorifică și punere în funcțiune",
    unit: "buc",
    includes:
      "Montarea unității exterioare pe suport și a unității interioare pe perete, linia frigorifică izolată, vidarea și încărcarea, racordarea hidraulică și electrică, umplerea și punerea în funcțiune.",
    excludes:
      "Platforma unității exterioare, circuitul electric până la unități, pufferul și boilerul.",
    measurement: "Numărul de pompe de căldură montate.",
    resources: [
      pompaCalduraSplit(1),
      suportPompa(1),
      linieFrigorifica(5),
      racordInox(2),
      robinetSferic(2),
      smallMaterials(3),
      pompaVid(1),
      frigotehnist(8),
      instalator(8),
      electrician(2),
      necalificat(4),
    ],
  },
  {
    code: "DV-INC-07",
    category,
    title:
      "Boiler cu serpentină de 200 l, racordat la sursă și la apa menajeră",
    unit: "buc",
    includes:
      "Așezarea boilerului, racordarea serpentinei la sursa de căldură cu robineți de izolare, racordarea la apă rece și caldă cu vas de expansiune și supapă de siguranță, umplerea și proba de funcționare.",
    excludes: "Pompa de circulație a serpentinei (DV-INC-10).",
    measurement: "Numărul de boilere montate.",
    resources: [
      boilerIndirect(1),
      vasExpansiuneAcm(1),
      supapa(1),
      robinetSferic(4),
      racordInox(4),
      smallMaterials(3),
      instalator(6),
      necalificat(1),
    ],
  },
  {
    code: "DV-INC-08",
    category,
    title: "Puffer de 500 l, cu racorduri și robineți de izolare",
    unit: "buc",
    includes:
      "Așezarea pufferului, racordarea la sursă și la circuitele de încălzire cu robineți de izolare, montarea tecilor pentru senzori, umplerea și aerisirea.",
    measurement: "Numărul de puffere montate.",
    resources: [
      puffer(1),
      robinetSferic(6),
      racordInox(4),
      smallMaterials(3),
      instalator(8),
      necalificat(2),
    ],
  },
  {
    code: "DV-INC-09",
    category,
    title: "Vas de expansiune închis de 24 l, cu grup de siguranță",
    unit: "buc",
    includes:
      "Montarea vasului pe consolă, a grupului de siguranță cu manometru, aerisitor și supapă, racordarea la retur și reglarea presiunii de preîncărcare.",
    measurement: "Numărul de vase montate.",
    resources: [
      vasExpansiune(1),
      grupSiguranta(1),
      robinetSferic(1),
      smallMaterials(2),
      instalator(1.5),
    ],
  },
  {
    code: "DV-INC-10",
    category,
    title: "Pompă de circulație electronică, cu robineți de izolare",
    unit: "buc",
    includes:
      "Montarea pompei între doi robineți de izolare, legarea electrică, aerisirea și reglarea treptei de funcționare.",
    measurement: "Numărul de pompe montate.",
    resources: [
      pompaCirculatie(1),
      robinetSferic(2),
      smallMaterials(2),
      instalator(1.5),
      electrician(0.5),
    ],
  },
  {
    code: "DV-INC-11",
    category,
    title:
      "Separator de aer, filtru magnetic și kit de umplere automată, pe instalație existentă",
    unit: "set",
    includes:
      "Golirea parțială, montarea separatorului de aer pe tur, a filtrului magnetic pe retur și a kitului de umplere cu reductor de presiune, reumplerea și proba.",
    measurement: "Numărul de seturi montate.",
    resources: [
      dezaerator(1),
      filtruMagnetic(1),
      kitUmplere(1),
      smallMaterials(3),
      instalator(2.5),
    ],
  },
  {
    code: "DV-INC-12",
    category,
    title: "Butelie de egalizare cu distribuitor pentru 3 circuite, cu montaj",
    unit: "buc",
    includes:
      "Fixarea pe perete, racordarea la sursă și la cele trei circuite cu robineți de izolare, izolarea și aerisirea.",
    excludes: "Pompele de circulație (DV-INC-10).",
    measurement: "Numărul de butelii montate.",
    resources: [
      butelie(1),
      robinetSferic(8),
      dibluMetalic(4),
      smallMaterials(3),
      instalator(5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-INC-13",
    category,
    title:
      "Radiator din oțel tip 22, 600 × 1000 mm, cu console, robinet termostatic și detentor",
    unit: "buc",
    includes:
      "Trasarea, fixarea consolelor, montarea radiatorului, a robinetului termostatic cu cap termostatat, a detentorului și a aerisitorului, racordarea la legături și aerisirea.",
    excludes: "Legăturile din pardoseală sau din perete (DV-INC-17).",
    measurement:
      "Numărul de radiatoare montate; pentru alte dimensiuni se ajustează prețul radiatorului.",
    resources: [
      radiatorOtel(1),
      consoleRadiator(1),
      robinetTermostatic(1),
      robinetRetur(1),
      smallMaterials(2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-INC-14",
    category,
    title: "Radiator din aluminiu cu 10 elemenți, cu robineți și montaj",
    unit: "buc",
    includes:
      "Asamblarea elemenților cu nipluri și garnituri, fixarea consolelor, montarea radiatorului, a robinetului termostatic, a detentorului și a aerisitorului, racordarea și aerisirea.",
    excludes: "Legăturile din pardoseală sau din perete (DV-INC-17).",
    measurement:
      "Numărul de radiatoare montate; pentru alt număr de elemenți se ajustează cantitatea de elemenți.",
    resources: [
      radiatorAluminiu(10),
      consoleRadiator(1),
      robinetTermostatic(1),
      robinetRetur(1),
      smallMaterials(2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-INC-15",
    category,
    title: "Radiator portprosop din oțel, 500 × 1200 mm, cu robineți și montaj",
    unit: "buc",
    includes:
      "Trasarea, fixarea în perete, montarea robinetului termostatic colțar și a detentorului, racordarea și aerisirea.",
    measurement: "Numărul de radiatoare montate.",
    resources: [
      portprosop(1),
      robinetTermostatic(1),
      robinetRetur(1),
      smallMaterials(2),
      instalator(2),
    ],
  },
  {
    code: "DV-INC-16",
    category,
    title:
      "Robinet termostatic cu cap termostatat, înlocuit pe radiator existent",
    unit: "buc",
    includes:
      "Golirea parțială a instalației, demontarea robinetului vechi, montarea robinetului termostatic și a capului, reumplerea și aerisirea.",
    measurement: "Numărul de robineți înlocuiți.",
    resources: [robinetTermostatic(1), smallMaterials(2), instalator(1)],
  },
  {
    code: "DV-INC-17",
    category,
    title:
      "Conductă multistrat Ø16 izolată pentru încălzire, montată în pardoseală sau în șliț",
    unit: "m",
    includes:
      "Tăierea, calibrarea, pozarea țevii în izolație de 9 mm, fitingurile presate la capete. Un radiator are de regulă tur și retur, deci două lungimi.",
    excludes: "Șlițurile, șapa și proba de presiune (DV-INC-36).",
    measurement: "Lungimea țevii montate.",
    resources: [
      tevaPexAl16(1.02),
      izolatieTeava(1.02),
      fitingPresare16(0.2),
      smallMaterials(2),
      instalator(0.25),
      presaFitinguri(0.05),
    ],
  },
  {
    code: "DV-INC-18",
    category,
    title:
      "Conductă multistrat Ø20 izolată pentru încălzire, montată în pardoseală sau aparent",
    unit: "m",
    includes:
      "Tăierea, calibrarea, pozarea țevii în izolație de 9 mm, fixarea cu cleme sau brățări și fitingurile presate.",
    excludes: "Proba de presiune (DV-INC-36).",
    measurement: "Lungimea țevii montate.",
    resources: [
      tevaPexAl20(1.02),
      izolatieTeava(1.02),
      fitingPresare20(0.2),
      brataraMetalica(0.7),
      smallMaterials(2),
      instalator(0.3),
      presaFitinguri(0.05),
    ],
  },
  {
    code: "DV-INC-19",
    category,
    title:
      "Conductă multistrat Ø26 izolată pentru încălzire, coloană sau distribuție",
    unit: "m",
    includes:
      "Tăierea, calibrarea, pozarea țevii în izolație de 13 mm, fixarea cu brățări și fitingurile presate.",
    excludes: "Proba de presiune (DV-INC-36).",
    measurement: "Lungimea țevii montate.",
    resources: [
      tevaPexAl26(1.02),
      izolatieTeava13(1.02),
      fitingPresare26(0.2),
      brataraMetalica(0.7),
      smallMaterials(2),
      instalator(0.35),
      presaFitinguri(0.06),
    ],
  },
  {
    code: "DV-INC-20",
    category,
    title:
      "Distribuitor-colector din alamă pentru radiatoare, 6 circuite, în cutie îngropată",
    unit: "buc",
    includes:
      "Montarea cutiei în perete, a distribuitorului și colectorului cu robineți de izolare, aerisitoare și robineți de golire și racordarea circuitelor.",
    excludes: "Proba de presiune (DV-INC-36).",
    measurement: "Numărul de distribuitoare montate.",
    resources: [
      distribuitorRadiatoare(1),
      cutieDistribuitor(1),
      robinetSferic(2),
      smallMaterials(3),
      instalator(4),
    ],
  },
  {
    code: "DV-INC-21",
    category,
    title:
      'Conductă din oțel negru 1/2" – 1" sudată, pentru încălzire, montată aparent',
    unit: "m",
    includes:
      "Tăierea, pregătirea capetelor, sudarea și filetarea, fixarea cu brățări și grunduirea anticorozivă.",
    excludes:
      "Izolația (DV-INC-23, DV-INC-24), vopsitoria de finisaj și proba de presiune (DV-INC-36).",
    measurement: "Lungimea conductei montate.",
    resources: [
      tevaOtelNegru(1.02),
      fitingOtel(0.5),
      electrozi(0.1),
      grundAnticoroziv(0.08),
      brataraMetalica(0.6),
      discAbraziv(0.05),
      instalator(0.6),
      sudor(0.3),
      necalificat(0.2),
      aparatSudura(0.3),
      polizor(0.1),
    ],
  },
  {
    code: "DV-INC-22",
    category,
    title:
      'Conductă din oțel negru 1 1/4" – 2" sudată, pentru încălzire, montată aparent',
    unit: "m",
    includes:
      "Tăierea, pregătirea capetelor, sudarea, fixarea cu brățări și grunduirea anticorozivă.",
    excludes:
      "Izolația (DV-INC-23, DV-INC-24), vopsitoria de finisaj și proba de presiune (DV-INC-36).",
    measurement: "Lungimea conductei montate.",
    resources: [
      tevaOtelMare(1.02),
      fitingOtelMare(0.4),
      electrozi(0.2),
      grundAnticoroziv(0.12),
      brataraMetalica(0.5),
      discAbraziv(0.08),
      instalator(0.8),
      sudor(0.4),
      necalificat(0.3),
      aparatSudura(0.4),
      polizor(0.15),
    ],
  },
  {
    code: "DV-INC-23",
    category,
    title: "Izolarea conductelor cu cauciuc elastomeric de 19 mm",
    unit: "m",
    includes:
      "Tăierea, îmbrăcarea conductei, lipirea îmbinărilor cu adeziv și etanșarea coturilor și a armăturilor.",
    measurement: "Lungimea conductei izolate.",
    resources: [
      izolatieElastomerica(1.05),
      adezivElastomeric(0.02),
      instalator(0.15),
    ],
  },
  {
    code: "DV-INC-24",
    category,
    title:
      "Izolarea conductelor cu cochilii din vată minerală cu folie de aluminiu",
    unit: "m",
    includes:
      "Tăierea, așezarea cochiliilor pe conductă, închiderea cu banda autoadezivă a cochiliei și cu bandă din aluminiu la îmbinări.",
    measurement: "Lungimea conductei izolate.",
    resources: [cochilieVata(1.05), bandaAluminiu(0.5), instalator(0.2)],
  },
  {
    code: "DV-INC-25",
    category,
    title:
      "Încălzire în pardoseală pe plăci cu nuturi, țeavă PE-RT Ø16 la pas de 15 cm",
    unit: "mp",
    includes:
      "Așezarea plăcilor cu nuturi, pozarea țevii în serpentină la pas de 15 cm și proba de presiune menținută pe durata turnării șapei.",
    excludes:
      "Șapa, cu banda perimetrală și aditivul ei (DV-PRD-10), termoizolația suplimentară de sub plăci, distribuitorul (DV-INC-26) și grupul de pompare (DV-INC-27).",
    measurement: "Suprafața încălzită, fără zonele fără țeavă.",
    resources: [
      placaNuturi(1.05),
      tevaPert(7),
      smallMaterials(2),
      instalator(0.6),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-INC-26",
    category,
    title:
      "Distribuitor-colector din inox cu debitmetre, 8 circuite, în cutie îngropată",
    unit: "buc",
    includes:
      "Montarea cutiei în perete, a distribuitorului cu debitmetre, aerisitoare și robineți de golire și racordarea celor opt circuite cu fitinguri de strângere.",
    excludes: "Proba de presiune (DV-INC-36).",
    measurement: "Numărul de distribuitoare montate.",
    resources: [
      distribuitorPardoseala(1),
      cutieDistribuitor(1),
      robinetSferic(2),
      racordStrangere16(16),
      smallMaterials(3),
      instalator(4),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-INC-27",
    category,
    title: "Grup de pompare și amestec pentru încălzire în pardoseală",
    unit: "buc",
    includes:
      "Montarea grupului pe distribuitor, racordarea la tur și retur, legarea electrică a pompei, reglarea temperaturii de amestec și proba.",
    measurement: "Numărul de grupuri montate.",
    resources: [
      grupPompare(1),
      smallMaterials(2),
      instalator(3),
      electrician(0.5),
    ],
  },
  {
    code: "DV-INC-28",
    category,
    title:
      "Termostat de ambient wireless cu două actuatoare termice, pe o zonă de încălzire",
    unit: "set",
    includes:
      "Montarea termostatului și a receptorului, a actuatoarelor pe circuitele zonei de la distribuitor, cablarea actuatoarelor la receptor, împerecherea și proba.",
    measurement: "Numărul de zone echipate.",
    resources: [
      termostatWireless(1),
      actuator(2),
      cabluComanda(6),
      smallMaterials(2),
      electrician(1.5),
      instalator(0.5),
    ],
  },
  {
    code: "DV-INC-29",
    category,
    title: "Termostat de ambient cu fir pentru centrală, cu montaj și cablare",
    unit: "buc",
    includes:
      "Montarea termostatului, tragerea cablului de comandă în tub până la centrală, legarea la bornele centralei, programarea și proba.",
    excludes: "Șlițurile.",
    measurement: "Numărul de termostate montate.",
    resources: [
      termostatFir(1),
      cabluComanda(10),
      tubFlexibil(10),
      dibluCui(6),
      smallMaterials(2),
      electrician(1.5),
    ],
  },
  {
    code: "DV-INC-30",
    category,
    title:
      "Coș de fum din inox cu perete dublu izolat, Ø200, montat pe exterior",
    unit: "m",
    includes:
      "Asamblarea tronsoanelor cu coliere, fixarea pe perete cu brățări la fiecare 2 m, verificarea verticalității și etanșarea trecerilor.",
    excludes: "Accesoriile de bază și de cap (DV-INC-31) și schela peste 4 m.",
    measurement: "Lungimea coșului montat.",
    resources: [
      cosInox(1),
      bratraCos(0.5),
      smallMaterials(2),
      instalator(1.2),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-INC-31",
    category,
    title:
      "Accesorii pentru coș de fum din inox: placă de bază, teu, capac de curățare, colector de condens și pălărie",
    unit: "set",
    includes:
      "Montarea plăcii de bază cu consolă, a teului de racord, a capacului de curățare și a colectorului de condens la bază și a pălăriei la cap.",
    excludes:
      "Racordarea cazanului sau a focarului la teu, cuprinsă în normele lor (DV-INC-02, DV-INC-03, DV-INC-35).",
    measurement: "Numărul de seturi montate.",
    resources: [
      accesoriiCos(1),
      dibluMetalic(4),
      smallMaterials(2),
      instalator(3),
      necalificat(1),
    ],
  },
  {
    code: "DV-INC-32",
    category,
    title: "Coș de fum ceramic cu manta din beton ușor, Ø200, zidit",
    unit: "m",
    includes:
      "Zidirea blocurilor de manta cu mortar, montarea tuburilor ceramice cu chit refractar și a izolației, racordul și ușița de curățare la bază, verificarea verticalității.",
    excludes:
      "Tencuirea mantalei (categoria Tencuieli), pălăria și trecerea prin acoperiș.",
    measurement: "Înălțimea coșului zidit.",
    resources: [
      cosCeramic(1),
      mortarZidarie(0.02),
      smallMaterials(3),
      zidar(1.5),
      necalificat(1),
    ],
  },
  {
    code: "DV-INC-33",
    category,
    title: "Aerotermă cu apă caldă de 20 kW, cu montaj și racordare",
    unit: "buc",
    includes:
      "Fixarea pe perete sau pe tavan cu ancore, racordarea hidraulică cu racorduri flexibile și robineți de izolare, legarea electrică, aerisirea și proba.",
    excludes: "Circuitul electric și conductele de alimentare.",
    measurement: "Numărul de aeroterme montate.",
    resources: [
      aeroterma(1),
      racordInox(2),
      robinetSferic(2),
      dibluMetalic(4),
      smallMaterials(2),
      instalator(5),
      electrician(1),
      necalificat(1),
    ],
  },
  {
    code: "DV-INC-34",
    category,
    title: "Convector electric de perete de 2 kW, cu montaj",
    unit: "buc",
    includes:
      "Trasarea, fixarea consolei pe perete, agățarea convectorului, legarea la priza sau circuitul dedicat și proba.",
    excludes: "Circuitul electric (categoria Instalații electrice).",
    measurement: "Numărul de convectoare montate.",
    resources: [convector(1), dibluCui(4), electrician(1)],
  },
  {
    code: "DV-INC-35",
    category,
    title: "Focar de șemineu pe lemne de 12 kW, așezat și racordat la coș",
    unit: "buc",
    includes:
      "Aducerea și așezarea focarului pe postament, racordarea la coșul de fum cu tub și rozetă, racordul de aer de ardere și proba de tiraj.",
    excludes:
      "Postamentul, coșul de fum, placarea decorativă și grilele de convecție.",
    measurement: "Numărul de focare montate.",
    resources: [
      focar(1),
      smallMaterials(3),
      instalator(6),
      zidar(2),
      necalificat(2),
    ],
  },
  {
    code: "DV-INC-36",
    category,
    title:
      "Proba de presiune la rece, spălarea și tratarea cu inhibitor a instalației de încălzire",
    unit: "buc",
    includes:
      "Umplerea instalației, proba la 1,5 ori presiunea de lucru menținută 2 ore, verificarea îmbinărilor, golirea, spălarea și reumplerea cu inhibitor de coroziune.",
    measurement: "Numărul de instalații probate, pe locuință sau pe tronson.",
    resources: [inhibitor(1), smallMaterials(2), instalator(4), necalificat(1)],
  },
  {
    code: "DV-INC-37",
    category,
    title:
      "Echilibrarea hidraulică și reglarea instalației, pe corp de încălzire",
    unit: "buc",
    includes:
      "Reglarea detentoarelor și a debitmetrelor după calcul, verificarea temperaturilor de tur și retur și aerisirea finală.",
    measurement: "Numărul de corpuri de încălzire sau circuite reglate.",
    resources: [instalator(0.5)],
  },
  {
    code: "DV-INC-38",
    category,
    title: "Demontarea și remontarea unui radiator pentru lucrări de finisaj",
    unit: "buc",
    includes:
      "Închiderea robineților, golirea radiatorului, demontarea, depozitarea, remontarea cu garnituri noi, umplerea și aerisirea.",
    measurement: "Numărul de radiatoare demontate și remontate.",
    resources: [garnituriRadiator(1), smallMaterials(2), instalator(1.5)],
  },
  {
    code: "DV-INC-39",
    category,
    title:
      "Înlocuirea unui radiator existent cu radiator din oțel tip 22, pe racorduri existente",
    unit: "buc",
    includes:
      "Golirea, demontarea radiatorului vechi, adaptarea racordurilor, montarea radiatorului nou cu console, robinet termostatic și detentor, umplerea și aerisirea.",
    excludes: "Transportul la depozit al radiatorului vechi.",
    measurement: "Numărul de radiatoare înlocuite.",
    resources: [
      radiatorOtel(1),
      consoleRadiator(1),
      robinetTermostatic(1),
      robinetRetur(1),
      smallMaterials(3),
      instalator(3),
      necalificat(0.5),
    ],
  },
];

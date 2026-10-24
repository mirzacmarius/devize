import type { BaseNorm } from "./norm";
import {
  carotiera,
  clema,
  dibluMetalic,
  electrician,
  frigotehnist,
  instalator,
  material,
  necalificat,
  pompaVid,
  robinetSferic,
  smallMaterials,
  spuma,
  tubFlexibil,
} from "./resources";

const category = "Ventilație și climatizare";

// Aparate de aer condiționat, ventilație cu recuperare de căldură,
// tubulatură, guri de aer, ventilatoare și hote.

const split9 = material(
  "Aparat de aer condiționat split inverter, 9000 BTU",
  "set",
  2200,
);
const split12 = material(
  "Aparat de aer condiționat split inverter, 12000 BTU",
  "set",
  2600,
);
const split18 = material(
  "Aparat de aer condiționat split inverter, 18000 BTU",
  "set",
  3800,
);
const multisplit = material(
  "Sistem multisplit inverter cu 2 unități interioare, 2 × 12000 BTU",
  "set",
  6500,
);
const suportSplit = material(
  "Suport metalic pentru unitatea exterioară",
  "set",
  85,
);
const linieFrigorificaMica = material(
  'Linie frigorifică izolată din cupru, 1/4" – 3/8"',
  "m",
  55,
);
const linieFrigorifica = material(
  'Linie frigorifică izolată din cupru, 3/8" – 5/8"',
  "m",
  95,
);
const tubCondens = material("Tub pentru condens Ø16", "m", 3);
const cabluSplit = material("Cablu de interconectare 4 × 1,5 mm²", "m", 6);
const canalMascare = material(
  "Canal de mascare pentru traseul frigorific, 80 × 60 mm",
  "m",
  25,
);
const pompaCondens = material("Pompă de condens pentru split", "buc", 350);
const vmc = material(
  "Unitate de ventilație cu recuperare de căldură, 300 mc/h",
  "buc",
  7500,
);
const tubulaturaVmc = material(
  "Tubulatură flexibilă antibacteriană Ø75 pentru ventilație cu recuperare",
  "m",
  12,
);
const cutieDistributie = material(
  "Cutie de distribuție pentru ventilație, 10 racorduri Ø75",
  "buc",
  650,
);
const valvaAer = material(
  "Valvă de aer cu racord de perete sau de tavan",
  "buc",
  110,
);
const prizaAer = material(
  "Priză de aer și gură de evacuare exterioare, cu plasă",
  "set",
  320,
);
const tubulaturaSpiro = material(
  "Tubulatură circulară din tablă zincată Ø125 – 160",
  "m",
  45,
);
const fitingSpiro = material(
  "Fiting pentru tubulatură circulară (cot, reducție, teu)",
  "buc",
  55,
);
const colier = material(
  "Colier cu cauciuc și tijă pentru tubulatură Ø125 – 160",
  "buc",
  12,
);
const tubulaturaRectangulara = material(
  "Tubulatură rectangulară din tablă zincată, 300 × 200 mm",
  "m",
  95,
);
const izolatieTubulatura = material(
  "Izolație din vată minerală cu folie de aluminiu pentru tubulatură, 30 mm",
  "mp",
  32,
);
const bandaAluminiu = material("Bandă adezivă din aluminiu", "buc", 25);
const tubulaturaFlexibila = material(
  "Tubulatură flexibilă izolată Ø125",
  "m",
  28,
);
const grila = material(
  "Grilă de ventilație din aluminiu cu reglaj, 300 × 150 mm",
  "buc",
  95,
);
const anemostat = material(
  "Anemostat pătrat 600 × 600 mm cu cutie de racord",
  "set",
  220,
);
const ventilatorBaie = material(
  "Ventilator de baie Ø100 cu temporizator",
  "buc",
  180,
);
const tubAluminiu100 = material("Tub flexibil din aluminiu Ø100", "m", 10);
const clapeta100 = material("Clapetă antiretur Ø100", "buc", 35);
const grilaExterior100 = material(
  "Grilă exterioară cu plasă antiinsecte Ø100",
  "buc",
  35,
);
const ventilatorCanal = material("Ventilator în linie Ø125", "buc", 450);
const clapeta125 = material("Clapetă antiretur Ø125", "buc", 45);
const ventilatorAcoperis = material(
  "Ventilator de acoperiș centrifugal, 1000 mc/h",
  "buc",
  2200,
);
const socluVentilator = material(
  "Soclu pentru ventilator de acoperiș",
  "buc",
  450,
);
const hota = material("Hotă de bucătărie decorativă, 60 cm", "buc", 900);
const tubAluminiu125 = material("Tub flexibil din aluminiu Ø125", "m", 12);
const kitEvacuare = material(
  "Kit de evacuare prin perete Ø125 cu grilă antiinsecte",
  "set",
  95,
);
const clapetaAntifoc = material("Clapetă antifoc Ø200 cu fuzibil", "buc", 650);
const perdeaAer = material("Perdea de aer electrică, 1 m", "buc", 2800);
const ventiloconvector = material(
  "Ventiloconvector de perete cu 2 țevi, 2,5 kW",
  "buc",
  2400,
);
const racordInoxMic = material('Racord flexibil din inox, 1/2"', "buc", 35);

function split(
  code: string,
  title: string,
  aparat: ReturnType<typeof material>,
  linie: ReturnType<typeof material>,
  ore: number,
): BaseNorm {
  return {
    code,
    category,
    title,
    unit: "buc",
    includes:
      "Montarea unității interioare pe placa de perete și a unității exterioare pe suport, străpungerea peretelui, traseul frigorific de până la 3 m cu tub de condens și cablu de interconectare, vidarea, proba de etanșeitate, punerea în funcțiune și proba de răcire.",
    excludes:
      "Traseul peste 3 m (DV-VEN-05), pompa de condens (DV-VEN-06), priza sau circuitul electric și schela peste 4 m.",
    measurement: "Numărul de aparate montate.",
    resources: [
      aparat(1),
      suportSplit(1),
      linie(3),
      tubCondens(3),
      cabluSplit(3),
      smallMaterials(2),
      frigotehnist(ore),
      necalificat(1),
      pompaVid(1),
      carotiera(0.3),
    ],
  };
}

export const ventilatie: BaseNorm[] = [
  split(
    "DV-VEN-01",
    "Aparat de aer condiționat split inverter de 9000 BTU, cu montaj și punere în funcțiune",
    split9,
    linieFrigorificaMica,
    4,
  ),
  split(
    "DV-VEN-02",
    "Aparat de aer condiționat split inverter de 12000 BTU, cu montaj și punere în funcțiune",
    split12,
    linieFrigorificaMica,
    4,
  ),
  split(
    "DV-VEN-03",
    "Aparat de aer condiționat split inverter de 18000 BTU, cu montaj și punere în funcțiune",
    split18,
    linieFrigorifica,
    5,
  ),
  {
    code: "DV-VEN-04",
    category,
    title:
      "Sistem multisplit cu 2 unități interioare de 12000 BTU, cu montaj și punere în funcțiune",
    unit: "set",
    includes:
      "Montarea celor două unități interioare și a unității exterioare pe suport, străpungerile, traseele frigorifice de până la 8 m în total cu tuburi de condens și cabluri, vidarea, proba de etanșeitate, punerea în funcțiune.",
    excludes:
      "Traseul peste 8 m (DV-VEN-05), pompele de condens, circuitul electric și schela peste 4 m.",
    measurement: "Numărul de sisteme montate.",
    resources: [
      multisplit(1),
      suportSplit(1),
      linieFrigorificaMica(8),
      tubCondens(8),
      cabluSplit(8),
      smallMaterials(2),
      frigotehnist(10),
      necalificat(2),
      pompaVid(2),
      carotiera(0.6),
    ],
  },
  {
    code: "DV-VEN-05",
    category,
    title:
      "Traseu frigorific suplimentar pentru aparat de aer condiționat, în canal de mascare",
    unit: "m",
    includes:
      "Linia frigorifică izolată, tubul de condens și cablul de interconectare pozate în canal de mascare fixat pe perete.",
    measurement: "Lungimea traseului peste cel inclus în norma aparatului.",
    resources: [
      linieFrigorificaMica(1),
      tubCondens(1),
      cabluSplit(1),
      canalMascare(1),
      smallMaterials(2),
      frigotehnist(0.4),
    ],
  },
  {
    code: "DV-VEN-06",
    category,
    title: "Pompă de condens pentru aparat de aer condiționat, cu montaj",
    unit: "buc",
    includes:
      "Montarea pompei și a rezervorului în canalul de mascare sau în unitate, racordarea la condens și la alimentare, proba de evacuare.",
    measurement: "Numărul de pompe montate.",
    resources: [pompaCondens(1), smallMaterials(2), frigotehnist(1)],
  },
  {
    code: "DV-VEN-07",
    category,
    title:
      "Unitate de ventilație cu recuperare de căldură de 300 mc/h, cu montaj și punere în funcțiune",
    unit: "buc",
    includes:
      "Fixarea unității pe perete sau pe tavan cu ancore, racordarea celor patru tubulaturi, evacuarea condensului cu sifon, legarea electrică, reglarea debitelor pe fiecare valvă și punerea în funcțiune.",
    excludes:
      "Tubulatura și cutiile de distribuție (DV-VEN-08 – DV-VEN-11) și circuitul electric.",
    measurement: "Numărul de unități montate.",
    resources: [
      vmc(1),
      dibluMetalic(4),
      tubCondens(3),
      smallMaterials(3),
      instalator(8),
      electrician(1.5),
      necalificat(2),
    ],
  },
  {
    code: "DV-VEN-08",
    category,
    title:
      "Tubulatură flexibilă antibacteriană Ø75 pentru ventilație cu recuperare, în șapă sau în tavan",
    unit: "m",
    includes:
      "Pozarea tuburilor pe trasee, fixarea cu cleme, îmbinările etanșe cu garnituri și protejarea capetelor până la montarea valvelor.",
    measurement: "Lungimea tubulaturii montate.",
    resources: [tubulaturaVmc(1.05), clema(1.5), instalator(0.15)],
  },
  {
    code: "DV-VEN-09",
    category,
    title:
      "Cutie de distribuție pentru ventilație cu 10 racorduri Ø75, cu montaj",
    unit: "buc",
    includes:
      "Fixarea cutiei, racordarea la tubulatura principală și la tuburile Ø75, obturarea racordurilor nefolosite și etanșarea.",
    measurement: "Numărul de cutii montate.",
    resources: [
      cutieDistributie(1),
      dibluMetalic(2),
      smallMaterials(2),
      instalator(2),
    ],
  },
  {
    code: "DV-VEN-10",
    category,
    title:
      "Valvă de aer de refulare sau de aspirație, cu racord, în perete sau în tavan",
    unit: "buc",
    includes:
      "Montarea racordului în gol, legarea la tubul Ø75, fixarea valvei și reglarea inițială.",
    measurement: "Numărul de valve montate.",
    resources: [valvaAer(1), smallMaterials(2), instalator(0.6)],
  },
  {
    code: "DV-VEN-11",
    category,
    title:
      "Prize de aer exterioare pentru ventilație (admisie și evacuare), prin perete, cu carotare",
    unit: "set",
    includes:
      "Carotarea celor două străpungeri, montarea tuburilor de trecere izolate, a prizei de aer și a gurii de evacuare cu plasă, etanșarea trecerilor.",
    measurement: "Numărul de seturi montate.",
    resources: [
      prizaAer(1),
      spuma(0.5),
      smallMaterials(2),
      instalator(3),
      necalificat(0.5),
      carotiera(1),
    ],
  },
  {
    code: "DV-VEN-12",
    category,
    title:
      "Tubulatură circulară din tablă zincată Ø125 – 160, montată la tavan",
    unit: "m",
    includes:
      "Tăierea la lungime, îmbinarea cu nituri și bandă, fixarea cu coliere pe tije ancorate în tavan și etanșarea îmbinărilor.",
    excludes: "Izolația (DV-VEN-14) și gurile de aer.",
    measurement: "Lungimea tubulaturii montate.",
    resources: [
      tubulaturaSpiro(1.02),
      fitingSpiro(0.3),
      colier(0.7),
      dibluMetalic(0.7),
      bandaAluminiu(0.1),
      instalator(0.5),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-VEN-13",
    category,
    title:
      "Tubulatură rectangulară din tablă zincată 300 × 200 mm, montată la tavan",
    unit: "m",
    includes:
      "Îmbinarea tronsoanelor cu flanșe și garnituri, suspendarea pe profile și tije ancorate în tavan și etanșarea.",
    excludes: "Izolația (DV-VEN-14) și gurile de aer.",
    measurement: "Lungimea tubulaturii montate.",
    resources: [
      tubulaturaRectangulara(1.02),
      dibluMetalic(1.4),
      smallMaterials(3),
      instalator(0.8),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-VEN-14",
    category,
    title:
      "Izolarea tubulaturii de ventilație cu vată minerală cu folie de aluminiu, 30 mm",
    unit: "mp",
    includes:
      "Tăierea și înfășurarea saltelei pe tubulatură, fixarea și închiderea rosturilor cu bandă din aluminiu.",
    measurement: "Suprafața desfășurată a tubulaturii izolate.",
    resources: [izolatieTubulatura(1.1), bandaAluminiu(0.3), instalator(0.4)],
  },
  {
    code: "DV-VEN-15",
    category,
    title: "Tubulatură flexibilă izolată Ø125, montată în tavan",
    unit: "m",
    includes:
      "Întinderea tubului, racordarea la tubulatura rigidă sau la gurile de aer cu coliere și bandă, suspendarea cu benzi.",
    measurement: "Lungimea tubulaturii montate.",
    resources: [
      tubulaturaFlexibila(1.05),
      bandaAluminiu(0.1),
      smallMaterials(2),
      instalator(0.25),
    ],
  },
  {
    code: "DV-VEN-16",
    category,
    title:
      "Grilă de ventilație din aluminiu cu reglaj, 300 × 150 mm, cu montaj",
    unit: "buc",
    includes:
      "Decuparea sau racordarea la tubulatură, fixarea grilei și reglarea lamelelor.",
    measurement: "Numărul de grile montate.",
    resources: [grila(1), smallMaterials(2), instalator(0.6)],
  },
  {
    code: "DV-VEN-17",
    category,
    title: "Anemostat 600 × 600 mm cu cutie de racord, în tavan casetat",
    unit: "buc",
    includes:
      "Montarea cutiei de racord cu suspendare, legarea la tubulatura flexibilă, montarea anemostatului în caseta tavanului și reglarea.",
    measurement: "Numărul de anemostate montate.",
    resources: [anemostat(1), smallMaterials(2), instalator(1.2)],
  },
  {
    code: "DV-VEN-18",
    category,
    title:
      "Ventilator de baie Ø100 cu temporizator, cu tub, clapetă și grilă exterioară",
    unit: "buc",
    includes:
      "Carotarea sau racordarea la golul existent, montarea ventilatorului, a tubului flexibil, a clapetei antiretur și a grilei exterioare, legarea la circuitul de iluminat și proba.",
    measurement: "Numărul de ventilatoare montate.",
    resources: [
      ventilatorBaie(1),
      tubAluminiu100(2),
      clapeta100(1),
      grilaExterior100(1),
      smallMaterials(2),
      electrician(1),
      carotiera(0.3),
    ],
  },
  {
    code: "DV-VEN-19",
    category,
    title:
      "Ventilator în linie Ø125 cu clapetă antiretur, montat pe tubulatură",
    unit: "buc",
    includes:
      "Montarea ventilatorului pe tubulatură cu coliere și suspendare, a clapetei antiretur, legarea electrică și proba.",
    excludes: "Circuitul electric și tubulatura.",
    measurement: "Numărul de ventilatoare montate.",
    resources: [
      ventilatorCanal(1),
      clapeta125(1),
      tubFlexibil(3),
      smallMaterials(2),
      electrician(1.5),
      instalator(0.5),
    ],
  },
  {
    code: "DV-VEN-20",
    category,
    title: "Ventilator de acoperiș centrifugal de 1000 mc/h, pe soclu",
    unit: "buc",
    includes:
      "Montarea soclului pe acoperiș cu etanșarea trecerii, a ventilatorului pe soclu, racordarea la tubulatura de evacuare, legarea electrică și proba.",
    excludes: "Circuitul electric și tubulatura.",
    measurement: "Numărul de ventilatoare montate.",
    resources: [
      ventilatorAcoperis(1),
      socluVentilator(1),
      smallMaterials(3),
      instalator(4),
      electrician(1.5),
      necalificat(1),
    ],
  },
  {
    code: "DV-VEN-21",
    category,
    title:
      "Hotă de bucătărie decorativă de 60 cm, cu tub de evacuare prin perete",
    unit: "buc",
    includes:
      "Fixarea hotei și a hornului decorativ, tubul flexibil de evacuare, carotarea peretelui, kitul de evacuare cu grilă antiinsecte, legarea la priză și proba.",
    excludes: "Priza (categoria Instalații electrice).",
    measurement: "Numărul de hote montate.",
    resources: [
      hota(1),
      tubAluminiu125(2),
      kitEvacuare(1),
      smallMaterials(2),
      instalator(1.5),
      electrician(0.5),
      carotiera(0.3),
    ],
  },
  {
    code: "DV-VEN-22",
    category,
    title:
      "Clapetă antifoc Ø200 cu fuzibil, montată pe tubulatură la trecerea prin perete",
    unit: "buc",
    includes:
      "Montarea clapetei în golul din perete, racordarea tubulaturii de ambele părți, etanșarea cu mortar rezistent la foc și proba de declanșare.",
    measurement: "Numărul de clapete montate.",
    resources: [
      clapetaAntifoc(1),
      smallMaterials(3),
      instalator(1.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-VEN-23",
    category,
    title: "Perdea de aer electrică de 1 m, montată deasupra ușii",
    unit: "buc",
    includes:
      "Fixarea consolelor cu ancore, montarea perdelei, legarea electrică și la contactul de ușă, proba.",
    excludes: "Circuitul electric.",
    measurement: "Numărul de perdele montate.",
    resources: [
      perdeaAer(1),
      dibluMetalic(4),
      smallMaterials(2),
      electrician(2),
      instalator(1),
      necalificat(1),
    ],
  },
  {
    code: "DV-VEN-24",
    category,
    title:
      "Ventiloconvector de perete cu 2 țevi de 2,5 kW, cu montaj și racordare",
    unit: "buc",
    includes:
      "Fixarea pe perete, racordarea hidraulică cu robineți de izolare și racorduri flexibile, tubul de condens, legarea electrică și proba.",
    excludes: "Conductele de agent termic și circuitul electric.",
    measurement: "Numărul de ventiloconvectoare montate.",
    resources: [
      ventiloconvector(1),
      robinetSferic(2),
      racordInoxMic(2),
      tubCondens(3),
      dibluMetalic(4),
      smallMaterials(2),
      instalator(4),
      electrician(1),
    ],
  },
];

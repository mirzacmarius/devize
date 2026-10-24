import type { BaseNorm } from "./norm";
import {
  accesoriuJgheab,
  aparatSpalat,
  automacara,
  bandaFolii,
  betonC16,
  bratariBurlan,
  burlan,
  carligJgheab,
  cherestea,
  clemaTigla,
  cotBurlan,
  cuie,
  dulgher,
  elementeImbinare,
  folieAnticondens,
  gazPropan,
  instalator,
  invelitor,
  izolator,
  jgheab,
  lazura,
  lemnEcarisat,
  material,
  membranaSbs4,
  montatorTamplarie,
  necalificat,
  placaOsb,
  smallMaterials,
  solutieLemn,
  surubLemn,
  surubTabla,
  tiglaCeramica,
  tiglaMetalica,
  tinichigiu,
  vopsitor,
} from "./resources";

const category = "Acoperișuri";

const sindrila = material("Șindrilă bituminoasă", "mp", 32);
const membranaBaza = material("Membrană de bază pentru șindrilă", "mp", 6);
const cuieSindrila = material("Cuie cu cap lat pentru șindrilă", "kg", 10);
const adezivSindrila = material("Adeziv bituminos pentru șindrilă", "kg", 14);
const tablaFaltuita = material(
  "Tablă fălțuită zincată vopsită, 0,5 mm",
  "mp",
  58,
);
const folieStructurata = material(
  "Folie structurată de separare pentru tablă fălțuită",
  "mp",
  9,
);
const agrafe = material("Agrafe pentru tablă fălțuită", "buc", 0.5);
const panouSandwich = material(
  "Panou sandwich de acoperiș cu poliuretan, 50 mm",
  "mp",
  110,
);
const surubPanou = material(
  "Șurub autoforant lung pentru panouri sandwich",
  "buc",
  1.2,
);
const bandaButilica = material("Bandă de etanșare butilică", "m", 3);
const tablaCutata = material(
  "Tablă cutată zincată vopsită T18, 0,5 mm",
  "mp",
  38,
);
const tiglaBeton = material("Țiglă de beton", "buc", 4);
const coama = material("Coamă ceramică sau de beton", "buc", 14);
const bandaCoama = material("Bandă de coamă ventilată", "m", 18);
const suportCoama = material("Suport de șipcă pentru coamă", "buc", 6);
const surubCoama = material("Șurub cu clemă pentru coame", "buc", 3);
const dolie = material("Dolie din tablă vopsită, 50 cm", "m", 45);
const profilStreasina = material(
  "Profil de tablă vopsită pentru streașină și fronton",
  "m",
  25,
);
const parazapada = material("Parazăpadă din tablă vopsită", "m", 45);
const suportParazapada = material("Suport de parazăpadă", "buc", 12);
const fereastraMansarda = material(
  "Fereastră de mansardă de 78 × 118 cm, cu ramă de etanșare",
  "buc",
  2400,
);
const luminator = material(
  "Luminator cupolă de 100 × 100 cm, cu soclu",
  "buc",
  1900,
);
const kitCos = material(
  "Kit de etanșare pentru trecerea coșului prin învelitoare",
  "set",
  350,
);
const masticAcoperis = material(
  "Mastic de etanșare pentru acoperișuri, cartuș",
  "buc",
  28,
);
const aerator = material("Aerator de acoperiș", "buc", 180);
const lambriu = material("Lambriu din lemn pentru streașină", "mp", 48);
const pazie = material("Pazie din lemn de rășinoase, 20 × 200 mm", "m", 25);
const jgheabPvc = material("Jgheab din PVC, cu cârlige și accesorii", "m", 32);
const burlanPvc = material("Burlan din PVC, cu brățări și coturi", "m", 30);
const titanZinc = material(
  "Jgheab sau burlan din titan-zinc, cu accesorii",
  "m",
  110,
);
const racordBurlan = material(
  "Piesă de racord a burlanului la canalizare, cu sifon",
  "buc",
  140,
);
const treaptaAcoperis = material("Treaptă de acoperiș pentru coșar", "buc", 95);
const solutieMuschi = material(
  "Soluție antimușchi pentru acoperișuri",
  "l",
  25,
);

export const acoperisuri: BaseNorm[] = [
  {
    code: "DV-ACO-01",
    category,
    title: "Șarpantă din lemn ecarisat de rășinoase, confecționată și montată",
    unit: "mc",
    includes:
      "Trasarea, tăierea și îmbinarea elementelor, ridicarea lor și montarea cu cuie și elemente metalice de îmbinare.",
    excludes: "Tratarea lemnului; ancorarea în centuri.",
    measurement: "Volumul lemnului din șarpantă, după proiect.",
    resources: [
      lemnEcarisat(1.08),
      cuie(4),
      elementeImbinare(6),
      dulgher(18),
      necalificat(6),
    ],
  },
  {
    code: "DV-ACO-02",
    category,
    title: "Tratarea lemnului cu soluție ignifugă și insecto-fungicidă",
    unit: "mp",
    includes:
      "Aplicarea soluției cu pensula, în două straturi, pe toate fețele.",
    measurement: "Suprafața desfășurată a lemnului tratat.",
    resources: [solutieLemn(0.35), vopsitor(0.08), necalificat(0.02)],
  },
  {
    code: "DV-ACO-03",
    category,
    title:
      "Învelitoare din țiglă metalică, cu folie anticondens, șipci și contrașipci",
    unit: "mp",
    includes:
      "Montarea foliei, a contrașipcilor și a șipcilor, montarea foilor de țiglă și fixarea lor cu șuruburi.",
    excludes: "Coamele, doliile, bordurile, șorțurile și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      folieAnticondens(1.15),
      cherestea(0.007),
      cuie(0.05),
      tiglaMetalica(1.12),
      surubTabla(8),
      smallMaterials(2),
      invelitor(0.45),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-ACO-04",
    category,
    title:
      "Învelitoare din țiglă ceramică, cu folie anticondens, șipci și contrașipci",
    unit: "mp",
    includes:
      "Montarea foliei, a contrașipcilor și a șipcilor, așezarea țiglelor și prinderea lor cu cleme.",
    excludes:
      "Coamele, doliile, accesoriile de ventilație și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      folieAnticondens(1.15),
      cherestea(0.007),
      cuie(0.05),
      tiglaCeramica(11.5),
      clemaTigla(4),
      smallMaterials(2),
      invelitor(0.75),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-ACO-05",
    category,
    title: "Jgheab semicircular din tablă vopsită, cu cârlige și accesorii",
    unit: "m",
    includes:
      "Fixarea cârligelor cu pantă spre burlane, montarea jgheabului, a îmbinărilor, a capacelor și a racordurilor.",
    measurement: "Lungimea jgheabului.",
    resources: [
      jgheab(1.05),
      carligJgheab(1.5),
      accesoriuJgheab(0.3),
      tinichigiu(0.45),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-ACO-06",
    category,
    title: "Burlan din tablă vopsită, cu brățări și coturi",
    unit: "m",
    includes: "Fixarea brățărilor, montarea burlanului și a coturilor.",
    measurement: "Lungimea burlanului.",
    resources: [
      burlan(1.05),
      bratariBurlan(0.7),
      cotBurlan(0.2),
      tinichigiu(0.35),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-ACO-07",
    category,
    title: "Astereală din scânduri de rășinoase de 24 mm, pe căpriori",
    unit: "mp",
    includes:
      "Tăierea și baterea scândurilor pe căpriori, cu rosturile de 1 cm, și tăieturile la margini.",
    measurement: "Suprafața asterelii, măsurată pe pantă.",
    resources: [cherestea(0.027), cuie(0.1), dulgher(0.35), necalificat(0.15)],
  },
  {
    code: "DV-ACO-08",
    category,
    title: "Astereală din plăci OSB 3 de 18 mm, pe căpriori",
    unit: "mp",
    includes:
      "Așezarea plăcilor cu rosturile decalate și cu distanța de dilatare, înșurubarea lor pe căpriori și tăieturile.",
    measurement: "Suprafața asterelii, măsurată pe pantă.",
    resources: [placaOsb(1.08), surubLemn(20), dulgher(0.3), necalificat(0.12)],
  },
  {
    code: "DV-ACO-09",
    category,
    title:
      "Învelitoare din șindrilă bituminoasă pe astereală, cu membrană de bază",
    unit: "mp",
    includes:
      "Montarea membranei de bază, a rândului de pornire și a șindrilei bătute în cuie, lipirea la margini și la străpungeri.",
    excludes: "Astereala; coamele și doliile; sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      membranaBaza(1.1),
      sindrila(1.1),
      cuieSindrila(0.08),
      adezivSindrila(0.2),
      invelitor(0.55),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-ACO-10",
    category,
    title:
      "Învelitoare din tablă fălțuită pe astereală, cu folie structurată de separare",
    unit: "mp",
    includes:
      "Așezarea foliei structurate, profilarea și montarea fâșiilor de tablă cu agrafe, închiderea falțurilor, racordurile la margini.",
    excludes: "Astereala; doliile și șorțurile; sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      folieStructurata(1.1),
      tablaFaltuita(1.15),
      agrafe(6),
      tinichigiu(0.9),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-ACO-11",
    category,
    title: "Învelitoare din panouri sandwich de 50 mm, pe pane metalice",
    unit: "mp",
    includes:
      "Ridicarea și așezarea panourilor, fixarea cu șuruburi lungi în pane, banda butilică la suprapuneri și închiderile la margini.",
    excludes: "Panele; coamele, doliile și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      panouSandwich(1.08),
      surubPanou(4),
      bandaButilica(1.5),
      tinichigiu(0.3),
      necalificat(0.2),
      automacara(0.01),
    ],
  },
  {
    code: "DV-ACO-12",
    category,
    title: "Învelitoare din tablă cutată zincată vopsită, pe șipci sau pane",
    unit: "mp",
    includes:
      "Montarea foilor cu suprapuneri și fixarea lor cu șuruburi cu garnitură, tăieturile la margini.",
    excludes: "Șipcile și folia; coamele și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      tablaCutata(1.1),
      surubTabla(7),
      tinichigiu(0.3),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-ACO-13",
    category,
    title:
      "Învelitoare din țiglă de beton, cu folie anticondens, șipci și contrașipci",
    unit: "mp",
    includes:
      "Montarea foliei, a contrașipcilor și a șipcilor, așezarea țiglelor și prinderea lor cu cleme.",
    excludes:
      "Coamele, doliile, accesoriile de ventilație și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      folieAnticondens(1.15),
      cherestea(0.007),
      cuie(0.05),
      tiglaBeton(10.5),
      clemaTigla(3),
      smallMaterials(2),
      invelitor(0.7),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-ACO-14",
    category,
    title: "Coame și muchii cu bandă ventilată, pe suporți de șipcă",
    unit: "m",
    includes:
      "Montarea suporților și a șipcii de coamă, banda ventilată, așezarea coamelor și fixarea lor cu șuruburi cu clemă.",
    measurement: "Lungimea coamelor și a muchiilor.",
    resources: [
      coama(3),
      bandaCoama(1.05),
      suportCoama(1.2),
      surubCoama(3),
      cherestea(0.002),
      invelitor(0.5),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-ACO-15",
    category,
    title: "Dolii din tablă vopsită, cu bandă de etanșare",
    unit: "m",
    includes:
      "Astereala doliei, montarea doliei cu agrafe și suprapuneri, banda de etanșare pe margini, tăierea învelitorii pe contur.",
    measurement: "Lungimea doliilor.",
    resources: [
      dolie(1.05),
      bandaButilica(2),
      cherestea(0.004),
      smallMaterials(3),
      tinichigiu(0.45),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-ACO-16",
    category,
    title: "Șorț de streașină sau bordură de fronton din tablă vopsită",
    unit: "m",
    includes: "Montarea profilului cu suprapuneri și fixarea lui cu șuruburi.",
    measurement: "Lungimea profilelor.",
    resources: [
      profilStreasina(1.05),
      surubTabla(3),
      tinichigiu(0.25),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ACO-17",
    category,
    title: "Parazăpezi din tablă vopsită, pe suporți",
    unit: "m",
    includes:
      "Fixarea suporților în șipci sau căpriori, montarea parazăpezii cu îmbinările ei.",
    measurement: "Lungimea parazăpezilor.",
    resources: [parazapada(1.05), suportParazapada(1.5), tinichigiu(0.35)],
  },
  {
    code: "DV-ACO-18",
    category,
    title:
      "Fereastră de mansardă de 78 × 118 cm, cu ramă de etanșare, montată în învelitoare",
    unit: "buc",
    includes:
      "Decuparea învelitorii și a foliei, cadrul de rezemare, montarea ferestrei și a ramei de etanșare, racordarea foliei și a învelitorii, reglarea.",
    excludes: "Finisarea golului la interior; rulourile și jaluzelele.",
    measurement: "Numărul de ferestre.",
    resources: [
      fereastraMansarda(1),
      cherestea(0.01),
      folieAnticondens(2),
      bandaFolii(5),
      montatorTamplarie(3),
      invelitor(1.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-ACO-19",
    category,
    title: "Luminator cupolă de 100 × 100 cm, cu soclu, montat pe terasă",
    unit: "buc",
    includes:
      "Fixarea soclului, racordarea hidroizolației pe soclu cu membrană lipită, montarea cupolei și etanșările.",
    excludes: "Golul în planșeu; finisarea golului la interior.",
    measurement: "Numărul de luminatoare.",
    resources: [
      luminator(1),
      membranaSbs4(2.5),
      gazPropan(0.3),
      montatorTamplarie(2),
      izolator(1),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-ACO-20",
    category,
    title:
      "Etanșarea trecerii coșului de fum prin învelitoare, cu kit de racord",
    unit: "buc",
    includes:
      "Tăierea învelitorii pe conturul coșului, montarea șorțurilor și a benzilor de racord, profilul de închidere și masticul.",
    measurement: "Numărul de coșuri racordate.",
    resources: [kitCos(1), masticAcoperis(1), tinichigiu(2), necalificat(0.5)],
  },
  {
    code: "DV-ACO-21",
    category,
    title: "Aerator de acoperiș sau ieșire de ventilație prin învelitoare",
    unit: "buc",
    includes:
      "Decuparea învelitorii și a foliei, montarea piesei de trecere și a aeratorului, etanșările.",
    measurement: "Numărul de aeratoare.",
    resources: [aerator(1), invelitor(0.7)],
  },
  {
    code: "DV-ACO-22",
    category,
    title: "Lambriu din lemn la streașină, pe rame, lăcuit",
    unit: "mp",
    includes:
      "Ramele din șipci fixate de căpriori, montarea lambriului cu cuie sau șuruburi, profilele de margine și două straturi de lazură.",
    measurement: "Suprafața lambriului, măsurată pe față.",
    resources: [
      lambriu(1.1),
      cherestea(0.004),
      cuie(0.05),
      surubLemn(10),
      lazura(0.25),
      dulgher(0.6),
      vopsitor(0.25),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-ACO-23",
    category,
    title: "Pazie din lemn de rășinoase, lăcuită, pe capetele căpriorilor",
    unit: "m",
    includes:
      "Tăierea capetelor căpriorilor la linie, montarea paziei cu șuruburi și două straturi de lazură.",
    measurement: "Lungimea paziei.",
    resources: [
      pazie(1.05),
      surubLemn(4),
      lazura(0.05),
      dulgher(0.25),
      vopsitor(0.08),
    ],
  },
  {
    code: "DV-ACO-24",
    category,
    title:
      "Șipci și contrașipci pe căpriori, cu folie anticondens, fără învelitoare",
    unit: "mp",
    includes:
      "Întinderea foliei cu suprapuneri, baterea contrașipcilor peste folie și a șipcilor la distanța țiglei.",
    excludes: "Învelitoarea.",
    measurement: "Suprafața acoperișului, măsurată pe pantă.",
    resources: [
      folieAnticondens(1.15),
      cherestea(0.007),
      cuie(0.05),
      dulgher(0.25),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-ACO-25",
    category,
    title: "Jgheab din PVC, cu cârlige și accesorii",
    unit: "m",
    includes:
      "Fixarea cârligelor cu pantă spre burlane, montarea jgheabului, a îmbinărilor cu garnitură, a capacelor și a racordurilor.",
    measurement: "Lungimea jgheabului.",
    resources: [jgheabPvc(1.05), tinichigiu(0.4), necalificat(0.1)],
  },
  {
    code: "DV-ACO-26",
    category,
    title: "Burlan din PVC, cu brățări și coturi",
    unit: "m",
    includes: "Fixarea brățărilor, montarea burlanului și a coturilor.",
    measurement: "Lungimea burlanului.",
    resources: [burlanPvc(1.05), tinichigiu(0.3), necalificat(0.1)],
  },
  {
    code: "DV-ACO-27",
    category,
    title: "Jgheab sau burlan din titan-zinc, cu accesorii, lipit cu cositor",
    unit: "m",
    includes:
      "Fixarea cârligelor sau a brățărilor, montarea elementelor, îmbinările lipite cu cositor și racordurile.",
    measurement: "Lungimea jgheaburilor și a burlanelor.",
    resources: [titanZinc(1.05), tinichigiu(0.6), necalificat(0.1)],
  },
  {
    code: "DV-ACO-28",
    category,
    title: "Racordul burlanului la canalizarea pluvială, cu piesă cu sifon",
    unit: "buc",
    includes:
      "Săpătura mică, montarea piesei de racord pe conducta pluvială, îmbinarea cu burlanul și fixarea ei în beton.",
    excludes: "Conducta de canalizare pluvială.",
    measurement: "Numărul de racorduri.",
    resources: [
      racordBurlan(1),
      betonC16(0.02),
      instalator(0.8),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-ACO-29",
    category,
    title: "Trepte de acoperiș pentru coșar, montate pe șipci",
    unit: "buc",
    includes: "Fixarea suportului în șipci și montarea treptei.",
    measurement: "Numărul de trepte.",
    resources: [treaptaAcoperis(1), invelitor(0.4)],
  },
  {
    code: "DV-ACO-30",
    category,
    title: "Curățarea învelitorii cu apă sub presiune și tratament antimușchi",
    unit: "mp",
    includes:
      "Spălarea cu presiune de sus în jos, îndepărtarea resturilor din jgheaburi și aplicarea soluției antimușchi.",
    excludes: "Schela sau platforma; reparațiile învelitorii.",
    measurement: "Suprafața învelitorii curățate, măsurată pe pantă.",
    resources: [solutieMuschi(0.1), necalificat(0.12), aparatSpalat(0.05)],
  },
];

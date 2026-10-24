import type { BaseNorm } from "./norm";
import {
  amorsaEpoxidica,
  ancoraChimica,
  aparatSpalat,
  betonC25,
  betoniera,
  betonist,
  caramidaPlina,
  carotiera,
  cherestea,
  ciment,
  ciocanDemolator,
  cuie,
  dulgher,
  equipment,
  fierar,
  izolator,
  lacatus,
  material,
  mortarReparatii,
  mortarZidarie,
  necalificat,
  otelBeton,
  plasaSudata,
  polizor,
  rotopercutor,
  sacMoloz,
  smallMaterials,
  vibrator,
  zidar,
  zugrav,
} from "./resources";

const category = "Reparații și consolidări";

// Reparații la beton și zidărie, injectări, cămășuieli, fibre de carbon,
// subzidiri și pregătirea suprafețelor la clădiri existente.

const rasinaEpoxidica = material(
  "Rășină epoxidică de injectare pentru fisuri, cartuș de 400 ml",
  "buc",
  180,
);
const rasinaPoliuretanica = material(
  "Rășină poliuretanică de injectare pentru fisuri cu infiltrații, cartuș de 400 ml",
  "buc",
  160,
);
const packer = material("Packer de injectare", "buc", 6);
const pompaInjectare = equipment("Pompă de injectare", "ora", 25);
const punteArmaturi = material(
  "Punte de aderență și protecție anticorozivă pentru armături",
  "kg",
  28,
);
const punteAderenta = material(
  "Punte de aderență pentru beton vechi-nou",
  "kg",
  18,
);
const mortarR4 = material(
  "Mortar de reparații pentru beton, clasa R4, fibroarmat",
  "kg",
  4.8,
);
const masinaTorcret = equipment("Mașină de torcretat", "ora", 60);
const tesaturaCarbon = material(
  "Țesătură din fibre de carbon unidirecțională, 300 g/mp",
  "mp",
  180,
);
const rasinaLaminare = material("Rășină epoxidică de laminare", "kg", 95);
const lamelaCarbon = material(
  "Lamelă din fibre de carbon, 50 × 1,2 mm",
  "m",
  95,
);
const adezivLamela = material("Adeziv epoxidic pentru lamele", "kg", 90);
const pastaEtansare = material(
  "Pastă epoxidică pentru etanșarea fisurilor",
  "kg",
  70,
);
const popMetalic = equipment("Pop metalic reglabil, chirie pe zi", "zi", 4);
const buiandrug = material(
  "Buiandrug prefabricat din beton armat, 1,5 m",
  "buc",
  120,
);
const tirant = material(
  "Tirant din oțel Ø20 cu plăci de ancoraj și piulițe",
  "m",
  65,
);
const aditivInjectare = material(
  "Aditiv superplastifiant pentru lapte de ciment",
  "l",
  15,
);
const hidrofobizant = material(
  "Hidrofobizant siliconic pentru fațade",
  "l",
  28,
);
const instalatieSablare = equipment("Instalație de sablare", "ora", 90);
const nisipSablare = material("Nisip de sablare", "kg", 0.6);

export const reparatii: BaseNorm[] = [
  {
    code: "DV-REP-01",
    category,
    title: "Injectarea fisurilor în beton cu rășină epoxidică, prin packere",
    unit: "m",
    includes:
      "Curățarea fisurii, montarea packerelor la 25 cm, etanșarea fisurii la suprafață, injectarea rășinii până la refuz, scoaterea packerelor și finisarea găurilor.",
    measurement: "Lungimea fisurilor injectate.",
    resources: [
      rasinaEpoxidica(0.5),
      packer(4),
      pastaEtansare(0.3),
      smallMaterials(3),
      betonist(1),
      pompaInjectare(0.3),
      rotopercutor(0.2),
    ],
  },
  {
    code: "DV-REP-02",
    category,
    title:
      "Injectarea fisurilor cu infiltrații de apă cu rășină poliuretanică, prin packere",
    unit: "m",
    includes:
      "Forarea găurilor în alternanță, montarea packerelor, injectarea rășinii expandabile, scoaterea packerelor și închiderea găurilor cu mortar rapid.",
    measurement: "Lungimea fisurilor injectate.",
    resources: [
      rasinaPoliuretanica(0.6),
      packer(4),
      mortarReparatii(1),
      izolator(1),
      pompaInjectare(0.3),
      rotopercutor(0.2),
    ],
  },
  {
    code: "DV-REP-03",
    category,
    title:
      "Reparații locale la beton cu mortar R3, până la 3 cm grosime, cu tratarea armăturilor",
    unit: "mp",
    includes:
      "Îndepărtarea betonului degradat până la suport sănătos, curățarea armăturilor de rugină, protecția lor anticorozivă, puntea de aderență și aplicarea mortarului în straturi, finisarea.",
    measurement: "Suprafața reparată.",
    resources: [
      mortarReparatii(55),
      punteArmaturi(0.5),
      betonist(1.2),
      necalificat(0.5),
      ciocanDemolator(0.3),
    ],
  },
  {
    code: "DV-REP-04",
    category,
    title:
      "Reparații structurale la beton cu mortar R4 fibroarmat, până la 5 cm grosime",
    unit: "mp",
    includes:
      "Îndepărtarea betonului degradat, curățarea și protecția armăturilor, puntea de aderență, aplicarea mortarului R4 în straturi și finisarea.",
    measurement: "Suprafața reparată.",
    resources: [
      mortarR4(90),
      punteArmaturi(0.6),
      betonist(1.6),
      necalificat(0.6),
      ciocanDemolator(0.4),
    ],
  },
  {
    code: "DV-REP-05",
    category,
    title:
      "Cămășuirea stâlpilor sau a pereților cu plasă sudată și mortar torcretat, 4 cm",
    unit: "mp",
    includes:
      "Asperizarea suprafeței, conectorii din oțel ancorați chimic, montarea plasei sudate, torcretarea mortarului în două straturi și finisarea.",
    excludes: "Desfacerea tencuielilor existente (categoria Demolări).",
    measurement: "Suprafața cămășuită.",
    resources: [
      plasaSudata(4),
      otelBeton(1),
      ancoraChimica(0.2),
      mortarR4(80),
      betonist(1.8),
      fierar(0.5),
      necalificat(0.8),
      masinaTorcret(0.1),
      rotopercutor(0.2),
    ],
  },
  {
    code: "DV-REP-06",
    category,
    title: "Consolidare cu țesătură din fibre de carbon, un strat, pe beton",
    unit: "mp",
    includes:
      "Șlefuirea și rotunjirea muchiilor, amorsa epoxidică, aplicarea rășinii de laminare, așezarea și impregnarea țesăturii, stratul de închidere.",
    excludes: "Protecția la foc și finisajul.",
    measurement: "Suprafața acoperită cu țesătură.",
    resources: [
      tesaturaCarbon(1.1),
      rasinaLaminare(1.2),
      amorsaEpoxidica(0.3),
      betonist(1.2),
      necalificat(0.3),
      polizor(0.2),
    ],
  },
  {
    code: "DV-REP-07",
    category,
    title: "Lamelă din fibre de carbon lipită pe grindă sau planșeu",
    unit: "m",
    includes:
      "Șlefuirea suportului, aplicarea adezivului epoxidic pe suport și pe lamelă, presarea lamelei și îndepărtarea excesului.",
    measurement: "Lungimea lamelelor montate.",
    resources: [
      lamelaCarbon(1.02),
      adezivLamela(0.35),
      amorsaEpoxidica(0.05),
      betonist(0.6),
      polizor(0.1),
    ],
  },
  {
    code: "DV-REP-08",
    category,
    title:
      "Suprabetonare de planșeu existent cu beton armat de 6 cm, cu conectori ancorați chimic",
    unit: "mp",
    includes:
      "Curățarea și asperizarea planșeului, conectorii din oțel ancorați chimic, plasa sudată, puntea de aderență, turnarea și vibrarea betonului, nivelarea.",
    excludes: "Desfacerea pardoselii existente (categoria Demolări).",
    measurement: "Suprafața suprabetonată.",
    resources: [
      plasaSudata(4),
      otelBeton(0.3),
      ancoraChimica(0.08),
      punteAderenta(0.3),
      betonC25(0.065),
      betonist(0.5),
      fierar(0.15),
      necalificat(0.3),
      vibrator(0.1),
      rotopercutor(0.1),
    ],
  },
  {
    code: "DV-REP-09",
    category,
    title: "Subzidirea fundațiilor pe tronsoane de 1 m, cu beton armat C25/30",
    unit: "mc",
    includes:
      "Săpătura manuală pe tronsoane alternante, sprijinirile, armarea, cofrarea laterală, turnarea și vibrarea betonului, matarea rostului cu fundația existentă și decofrarea.",
    excludes: "Evacuarea pământului (categoria Terasamente).",
    measurement: "Volumul de beton turnat.",
    resources: [
      betonC25(1.05),
      otelBeton(60),
      cherestea(0.05),
      cuie(0.5),
      popMetalic(10),
      betonist(4),
      fierar(2),
      dulgher(1.5),
      necalificat(10),
      betoniera(1),
      vibrator(0.5),
    ],
  },
  {
    code: "DV-REP-10",
    category,
    title:
      "Înlocuirea unui buiandrug deteriorat cu buiandrug prefabricat, deschidere până la 1 m",
    unit: "buc",
    includes:
      "Sprijinirea provizorie a zidăriei, desfacerea buiandrugului vechi, montarea celui nou pe pat de mortar, rezidirea cu cărămidă plină, scoaterea sprijinirilor și evacuarea molozului.",
    excludes: "Tencuiala de refacere.",
    measurement: "Numărul de buiandrugi înlocuiți.",
    resources: [
      buiandrug(1),
      caramidaPlina(20),
      mortarZidarie(0.03),
      popMetalic(6),
      sacMoloz(0.5),
      zidar(4),
      necalificat(3),
      ciocanDemolator(1),
    ],
  },
  {
    code: "DV-REP-11",
    category,
    title:
      "Țeserea și repararea zidăriei fisurate cu cărămidă plină, pe tronsoane, pe grosimea de 1/2 cărămidă (12,5 cm)",
    unit: "mp",
    includes:
      "Desfacerea zidăriei fisurate în trepte, curățarea, rezidirea țesută cu cărămidă plină și agrafe din oțel, umplerea rosturilor.",
    excludes: "Tencuiala de refacere.",
    measurement:
      "Suprafața de zidărie refăcută, pe grosimea de 12,5 cm; pentru zidurile de o cărămidă se dublează cantitățile.",
    resources: [
      caramidaPlina(60),
      mortarZidarie(0.05),
      otelBeton(2),
      zidar(2.5),
      necalificat(1.5),
      ciocanDemolator(0.5),
    ],
  },
  {
    code: "DV-REP-12",
    category,
    title: "Tirant din oțel Ø20 prin zidărie, cu plăci de ancoraj, tensionat",
    unit: "m",
    includes:
      "Carotarea traseului, introducerea tirantului, montarea plăcilor de ancoraj și a piulițelor, tensionarea și protecția anticorozivă a capetelor.",
    measurement: "Lungimea tiranților.",
    resources: [
      tirant(1.02),
      smallMaterials(2),
      lacatus(0.6),
      necalificat(0.4),
      carotiera(0.3),
    ],
  },
  {
    code: "DV-REP-13",
    category,
    title: "Consolidarea zidăriei prin injectare cu lapte de ciment aditivat",
    unit: "mp",
    includes:
      "Forarea găurilor în rețea, montarea packerelor, spălarea, injectarea laptelui de ciment cu aditiv până la refuz și închiderea găurilor.",
    measurement: "Suprafața de zidărie injectată.",
    resources: [
      ciment(8),
      aditivInjectare(0.2),
      packer(6),
      zidar(1),
      necalificat(0.5),
      pompaInjectare(0.4),
      rotopercutor(0.3),
    ],
  },
  {
    code: "DV-REP-14",
    category,
    title: "Ancorarea barelor de armătură în beton existent cu ancoră chimică",
    unit: "buc",
    includes:
      "Forarea găurii la diametrul și adâncimea cerute, curățarea cu perie și aer, injectarea ancorei chimice și introducerea barei.",
    measurement: "Numărul de bare ancorate.",
    resources: [
      otelBeton(0.8),
      ancoraChimica(0.15),
      fierar(0.2),
      rotopercutor(0.1),
    ],
  },
  {
    code: "DV-REP-15",
    category,
    title: "Hidrofobizarea fațadelor din zidărie aparentă sau piatră",
    unit: "mp",
    includes:
      "Protejarea tâmplăriei, aplicarea hidrofobizantului în două straturi până la saturare, cu pensula sau pulverizat.",
    excludes: "Curățarea prealabilă (DV-REP-17) și schela.",
    measurement: "Suprafața tratată.",
    resources: [hidrofobizant(0.4), zugrav(0.1), necalificat(0.03)],
  },
  {
    code: "DV-REP-16",
    category,
    title: "Sablarea suprafețelor din beton sau metal",
    unit: "mp",
    includes:
      "Protejarea zonelor învecinate, sablarea până la suport curat, strângerea nisipului și evacuarea lui.",
    measurement: "Suprafața sablată.",
    resources: [nisipSablare(20), necalificat(0.3), instalatieSablare(0.15)],
  },
  {
    code: "DV-REP-17",
    category,
    title: "Spălarea cu presiune a fațadelor și a suprafețelor exterioare",
    unit: "mp",
    includes:
      "Protejarea tâmplăriei și a instalațiilor, spălarea cu apă sub presiune, îndepărtarea depunerilor și a vegetației.",
    measurement: "Suprafața spălată.",
    resources: [necalificat(0.08), aparatSpalat(0.05)],
  },
];

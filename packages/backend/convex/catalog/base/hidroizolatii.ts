import type { BaseNorm } from "./norm";
import {
  aerCald,
  amorsaBituminoasa,
  amorsaSape,
  bandaColturi,
  betoniera,
  betonist,
  dibluCui,
  emulsieBituminoasa,
  equipment,
  fierar,
  foliePolietilena,
  gazPropan,
  geotextil,
  instalator,
  izolator,
  material,
  membranaArdezie,
  membranaCrampoane,
  membranaSbs3,
  membranaSbs4,
  mortarHidroizolant,
  mortarSapa,
  necalificat,
  pietris,
  plasaSudata,
  profilInchidere,
  smallMaterials,
} from "./resources";

const category = "Hidroizolații";

const lamaSudura = equipment(
  "Aparat de sudură cu lamă încălzită pentru benzi de rost",
  "ora",
  10,
);

const membranaPvc = material("Membrană PVC pentru terase, 1,5 mm", "mp", 42);
const dibluMembrana = material(
  "Diblu cu placă de presiune pentru membrane",
  "buc",
  1.6,
);
const tablaPvc = material("Tablă căptușită cu PVC pentru racorduri", "m", 28);
const membranaEpdm = material("Membrană EPDM de 1,2 mm", "mp", 48);
const adezivEpdm = material("Adeziv de contact pentru EPDM", "kg", 32);
const bandaEpdm = material("Bandă de îmbinare pentru EPDM", "m", 14);
const amorsaPu = material("Amorsă poliuretanică", "kg", 40);
const hidroLichida = material("Hidroizolație lichidă poliuretanică", "kg", 38);
const tesaturaArmare = material(
  "Țesătură de armare pentru hidroizolații lichide",
  "mp",
  6,
);
const membranaAutoadeziva = material(
  "Membrană bituminoasă autoadezivă, 1,5 mm",
  "mp",
  24,
);
const mortarRigid = material(
  "Mortar hidroizolant rigid monocomponent",
  "kg",
  5.5,
);
const membranaLichida = material(
  "Membrană lichidă elastică pentru băi, gata de aplicat",
  "kg",
  22,
);
const manseta = material("Manșetă de etanșare pentru țevi", "buc", 8);
const guraScurgere = material(
  "Gură de scurgere pentru terase, cu parafrunzar",
  "buc",
  240,
);
const waterstop = material(
  "Bandă de etanșare din PVC pentru rosturi de lucru",
  "m",
  35,
);
const cordonBentonita = material("Cordon de bentonită pentru rosturi", "m", 25);
const plasaCordon = material(
  "Plasă de fixare pentru cordonul de bentonită",
  "m",
  4,
);
const membranaBentonitica = material("Membrană bentonitică", "mp", 38);
const profilAluminiu = material(
  "Profil de închidere din aluminiu pentru hidroizolații",
  "m",
  12,
);
const masticBituminos = material("Mastic bituminos", "kg", 16);

export const hidroizolatii: BaseNorm[] = [
  {
    code: "DV-HDR-01",
    category,
    title:
      "Hidroizolație cu membrană bituminoasă SBS de 4 mm, într-un strat, lipită cu flacără",
    unit: "mp",
    includes:
      "Curățarea suportului, amorsarea, lipirea membranei cu flacără, cu petreceri de 10 cm, și întoarcerile la racorduri.",
    excludes: "Șapa de pantă; protecția hidroizolației.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaSbs4(1.15),
      gazPropan(0.12),
      izolator(0.25),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-HDR-02",
    category,
    title:
      "Hidroizolație de terasă din două straturi de membrană bituminoasă, cu ardezie la suprafață",
    unit: "mp",
    includes:
      "Amorsarea, lipirea cu flacără a primului strat și a stratului cu ardezie, cu rosturile decalate, și racordurile la atice și la guri de scurgere.",
    excludes: "Termoizolația și șapa de pantă; gurile de scurgere.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaSbs3(1.15),
      membranaArdezie(1.15),
      gazPropan(0.22),
      izolator(0.45),
      necalificat(0.18),
    ],
  },
  {
    code: "DV-HDR-03",
    category,
    title:
      "Hidroizolație cu mortar elastic bicomponent sub placaje, în băi și pe balcoane",
    unit: "mp",
    includes:
      "Montarea benzii de etanșare la colțuri și străpungeri, aplicarea mortarului în două straturi.",
    excludes: "Placajul.",
    measurement: "Suprafața hidroizolată, cu racordurile pe pereți.",
    resources: [
      mortarHidroizolant(3),
      bandaColturi(0.6),
      izolator(0.3),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-HDR-04",
    category,
    title: "Hidroizolație de fundații cu emulsie bituminoasă, în două straturi",
    unit: "mp",
    includes:
      "Curățarea suprafeței și aplicarea emulsiei în două straturi încrucișate.",
    excludes: "Protecția hidroizolației.",
    measurement: "Suprafața hidroizolată.",
    resources: [emulsieBituminoasa(1.2), izolator(0.15), necalificat(0.05)],
  },
  {
    code: "DV-HDR-05",
    category,
    title: "Protecția hidroizolației fundațiilor cu membrană cu crampoane",
    unit: "mp",
    includes:
      "Fixarea membranei cu crampoanele spre perete, petrecerile și profilul de închidere la partea de sus.",
    measurement: "Suprafața protejată.",
    resources: [
      membranaCrampoane(1.15),
      profilInchidere(0.2),
      dibluCui(2),
      izolator(0.1),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-HDR-06",
    category,
    title:
      "Hidroizolație de terasă cu membrană PVC de 1,5 mm, fixată mecanic, pe geotextil de separare",
    unit: "mp",
    includes:
      "Așezarea geotextilului, întinderea membranei și fixarea ei mecanică în suport, sudarea suprapunerilor cu aer cald, racordurile pe tablă căptușită cu PVC.",
    excludes: "Termoizolația; gurile de scurgere; lestarea.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      geotextil(1.1),
      membranaPvc(1.15),
      dibluMembrana(3),
      tablaPvc(0.3),
      izolator(0.4),
      necalificat(0.15),
      aerCald(0.1),
    ],
  },
  {
    code: "DV-HDR-07",
    category,
    title: "Hidroizolație de terasă cu membrană EPDM de 1,2 mm, lipită",
    unit: "mp",
    includes:
      "Curățarea suportului, întinderea și lipirea membranei cu adeziv de contact, îmbinările cu bandă, racordurile la atice și străpungeri.",
    excludes: "Termoizolația; gurile de scurgere.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      membranaEpdm(1.1),
      adezivEpdm(0.4),
      bandaEpdm(0.4),
      izolator(0.35),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-HDR-08",
    category,
    title:
      "Hidroizolație lichidă poliuretanică în două straturi, armată cu țesătură, pe terase și balcoane",
    unit: "mp",
    includes:
      "Pregătirea și amorsarea suportului, primul strat cu țesătura de armare înglobată, al doilea strat după uscare, racordurile pe pereți.",
    excludes:
      "Reparațiile suportului; placajul sau stratul de uzură de deasupra.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaPu(0.2),
      hidroLichida(2.2),
      tesaturaArmare(1.1),
      izolator(0.4),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-HDR-09",
    category,
    title:
      "Hidroizolație cu membrană bituminoasă autoadezivă, sub șape și pe suporturi din lemn",
    unit: "mp",
    includes:
      "Amorsarea suportului, derularea și presarea membranei cu petreceri de 10 cm, întoarcerile pe pereți.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaAutoadeziva(1.15),
      izolator(0.2),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-HDR-10",
    category,
    title:
      "Hidroizolație rigidă cu mortar pe bază de ciment, în două straturi, pentru subsoluri, cuve și bazine",
    unit: "mp",
    includes:
      "Curățarea și umezirea suportului, scafele la colțuri, aplicarea mortarului cu bidineaua sau prin pulverizare în două straturi încrucișate.",
    excludes: "Reparațiile suportului; injectările.",
    measurement: "Suprafața hidroizolată.",
    resources: [
      mortarRigid(4),
      bandaColturi(0.3),
      izolator(0.35),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-HDR-11",
    category,
    title:
      "Hidroizolație orizontală sub zidărie cu membrană bituminoasă, pe fundații și socluri",
    unit: "m",
    includes:
      "Curățarea și amorsarea suprafeței, lipirea fâșiei de membrană cu petreceri la capete.",
    measurement: "Lungimea zidului hidroizolat.",
    resources: [
      amorsaBituminoasa(0.1),
      membranaSbs3(0.4),
      gazPropan(0.05),
      izolator(0.08),
    ],
  },
  {
    code: "DV-HDR-12",
    category,
    title:
      "Membrană lichidă elastică gata de aplicat sub placaje, în băi și bucătării",
    unit: "mp",
    includes:
      "Amorsarea, banda de etanșare la colțuri și manșetele la țevi, aplicarea membranei în două straturi.",
    excludes: "Placajul.",
    measurement: "Suprafața hidroizolată, cu racordurile pe pereți.",
    resources: [
      amorsaSape(0.15),
      membranaLichida(1.5),
      bandaColturi(0.6),
      manseta(0.3),
      izolator(0.3),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-HDR-13",
    category,
    title:
      "Gură de scurgere pentru terase, cu parafrunzar, racordată la hidroizolație",
    unit: "buc",
    includes:
      "Montarea gurii de scurgere în gol, racordarea ei la coloana pluvială, lipirea gulerului în hidroizolație (petecul de întărire din jur e cuprins în norma hidroizolației) și parafrunzarul.",
    excludes: "Golul în placă; coloana pluvială.",
    measurement: "Numărul de guri de scurgere.",
    resources: [guraScurgere(1), izolator(1), instalator(0.5)],
  },
  {
    code: "DV-HDR-14",
    category,
    title:
      "Bandă de etanșare din PVC în rosturile de lucru ale betonului, montată înainte de turnare",
    unit: "m",
    includes:
      "Așezarea benzii în poziție, fixarea ei de armătură și sudarea cap la cap a îmbinărilor cu lama încălzită.",
    measurement: "Lungimea rosturilor etanșate.",
    resources: [
      waterstop(1.05),
      smallMaterials(3),
      fierar(0.15),
      izolator(0.1),
      lamaSudura(0.05),
    ],
  },
  {
    code: "DV-HDR-15",
    category,
    title: "Cordon de bentonită în rosturile de betonare, cu plasă de fixare",
    unit: "m",
    includes:
      "Curățarea betonului întărit, așezarea cordonului pe mijlocul rostului și fixarea lui cu plasă și dibluri.",
    measurement: "Lungimea rosturilor etanșate.",
    resources: [
      cordonBentonita(1.05),
      plasaCordon(1.05),
      dibluCui(4),
      izolator(0.12),
    ],
  },
  {
    code: "DV-HDR-16",
    category,
    title:
      "Hidroizolație cu membrană bentonitică sub radiere și pe pereții subsolului",
    unit: "mp",
    includes:
      "Așezarea membranei cu petreceri de 10 cm, fixarea ei cu dibluri pe pereți și protejarea până la turnarea betonului sau umplutură.",
    measurement: "Suprafața hidroizolată.",
    resources: [
      membranaBentonitica(1.15),
      dibluCui(2),
      izolator(0.2),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-HDR-17",
    category,
    title:
      "Strat de protecție și lestare din pietriș spălat de 5 cm pe terase, pe geotextil",
    unit: "mp",
    includes:
      "Așezarea geotextilului, ridicarea și împrăștierea pietrișului în strat uniform.",
    measurement: "Suprafața acoperită.",
    resources: [geotextil(1.1), pietris(0.055), necalificat(0.25)],
  },
  {
    code: "DV-HDR-18",
    category,
    title:
      "Șapă de protecție de 4 cm pe hidroizolația teraselor, armată cu plasă, pe folie",
    unit: "mp",
    includes:
      "Folia de separare, plasa sudată, prepararea și turnarea mortarului, nivelarea și driscuirea, rosturile.",
    excludes: "Hidroizolația; stratul de uzură de deasupra.",
    measurement: "Suprafața șapei.",
    resources: [
      foliePolietilena(1.1),
      plasaSudata(1.5),
      mortarSapa(0.042),
      betonist(0.3),
      necalificat(0.25),
      betoniera(0.04),
    ],
  },
  {
    code: "DV-HDR-19",
    category,
    title:
      "Hidroizolația pereților subsolului cu două straturi de membrană bituminoasă de 4 mm",
    unit: "mp",
    includes:
      "Curățarea și amorsarea suportului, lipirea cu flacără a celor două straturi cu rosturile decalate, întoarcerile pe fundație și la partea de sus.",
    excludes: "Protecția hidroizolației; drenul.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaSbs4(2.3),
      gazPropan(0.24),
      izolator(0.5),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-HDR-20",
    category,
    title:
      "Închiderea racordului hidroizolației la atice și pereți, cu profil din aluminiu și mastic",
    unit: "m",
    includes:
      "Profilul de închidere din aluminiu fixat cu dibluri la marginea de sus a întoarcerii și masticul de etanșare de deasupra lui.",
    excludes:
      "Scafa și întoarcerea hidroizolației pe perete, cuprinse în norma hidroizolației.",
    measurement:
      "Lungimea racordului. Întoarcerea hidroizolației pe perete se măsoară cu suprafața ei, în norma hidroizolației.",
    resources: [
      profilAluminiu(1.05),
      dibluCui(3),
      masticBituminos(0.1),
      izolator(0.15),
    ],
  },
];

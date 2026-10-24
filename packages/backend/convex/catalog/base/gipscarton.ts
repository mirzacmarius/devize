import type { BaseNorm } from "./norm";
import {
  adezivGips,
  ancoraTavan,
  bandaProfile,
  bandaRosturi,
  barieraVapori,
  brida,
  dibluCui,
  dibluMetalic,
  masaSpaclu,
  material,
  montatorGips,
  necalificat,
  placaGips,
  placaGipsRezistentaUmezeala,
  plasaFatada,
  profilCD60,
  profilCW75,
  profilUD30,
  profilUW75,
  setSuspendare,
  smallMaterials,
  surubGips,
  vataBazaltica5,
  vataSticla5,
  vataSticla10,
} from "./resources";

const category = "Gips-carton";

const placaRf = material(
  "Placă de gips-carton rezistentă la foc, 12,5 mm",
  "mp",
  22,
);
const placaAcustica = material(
  "Placă de gips-carton perforată acustică",
  "mp",
  85,
);
const masaSpacluPerforate = material(
  "Masă de șpaclu pentru plăci perforate",
  "kg",
  9,
);
const placaFibrogips = material("Placă din fibrogips, 12,5 mm", "mp", 45);
const surubFibrogips = material("Șurub pentru fibrogips", "buc", 0.08);
const adezivFibrogips = material(
  "Adeziv pentru rosturi de fibrogips",
  "kg",
  35,
);
const placaCimentoasa = material(
  "Placă cimentoasă pentru exterior, 12,5 mm",
  "mp",
  65,
);
const surubCimentoasa = material("Șurub pentru plăci cimentoase", "buc", 0.2);
const masaSpacluCimentoasa = material(
  "Masă de șpaclu pentru plăci cimentoase",
  "kg",
  3.5,
);
const profilCW100 = material("Profil CW 100", "m", 7.5);
const profilUW100 = material("Profil UW 100", "m", 6.5);
const profilCW50 = material("Profil CW 50", "m", 5);
const profilUW50 = material("Profil UW 50", "m", 4.2);
const profilUA = material("Profil de rigidizare UA 75", "m", 14);
const conectoriUA = material("Set de conectori pentru profile UA", "set", 25);
const coltarAluminiu = material(
  "Profil de colț din aluminiu pentru gips-carton",
  "m",
  3,
);
const bandaFibra = material(
  "Bandă din fibră de sticlă autoadezivă pentru rosturi",
  "m",
  0.3,
);
const caseta = material("Casetă din fibre minerale, 60 × 60 cm", "mp", 38);
const structuraCasete = material(
  "Structură vizibilă T24 pentru tavane casetate",
  "mp",
  22,
);
const trapa = material(
  "Trapă de vizitare din gips-carton, 60 × 60 cm",
  "buc",
  140,
);

export const gipscarton: BaseNorm[] = [
  {
    code: "DV-GIP-01",
    category,
    title:
      "Perete despărțitor din gips-carton pe profile CW/UW 75, placat simplu pe ambele fețe, cu vată minerală de 5 cm",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei, înșurubarea plăcilor și tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Gletul pe toată suprafața; ramele pentru uși; vopsirea.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaGips(2.1),
      profilCW75(2),
      profilUW75(0.7),
      vataSticla5(1.05),
      surubGips(30),
      dibluCui(1.6),
      bandaProfile(1.2),
      bandaRosturi(1.6),
      masaSpaclu(0.7),
      smallMaterials(2),
      montatorGips(0.9),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-02",
    category,
    title: "Placarea pereților cu gips-carton pe profile CD/UD, un strat",
    unit: "mp",
    includes:
      "Trasarea, prinderea bridelor și a profilelor, înșurubarea plăcilor și tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Termoizolația din spatele plăcilor; gletul pe toată suprafața.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaGips(1.05),
      profilCD60(2.2),
      profilUD30(0.8),
      brida(1.5),
      surubGips(15),
      dibluCui(2.5),
      bandaRosturi(0.8),
      masaSpaclu(0.35),
      montatorGips(0.55),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-GIP-03",
    category,
    title: "Plafon suspendat din gips-carton pe profile CD/UD, cu tije",
    unit: "mp",
    includes:
      "Trasarea, prinderea tijelor de planșeu, montarea profilelor, înșurubarea plăcilor și tratarea rosturilor.",
    excludes:
      "Termoizolația de deasupra; decupajele pentru corpuri de iluminat; gletul pe toată suprafața.",
    measurement: "Suprafața plafonului, în proiecție orizontală.",
    resources: [
      placaGips(1.05),
      profilCD60(3.2),
      profilUD30(0.4),
      setSuspendare(1.2),
      ancoraTavan(1.2),
      surubGips(17),
      dibluCui(0.8),
      bandaRosturi(1.2),
      masaSpaclu(0.45),
      smallMaterials(2),
      montatorGips(0.85),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-04",
    category,
    title: "Placarea pereților cu gips-carton lipit cu adeziv",
    unit: "mp",
    includes:
      "Aplicarea adezivului în puncte, lipirea și alinierea plăcilor, tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Pregătirea pereților denivelați cu mai mult de 2 cm.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaGips(1.05),
      adezivGips(4),
      bandaRosturi(0.8),
      masaSpaclu(0.35),
      montatorGips(0.45),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-GIP-05",
    category,
    title:
      "Perete despărțitor din gips-carton pe profile CW/UW 75, placat dublu pe ambele fețe, cu vată minerală de 5 cm",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei, înșurubarea celor două straturi de plăci cu rosturile decalate și tratarea rosturilor.",
    excludes: "Gletul pe toată suprafața; ramele pentru uși; vopsirea.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaGips(4.2),
      profilCW75(2),
      profilUW75(0.7),
      vataSticla5(1.05),
      surubGips(46),
      dibluCui(1.6),
      bandaProfile(1.2),
      bandaRosturi(1.6),
      masaSpaclu(0.8),
      smallMaterials(2),
      montatorGips(1.25),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-GIP-06",
    category,
    title:
      "Perete despărțitor din gips-carton pe profile CW/UW 100, placat dublu pe ambele fețe, cu vată minerală de 10 cm",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei, înșurubarea celor două straturi de plăci cu rosturile decalate și tratarea rosturilor.",
    excludes: "Gletul pe toată suprafața; ramele pentru uși; vopsirea.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaGips(4.2),
      profilCW100(2),
      profilUW100(0.7),
      vataSticla10(1.05),
      surubGips(46),
      dibluCui(1.6),
      bandaProfile(1.4),
      bandaRosturi(1.6),
      masaSpaclu(0.8),
      smallMaterials(2),
      montatorGips(1.3),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-GIP-07",
    category,
    title:
      "Perete despărțitor din gips-carton pe profile CW/UW 50, placat simplu pe ambele fețe, cu vată minerală de 5 cm",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei, înșurubarea plăcilor și tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Gletul pe toată suprafața; ramele pentru uși; vopsirea.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaGips(2.1),
      profilCW50(2),
      profilUW50(0.7),
      vataSticla5(1.05),
      surubGips(30),
      dibluCui(1.6),
      bandaProfile(1),
      bandaRosturi(1.6),
      masaSpaclu(0.7),
      smallMaterials(2),
      montatorGips(0.85),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-08",
    category,
    title:
      "Perete despărțitor din gips-carton rezistent la umezeală pe profile CW/UW 75, placat simplu, cu vată minerală de 5 cm, pentru băi",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei, înșurubarea plăcilor rezistente la umezeală și tratarea rosturilor.",
    excludes: "Hidroizolația sub placaj; gletul; ramele pentru uși.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaGipsRezistentaUmezeala(2.1),
      profilCW75(2),
      profilUW75(0.7),
      vataSticla5(1.05),
      surubGips(30),
      dibluCui(1.6),
      bandaProfile(1.2),
      bandaRosturi(1.6),
      masaSpaclu(0.7),
      smallMaterials(2),
      montatorGips(0.9),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-09",
    category,
    title:
      "Perete rezistent la foc din gips-carton pe profile CW/UW 75, placat dublu cu plăci rezistente la foc, cu vată bazaltică de 5 cm",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei bazaltice, înșurubarea celor două straturi de plăci cu rosturile decalate și tratarea rosturilor.",
    excludes: "Gletul pe toată suprafața; ramele pentru uși; vopsirea.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaRf(4.2),
      profilCW75(2),
      profilUW75(0.7),
      vataBazaltica5(1.05),
      surubGips(46),
      dibluCui(1.6),
      bandaProfile(1.2),
      bandaRosturi(1.6),
      masaSpaclu(0.8),
      smallMaterials(2),
      montatorGips(1.3),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-GIP-10",
    category,
    title:
      "Placarea pereților cu gips-carton rezistent la umezeală pe profile CD/UD, un strat, pentru băi",
    unit: "mp",
    includes:
      "Trasarea, prinderea bridelor și a profilelor, înșurubarea plăcilor rezistente la umezeală și tratarea rosturilor.",
    excludes: "Hidroizolația sub placaj; termoizolația din spatele plăcilor.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaGipsRezistentaUmezeala(1.05),
      profilCD60(2.2),
      profilUD30(0.8),
      brida(1.5),
      surubGips(15),
      dibluCui(2.5),
      bandaRosturi(0.8),
      masaSpaclu(0.35),
      montatorGips(0.55),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-GIP-11",
    category,
    title:
      "Placarea pereților cu gips-carton pe profile CD/UD, cu vată minerală de 5 cm și barieră de vapori",
    unit: "mp",
    includes:
      "Trasarea, prinderea bridelor și a profilelor, așezarea vatei între profile, bariera de vapori lipită, înșurubarea plăcilor și tratarea rosturilor.",
    excludes: "Gletul pe toată suprafața.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaGips(1.05),
      profilCD60(2.2),
      profilUD30(0.8),
      brida(1.5),
      vataSticla5(1.05),
      barieraVapori(1.1),
      surubGips(15),
      dibluCui(2.5),
      bandaRosturi(0.8),
      masaSpaclu(0.35),
      montatorGips(0.65),
      necalificat(0.12),
    ],
  },
  {
    code: "DV-GIP-12",
    category,
    title:
      "Plafon suspendat din gips-carton pe profile CD/UD, cu tije, placat dublu",
    unit: "mp",
    includes:
      "Trasarea, prinderea tijelor de planșeu, montarea profilelor, înșurubarea celor două straturi de plăci cu rosturile decalate și tratarea rosturilor.",
    excludes:
      "Termoizolația de deasupra; decupajele pentru corpuri de iluminat; gletul pe toată suprafața.",
    measurement: "Suprafața plafonului, în proiecție orizontală.",
    resources: [
      placaGips(2.1),
      profilCD60(3.2),
      profilUD30(0.4),
      setSuspendare(1.5),
      ancoraTavan(1.5),
      surubGips(40),
      dibluCui(0.8),
      bandaRosturi(1.2),
      masaSpaclu(0.5),
      smallMaterials(2),
      montatorGips(1.1),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-GIP-13",
    category,
    title:
      "Plafon suspendat din gips-carton rezistent la umezeală pe profile CD/UD, cu tije, pentru băi",
    unit: "mp",
    includes:
      "Trasarea, prinderea tijelor de planșeu, montarea profilelor, înșurubarea plăcilor rezistente la umezeală și tratarea rosturilor.",
    excludes:
      "Decupajele pentru corpuri de iluminat și ventilator; gletul pe toată suprafața.",
    measurement: "Suprafața plafonului, în proiecție orizontală.",
    resources: [
      placaGipsRezistentaUmezeala(1.05),
      profilCD60(3.2),
      profilUD30(0.4),
      setSuspendare(1.2),
      ancoraTavan(1.2),
      surubGips(17),
      dibluCui(0.8),
      bandaRosturi(1.2),
      masaSpaclu(0.45),
      smallMaterials(2),
      montatorGips(0.85),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-14",
    category,
    title:
      "Placarea tavanelor și a pantelor mansardei cu gips-carton pe profile CD/UD, prinse cu bride de căpriori",
    unit: "mp",
    includes:
      "Trasarea, prinderea bridelor de căpriori sau grinzi, montarea profilelor, înșurubarea plăcilor și tratarea rosturilor.",
    excludes: "Termoizolația și bariera de vapori; gletul pe toată suprafața.",
    measurement: "Suprafața placată, măsurată pe pantă.",
    resources: [
      placaGips(1.05),
      profilCD60(2.6),
      profilUD30(0.6),
      brida(2.5),
      surubGips(17),
      dibluCui(1),
      bandaRosturi(1.2),
      masaSpaclu(0.45),
      montatorGips(0.75),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-15",
    category,
    title:
      "Tavan casetat din fibre minerale de 60 × 60 cm, pe structură vizibilă T24, suspendată",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor de margine, suspendarea structurii, așezarea casetelor și tăieturile la margini.",
    excludes: "Decupajele pentru corpuri de iluminat și grile.",
    measurement: "Suprafața plafonului, în proiecție orizontală.",
    resources: [
      caseta(1.05),
      structuraCasete(1),
      setSuspendare(1),
      ancoraTavan(1),
      dibluCui(1),
      montatorGips(0.45),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-GIP-16",
    category,
    title:
      "Scafă sau coborâre de tavan din gips-carton pentru iluminat indirect, până la 30 cm înălțime",
    unit: "m",
    includes:
      "Trasarea, structura din profile CD/UD, înșurubarea plăcilor, profilele de colț din aluminiu și tratarea rosturilor.",
    excludes: "Benzile LED și alimentarea lor; gletul.",
    measurement: "Lungimea scafei.",
    resources: [
      placaGips(0.8),
      profilCD60(2.5),
      profilUD30(2),
      surubGips(20),
      dibluCui(2),
      bandaRosturi(1.5),
      coltarAluminiu(2.1),
      masaSpaclu(0.5),
      montatorGips(0.9),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-17",
    category,
    title:
      "Mască pentru coloane și conducte din gips-carton rezistent la umezeală, pe profile CW/UW 50, până la 60 cm perimetru",
    unit: "m",
    includes:
      "Trasarea, structura din profile fixată de pereți și pardoseală, înșurubarea plăcilor, profilele de colț și tratarea rosturilor.",
    excludes: "Trapa de vizitare; gletul; placajul.",
    measurement: "Înălțimea măștii, pentru fiecare mască.",
    resources: [
      placaGipsRezistentaUmezeala(1.3),
      profilCW50(3),
      profilUW50(2),
      surubGips(25),
      dibluCui(4),
      bandaRosturi(2.2),
      coltarAluminiu(2.1),
      masaSpaclu(0.6),
      montatorGips(1),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-18",
    category,
    title:
      "Trapă de vizitare de 60 × 60 cm, montată în pereți sau plafoane din gips-carton",
    unit: "buc",
    includes:
      "Decuparea golului, rama din profile CD, fixarea trapei și tratarea rosturilor din jur.",
    measurement: "Numărul de trape.",
    resources: [trapa(1), profilCD60(2.5), surubGips(20), montatorGips(1)],
  },
  {
    code: "DV-GIP-19",
    category,
    title:
      "Rigidizarea golului de ușă în pereți din gips-carton cu profile UA și conectori",
    unit: "buc",
    includes:
      "Montarea celor doi montanți UA cu conectorii lor în pardoseală și tavan, traversa de deasupra golului și fixarea cu dibluri metalice.",
    excludes: "Tocul ușii.",
    measurement: "Numărul de goluri rigidizate.",
    resources: [
      profilUA(5.5),
      conectoriUA(2),
      dibluMetalic(4),
      montatorGips(1.2),
    ],
  },
  {
    code: "DV-GIP-20",
    category,
    title:
      "Plafon acustic din plăci de gips-carton perforate, pe profile CD/UD, cu tije",
    unit: "mp",
    includes:
      "Trasarea, suspendarea structurii, înșurubarea plăcilor perforate cu rosturile aliniate, vata de deasupra și tratarea rosturilor cu masa de șpaclu specială.",
    excludes: "Decupajele pentru corpuri de iluminat; vopsirea.",
    measurement: "Suprafața plafonului, în proiecție orizontală.",
    resources: [
      placaAcustica(1.05),
      vataSticla5(1.05),
      profilCD60(3.2),
      profilUD30(0.4),
      setSuspendare(1.5),
      ancoraTavan(1.5),
      surubGips(20),
      masaSpacluPerforate(0.4),
      smallMaterials(2),
      montatorGips(1.3),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-GIP-21",
    category,
    title:
      "Placarea pereților cu plăci din fibrogips pe profile CD/UD, pentru spații cu solicitări mecanice",
    unit: "mp",
    includes:
      "Trasarea, prinderea bridelor și a profilelor, înșurubarea plăcilor, lipirea rosturilor cu adeziv și șpăcluirea lor.",
    excludes: "Termoizolația din spatele plăcilor; gletul pe toată suprafața.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaFibrogips(1.05),
      profilCD60(2.2),
      profilUD30(0.8),
      brida(1.5),
      surubFibrogips(20),
      adezivFibrogips(0.05),
      masaSpaclu(0.2),
      montatorGips(0.7),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-GIP-22",
    category,
    title:
      "Placarea tavanelor exterioare și a streșinilor cu plăci cimentoase pe profile CD/UD, armate și șpăcluite",
    unit: "mp",
    includes:
      "Structura din profile, înșurubarea plăcilor cimentoase, masa de șpaclu cu plasa înglobată pe toată suprafața, gata de vopsit.",
    excludes: "Schela; vopseaua.",
    measurement: "Suprafața placată.",
    resources: [
      placaCimentoasa(1.05),
      profilCD60(3),
      profilUD30(0.6),
      brida(2),
      surubCimentoasa(20),
      masaSpacluCimentoasa(1.5),
      plasaFatada(1.1),
      montatorGips(1.1),
      necalificat(0.25),
    ],
  },
  {
    code: "DV-GIP-23",
    category,
    title:
      "Tratarea rosturilor de gips-carton cu bandă din fibră de sticlă și masă de șpaclu, pe plăci montate de alții",
    unit: "mp",
    includes:
      "Lipirea benzii autoadezive pe rosturi, șpăcluirea rosturilor și a capetelor de șuruburi în două straturi, șlefuirea.",
    measurement: "Suprafața plăcilor ale căror rosturi s-au tratat.",
    resources: [bandaFibra(1.2), masaSpaclu(0.45), montatorGips(0.2)],
  },
];
